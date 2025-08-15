// src/scenes/MainScene.ts
import Phaser from "phaser";
import { createArena, getWorldSize } from "../utils/Arena";
import { Player } from "../objects/Player";
import { ServerConfig } from "../core/ServerConfig";
import { WeaponsSystem } from "../systems/Weapons";
import { EnemyManager } from "../systems/EnemyManager";
import { Enemy } from "../objects/Enemy";
import { StartOverlay } from "../ui/StartOverlay";
import { GameOverOverlay } from "../ui/GameOverOverlay";
import { ScoreSystem } from "../systems/ScoreSystem";
import { Leaderboard } from "../systems/Leaderboard";
import { HealthSystem } from "../systems/HealthSystem";
import { LivingGrid } from "../systems/LivingGrid";
import { ServerReset } from "../systems/ServerReset";
import type { MovementMode } from "../config/GameSettings";

export class MainScene extends Phaser.Scene {
  private player: Player | null = null;
  private weapons: WeaponsSystem | null = null;
  private enemies!: EnemyManager;
  private startUI!: StartOverlay;
  private gameOverUI!: GameOverOverlay;
  private score!: ScoreSystem;
  private leaderboard!: Leaderboard;
  private health!: HealthSystem;
  private livingGrid!: LivingGrid;
  private resetClock!: ServerReset;
  private username: string | null = null;

  // Movement toggle UI
  private moveBox!: Phaser.GameObjects.Rectangle;
  private moveCheck!: Phaser.GameObjects.Rectangle;
  private moveLabel!: Phaser.GameObjects.Text;
  private currentMovementMode: MovementMode =
    ServerConfig.settings.movementDefaultMode;

  constructor() {
    super("Main");
  }

  create() {
    const { worldW, worldH } = getWorldSize();
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    createArena(this);

    // Specials grid
    this.livingGrid = new LivingGrid(this);
    this.livingGrid.reshuffle();

    // World systems
    this.enemies = new EnemyManager(this, null, this.livingGrid);
    this.score = new ScoreSystem(this);
    this.score.mount();
    this.health = new HealthSystem(this);
    this.health.mount(this.score);
    this.leaderboard = new Leaderboard(this);
    this.leaderboard.mount();

    // Server reset countdown
    this.resetClock = new ServerReset(this, () => this.performServerReset());
    this.resetClock.mount();

    // Start UI (world continues running without the player)
    this.startUI = new StartOverlay(this);
    this.startUI.show((name) => this.startGame(name));

    // Kills → score + single 'KILL' text (duration via constants)
    this.events.on(
      "enemy:killed",
      (d: {
        type: string;
        x: number;
        y: number;
        killerName: string;
        killerColor: number;
        score: number;
      }) => {
        if (this.player && this.username && d.killerName === this.username) {
          this.score.add(d.score);
          this.leaderboard.upsert(this.username, this.score.getScore());
        }
        const s = ServerConfig.settings;
        const t = this.add
          .text(d.x, d.y, "KILL", {
            fontFamily: "monospace",
            fontSize: "18px",
            color: "#ffffff",
            stroke: "#000",
            strokeThickness: 3,
          })
          .setDepth(1500);
        t.setTint(d.killerColor);
        this.tweens.add({
          targets: t,
          y: d.y - s.uiKillTextRisePx,
          alpha: 0.0,
          duration: s.uiKillTextDurationMs,
          ease: "Quad.easeOut",
          onComplete: () => t.destroy(),
        });
      }
    );

    // Partial credit for damage (only for the local player here)
    this.events.on(
      "enemy:damaged",
      (d: { x: number; y: number; amount: number; dealerName: string }) => {
        if (!this.player || !this.username) return;
        if (d.dealerName !== this.username) return;
        const pts = Math.round(d.amount * ServerConfig.settings.scorePerDamage);
        if (pts > 0) {
          this.score.add(pts);
          this.leaderboard.upsert(this.username, this.score.getScore());
        }
      }
    );

    this.input.mouse?.disableContextMenu();

    // Movement mode toggle (bottom-left, HUD)
    this.createMovementToggleUI();

    // Reflow HUD on resize
    this.scale.on(
      Phaser.Scale.Events.RESIZE,
      () => this.layoutMovementToggle(),
      this
    );
  }

