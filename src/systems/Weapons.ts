import Phaser from 'phaser'
import { ServerConfig } from '../core/ServerConfig'
import type { LivingGrid } from './LivingGrid'

class BaseProjectile extends Phaser.Physics.Arcade.Image {
  protected startX = 0
  protected startY = 0
  protected maxRangeSq = 0
  damage = 0
  ricochetCount = 0
  ricochetMax = 0

  constructor(scene: Phaser.Scene, texture: string) {
    super(scene, 0, 0, texture)
    scene.add.existing(this)
    scene.physics.add.existing(this)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.allowGravity = false
    body.setCollideWorldBounds(true)
    body.bounce.set(1, 1)
    ;(body as any).onWorldBounds = true
    this.setActive(false).setVisible(false)
  }

  fire(fromX: number, fromY: number, vx: number, vy: number, range: number, tint?: number, damage = 0, ricochetMax = 0) {
    this.startX = fromX
    this.startY = fromY
    this.maxRangeSq = range * range
    this.damage = damage
    this.ricochetCount = 0
    this.ricochetMax = ricochetMax

    this.setPosition(fromX, fromY)
    this.setActive(true).setVisible(true)
    if (tint !== undefined) this.setTint(tint)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.reset(fromX, fromY)
    body.setVelocity(vx, vy)
    this.setRotation(Math.atan2(vy, vx))
  }

  updateRangeAndMaybeExpire() {
    const dx = this.x - this.startX
    const dy = this.y - this.startY
    if (dx * dx + dy * dy >= this.maxRangeSq) this.onRangeEnd()
  }

  handleWorldBounce() {
    if (this.ricochetCount < this.ricochetMax) { this.ricochetCount++; return }
    this.onRangeEnd()
  }

  protected onRangeEnd() { this.kill() }
  protected kill() {
    const body = this.body as Phaser.Physics.Arcade.Body
    body.stop()
    this.setActive(false).setVisible(false)
  }
}

class Bullet extends BaseProjectile {
  constructor(scene: Phaser.Scene) {
    super(scene, 'bulletTex')
    this.setBlendMode(Phaser.BlendModes.ADD)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(4, 0, 0)
  }
}

class HeavyProjectile extends BaseProjectile {
  constructor(scene: Phaser.Scene) {
    super(scene, 'rocketTex')
    this.setScale(1.15)
    this.setBlendMode(Phaser.BlendModes.ADD)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(6, 0, 0)
  }

  protected onRangeEnd(): void {
    const s = ServerConfig.settings
    Explosion.spawn(this.scene, this.x, this.y, s.secondaryExplosionRadius, this.damage)
    this.scene.events.emit('weapons:explosion', { x: this.x, y: this.y, radius: s.secondaryExplosionRadius, damage: this.damage })
    this.kill()
  }
}

class Explosion {
  static spawn(scene: Phaser.Scene, x: number, y: number, radius: number, _damage: number) {
    const g = scene.add.graphics({ x, y })
    g.setDepth(999)
    g.fillStyle(0xffc400, 0.25).fillCircle(0, 0, radius * 0.5)
    g.lineStyle(4, 0xff3b30, 0.8).strokeCircle(0, 0, radius * 0.5)
    scene.tweens.add({ targets: g, scaleX: 1.25, scaleY: 1.25, alpha: 0, duration: 200, onComplete: () => g.destroy() })
  }
}

function ensureProjectileTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists('bulletTex')) {
    const g = scene.add.graphics(); g.setVisible(false)
    g.fillStyle(0xffffff, 1).fillCircle(4, 4, 4)
    g.generateTexture('bulletTex', 8, 8); g.destroy()
  }
  if (!scene.textures.exists('rocketTex')) {
    const g = scene.add.graphics(); g.setVisible(false)
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 12, 6)
    g.generateTexture('rocketTex', 12, 6); g.destroy()
  }
}

export class WeaponsSystem {
  private scene: Phaser.Scene
  private owner: Phaser.GameObjects.Sprite
  private bullets: Phaser.Physics.Arcade.Group
  private rockets: Phaser.Physics.Arcade.Group
  private nextPrimaryTime = 0
  private nextSecondaryTime = 0
  private s = ServerConfig.settings
  private livingGrid: LivingGrid

