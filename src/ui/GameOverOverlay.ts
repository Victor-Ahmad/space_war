import Phaser from 'phaser'

export class GameOverOverlay {
  private scene: Phaser.Scene
  private bg!: Phaser.GameObjects.Rectangle
  private title!: Phaser.GameObjects.Text
  private btn!: Phaser.GameObjects.Text
  private onResize = () => this.layout()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  show(onPlayAgain: () => void) {
    const { width, height } = this.scene.scale

    this.bg = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.45)
      .setScrollFactor(0)
      .setDepth(3000)

    this.title = this.scene.add
      .text(width / 2, height / 2 - 20, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ffffff'
      })
      .setStroke('#ff3b30', 8)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001)

    this.btn = this.scene.add
      .text(width / 2, height / 2 + 50, 'PLAY AGAIN', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#0b0e14',
        backgroundColor: '#ffd60a',
        padding: { x: 18, y: 8 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onPlayAgain())

    // Re-center on resize
    this.scene.scale.on('resize', this.onResize)
  }

  private layout() {
    if (!this.bg) return
    const { width, height } = this.scene.scale
    this.bg.setPosition(width / 2, height / 2).setSize(width, height)
    this.title.setPosition(width / 2, height / 2 - 20)
    this.btn.setPosition(width / 2, height / 2 + 50)
  }

  hide() {
    this.scene.scale.off('resize', this.onResize)
    this.bg.destroy()
    this.title.destroy()
    this.btn.destroy()
  }
}
