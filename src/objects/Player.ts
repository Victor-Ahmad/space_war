import Phaser from 'phaser'
import { ServerConfig } from '../core/ServerConfig'
import type { MovementMode } from '../config/GameSettings'

export class Player extends Phaser.Physics.Arcade.Sprite {
  private hue: number
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    up: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
  }

  // Movement params (Glide)
  private maxSpeed: number
  private accel: number
  private drag: number

  // Movement params (Snap)
  private snapSpeed: number
  private movementMode: MovementMode

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = Player.ensureTriangleTexture(scene)
    super(scene, x, y, key)

    const s = ServerConfig.settings
    this.maxSpeed = s.kbMaxSpeed
    this.accel = s.kbAcceleration
    this.drag = s.kbDrag

    this.snapSpeed = s.kbSnapSpeed
    this.movementMode = s.movementDefaultMode

    // Bright random hue
    this.hue = Phaser.Math.Between(0, 359)
    const color = Phaser.Display.Color.HSVToRGB(this.hue / 360, 1, 1).color
    this.setTint(color)

    // Add + physics
    scene.add.existing(this)
    scene.physics.add.existing(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCollideWorldBounds(true)
    body.setBounce(s.playerBounce)

    // Round-ish collision
    const size = s.playerSize
    const radius = Math.max(8, size * 0.42)
    body.setCircle(radius, this.width / 2 - radius, this.height / 2 - radius)

    // Inputs: arrow keys + WASD
    this.cursors = scene.input.keyboard!.createCursorKeys()
    this.wasd = scene.input.keyboard!.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' }) as any

    this.setOrigin(0.5, 0.5)
    this.setDepth(10)
  }

  /** Switch at runtime from UI */
  setMovementMode(mode: MovementMode) {
    this.movementMode = mode
    // instant mode: no residual drift
    if (mode === 'snap') {
      const body = this.body as Phaser.Physics.Arcade.Body
      body.setVelocity(0, 0)
    }
  }
  getMovementMode(): MovementMode { return this.movementMode }

  getTintColor() { return (this as any).tintTopLeft ?? 0xffffff }

  update(_time: number, delta: number) {
    const dt = Math.max(0.001, delta / 1000)
    const body = this.body as Phaser.Physics.Arcade.Body

    // ---- Rotation: screen-space aim (camera-proof)
    const cam = this.scene.cameras.main
    const ptr = this.scene.input.activePointer
    const playerScreenX = (this.x - cam.scrollX) * cam.zoom
    const playerScreenY = (this.y - cam.scrollY) * cam.zoom
    const angleScreen = Math.atan2(ptr.y - playerScreenY, ptr.x - playerScreenX)
    this.setRotation(angleScreen + Math.PI / 2)

    // ---- Input vector (arrows and/or WASD)
    let ix = 0, iy = 0
    if (this.cursors.left.isDown || this.wasd.left.isDown)  ix -= 1
    if (this.cursors.right.isDown || this.wasd.right.isDown) ix += 1
    if (this.cursors.up.isDown || this.wasd.up.isDown)       iy -= 1
    if (this.cursors.down.isDown || this.wasd.down.isDown)   iy += 1

    const hasInput = ix !== 0 || iy !== 0

    if (this.movementMode === 'snap') {
      // === SNAP: immediate velocity, no easing ===
      if (hasInput) {
        const len = Math.hypot(ix, iy)
        const nx = ix / len
        const ny = iy / len
        body.setVelocity(nx * this.snapSpeed, ny * this.snapSpeed)
      } else {
        body.setVelocity(0, 0)
      }
      return
    }

    // === GLIDE: accelerate + clamp + manual drag ===
    if (hasInput) {
      const len = Math.hypot(ix, iy)
      const nx = ix / len
      const ny = iy / len

      const vx = body.velocity.x + nx * this.accel * dt
      const vy = body.velocity.y + ny * this.accel * dt

      const sp = Math.hypot(vx, vy)
      if (sp > this.maxSpeed) {
        const k = this.maxSpeed / sp
        body.setVelocity(vx * k, vy * k)
      } else {
        body.setVelocity(vx, vy)
      }
    } else {
      const vx = body.velocity.x
      const vy = body.velocity.y
      const damp = this.drag * dt
      const nvx = Math.abs(vx) <= damp ? 0 : vx - Math.sign(vx) * damp
      const nvy = Math.abs(vy) <= damp ? 0 : vy - Math.sign(vy) * damp
      body.setVelocity(nvx, nvy)
    }
  }

  static ensureTriangleTexture(scene: Phaser.Scene) {
    const key = 'playerTriangle'
    if (scene.textures.exists(key)) return key

    const size = ServerConfig.settings.playerSize
    const w = size
    const h = size * 1.2

    const g = scene.add.graphics({ x: 0, y: 0 })
    g.setVisible(false)

    g.fillStyle(0xffffff, 1)
    g.beginPath()
    g.moveTo(w / 2, 0)
    g.lineTo(0, h)
    g.lineTo(w, h)
    g.closePath()
    g.fillPath()

    g.lineStyle(2, 0xffffff, 0.4)
    g.strokePath()

    g.generateTexture(key, w, h)
    g.destroy()

    return key
  }
}
