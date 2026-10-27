// Core game state: events, inventory, skills, quests.
import { ITEMS, item } from '../data/items.js';
import { SKILLS, XP_TABLE, levelForXp, MAX_LEVEL, playerLevelFor } from '../data/skills.js';
import { QUESTS } from '../data/quests.js';

export class Events {
  constructor() { this.handlers = {}; }
  on(name, fn) { (this.handlers[name] ||= []).push(fn); }
  emit(name, ...args) { for (const fn of this.handlers[name] || []) fn(...args); }
}

export const BELT = 8;
export const BASE_SLOTS = 28;

export class Inventory {
  constructor(size = BASE_SLOTS, events = null) {
    this.slots = new Array(size).fill(null);
    this.events = events;
  }
  get size() { return this.slots.length; }
  resize(n) { while (this.slots.length < n) this.slots.push(null); }
  changed() { this.events?.emit('inventory'); }

  // Returns how many could NOT be added.
  add(id, n = 1, extra = {}) {
    const def = item(id);
    let left = n;
    if (def.stack > 1) {
      for (const s of this.slots) {
        if (left <= 0) break;
        if (s && s.id === id && s.n < def.stack) { const k = Math.min(def.stack - s.n, left); s.n += k; left -= k; }
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (!this.slots[i]) {
        const k = Math.min(def.stack, left);
        this.slots[i] = { id, n: k, ...(def.dur ? { dur: def.dur } : {}), ...extra };
        left -= k;
      }
    }
    if (left < n) { this.changed(); this.events?.emit('gained', id, n - left); }
    return left;
  }

  count(id) { return this.slots.reduce((a, s) => a + (s && s.id === id ? s.n : 0), 0); }
  get weight() { return this.slots.reduce((a, s) => a + (s ? ITEMS[s.id].weight * s.n : 0), 0); }
  has(reqs) { return Object.entries(reqs).every(([id, n]) => this.count(id) >= n); }
  canFit(id, n = 1) {
    const def = item(id);
    let room = 0;
    for (const s of this.slots) {
      if (!s) room += def.stack;
      else if (s.id === id) room += def.stack - s.n;
      if (room >= n) return true;
    }
    return false;
  }

  remove(id, n = 1) {
    if (this.count(id) < n) return false;
    // take from the back of the pack first so the belt stays stocked
    for (let i = this.slots.length - 1; i >= 0 && n > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id) { const k = Math.min(s.n, n); s.n -= k; n -= k; if (s.n <= 0) this.slots[i] = null; }
    }
    this.changed();
    return true;
  }

  takeSlot(i, n = 1) {
    const s = this.slots[i];
    if (!s) return null;
    const k = Math.min(n, s.n);
    s.n -= k;
    if (s.n <= 0) this.slots[i] = null;
    this.changed();
    return { ...s, n: k };
  }

  swap(a, b) { [this.slots[a], this.slots[b]] = [this.slots[b], this.slots[a]]; this.changed(); }
  serialize() { return this.slots.map(s => (s ? { ...s } : null)); }
  load(arr) { this.slots = arr.map(s => (s && ITEMS[s.id] ? { ...s } : null)); this.changed(); }
}

export class Skills {
  constructor(events) {
    this.events = events;
    this.xp = Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0]));
    this.xp.vitality = XP_TABLE[10];
  }
  level(id) { return levelForXp(this.xp[id] || 0); }
  progress(id) {
    const l = this.level(id);
    if (l >= MAX_LEVEL) return 1;
    return (this.xp[id] - XP_TABLE[l]) / (XP_TABLE[l + 1] - XP_TABLE[l]);
  }
  add(id, amount) {
    if (!amount) return;
    const before = this.level(id), plBefore = this.playerLevel;
    this.xp[id] = (this.xp[id] || 0) + amount;
    const after = this.level(id);
    this.events.emit('xp', id, amount);
    if (after > before) this.events.emit('levelup', id, after);
    if (this.playerLevel > plBefore) this.events.emit('playerlevel', this.playerLevel);
  }
  get total() { return Object.keys(SKILLS).reduce((a, k) => a + this.level(k), 0); }
  get playerLevel() { return playerLevelFor(this.total); }
  // skill levels still needed for the next player level
  get toNextPlayerLevel() { const t = this.total; let n = 0; while (playerLevelFor(t + n) === this.playerLevel) n++; return n; }
  get combat() { // a RuneScape-flavored combat level
    const L = (k) => this.level(k);
    return Math.floor((L('vitality') + L('block')) * 0.25 + Math.max(L('blade'), L('marksman') * 1.0) * 0.4 + 1);
  }
}