  // ----------------- Movement Toggle UI -----------------
  private createMovementToggleUI() {
    const boxSize = 16;

    // Checkbox box
    this.moveBox = this.add
      .rectangle(0, 0, boxSize, boxSize, 0x111111, 0.65)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.6)
      .setScrollFactor(0)
      .setDepth(5000)
      .setInteractive({ useHandCursor: true });

    // Filled check indicator (shown only for Snap)
    this.moveCheck = this.add
      .rectangle(0, 0, boxSize - 6, boxSize - 6, 0x00ff88, 0.95)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(5001);

    // Label
    this.moveLabel = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(5001);

    this.moveBox.on("pointerdown", () => this.toggleMovementMode());
    this.moveLabel
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleMovementMode());

    this.layoutMovementToggle();
    this.syncMovementToggleVisuals();
  }

  private layoutMovementToggle() {
    const boxSize = 16;
    const margin = 10;
    const x = margin;
    const y = this.scale.height - margin - boxSize / 2; // bottom-left
    this.moveBox.setPosition(x, y);
    this.moveCheck.setPosition(x + 3, y);
    this.moveLabel.setPosition(x + boxSize + 8, y);
  }

  private syncMovementToggleVisuals() {
    const isSnap = this.currentMovementMode === "snap";
    this.moveCheck.setVisible(isSnap);
    this.moveLabel.setText(
      isSnap ? "Snap movement (instant)" : "Glide movement (smooth)"
    );
  }

  private toggleMovementMode() {
    this.currentMovementMode =
      this.currentMovementMode === "snap" ? "glide" : "snap";
    this.syncMovementToggleVisuals();
    if (this.player) this.player.setMovementMode(this.currentMovementMode);
  }
  // ------------------------------------------------------

  private setupPinballColliders() {
    const b = this.livingGrid.getBouncerGroup();
    if (!b) return;

    // Player & enemies collide with pin blocks (solid blockers)
    if (this.player) this.physics.add.collider(this.player, b);
    this.physics.add.collider(this.enemies.getGroup(), b);

    // Projectiles STOP on blocks (no deflection)
    if (this.weapons) {
      // bullets vanish
      this.physics.add.overlap(
        this.weapons.getBulletsGroup(),
        b,
        (bulletObj) => {
          const bullet = bulletObj as any;
          if (!bullet.active) return;
          if (bullet.body?.stop) bullet.body.stop();
          bullet.setActive(false).setVisible(false);
        }
      );
      // rockets explode on impact
      this.physics.add.overlap(
        this.weapons.getRocketsGroup(),
        b,
        (rocketObj) => {
          const rocket = rocketObj as any;
          if (!rocket.active) return;
          const s = ServerConfig.settings;
          this.events.emit("weapons:explosion", {
            x: rocket.x,
            y: rocket.y,
            radius: s.secondaryExplosionRadius,
            damage: rocket.damage ?? s.secondaryDamage,
          });
          if (rocket.body?.stop) rocket.body.stop();
          rocket.setActive(false).setVisible(false);
        }
      );
    }
  }

  private startGame(name: string) {
    this.username = name;

    const s = ServerConfig.settings;
    const innerW = s.gridCols * s.cellWidth;
    const innerH = s.gridRows * s.cellHeight;
    const x = s.arenaMargin + Math.random() * innerW;
    const y = s.arenaMargin + Math.random() * innerH;

    this.player = new Player(this, x, y);
    this.player.setMovementMode(this.currentMovementMode); // apply current choice
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.enemies.setPlayer(this.player);

    this.weapons = new WeaponsSystem(this, this.player, this.livingGrid);
    this.score.reset();
    this.health.reset();
    this.leaderboard.upsert(this.username, 0);

    // Bullet → Enemy
    this.physics.add.overlap(
      this.weapons.getBulletsGroup(),
      this.enemies.getGroup(),
      (bulletObj, enemyObj) => {
        const bullet = bulletObj as any;
        const enemy = enemyObj as Enemy;
        if (bullet.active && enemy.active) {
          const dmg = bullet.damage ?? ServerConfig.settings.primaryDamage;
          const killerColor = this.player!.getTintColor?.() ?? 0xffffff;
          this.enemies.applyHit(enemy, dmg, this.username!, killerColor);
          if (bullet.body?.stop) bullet.body.stop();
          bullet.setActive(false).setVisible(false);
        }
      }
    );

    // Rocket → Enemy (AoE)
    this.physics.add.overlap(
      this.weapons.getRocketsGroup(),
      this.enemies.getGroup(),
      (rocketObj, enemyObj) => {
        const rocket = rocketObj as any;
        const enemy = enemyObj as Enemy;
        if (rocket.active && enemy.active) {
          const s2 = ServerConfig.settings;
          const killerColor = this.player!.getTintColor?.() ?? 0xffffff;
          this.enemies.applyExplosion(
            rocket.x,
            rocket.y,
            s2.secondaryExplosionRadius,
            rocket.damage ?? s2.secondaryDamage,
            this.username!,
            killerColor
          );
          if (rocket.body?.stop) rocket.body.stop();
          rocket.setActive(false).setVisible(false);
        }
      }
    );

    // Secondary range-end AoE
    this.events.on(
      "weapons:explosion",
      (d: { x: number; y: number; radius: number; damage: number }) => {
        if (!this.player || !this.username) return;
        const killerColor = this.player.getTintColor?.() ?? 0xffffff;
        this.enemies.applyExplosion(
          d.x,
          d.y,
          d.radius,
          d.damage,
          this.username,
          killerColor
        );
      }
    );

    // Enemy contact → damage to player
    this.enemies.setupPlayerCollision((amount, _enemy) => {
      if (!this.player) return;
      const hpNow = this.health.damage(amount);
      if (hpNow <= 0) this.handlePlayerDeath();
    });

    this.setupPinballColliders();
  }

  private performServerReset() {
    this.weapons?.getBulletsGroup().clear(true, true);
    this.weapons?.getRocketsGroup().clear(true, true);
    this.score.reset();
    this.leaderboard.resetAll();
    this.enemies.repopulate();
    // Full special-cell rebuild; removes old pin visuals too
    this.livingGrid.reshuffle();
    this.setupPinballColliders();
    this.health.reset();
  }

  private handlePlayerDeath() {
    this.weapons?.getBulletsGroup().clear(true, true);
    this.weapons?.getRocketsGroup().clear(true, true);
    this.weapons = null;

    if (this.player) {
      this.cameras.main.stopFollow();
      this.player.destroy();
      this.player = null;
      this.enemies.setPlayer(null);
    }

    this.gameOverUI = new GameOverOverlay(this);
    this.gameOverUI.show(() => {
      this.gameOverUI.hide();
      this.startGame(this.username!);
    });
  }

  update(_t: number, dt: number) {
    const dts = dt / 1000;
    this.player?.update(_t, dt);
    this.weapons?.update(_t);
    this.enemies.update(dts);

    const movers: Phaser.GameObjects.GameObject[] = [];
    if (this.player) movers.push(this.player);
    this.enemies
      .getGroup()
      .getChildren()
      .forEach((go) => movers.push(go as any));

    this.livingGrid.applyForces(dts, movers);
    if (this.player)
      this.livingGrid.updateVignetteForPlayer(this.player.x, this.player.y);

    // Sonar pings
    this.livingGrid.tick(this.time.now, this.enemies.getGroup());
  }
}
