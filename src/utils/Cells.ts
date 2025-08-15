import { ServerConfig } from '../core/ServerConfig'

export type CellCoord = { row: number; col: number }
export type CellLabel = string // e.g., "A1"

export function worldToCell(x: number, y: number): CellCoord | null {
  const s = ServerConfig.settings
  const left = s.arenaMargin
  const top = s.arenaMargin
  const innerW = s.gridCols * s.cellWidth
  const innerH = s.gridRows * s.cellHeight
  if (x < left || y < top || x >= left + innerW || y >= top + innerH) return null
  const col = Math.floor((x - left) / s.cellWidth)
  const row = Math.floor((y - top) / s.cellHeight)
  return { row, col }
}

export function cellToCenter(row: number, col: number): { x: number; y: number } {
  const s = ServerConfig.settings
  const x = s.arenaMargin + col * s.cellWidth + s.cellWidth / 2
  const y = s.arenaMargin + row * s.cellHeight + s.cellHeight / 2
  return { x, y }
}

export function labelForCell(row: number, col: number): CellLabel {
  let r = row
  let s = ''
  while (r >= 0) { s = String.fromCharCode((r % 26) + 65) + s; r = Math.floor(r / 26) - 1 }
  return s + (col + 1)
}
