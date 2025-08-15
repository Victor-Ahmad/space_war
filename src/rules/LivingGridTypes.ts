export type CellId = string // e.g. "B4"

export type RuleRicochet = {
  type: 'ricochet'
  ricochetMax: number           // 0..2
  projectileSpeedScale?: number // 0.9..1.1
}

export type RuleConveyor = {
  type: 'conveyor'
  vx: number // world units per second (small)
  vy: number
}

export type RuleFog = {
  type: 'fog'
  radius: number // pixels in screen-space around player
  alpha?: number // 0..1 darkness outside
}

export type CellRule = RuleRicochet | RuleConveyor | RuleFog

export type CellDefinition = {
  cell: CellId
  rule: CellRule
  // Optional timed micro-event for the entire row/col that includes this cell
  event?: {
    scope: { row?: string; col?: number } // e.g., {row:'E'} or {col:5}
    everyMs: number
    durationMs: number
    type: 'wind' // MVP: push bodies along X
    strength: number // pixels/sec impulse
  }
}
