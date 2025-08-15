import { GameSettingsSingleton, type GameSettings } from '../config/GameSettings'

function totalRequestedSpecials(s: GameSettings): number {
  return (
    (s.scIncludeOvercharge ? s.scCountOvercharge : 0) +
    (s.scIncludeThreat ? s.scCountThreat : 0) +
    (s.scIncludeJetstream ? s.scCountJetstream : 0) +
    (s.scIncludeLowViz ? s.scCountLowViz : 0) +
    (s.scIncludeEcho ? s.scCountEcho : 0) +
    (s.scIncludeStickyTar ? s.scCountStickyTar : 0) +
    (s.scIncludePinball ? s.scCountPinball : 0) +
    (s.scIncludeSonar ? s.scCountSonar : 0)
  )
}

function computeMinGridCellsToFitSpecials(s: GameSettings): number {
  const requested = totalRequestedSpecials(s)
  const minCellsByFraction = Math.ceil(requested / Math.max(0.0001, s.scMaxFraction))
  return Math.max(1, minCellsByFraction)
}

function autoSizeGrid(s: GameSettings): { gridCols: number; gridRows: number } {
  const minCells = computeMinGridCellsToFitSpecials(s)
  let cols = Math.ceil(Math.sqrt(minCells))
  let rows = Math.ceil(minCells / cols)
  cols = Math.max(cols, 3)
  rows = Math.max(rows, 3)
  return { gridCols: cols, gridRows: rows }
}

const _settings: GameSettings = (() => {
  const s = { ...GameSettingsSingleton }
  if (s.scAutoGridBySpecials) {
    const { gridCols, gridRows } = autoSizeGrid(s)
    s.gridCols = gridCols
    s.gridRows = gridRows
  }
  return s
})()

export const ServerConfig = { settings: _settings }
