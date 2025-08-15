import Phaser from "phaser";
import { ServerConfig } from "../core/ServerConfig";
import { worldToCell, labelForCell, cellToCenter } from "../utils/Cells";

export type SpecialCellType = "echo" | "pinball" | "sonar";

type BaseCell = {
  row: number;
  col: number;
  label: string;
  type: SpecialCellType;
};
type EchoCell = BaseCell & { type: "echo" };
type PinballCell = BaseCell & {
  type: "pinball";
  points: { x: number; y: number }[];
};
type SonarCell = BaseCell & { type: "sonar"; nextPingAt: number };

type AnyCell = EchoCell | PinballCell | SonarCell;

export class LivingGrid {
  private scene: Phaser.Scene;
  private cells: AnyCell[] = [];
  private badgeTexts: Phaser.GameObjects.Text[] = [];
  private bouncers?: Phaser.Physics.Arcade.StaticGroup;
  private pinVisuals: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Call once at startup, and again on server reset */
  reshuffle() {
    // Clear old visuals/colliders
    this.clearBadges();
    this.pinVisuals.forEach((v) => v.destroy());
    this.pinVisuals = [];
    if (this.bouncers) {
      this.bouncers.clear(true, true);
      this.bouncers = undefined;
    }

    const s = ServerConfig.settings;
    const totalCells = s.gridCols * s.gridRows;
    const maxSpecial = Math.max(0, Math.floor(totalCells * s.scMaxFraction));

    const tuples: [SpecialCellType, number, boolean][] = [
      ["echo", s.scCountEcho, s.scIncludeEcho],
      ["pinball", s.scCountPinball, s.scIncludePinball],
      ["sonar", s.scCountSonar, s.scIncludeSonar],
    ];

    const desired: SpecialCellType[] = [];
    for (const [t, count, include] of tuples) {
      if (!include || count <= 0) continue;
      for (let i = 0; i < count; i++) desired.push(t);
    }

    const finalCount = Math.min(desired.length, maxSpecial);
    const bag = Phaser.Utils.Array.Shuffle(desired).slice(0, finalCount);

    const taken = new Set<string>();
    const picks: AnyCell[] = [];
    for (const t of bag) {
      for (let tries = 0; tries < 999; tries++) {
        const row = Phaser.Math.Between(0, s.gridRows - 1);
        const col = Phaser.Math.Between(0, s.gridCols - 1);
        const key = `${row}:${col}`;
        if (taken.has(key)) continue;
        taken.add(key);
        const label = labelForCell(row, col);
        picks.push(this.makeCell(t, row, col, label));
        break;
      }
    }
    this.cells = picks;

    // Pin blocks (L + I shapes only), tracked to destroy on reshuffle
    const pinCells = this.cells.filter(
      (c) => c.type === "pinball"
    ) as PinballCell[];
    if (pinCells.length) {
      this.bouncers = this.scene.physics.add.staticGroup();
      for (const pc of pinCells) {
        for (const anchor of pc.points)
          this.spawnTetrominoLI(
            anchor.x,
            anchor.y,
            this.bouncers!,
            this.pinVisuals
          );
      }
    }

    this.drawBadges();
  }

  private spawnTetrominoLI(
    cx: number,
    cy: number,
    group: Phaser.Physics.Arcade.StaticGroup,
    visuals: Phaser.GameObjects.GameObject[]
  ) {
    const s = ServerConfig.settings;
    const B = s.scPinBlockSize;
    const color = 0xffffff;
    const shapes = [
      // L
      [
        { x: 0, y: 0 },
        { x: B, y: 0 },
        { x: 0, y: -B },
        { x: 0, y: B },
      ],
      [
        { x: 0, y: 0 },
        { x: -B, y: 0 },
        { x: 0, y: -B },
        { x: 0, y: B },
      ],
      // I
      [
        { x: -B * 1.5, y: 0 },
        { x: -B * 0.5, y: 0 },
        { x: B * 0.5, y: 0 },
        { x: B * 1.5, y: 0 },
      ],
      [
        { x: 0, y: -B * 1.5 },
        { x: 0, y: -B * 0.5 },
        { x: 0, y: B * 0.5 },
        { x: 0, y: B * 1.5 },
      ],
    ];
    const layout = Phaser.Utils.Array.GetRandom(shapes);

    const texKey = "__pinBlock__";
    if (!this.scene.textures.exists(texKey)) {
      const g = this.scene.add.graphics().setVisible(false);
      g.fillStyle(0xffffff, 1).fillRect(0, 0, B, B);
      g.generateTexture(texKey, B, B);
      g.destroy();
    }

    for (const p of layout) {
      const x = cx + p.x;
      const y = cy + p.y;
      const img = this.scene.physics.add
        .staticImage(x, y, texKey)
        .setVisible(false);
      const body = img.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(B, B);
      img.refreshBody();
      group.add(img);

      const vis = this.scene.add
        .rectangle(x, y, B, B, color, 0.18)
        .setDepth(-70);
      visuals.push(vis);
    }
  }

