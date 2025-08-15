import Phaser from "phaser";
import { ServerConfig } from "../core/ServerConfig";
import { cellToCenter, labelForCell } from "./Cells";

/**
 * Draws the arena (grid + red border + labels).
 * Labels are drawn in the center of every cell.
 */
export function createArena(scene: Phaser.Scene) {
  const s = ServerConfig.settings;
  const innerW = s.gridCols * s.cellWidth;
  const innerH = s.gridRows * s.cellHeight;
  const x = s.arenaMargin;
  const y = s.arenaMargin;

  const g = scene.add.graphics().setDepth(1000);

  // Grid lines
  if (s.gridLineAlpha > 0) {
    g.lineStyle(1, 0xffffff, s.gridLineAlpha);

    // verticals
    for (let c = 0; c <= s.gridCols; c++) {
      const vx = x + c * s.cellWidth;
      g.beginPath();
      g.moveTo(vx, y);
      g.lineTo(vx, y + innerH);
      g.strokePath();
    }
    // horizontals
    for (let r = 0; r <= s.gridRows; r++) {
      const hy = y + r * s.cellHeight;
      g.beginPath();
      g.moveTo(x, hy);
      g.lineTo(x + innerW, hy);
      g.strokePath();
    }
  }

  // Labels inside each cell
  if (s.gridShowLabels) {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#9aa0a6",
      align: "center",
    };

    for (let r = 0; r < s.gridRows; r++) {
      for (let c = 0; c < s.gridCols; c++) {
        const { x: cx, y: cy } = cellToCenter(r, c);
        const label = labelForCell(r, c);
        scene.add
          .text(cx, cy, label, style)
          .setOrigin(0.5, 0.5) // ensure center alignment
          .setDepth(1001);
      }
    }
  }

  // Red border (inner playfield)
  g.lineStyle(s.arenaBorderGlow, 0xff3b30, 0.25).strokeRect(
    x,
    y,
    innerW,
    innerH
  );
  g.lineStyle(s.arenaBorderWidth, 0xff453a, 1).strokeRect(x, y, innerW, innerH);
}

export function getWorldSize() {
  const s = ServerConfig.settings;
  const innerW = s.gridCols * s.cellWidth;
  const innerH = s.gridRows * s.cellHeight;
  return {
    worldW: innerW + s.arenaMargin * 2,
    worldH: innerH + s.arenaMargin * 2,
  };
}
