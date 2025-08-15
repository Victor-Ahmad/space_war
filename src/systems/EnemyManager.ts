import Phaser from "phaser";
import { ServerConfig } from "../core/ServerConfig";
import { Enemy } from "../objects/Enemy";
import type { EnemyType } from "../objects/Enemy";
import type { Player } from "../objects/Player";
import type { LivingGrid } from "./LivingGrid";

export class EnemyManager {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;
  private player: Player | null;
  private playerCollider?: Phaser.Physics.Arcade.Collider;
  private onPlayerHit?: (amount: number, enemy: Enemy) => void;
  private lastHitAt = 0;
  private livingGrid: LivingGrid;

  constructor(
    scene: Phaser.Scene,
    player: Player | null,
    livingGrid: LivingGrid
  ) {
    this.scene = scene;
    this.player = player;
    this.livingGrid = livingGrid;
    this.group = scene.physics.add.group({
      classType: Enemy as any,
      runChildUpdate: false,
    });
    this.repopulate();
  }

  repopulate() {
    // Clear existing
    this.group.clear(true, true);
    const s = ServerConfig.settings;
    const bounds = this.scene.physics.world.bounds;
    const pickType = (): EnemyType => {
      const r = Math.random();
      return r < 0.6 ? "normal" : r < 0.85 ? "speed" : "strong";
    };
    for (let i = 0; i < s.enemyCount; i++) {
      const x = Phaser.Math.Between(bounds.x + 80, bounds.right - 80);
      const y = Phaser.Math.Between(bounds.y + 80, bounds.bottom - 80);
      const e = new Enemy(this.scene, x, y, pickType());
      this.group.add(e, true);
    }
    this.rebuildPlayerCollider();
  }

  setPlayer(p: Player | null) {
    this.player = p;
    this.rebuildPlayerCollider();
  }
  setupPlayerCollision(onPlayerHit: (amount: number, enemy: Enemy) => void) {
    this.onPlayerHit = onPlayerHit;
    this.rebuildPlayerCollider();
  }

  private damageForType(t: EnemyType) {
    const s = ServerConfig.settings;
    return t === "normal"
      ? s.enemyNormalDamage
      : t === "speed"
      ? s.enemySpeedDamage
      : s.enemyStrongDamage;
  }

  private rebuildPlayerCollider() {
    this.playerCollider?.destroy();
    this.playerCollider = undefined;
    if (!this.player || !this.onPlayerHit) return;
    this.playerCollider = this.scene.physics.add.overlap(
      this.player,
      this.group,
      (_player, eObj) => {
        const enemy = eObj as Enemy;
        const now = this.scene.time.now;
        const cd = ServerConfig.settings.playerHitIntervalMs;
        if (now - this.lastHitAt < cd) return;
        this.lastHitAt = now;
        let dmg = this.damageForType(enemy.type);

        const mods = this.livingGrid.getCombatModsAt(
          this.player!.x,
          this.player!.y
        );
        dmg = Math.round(dmg * mods.inDamageScale);

        this.onPlayerHit!(dmg, enemy);
      }
    );
  }

  getGroup() {
    return this.group;
  }

  update(dt: number) {
    this.group.children.iterate((child: Phaser.GameObjects.GameObject) => {
      const e = child as any;
      if (!e.active) return true;
      e.updateAI?.(this.player, dt);
      return true;
    });
  }

  applyHit(
    enemy: Enemy,
    damage: number,
    dealerName: string,
    dealerColor?: number
  ) {
    if (!enemy.active) return;
    const before = enemy.health;
    const amt = Math.max(0, Math.min(before, damage)); // clamp to remaining HP
    if (amt <= 0) return;

    enemy.takeDamage(amt, dealerName, dealerColor);

    // NEW: partial-credit score event
    this.scene.events.emit("enemy:damaged", {
      x: enemy.x,
      y: enemy.y,
      amount: amt,
      dealerName,
    });
  }

  applyExplosion(
    x: number,
    y: number,
    radius: number,
    damage: number,
    dealerName: string,
    dealerColor?: number
  ) {
    const r2 = radius * radius;
    this.group.getChildren().forEach((go) => {
      const e = go as Enemy;
      if (!e.active) return;
      const dx = e.x - x,
        dy = e.y - y;
      if (dx * dx + dy * dy > r2) return;

      const before = e.health;
      const amt = Math.max(0, Math.min(before, damage));
      if (amt <= 0) return;

      e.takeDamage(amt, dealerName, dealerColor);

      // NEW: partial-credit score event per target hit
      this.scene.events.emit("enemy:damaged", {
        x: e.x,
        y: e.y,
        amount: amt,
        dealerName,
      });
    });
  }
}