  private makeCell(
    t: SpecialCellType,
    row: number,
    col: number,
    label: string
  ): AnyCell {
    const s = ServerConfig.settings;
    const center = cellToCenter(row, col);
    switch (t) {
      case "pinball": {
        const pad = Math.min(s.cellWidth, s.cellHeight) * 0.22;
        return {
          type: "pinball",
          row,
          col,
          label,
          points: [
            { x: center.x - pad, y: center.y - pad },
            { x: center.x + pad, y: center.y - pad * 0.2 },
            { x: center.x, y: center.y + pad },
          ],
        };
      }
      case "echo":
        return { type: "echo", row, col, label };
      case "sonar":
        return {
          type: "sonar",
          row,
          col,
          label,
          nextPingAt: this.scene.time.now + s.scSonarPeriodMs,
        };
    }
  }

  private clearBadges() {
    this.badgeTexts.forEach((t) => t.destroy());
    this.badgeTexts = [];
  }

  private tagForCell(c: AnyCell): string {
    switch (c.type) {
      case "echo":
        return "ECHO";
      case "pinball":
        return "PIN";
      case "sonar":
        return "SONAR";
    }
  }
  private descForCell(c: AnyCell): string {
    switch (c.type) {
      case "echo":
        return "Echo shot";
      case "pinball":
        return "Blocks";
      case "sonar":
        return "Ping blips";
    }
  }

  private drawBadges() {
    const s = ServerConfig.settings;
    for (const c of this.cells) {
      const { x, y } = cellToCenter(c.row, c.col);
      const tag = this.scene.add
        .text(x, y - s.cellHeight / 2 + 10, this.tagForCell(c), {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#ffd60a",
        })
        .setOrigin(0.5, 0)
        .setAlpha(0.9)
        .setDepth(-80);
      const desc = this.scene.add
        .text(x, y - s.cellHeight / 2 + 24, this.descForCell(c), {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#ffffff",
        })
        .setOrigin(0.5, 0)
        .setAlpha(0.8)
        .setDepth(-80);
      this.badgeTexts.push(tag, desc);
    }
  }

  // === Queries / effects (pin collisions are handled in MainScene) ===

  /** Projectile modifiers at (x,y) — Echo only */
  getProjectileModsAt(
    x: number,
    y: number
  ): {
    projSpeedScale?: number;
    echo?: { delayMs: number; speedScale: number };
  } {
    const c = worldToCell(x, y);
    if (!c) return {};
    const s = ServerConfig.settings;
    let echo: { delayMs: number; speedScale: number } | undefined;
    for (const cell of this.cells) {
      if (cell.row !== c.row || cell.col !== c.col) continue;
      if (cell.type === "echo")
        echo = { delayMs: s.scEchoDelayMs, speedScale: s.scEchoSpeedScale };
    }
    return { echo };
  }

  /** Combat mods — none now; keep signature for compatibility */
  getCombatModsAt(
    _x: number,
    _y: number
  ): { outDamageScale: number; inDamageScale: number } {
    return { outDamageScale: 1, inDamageScale: 1 };
  }

  /** No continuous forces now; kept for compatibility */
  applyForces(_dt: number, _movers: Phaser.GameObjects.GameObject[]) {
    /* no-op */
  }

  /** Sonar pings */
  tick(now: number, enemiesGroup?: Phaser.Physics.Arcade.Group) {
    const s = ServerConfig.settings;
    const innerW = s.cellWidth,
      innerH = s.cellHeight;
    for (const cell of this.cells) {
      if (cell.type !== "sonar") continue;
      if (now < cell.nextPingAt) continue;
      cell.nextPingAt = now + s.scSonarPeriodMs;

      const { x, y } = cellToCenter(cell.row, cell.col);
      const g = this.scene.add.graphics({ x, y }).setDepth(-60);
      g.lineStyle(2, 0x00eaff, 0.9);
      g.strokeCircle(0, 0, 10);
      this.scene.tweens.add({
        targets: g,
        scaleX: Math.max(innerW, innerH) / 20,
        scaleY: Math.max(innerW, innerH) / 20,
        alpha: 0,
        duration: s.scSonarRingDurationMs,
        onComplete: () => g.destroy(),
      });

      if (enemiesGroup) {
        enemiesGroup.getChildren().forEach((go: any) => {
          const ex = go.x,
            ey = go.y;
          const cc = worldToCell(ex, ey);
          if (!cc || cc.row !== cell.row || cc.col !== cell.col) return;
          const dot = this.scene.add
            .circle(ex, ey, s.scSonarDotSize, 0x00eaff, 1)
            .setDepth(200);
          this.scene.tweens.add({
            targets: dot,
            alpha: 0,
            duration: s.scSonarBlipMs,
            onComplete: () => dot.destroy(),
          });
        });
      }
    }
  }

  /** Still provided for callers; now a no-op vignette. */
  updateVignetteForPlayer(_px: number, _py: number) {
    /* no-op */
  }

  getBouncerGroup(): Phaser.Physics.Arcade.StaticGroup | undefined {
    return this.bouncers;
  }
  isCellTypeAt(x: number, y: number, type: SpecialCellType): boolean {
    const c = worldToCell(x, y);
    if (!c) return false;
    return this.cells.some(
      (cell) => cell.type === type && cell.row === c.row && cell.col === c.col
    );
  }
}
