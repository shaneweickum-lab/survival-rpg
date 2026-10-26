// Saving to the browser's local storage.
const KEY = 'thornmere-save-v1';
const SETTINGS = 'thornmere-settings-v1';

export class SaveSystem {
  constructor(game) { this.game = game; this.timer = 0; }

  has() { try { return !!localStorage.getItem(KEY); } catch { return false; } }

  save() {
    const g = this.game;
    const data = {
      version: 1,
      savedAt: Date.now(),
      player: g.player.serialize(),
      inventory: g.inventory.serialize(),
      skills: g.skills.xp,
      quests: g.quests.serialize(),
      world: g.world.serialize(),
      structures: g.structures.serialize(),
      graves: g.graves.serialize(),
      creatures: g.creatures.serialize(),
      loreRead: g.loreRead,
      ending: g.ending,
      taken: [...g.world.taken],
    };
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { g.ui.toast('Could not save: ' + e.message); return false; }
  }

  autosave() { if (this.game.started && !this.game.player.dead) this.save(); }

  load() {
    let d;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch { d = null; }
    if (!d) return false;
    const g = this.game;
    g.inventory.load(d.inventory);
    g.skills.xp = { ...g.skills.xp, ...d.skills };
    g.quests.load(d.quests);
    g.player.load(d.player);
    g.inventory.load(d.inventory); // again, after the bag has resized the pack
    g.world.load(d.world);
    g.structures.load(d.structures);
    g.graves.load(d.graves);
    g.creatures.load(d.creatures);
    g.loreRead = d.loreRead || {};
    for (const id of d.taken || []) g.world.removeTaken(id);
    if (d.ending) g.endingChosen(d.ending, true);
    g.events.emit('inventory');
    return true;
  }

  saveSettings() {
    const g = this.game;
    try { localStorage.setItem(SETTINGS, JSON.stringify({ sens: g.input.sensitivity, vol: g.audio.volume, invertY: g.input.invertY, shadows: g.renderer.shadowMap.enabled })); } catch {}
  }
  loadSettings() {
    const g = this.game;
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS));
      if (!s) return;
      g.input.sensitivity = s.sens ?? g.input.sensitivity;
      g.audio.volume = s.vol ?? g.audio.volume;
      g.input.invertY = !!s.invertY;
      if (s.shadows === false) g.setShadows(false);
    } catch {}
  }

  update(dt) {
    this.timer += dt;
    if (this.timer > 120) { this.timer = 0; this.autosave(); }
  }
}
