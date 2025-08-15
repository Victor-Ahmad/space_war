import Phaser from 'phaser'

type Listener = () => void

export class ScoreSystem {
  private scene: Phaser.Scene
  private score = 0
  private text!: Phaser.GameObjects.Text
  private listeners: Listener[] = []

  constructor(scene: Phaser.Scene) { this.scene = scene }

  mount() {
    this.text = this.scene.add.text(16, 12, 'Score: 0', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
    }).setScrollFactor(0).setDepth(2000)
  }

  unmount() { this.text?.destroy() }

  onChange(cb: Listener) { this.listeners.push(cb) }

  reset() { this.score = 0; this.refresh() }
  add(points: number) { this.score += points; this.refresh() }
  getScore() { return this.score }

  /** X coordinate immediately to the right of the score text */
  getRightX() { return (this.text?.x ?? 0) + (this.text?.width ?? 0) }

  private refresh() {
    if (this.text) this.text.setText(`Score: ${this.score}`)
    this.listeners.forEach(fn => fn())
  }
}
