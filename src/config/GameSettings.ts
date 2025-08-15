export type MovementMode = "glide" | "snap";

export type GameSettings = {
  // Grid-driven arena (inner playable area)
  cellWidth: number;
  cellHeight: number;
  gridCols: number;
  gridRows: number;
  gridLineAlpha: number;
  gridShowLabels: boolean;

  // Border spacing
  arenaMargin: number;
  arenaBorderGlow: number;
  arenaBorderWidth: number;

  // Player
  playerSize: number;
  playerMaxHealth: number;
  playerHitIntervalMs: number;

  // Keyboard movement (Glide)
  kbMaxSpeed: number;
  kbAcceleration: number;
  kbDrag: number;

  // Keyboard movement (Snap)
  movementDefaultMode: MovementMode;
  kbSnapSpeed: number;

  // Collision
  playerBounce: number;

  // Weapons — primary
  primaryFireRate: number;
  primaryBulletSpeed: number;
  primaryRange: number;
  primaryDamage: number;

  // Weapons — secondary
  secondaryCooldown: number;
  secondaryProjectileSpeed: number;
  secondaryRange: number;
  secondaryExplosionRadius: number;
  secondaryDamage: number;

  // Enemies — global
  enemyCount: number;
  enemyDrag: number;
  enemyDetectRadius: number;
  enemyPatrolWaypointRadius: number;

  // Enemies — types
  enemyNormalHealth: number;
  enemyNormalSpeed: number;
  enemyNormalAccel: number;
  enemyNormalScore: number;
  enemyNormalDamage: number;
  enemySpeedHealth: number;
  enemySpeedSpeed: number;
  enemySpeedAccel: number;
  enemySpeedScore: number;
  enemySpeedDamage: number;
  enemyStrongHealth: number;
  enemyStrongSpeed: number;
  enemyStrongAccel: number;
  enemyStrongScore: number;
  enemyStrongDamage: number;

  // Living Grid
  lgAllowVignette: boolean;

  // Rule ranges / caps (kept for compat; unused now)
  lgRicochetMaxMin: number;
  lgRicochetMaxMax: number;
  lgProjSpeedScaleMin: number;
  lgProjSpeedScaleMax: number;
  lgConveyorSpeedMin: number;
  lgConveyorSpeedMax: number;

  // === SPECIAL CELLS ===
  scMaxFraction: number;
  scAutoGridBySpecials: boolean;

  // (Disabled) — kept for compat
  scIncludeOvercharge: boolean;
  scCountOvercharge: number;
  scIncludeThreat: boolean;
  scCountThreat: number;
  scIncludeJetstream: boolean;
  scCountJetstream: number;
  scIncludeLowViz: boolean;
  scCountLowViz: number;
  scIncludeStickyTar: boolean;
  scCountStickyTar: number;
  scIncludeSpring: boolean;
  scCountSpring: number;

  // Active specials
  scIncludeEcho: boolean;
  scCountEcho: number;
  scIncludePinball: boolean;
  scCountPinball: number;
  scIncludeSonar: boolean;
  scCountSonar: number;

  // Echo
  scEchoDelayMs: number;
  scEchoSpeedScale: number;

  // Sonar
  scSonarPeriodMs: number;
  scSonarBlipMs: number;
  scSonarRingDurationMs: number;
  scSonarDotSize: number;

  // Pin blocks
  scPinballRadius: number;
  scPinBlockSize: number;

  // Server reset
  serverResetIntervalMs: number;

  // UI
  uiKillTextDurationMs: number;
  uiKillTextRisePx: number;

  // Scoring
  scorePerDamage: number;
};

