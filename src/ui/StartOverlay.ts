import Phaser from 'phaser'

export class StartOverlay {
  private scene: Phaser.Scene
  private bg!: Phaser.GameObjects.Rectangle
  private title!: Phaser.GameObjects.Text
  private inputDom!: Phaser.GameObjects.DOMElement
  private playBtn!: Phaser.GameObjects.Text
  private onResize = () => this.layout()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  show(onPlay: (username: string) => void) {
    const { width, height } = this.scene.scale

    this.bg = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.45)
      .setScrollFactor(0)
      .setDepth(3000)

    this.title = this.scene.add
      .text(width / 2, height / 2 - 80, 'ENTER USERNAME', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001)

    // DOM input
    const wrapper = document.createElement('div')
    wrapper.innerHTML = `
      <input id="usernameInput" type="text" maxlength="16" placeholder="Your name"
        style="padding:10px 14px;border-radius:10px;border:none;outline:none;width:260px;font-size:16px;" />
    `
    this.inputDom = this.scene.add
      .dom(width / 2, height / 2, wrapper)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001)

    this.playBtn = this.scene.add
      .text(width / 2, height / 2 + 60, 'PLAY', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#0b0e14',
        backgroundColor: '#34c759',
        padding: { x: 18, y: 8 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001)
      .setInteractive({ useHandCursor: true })

    const submit = () => {
      const el = this.inputDom.getChildByID('usernameInput') as HTMLInputElement
      const name = (el?.value || '').trim()
      if (name.length > 0) {
        this.hide()
        onPlay(name)
      }
    }

    this.playBtn.on('pointerdown', submit)
    this.inputDom.node.addEventListener('keydown', (e: any) => {
      if (e.key === 'Enter') submit()
    })

    // Re-center on resize
    this.scene.scale.on('resize', this.onResize)
  }

  private layout() {
    if (!this.bg) return
    const { width, height } = this.scene.scale
    this.bg.setPosition(width / 2, height / 2).setSize(width, height)
    this.title.setPosition(width / 2, height / 2 - 80)
    this.inputDom.setPosition(width / 2, height / 2)
    this.playBtn.setPosition(width / 2, height / 2 + 60)
  }

  hide() {
    this.scene.scale.off('resize', this.onResize)
    this.bg.destroy()
    this.title.destroy()
    this.inputDom.destroy()
    this.playBtn.destroy()
  }
}
