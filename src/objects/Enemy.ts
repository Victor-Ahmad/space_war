import Phaser from 'phaser'
import { ServerConfig } from '../core/ServerConfig'

export type EnemyType = 'normal' | 'speed' | 'strong'

function makeEnemyTexture(scene: Phaser.Scene, key: string, sides: number) {
  if (scene.textures.exists(key)) return key
  const g = scene.add.graphics({ x: 0, y: 0 })
  g.setVisible(false)
  g.fillStyle(0xffffff, 1)
  g.lineStyle(2, 0xffffff, 0.35)
  const r = 16
  g.beginPath()
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2
    const px = Math.cos(a) * r + r + 2
    const py = Math.sin(a) * r + r + 2
    i === 0 ? g.moveTo(px, py) : g.lineTo(px, py)
  }
  g.closePath()
  g.fillPath()
  g.strokePath()
  g.generateTexture(key, r * 2 + 4, r * 2 + 4)
  g.destroy()
  return key
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  type: EnemyType
  maxHealth: number
  health: number
  detectRadius: number
  private speed: number
  private accel: number
  private drag: number = ServerConfig.settings.enemyDrag
  private waypoint: Phaser.Math.Vector2 | null = null
  private waypointRadius: number
  private hpBar: Phaser.GameObjects.Graphics
  private baseColor: number

  constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType) {
    // random triangle..hexagon for visual variety
    const sides = Phaser.Math.Between(3, 6)
    const key = makeEnemyTexture(scene, `enemy_${sides}`, sides)
    super(scene, x, y, key)

    this.type = type

    // Per-type settings
    const s = ServerConfig.settings
    const T =
      type === 'normal'
        ? { hp: s.enemyNormalHealth, sp: s.enemyNormalSpeed, ac: s.enemyNormalAccel }
        : type === 'speed'
        ? { hp: s.enemySpeedHealth, sp: s.enemySpeedSpeed, ac: s.enemySpeedAccel }
        : { hp: s.enemyStrongHealth, sp: s.enemyStrongSpeed, ac: s.enemyStrongAccel }

    // Bright random color (enemy tint + shatter tint)
    const hue = Phaser.Math.Between(0, 359)
    this.baseColor = Phaser.Display.Color.HSVToRGB(hue / 360, 0.9, 1).color
    this.setTint(this.baseColor)

    // Add + physics
    scene.add.existing(this)
    scene.physics.add.existing(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCollideWorldBounds(true)
    body.setDrag(s.enemyDrag, s.enemyDrag)
    body.setCircle(14, 0, 0)

    // Stats
    this.maxHealth = T.hp
    this.health = this.maxHealth
    this.detectRadius = s.enemyDetectRadius
    this.speed = T.sp
    this.accel = T.ac
    this.waypointRadius = s.enemyPatrolWaypointRadius

    this.setOrigin(0.5, 0.5)

    // HP bar graphics above the enemy
    this.hpBar = scene.add.graphics().setDepth(1001)
    this.updateHpBar()

    this.pickWaypoint(scene.physics.world.bounds)
  }

  preDestroy() {
    this.hpBar?.destroy()
  }

  private updateHpBar() {
    const pct = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1)
    this.hpBar.clear()
    const w = 28,
      h = 4
    // background
    this.hpBar.fillStyle(0x000000, 0.6).fillRect(this.x - w / 2, this.y - this.height / 2 - 12, w, h)
    // gradient (red->green) by pct
    const col = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(255, 59, 48),
      new Phaser.Display.Color(52, 199, 89),
      100,
      Math.floor(pct * 100)
    )
    const tint = Phaser.Display.Color.GetColor(col.r, col.g, col.b)
    this.hpBar.fillStyle(tint, 1).fillRect(this.x - w / 2 + 1, this.y - this.height / 2 - 11, (w - 2) * pct, h - 2)
  }

  private pickWaypoint(bounds: Phaser.Geom.Rectangle) {
    const pad = 24
    const x = Phaser.Math.Between(Math.floor(bounds.x + pad), Math.floor(bounds.right - pad))
    const y = Phaser.Math.Between(Math.floor(bounds.y + pad), Math.floor(bounds.bottom - pad))
    this.waypoint = new Phaser.Math.Vector2(x, y)
  }

  updateAI(player: Phaser.GameObjects.Sprite | null, dt: number) {
    const body = this.body as Phaser.Physics.Arcade.Body
    const b = this.scene.physics.world.bounds

    let targetX: number
    let targetY: number

    if (player) {
      const dxp = player.x - this.x
      const dyp = player.y - this.y
      const distToPlayer = Math.hypot(dxp, dyp)
      if (distToPlayer <= this.detectRadius) {
        targetX = player.x
        targetY = player.y
      } else {
        if (!this.waypoint || Phaser.Math.Distance.Between(this.x, this.y, this.waypoint.x, this.waypoint.y) < this.waypointRadius) {
          this.pickWaypoint(b)
        }
        targetX = this.waypoint!.x
        targetY = this.waypoint!.y
      }
    } else {
      // No player yet -> patrol
      if (!this.waypoint || Phaser.Math.Distance.Between(this.x, this.y, this.waypoint.x, this.waypoint.y) < this.waypointRadius) {
        this.pickWaypoint(b)
      }
      targetX = this.waypoint!.x
      targetY = this.waypoint!.y
    }

    let dx = targetX - this.x,
      dy = targetY - this.y
    const len = Math.hypot(dx, dy) || 1
    dx /= len
    dy /= len

    // accelerate towards target
    const vx = body.velocity.x + dx * this.accel * dt
    const vy = body.velocity.y + dy * this.accel * dt
    const sp = Math.hypot(vx, vy)
    if (sp > this.speed) {
      const k = this.speed / sp
      body.setVelocity(vx * k, vy * k)
    } else {
      body.setVelocity(vx, vy)
    }

    if (sp > 10) this.setRotation(Math.atan2(vy, vx))

    this.updateHpBar()
  }

  takeDamage(amount: number, killerName?: string, killerColor?: number) {
    this.health -= amount
    if (this.health <= 0) {
      this.dieShatterRectangles(killerName ?? 'Player', killerColor ?? 0xffffff)
    } else {
      this.updateHpBar()
    }
  }

  // Keep the current (rectangles) shatter/explosion look
  private dieShatterRectangles(killerName: string, killerColor: number) {
    const scene = this.scene
    const X = this.x
    const Y = this.y

    // Simple rect shards flying out (enemy color)
    const pieces = 10
    for (let i = 0; i < pieces; i++) {
      const a = (Math.PI * 2 * i) / pieces + Math.random() * 0.7
      const dist = 60 + Math.random() * 40
      const rect = scene.add.rectangle(X, Y, 6, 8, this.baseColor, 1).setDepth(1000)
      scene.tweens.add({
        targets: rect,
        x: X + Math.cos(a) * dist,
        y: Y + Math.sin(a) * dist,
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: 520,
        ease: 'cubic.out',
        onComplete: () => rect.destroy()
      })
    }

    // emit score event; MainScene shows the single "KILL" text (duration via constants)
    const s = ServerConfig.settings
    const scoreMap: Record<EnemyType, number> = {
      normal: s.enemyNormalScore,
      speed: s.enemySpeedScore,
      strong: s.enemyStrongScore
    }

    scene.events.emit('enemy:killed', {
      type: this.type,
      x: X,
      y: Y,
      killerName,
      killerColor,
      score: scoreMap[this.type]
    })

    this.hpBar.destroy()
    this.destroy()
  }
}
