import Phaser from 'phaser'

type Entry = { name: string; score: number }

export class Leaderboard {
  private scene: Phaser.Scene
  private entries: Map<string, number> = new Map()
  private panel!: Phaser.GameObjects.Graphics
  private texts: Phaser.GameObjects.Text[] = []
  private onResize = () => this.render()

  constructor(scene: Phaser.Scene) { this.scene = scene }

  upsert(name: string, score: number) { this.entries.set(name, score); this.render() }
  remove(name: string) { this.entries.delete(name); this.render() }
  addPoints(name: string, delta: number) {
    const cur = this.entries.get(name) ?? 0
    this.entries.set(name, cur + delta)
    this.render()
  }

  resetAll() {
    this.entries.forEach((_v, k) => this.entries.set(k, 0))
    this.render()
  }

  mount() {
    this.panel = this.scene.add.graphics().setScrollFactor(0).setDepth(2000)
    this.scene.scale.on('resize', this.onResize)
    this.render()
  }

  unmount() {
    this.scene.scale.off('resize', this.onResize)
    this.panel?.destroy()
    this.texts.forEach(t => t.destroy())
    this.texts = []
  }

  private render() {
    if (!this.panel) return
    this.panel.clear()
    this.texts.forEach(t => t.destroy())
    this.texts = []

    const top = Array.from(this.entries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const { width } = this.scene.scale
    const w = 226
    const x = Math.max(8, width - w - 14)
    const y = 14
    const headerH = 26
    const rowH = 20
    const h = headerH + rowH * (top.length || 1) + 10

    this.panel.fillStyle(0x000000, 0.35).fillRoundedRect(x, y, w, h, 10)
    this.panel.lineStyle(2, 0xffffff, 0.15).strokeRoundedRect(x, y, w, h, 10)

    const header = this.scene.add
      .text(x + 12, y + 6, 'LEADERBOARD', { fontFamily: 'monospace', fontSize: '14px', color: '#ffd60a' })
      .setScrollFactor(0).setDepth(2001)
    this.texts.push(header)

    top.forEach(([name, score], i) => {
      const t = this.scene.add
        .text(x + 12, y + headerH + i * 20, `${i + 1}. ${name} — ${score}`, { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' })
        .setScrollFactor(0).setDepth(2001)
      this.texts.push(t)
    })

    if (top.length === 0) {
      const t = this.scene.add
        .text(x + 12, y + headerH, 'waiting for players…', { fontFamily: 'monospace', fontSize: '14px', color: '#9aa0a6' })
        .setScrollFactor(0).setDepth(2001)
      this.texts.push(t)
    }
  }
}
