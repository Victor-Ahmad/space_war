import { ServerConfig } from "../core/ServerConfig";
import { worldToCell, labelForCell, indexToLetters } from "./Cells";

// Re-export canonical helpers to avoid drift.
export { worldToCell, indexToLetters };

export function cellIdFromRowCol(row: number, col: number) {
  return labelForCell(row, col);
}

export function isInsideWorld(x: number, y: number) {
  const s = ServerConfig.settings;
  const left = s.arenaMargin;
  const top = s.arenaMargin;
  const innerW = s.gridCols * s.cellWidth;
  const innerH = s.gridRows * s.cellHeight;
  return x >= left && y >= top && x < left + innerW && y < top + innerH;
}
