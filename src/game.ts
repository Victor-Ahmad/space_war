import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { MainScene } from './scenes/MainScene'

export function createGame(parent: HTMLElement) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0b0e14',
    physics: { default: 'arcade', arcade: { gravity: {
        y: 0,
        x: 0
    }, debug: false } },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight
    },
    // 👇 allow DOM elements for username input
    dom: { createContainer: true },
    fps: { target: 60, forceSetTimeOut: true },
    scene: [BootScene, MainScene]
  })
  return game
}
