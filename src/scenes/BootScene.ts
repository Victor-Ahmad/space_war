import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  preload() {
    // You can preload assets here if needed.
  }

  create() {
    // Ensure the canvas always fits the screen
    this.scale.on('resize', () => {
      // Scenes that need to react to resize can listen for this event from MainScene
      this.game.events.emit('app-resized')
    })

    this.scene.start('Main')
  }
}
