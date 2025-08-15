import Phaser from 'phaser'
import { ServerConfig } from '../core/ServerConfig'

export class ServerReset {
  private scene: Phaser.Scene
  private label!: Phaser.GameObjects.Text
  private event!: Phaser.Time.TimerEvent
  private endsAt = 0
  private onReset: () => void

  constructor(scene: Phaser.Scene, onReset: () => void) {
    this.scene = scene
    this.onReset = onReset
  }

  mount() {
    this.endsAt = this.scene.time.now + ServerConfig.settings.serverResetIntervalMs

    // Center-top label (HUD anchored)  — position updates on resize
    this.label = this.scene.add.text(0, 0, '00:00', {
      fontFamily: 'monospace', fontSize: '18px', color: '#fff', stroke: '#000', strokeThickness: 2
    }).setScrollFactor(0).setDepth(2100)

    this.layout()
    this.scene.scale.on('resize', this.layout, this)

    // Update 4x per second
    this.event = this.scene.time.addEvent({
      delay: 250, loop: true,
      callback: () => this.tick()
    })
  }

  unmount() {
    this.event?.remove(false)
    this.scene.scale.off('resize', this.layout, this)
    this.label?.destroy()
  }

  private layout = () => {
    const { width } = this.scene.scale
    this.label.setPosition(width / 2, 12).setOrigin(0.5, 0)
  }

  private tick() {
    const remain = Math.max(0, this.endsAt - this.scene.time.now)
    const mm = Math.floor(remain / 60000)
    const ss = Math.floor((remain % 60000) / 1000)
    this.label.setText(`Reset: ${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`)
    if (remain <= 0) this.triggerReset()
  }

  private triggerReset() {
    // restart interval and notify
    this.endsAt = this.scene.time.now + ServerConfig.settings.serverResetIntervalMs
    this.onReset()
  }
}