  constructor(scene: Phaser.Scene, owner: Phaser.GameObjects.Sprite, livingGrid: LivingGrid) {
    this.scene = scene
    this.owner = owner
    this.livingGrid = livingGrid
    ensureProjectileTextures(scene)
    this.bullets = scene.physics.add.group({ classType: Bullet as unknown as new (scene: Phaser.Scene) => Bullet, maxSize: 250 })
    this.rockets = scene.physics.add.group({ classType: HeavyProjectile as unknown as new (scene: Phaser.Scene) => HeavyProjectile, maxSize: 40 })
    scene.input.mouse?.disableContextMenu()

    // world-bounds ricochet cap
    this.scene.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      const go = body.gameObject as any
      if (go && (go instanceof Bullet || go instanceof HeavyProjectile)) {
        if (go.active && go.visible) (go as BaseProjectile).handleWorldBounce()
      }
    })
  }

  private getOwnerTint(): number {
    const asAny = this.owner as any
    return (asAny.getTintColor?.() ?? asAny.tintTopLeft ?? 0xffffff) as number
  }

  update(time: number) {
    const ptr = this.scene.input.activePointer
    const cam = this.scene.cameras.main

    const px = (this.owner.x - cam.scrollX) * cam.zoom
    const py = (this.owner.y - cam.scrollY) * cam.zoom
    const angleScreen = Math.atan2(ptr.y - py, ptr.x - px)
    const dirx = Math.cos(angleScreen)
    const diry = Math.sin(angleScreen)

    const combat = this.livingGrid.getCombatModsAt(this.owner.x, this.owner.y)
    const projMods = this.livingGrid.getProjectileModsAt(this.owner.x, this.owner.y)
    const speedScale = projMods.projSpeedScale ?? 1
    const tint = this.getOwnerTint()

    // Primary
    const fireInterval = 1000 / Math.max(1, this.s.primaryFireRate)
    if (ptr.leftButtonDown() && time >= this.nextPrimaryTime) {
      this.nextPrimaryTime = time + fireInterval
      const bullet = this.bullets.get() as Bullet | null
      if (bullet) {
        const baseDmg = this.s.primaryDamage * combat.outDamageScale
        const vx = dirx * this.s.primaryBulletSpeed * speedScale
        const vy = diry * this.s.primaryBulletSpeed * speedScale
        bullet.fire(this.owner.x, this.owner.y, vx, vy, this.s.primaryRange, tint, baseDmg)

        // Echo?
        if (projMods.echo) {
          const { delayMs, speedScale: eScale } = projMods.echo
          this.scene.time.delayedCall(delayMs, () => {
            const echo = this.bullets.get() as Bullet | null
            if (!echo) return
            echo.fire(
              this.owner.x, this.owner.y,
              dirx * this.s.primaryBulletSpeed * eScale,
              diry * this.s.primaryBulletSpeed * eScale,
              this.s.primaryRange, tint, baseDmg
            )
          })
        }
      }
    }

    // Secondary
    const space = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    const wantSecondary = ptr.rightButtonDown() || (space && Phaser.Input.Keyboard.JustDown(space))
    if (wantSecondary && time >= this.nextSecondaryTime) {
      this.nextSecondaryTime = time + this.s.secondaryCooldown * 1000
      const rocket = this.rockets.get() as HeavyProjectile | null
      if (rocket) {
        const baseDmg = this.s.secondaryDamage * combat.outDamageScale
        rocket.fire(
          this.owner.x, this.owner.y,
          dirx * this.s.secondaryProjectileSpeed * speedScale,
          diry * this.s.secondaryProjectileSpeed * speedScale,
          this.s.secondaryRange, tint, baseDmg
        )
      }
    }

    ;(this.bullets.getChildren() as BaseProjectile[]).forEach(p => { if (p.active && p.visible) p.updateRangeAndMaybeExpire() })
    ;(this.rockets.getChildren() as BaseProjectile[]).forEach(p => { if (p.active && p.visible) p.updateRangeAndMaybeExpire() })
  }

  getBulletsGroup() { return this.bullets }
  getRocketsGroup() { return this.rockets }
}
