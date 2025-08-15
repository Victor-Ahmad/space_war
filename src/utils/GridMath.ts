import { ServerConfig } from '../core/ServerConfig'

export function worldToCell(x: number, y: number) {
  const s = ServerConfig.settings
  const col = Math.floor((x - s.arenaMargin) / s.cellWidth)
  const row = Math.floor((y - s.arenaMargin) / s.cellHeight)
  return { row, col }
}

export function indexToLetters(n: number) {
  let s = ''; n = Math.floor(n)
  while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1 }
  return s
}

export function cellIdFromRowCol(row: number, col: number) {
  return `${indexToLetters(row)}${col + 1}`
}

export function isInsideWorld(x: number, y: number) {
  const b = { x: ServerConfig.settings.arenaMargin, y: ServerConfig.settings.arenaMargin,
              w: ServerConfig.settings.gridCols * ServerConfig.settings.cellWidth,
              h: ServerConfig.settings.gridRows * ServerConfig.settings.cellHeight }
  return x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h
}