// Tracks quest stages and objective progress from game events.
export class Quests {
  constructor(game) {
    this.game = game;
    this.state = {}; // id -> { stage, counters: {}, done: bool }
    this.flags = {};
    const ev = game.events;
    ev.on('crafted', (id, n) => this.bump('craft', g => g.item === id, n));
    ev.on('placed', (what) => this.bump('place', g => g.what === what, 1));
    ev.on('lit', () => this.bump('light', () => true, 1));
    ev.on('drank', (id) => this.bump('drink', g => g.item === id, 1));
    ev.on('ate', (id, cooked) => this.bump('eat', g => !g.cooked || cooked, 1));
    ev.on('chopped', () => this.bump('chop', () => true, 1));
    ev.on('mined', () => this.bump('mine', () => true, 1));
    ev.on('killed', (type) => this.bump('kill', g => g.creature === type, 1));
    ev.on('read', (lore) => this.bump('read', g => g.lore === lore, 1));
    ev.on('inventory', () => this.check());
  }
  start(id) {
    if (this.state[id]) return;
    this.state[id] = { stage: 0, counters: {}, done: false };
    const q = QUESTS[id];
    this.game.ui?.questBanner(q.title, q.stages[0].title);
    this.game.audio?.play('quest');
    this.check();
  }
  setFlag(f) { this.flags[f] = true; this.check(); }
  stage(id) { const s = this.state[id]; return s && !s.done ? QUESTS[id].stages[s.stage] : null; }
  bump(type, match, n) {
    for (const [id, s] of Object.entries(this.state)) {
      if (s.done) continue;
      const stage = QUESTS[id].stages[s.stage];
      stage.goals.forEach((g, i) => { if (g.type === type && match(g)) s.counters[i] = (s.counters[i] || 0) + n; });
    }
    this.check();
  }
  goalProgress(id, i) {
    const s = this.state[id], g = QUESTS[id].stages[s.stage].goals[i];
    const inv = this.game.inventory;
    if (g.type === 'have') return Math.min(g.n, inv.count(g.item) + (g.alt || []).reduce((a, k) => a + inv.count(k), 0) + (s.counters['k' + i] || 0));
    if (g.type === 'flag') return this.flags[g.flag] ? 1 : 0;
    return Math.min(g.n || 1, s.counters[i] || 0);
  }
  goalDone(id, i) { const g = QUESTS[id].stages[this.state[id].stage].goals[i]; return this.goalProgress(id, i) >= (g.n || 1); }
  check() {
    for (const [id, s] of Object.entries(this.state)) {
      if (s.done) continue;
      const q = QUESTS[id];
      const stage = q.stages[s.stage];
      // "have" goals latch once met, so crafting with the gathered items does not undo them
      stage.goals.forEach((g, i) => { if (g.type === 'have' && this.goalProgress(id, i) >= g.n) s.counters['k' + i] = g.n; });
      if (stage.goals.every((_, i) => this.goalDone(id, i))) {
        s.stage++;
        s.counters = {};
        this.game.skills.add('vitality', 40);
        if (s.stage >= q.stages.length) {
          s.done = true;
          this.game.ui?.questBanner(q.title, 'Completed');
        } else {
          this.game.ui?.questBanner(q.title, q.stages[s.stage].title);
        }
        this.game.audio?.play('quest');
        this.game.events.emit('questStage', id, s.stage);
        this.check();
        return;
      }
    }
    this.game.events.emit('questsChanged');
  }
  activeTarget() {
    for (const id of ['main', ...Object.keys(this.state)]) {
      const st = this.stage(id);
      if (st?.target) return st.target;
    }
    return null;
  }
  serialize() { return { state: this.state, flags: this.flags }; }
  load(d) { this.state = d.state || {}; this.flags = d.flags || {}; }
}
