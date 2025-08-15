import Phaser from 'phaser'
import { ServerConfig } from '../core/ServerConfig'
import { ScoreSystem } from './ScoreSystem'

export class HealthSystem {
  private scene: Phaser.Scene
  private maxHp = ServerConfig.settings.playerMaxHealth
  private hp = this.maxHp
  private bg!: Phaser.GameObjects.Rectangle
  private fill!: Phaser.GameObjects.Rectangle
  private outline!: Phaser.GameObjects.Rectangle
  private width = 160
  private height = 12
  private score!: ScoreSystem
  private onResize = () => this.layout()

  constructor(scene: Phaser.Scene) { this.scene = scene }

  mount(score: ScoreSystem) {
    this.score = score
    const y = 12
    this.bg = this.scene.add.rectangle(0, y + this.height/2, this.width, this.height, 0x0d1117, 0.7).setScrollFactor(0).setDepth(2000)
    this.fill = this.scene.add.rectangle(0, y + this.height/2, this.width, this.height, 0x34c759, 1).setScrollFactor(0).setDepth(2001)
    this.outline = this.scene.add.rectangle(0, y + this.height/2, this.width, this.height).setStrokeStyle(2, 0xffffff, 0.2).setScrollFactor(0).setDepth(2002) as any
    this.layout()
    this.scene.scale.on('resize', this.onResize)
    this.score.onChange(() => this.layout())
    this.refresh()
  }

  unmount() {
    this.scene.scale.off('resize', this.onResize)
    this.bg?.destroy(); this.fill?.destroy(); this.outline?.destroy()
  }

  reset() { this.maxHp = ServerConfig.settings.playerMaxHealth; this.hp = this.maxHp; this.refresh() }

  damage(amount: number) {
    this.hp = Math.max(0, this.hp - Math.max(0, amount))
    this.refresh()
    return this.hp
  }

  private layout() {
    const xLeft = this.score.getRightX() + 16 // “right after the score”
    const yTop = 12
    const cx = xLeft + this.width / 2
    const cy = yTop + this.height / 2
    this.bg.setPosition(cx, cy)
    this.fill.setPosition(cx - (this.width - this.width * (this.hp / this.maxHp)) / 2, cy)
    this.outline.setPosition(cx, cy)
  }

  private refresh() {
    const pct = this.maxHp > 0 ? this.hp / this.maxHp : 0
    this.fill.width = Math.max(0, this.width * pct)
    this.layout()
  }
}