const defaults: GameSettings = {
  // Grid — 600x600 cells
  cellWidth: 600,
  cellHeight: 600,
  gridCols: 6,
  gridRows: 6,
  gridLineAlpha: 0.07,
  gridShowLabels: true,

  // Border
  arenaMargin: 56,
  arenaBorderGlow: 16,
  arenaBorderWidth: 3,

  // Player
  playerSize: 28,
  playerMaxHealth: 100,
  playerHitIntervalMs: 400,

  // Keyboard movement (Glide)
  kbMaxSpeed: 320,
  kbAcceleration: 900,
  kbDrag: 420,

  // Keyboard movement (Snap)
  movementDefaultMode: "glide",
  kbSnapSpeed: 360,

  playerBounce: 0,

  // Weapons
  primaryFireRate: 10,
  primaryBulletSpeed: 900,
  primaryRange: 900,
  primaryDamage: 10,

  secondaryCooldown: 1.8,
  secondaryProjectileSpeed: 560,
  secondaryRange: 820,
  secondaryExplosionRadius: 90,
  secondaryDamage: 80,

  // Enemies
  enemyCount: 12,
  enemyDrag: 350,
  enemyDetectRadius: 420,
  enemyPatrolWaypointRadius: 80,

  enemyNormalHealth: 60,
  enemyNormalSpeed: 220,
  enemyNormalAccel: 750,
  enemyNormalScore: 10,
  enemyNormalDamage: 12,

  enemySpeedHealth: 40,
  enemySpeedSpeed: 320,
  enemySpeedAccel: 1100,
  enemySpeedScore: 15,
  enemySpeedDamage: 10,

  enemyStrongHealth: 120,
  enemyStrongSpeed: 160,
  enemyStrongAccel: 700,
  enemyStrongScore: 30,
  enemyStrongDamage: 22,

  // Living Grid
  lgAllowVignette: true,

  // Rule caps (unused now)
  lgRicochetMaxMin: 0,
  lgRicochetMaxMax: 1,
  lgProjSpeedScaleMin: 0.95,
  lgProjSpeedScaleMax: 1.1,
  lgConveyorSpeedMin: 60,
  lgConveyorSpeedMax: 160,

  // Specials budget
  scMaxFraction: 1 / 3,
  scAutoGridBySpecials: true,

  // Disabled specials
  scIncludeOvercharge: false,
  scCountOvercharge: 0,
  scIncludeThreat: false,
  scCountThreat: 0,
  scIncludeJetstream: false,
  scCountJetstream: 0,
  scIncludeLowViz: false,
  scCountLowViz: 0,
  scIncludeStickyTar: false,
  scCountStickyTar: 0,
  scIncludeSpring: false,
  scCountSpring: 0,

  // Active specials — Echo, Pin, Sonar (two each by default)
  scIncludeEcho: true,
  scCountEcho: 2,
  scIncludePinball: true,
  scCountPinball: 2,
  scIncludeSonar: true,
  scCountSonar: 2,

  // Echo
  scEchoDelayMs: 120,
  scEchoSpeedScale: 0.6,

  // Sonar
  scSonarPeriodMs: 7000,
  scSonarBlipMs: 400,
  scSonarRingDurationMs: 700,
  scSonarDotSize: 6,

  // Pin blocks
  scPinballRadius: 28,
  scPinBlockSize: 28,

  // Server reset 5 minutes
  serverResetIntervalMs: 5 * 60 * 1000,

  // UI
  uiKillTextDurationMs: 1400,
  uiKillTextRisePx: 24,

  // Scoring
  scorePerDamage: 0.25,
};

/** URL overrides incl. booleans / strings */
function withQueryOverrides(base: GameSettings): GameSettings {
  const url = new URL(window.location.href);
  const next: Partial<GameSettings> = {};
  (Object.keys(base) as (keyof GameSettings)[]).forEach((k) => {
    const raw = url.searchParams.get(k as string);
    if (raw === null) return;
    if (raw === "true") (next as any)[k] = true;
    else if (raw === "false") (next as any)[k] = false;
    else
      (next as any)[k] = Number.isNaN(Number(raw)) ? (raw as any) : Number(raw);
  });
  return { ...base, ...next };
}

export const GameSettingsSingleton: GameSettings = withQueryOverrides(defaults);
