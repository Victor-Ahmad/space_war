import Phaser from 'phaser'
import { ServerConfig } from '../core/ServerConfig'

// Expose row index -> AA/AB... label for reuse
export function indexToLetters(n: number) {
  let s = ''
  n = Math.floor(n)
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

// World ↔ cell helpers
export function worldToCell(x: number, y: number) {
  const s = ServerConfig.settings
  const col = Math.floor((x - s.arenaMargin) / s.cellWidth)
  const row = Math.floor((y - s.arenaMargin) / s.cellHeight)
  return {
    row: Phaser.Math.Clamp(row, 0, s.gridRows - 1),
    col: Phaser.Math.Clamp(col, 0, s.gridCols - 1)
  }
}

export function cellLabel(row: number, col: number) {
  return `${indexToLetters(row)}${col + 1}`
}

export function cellBounds(row: number, col: number) {
  const s = ServerConfig.settings
  const x = s.arenaMargin + col * s.cellWidth
  const y = s.arenaMargin + row * s.cellHeight
  return new Phaser.Geom.Rectangle(x, y, s.cellWidth, s.cellHeight)
}

/**
 * Draw grid + border and set physics inner bounds.
 */
export function createArena(scene: Phaser.Scene) {
  const s = ServerConfig.settings
  const innerW = s.gridCols * s.cellWidth
  const innerH = s.gridRows * s.cellHeight
  const x = s.arenaMargin
  const y = s.arenaMargin

  scene.physics.world.setBounds(x, y, innerW, innerH, true, true, true, true)

  const grid = scene.add.graphics().setDepth(-100)
  grid.lineStyle(1, 0xffffff, s.gridLineAlpha)

  for (let c = 1; c < s.gridCols; c++) {
    const gx = x + c * s.cellWidth
    grid.beginPath().moveTo(gx, y).lineTo(gx, y + innerH).strokePath()
  }
  for (let r = 1; r < s.gridRows; r++) {
    const gy = y + r * s.cellHeight
    grid.beginPath().moveTo(x, gy).lineTo(x + innerW, gy).strokePath()
  }

  if (s.gridShowLabels) {
    const labelDepth = -90
    for (let r = 0; r < s.gridRows; r++) {
      const rowLabel = indexToLetters(r)
      for (let c = 0; c < s.gridCols; c++) {
        const colLabel = (c + 1).toString()
        const label = `${rowLabel}${colLabel}`
        const cx = x + c * s.cellWidth + s.cellWidth / 2
        const cy = y + r * s.cellHeight + s.cellHeight / 2
        scene.add
          .text(cx, cy, label, {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#9aa0a6'
          })
          .setOrigin(0.5)
          .setAlpha(0.35)
          .setDepth(labelDepth)
      }
    }
  }

  const g = scene.add.graphics().setDepth(1000)
  g.lineStyle(s.arenaBorderGlow, 0xff3b30, 0.25).strokeRect(x, y, innerW, innerH)
  g.lineStyle(s.arenaBorderWidth, 0xff453a, 1).strokeRect(x, y, innerW, innerH)
}

export function getWorldSize() {
  const s = ServerConfig.settings
  const innerW = s.gridCols * s.cellWidth
  const innerH = s.gridRows * s.cellHeight
  return { worldW: innerW + s.arenaMargin * 2, worldH: innerH + s.arenaMargin * 2 }
}
