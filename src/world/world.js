// The living vale: terrain, sky, resource nodes, interactable targets, fires and drops.
import * as THREE from 'three';
import { getModel } from '../engine/assets.js';
import { procModel, oreBoulder } from '../engine/procmodels.js';
import { mulberry32, Simplex2, smoothstep } from '../engine/noise.js';
import { MANIFEST } from '../data/manifest.js';
import { PLACES, WORLD_SIZE, WATER_LEVEL } from '../data/places.js';
import { ITEMS } from '../data/items.js';
import { ORE } from '../data/items.js';
import { Terrain, roadDistance } from './terrain.js';
import { Sky } from './sky.js';
import { Colliders, InstancedSet } from './physics.js';
import { buildVillage } from './settlements.js';
import { makeItemObject } from '../game/itemvisuals.js';

const UP = new THREE.Vector3(0, 1, 0);

// ---------- targets: anything you can look at and act on ----------
class Targets {
  constructor() { this.grid = new Map(); this.CELL = 6; }
  key(i, j) { return i + ',' + j; }
  add(t) {
    t.enabled ??= true;
    const i = Math.floor(t.x / this.CELL), j = Math.floor(t.z / this.CELL);
    t._k = this.key(i, j);
    if (!this.grid.has(t._k)) this.grid.set(t._k, new Set());
    this.grid.get(t._k).add(t);
    return t;
  }
  move(t, x, z) { this.remove(t); t.x = x; t.z = z; this.add(t); }
  remove(t) { this.grid.get(t._k)?.delete(t); }
  near(x, z, r) {
    const out = [];
    const c = this.CELL;
    for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++)
      for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++)
        for (const t of this.grid.get(this.key(i, j)) || []) if (t.enabled) out.push(t);
    return out;
  }
  // ray vs vertical cylinders
  pick(origin, dir, maxDist) {
    let best = null, bestT = maxDist;
    for (const t of this.near(origin.x, origin.z, maxDist + 3)) {
      const ox = origin.x - t.x, oz = origin.z - t.z;
      const a = dir.x * dir.x + dir.z * dir.z, b = 2 * (ox * dir.x + oz * dir.z), c = ox * ox + oz * oz - t.r * t.r;
      let tt;
      if (c <= 0) tt = 0; // inside the cylinder's footprint
      else {
        const disc = b * b - 4 * a * c;
        if (disc < 0 || a < 1e-8) continue;
        tt = (-b - Math.sqrt(disc)) / (2 * a);
        if (tt < 0) continue;
      }
      // clip against the cylinder's height: find the first t within [y0, y1]
      let y = origin.y + dir.y * tt;
      if (y < t.y0 || y > t.y1) {
        const tExitDisc = c <= 0 ? maxDist : (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
        const tY = dir.y !== 0 ? ((y < t.y0 ? t.y0 : t.y1) - origin.y) / dir.y : -1;
        if (tY < tt || tY > tExitDisc) continue;
        tt = tY;
      }
      if (tt < bestT) { bestT = tt; best = t; }
    }
    return best ? { target: best, dist: bestT } : null;
  }
}

const TREE_KINDS = {
  oak: { name: 'Oak', models: MANIFEST.nature.filter(n => /^Tree_/.test(n)), item: 'log', logs: 4, level: 1, tier: 1, xp: 25, diff: 0.0, trunk: 0.45 },
  birch: { name: 'Birch', models: MANIFEST.nature.filter(n => /^Birch_/.test(n)), item: 'log', logs: 3, level: 1, tier: 1, xp: 25, diff: 0.0, trunk: 0.3 },
  pine: { name: 'Pine', models: MANIFEST.nature.filter(n => /^Pine_/.test(n)), item: 'pine_log', logs: 5, level: 15, tier: 2, xp: 60, diff: 0.15, trunk: 0.45 },
  dead: { name: 'Dead Tree', models: MANIFEST.nature.filter(n => /^Dead/.test(n)), item: 'deadwood', logs: 2, level: 1, tier: 1, xp: 15, diff: -0.1, trunk: 0.35 },
};
export const NATURE_MODELS = Object.values(TREE_KINDS).flatMap(k => k.models.map(m => 'nature/' + m));

const ROCK_KINDS = {
  stone: { name: 'Boulder', item: 'stone', level: 1, tier: 1, xp: 8, n: [3, 5], color: null },
  copper: { name: 'Copper Vein', item: 'copper_ore', level: 1, tier: 1, xp: 20, n: [2, 4], color: ORE.copper },
  tin: { name: 'Tin Vein', item: 'tin_ore', level: 1, tier: 1, xp: 20, n: [2, 4], color: ORE.tin },
  iron: { name: 'Iron Vein', item: 'iron_ore', level: 15, tier: 2, xp: 45, n: [2, 3], color: ORE.iron },
  coal: { name: 'Coal Seam', item: 'coal', level: 20, tier: 2, xp: 50, n: [2, 4], color: ORE.coal },
  gold: { name: 'Gold Vein', item: 'gold_ore', level: 30, tier: 3, xp: 80, n: [1, 3], color: ORE.gold },
  aether: { name: 'Aether Cluster', item: 'aether_shard', level: 35, tier: 3, xp: 110, n: [1, 2], color: null },
};

// gatherables: [proc model, item, min, max, xp, skill, respawn seconds, label]
const GATHER = {
  stick: { model: 'stick', item: 'stick', n: [1, 2], xp: 2, skill: 'foraging', respawn: 240, verb: 'Pick up' },
  stone: { model: 'stone', item: 'stone', n: [1, 1], xp: 2, skill: 'foraging', respawn: 300, verb: 'Pick up' },
  flint: { model: 'flint', item: 'flint', n: [1, 2], xp: 4, skill: 'foraging', respawn: 300, verb: 'Pick up' },
  grass: { model: 'grass', item: 'fiber', n: [1, 3], xp: 3, skill: 'foraging', respawn: 200, verb: 'Pull fiber from', name: 'Tall Grass' },
  reeds: { model: 'reeds', item: 'fiber', n: [2, 4], xp: 4, skill: 'foraging', respawn: 240, verb: 'Cut', name: 'Reeds' },
  berrybush: { model: 'berrybush', item: 'berries', n: [2, 4], xp: 8, skill: 'foraging', respawn: 420, verb: 'Forage', name: 'Thornberry Bush', depletedModel: 'bush' },
  mushroom: { model: 'mushroom', item: 'mushroom', n: [1, 2], xp: 6, skill: 'foraging', respawn: 360, verb: 'Pick' },
  bloodroot: { model: 'bloodroot', item: 'bloodroot', n: [1, 2], xp: 12, skill: 'foraging', respawn: 480, verb: 'Pick', level: 1 },
  ashleaf: { model: 'ashleaf', item: 'ashleaf', n: [1, 2], xp: 12, skill: 'foraging', respawn: 480, verb: 'Pick', level: 3 },
  moonpetal: { model: 'moonpetal', item: 'moonpetal', n: [1, 2], xp: 18, skill: 'foraging', respawn: 600, verb: 'Pick', level: 5, nightOnly: true },
};

export class World {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.rand = mulberry32(2024);
    this.noise = new Simplex2(99);
    this.terrain = new Terrain();
    this.scene.add(this.terrain.mesh, this.terrain.water);
    this.sky = new Sky(this.scene);
    this.sky.water = this.terrain.water;
    this.colliders = new Colliders();
    this.targets = new Targets();
    this.nodes = [];          // every resource node, indexed for saving
    this.depleted = new Set();
    this.anims = [];          // short-lived animations
    this.fires = [];          // { pos, radius, lit, intensity }
    this.drops = [];
    this.doors = [];
    this.containers = {};     // id -> { items, lootTable, opened }
    this.time = 0;            // seconds of play
    this.lightPool = [...Array(6)].map(() => { const l = new THREE.PointLight(0xff9040, 0, 16, 1.5); this.scene.add(l); return l; });
    this.nightVisible = null;
  }

  heightAt(x, z) { return this.terrain.heightAt(x, z); }
  flush(node) { if (this._cullAt) { node.set.rebuild(this._cullAt); node.altSet?.rebuild(this._cullAt); } }
  isWater(x, z) { return this.terrain.heightAt(x, z) < WATER_LEVEL - 0.1; }

  build() {
    this.sets = new Map();
    this.populateTrees();
    this.populateRocks();
    this.populateGatherables();
    this.populateDecor();
    buildVillage(this);
    for (const s of this.sets.values()) s.finalize();
  }

  set(key, defFn, cap) {
    if (!this.sets.has(key)) {
      const range = key.startsWith('t:') ? 55 : key.startsWith('tree:') || key.startsWith('d:bigrock') ? 190 : key.startsWith('rock:') || key === 'd:bush' || key === 'g:berrybush' ? 150 : 90;
      const s = new InstancedSet(defFn(), cap, { range, shadows: !(key.startsWith('g:') || key.startsWith('t:')) || key === 'g:berrybush' });
      this.scene.add(s.group);
      this.sets.set(key, s);
    }
    return this.sets.get(key);
  }

  // Sample a point satisfying `ok`, trying `tries` times.
  scatter(n, ok, { center = null, radius = WORLD_SIZE / 2 - 40, tries = 30 } = {}) {
    const out = [];
    for (let k = 0; k < n; k++) {
      for (let t = 0; t < tries; t++) {
        let x, z;
        if (center) { const a = this.rand() * Math.PI * 2, r = Math.sqrt(this.rand()) * radius; x = center.x + Math.cos(a) * r; z = center.z + Math.sin(a) * r; }
        else { x = (this.rand() * 2 - 1) * radius; z = (this.rand() * 2 - 1) * radius; }
        const h = this.heightAt(x, z);
        if (ok(x, z, h)) { out.push([x, z, h]); break; }
      }
    }
    return out;
  }

  distTo(place, x, z) { const p = PLACES[place]; return Math.hypot(x - p.x, z - p.z) / p.r; }
  inVillage(x, z, pad = 1.15) { return this.distTo('village', x, z) < pad; }
  dryFlat(x, z, h, maxSlope = 0.3) { return h > 0.7 && this.terrain.slopeAt(x, z) < maxSlope && roadDistance(x, z) > 3; }

  addNode(node) {
    node.idx = this.nodes.length;
    this.nodes.push(node);
    return node;
  }

  // ---------- trees ----------
  populateTrees() {
    const pts = this.scatter(1500, (x, z, h) => {
      if (!this.dryFlat(x, z, h, 0.35) || this.inVillage(x, z, 1.05) || h > 40) return false;
      const forest = this.noise.fbm(x / 70, z / 70, 3);
      const inHollow = this.distTo('hollow', x, z) < 1.1, inPine = this.distTo('pinewood', x, z) < 1.2;
      const density = inHollow || inPine ? 0.75 : this.distTo('village', x, z) < 2 ? 0.15 : smoothstep(-0.25, 0.35, forest);
      return this.rand() < density;
    });
    for (const [x, z, h] of pts) {
      let kind;
      const r = this.rand();
      if (this.distTo('hollow', x, z) < 1.15) kind = 'dead';
      else if (this.distTo('pinewood', x, z) < 1.25) kind = r < 0.8 ? 'pine' : r < 0.9 ? 'dead' : 'birch';
      else if (this.distTo('marsh', x, z) < 1.1) kind = r < 0.5 ? 'dead' : 'birch';
      else if (z < -60 && r < 0.25) kind = 'pine';
      else kind = r < 0.5 ? 'oak' : r < 0.85 ? 'birch' : 'dead';
      this.addTree(kind, x, z, h);
    }
  }

  addTree(kind, x, z, h) {
    const K = TREE_KINDS[kind];
    const model = K.models[Math.floor(this.rand() * K.models.length)];
    const set = this.set('tree:' + model, () => getModel('nature/' + model), 220);
    const scale = 0.85 + this.rand() * 0.5;
    const rot = this.rand() * Math.PI * 2;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, h - 0.15, z), new THREE.Quaternion().setFromAxisAngle(UP, rot), new THREE.Vector3(scale, scale, scale));
    const index = set.add(m);
    const trunk = K.trunk * scale;
    const node = this.addNode({ type: 'tree', kind, set, index, x, z, h, scale, rot, model, remaining: K.logs, max: K.logs });
    node.collider = this.colliders.add({ kind: 'circle', x, z, r: trunk, y0: h - 1, y1: h + 6 });
    node.target = this.targets.add({
      x, z, r: Math.max(trunk, 0.45), y0: h - 0.5, y1: h + 4.5, node,
      name: K.name, hitVerb: 'Chop', tool: 'axe', level: K.level, skill: 'woodcutting',
      hit: (g, info) => this.chopTree(node, info),
    });
  }

  chopTree(node, { tool }) {
    const g = this.game, K = TREE_KINDS[node.kind];
    if (!tool || tool.tool !== 'axe') { g.ui.toast('You need an axe.'); return false; }
    const lvl = g.skills.level('woodcutting');
    if (lvl < K.level) { g.ui.toast(`You need Woodcutting ${K.level} to chop ${K.name.toLowerCase()}.`); return false; }
    if (tool.tier < K.tier) { g.ui.toast('Your axe is too crude for this wood.'); return false; }
    g.audio.play('chop');
    this.shake(node);
    const chance = Math.min(0.95, 0.4 + lvl * 0.02 + tool.tier * 0.12 - K.diff);
    if (Math.random() < chance) {
      const left = g.inventory.add(K.item, 1);
      if (left) this.dropItem(K.item, left, new THREE.Vector3(node.x, node.h + 0.5, node.z));
      g.skills.add('woodcutting', K.xp);
      g.events.emit('chopped', node.kind);
      if (node.kind === 'dead' && Math.random() < 0.5) g.inventory.add('stick', 1);
      if (node.kind === 'oak' && Math.random() < 0.15) { g.inventory.add('apple', 1); g.ui.toast('An apple falls.'); }
      node.remaining--;
      if (node.remaining <= 0) this.fellTree(node);
    }
    return true;
  }

  shake(node) {
    const set = node.set, base = set.matrices[node.index];
    let t = 0;
    this.anims.push((dt) => {
      t += dt;
      const a = Math.sin(t * 40) * 0.03 * (1 - t / 0.35);
      if (node.remaining > 0) set.setTemp(node.index, t < 0.35 ? base.clone().multiply(new THREE.Matrix4().makeRotationZ(a)) : base);
      return t < 0.35;
    });
  }

  fellTree(node) {
    node.set.setVisible(node.index, false); this.flush(node);
    node.target.enabled = false;
    node.collider.enabled = false;
    node.respawnAt = this.time + 420;
    this.depleted.add(node);
    // the falling trunk
    const obj = getModel('nature/' + node.model).instance();
    obj.position.set(node.x, node.h - 0.15, node.z);
    obj.rotation.y = node.rot;
    obj.scale.setScalar(node.scale);
    const pivot = new THREE.Group();
    pivot.position.copy(obj.position);
    obj.position.set(0, 0, 0);
    pivot.add(obj);
    const fallDir = Math.random() * Math.PI * 2;
    pivot.rotation.y = fallDir;
    this.scene.add(pivot);
    const stump = procModel('stump').instance();
    stump.position.set(node.x, node.h - 0.1, node.z);
    stump.scale.setScalar(node.scale * 0.9);
    this.scene.add(stump);
    node.stump = stump;
    let t = 0;
    this.game.audio.play('roar', 0.25);
    this.anims.push((dt) => {
      t += dt;
      obj.rotation.x = Math.min(Math.PI / 2, (t * t) * 1.4);
      if (t > 1.6) obj.position.y -= dt * 1.5;
      if (t > 3) { this.scene.remove(pivot); return false; }
      return true;
    });
  }

  // ---------- rocks ----------
  populateRocks() {
    const place = (kind, n, center, radius, extra = () => true) => {
      for (const [x, z, h] of this.scatter(n, (x, z, h) => h > 0.8 && !this.inVillage(x, z) && roadDistance(x, z) > 4 && extra(x, z, h), { center: center ? PLACES[center] : null, radius: radius ?? (center ? PLACES[center].r : undefined) })) this.addRock(kind, x, z, h);
    };
    place('copper', 14, 'copper_hills');
    place('tin', 14, 'copper_hills');
    place('stone', 12, 'copper_hills');
    place('copper', 3, 'village', 90, (x, z) => !this.inVillage(x, z, 1.3));
    place('tin', 3, 'village', 90, (x, z) => !this.inVillage(x, z, 1.3));
    place('stone', 45, null);
    place('iron', 10, 'pinewood');
    place('iron', 4, 'copper_hills');
    place('coal', 9, 'pinewood');
    place('gold', 4, 'barrow', 40);
    place('gold', 3, 'hollow', 60, (x, z) => this.distTo('hollow', x, z) > 0.85);
    place('aether', 5, 'hollow', 50);
    place('aether', 3, 'barrow', 30);
  }

  addRock(kind, x, z, h) {
    const K = ROCK_KINDS[kind];
    const scale = 0.8 + this.rand() * 0.6;
    const rot = this.rand() * Math.PI * 2;
    let set;
    if (kind === 'aether') set = this.set('rock:aether', () => getModel('items/Crystal3'), 30);
    else set = this.set('rock:' + kind, () => (K.color ? oreBoulder(K.color) : procModel('boulder')), 80);
    const s = kind === 'aether' ? scale * 1.6 : scale;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, h - 0.2, z), new THREE.Quaternion().setFromAxisAngle(UP, rot), new THREE.Vector3(s, s, s));
    const index = set.add(m);
    const n = K.n[0] + Math.floor(this.rand() * (K.n[1] - K.n[0] + 1));
    const node = this.addNode({ type: 'rock', kind, set, index, x, z, h, remaining: n, max: n });
    const r = kind === 'aether' ? 0.6 * s : 1.1 * scale;
    node.collider = this.colliders.add({ kind: 'circle', x, z, r: r * 0.9, y0: h - 1, y1: h + 1.4 * scale });
    node.target = this.targets.add({
      x, z, r, y0: h - 0.5, y1: h + 1.6 * scale, node, name: K.name, hitVerb: 'Mine', tool: 'pick', level: K.level, skill: 'mining',
      hit: (g, info) => this.mineRock(node, info),
    });
  }

  mineRock(node, { tool }) {
    const g = this.game, K = ROCK_KINDS[node.kind];
    if (!tool || tool.tool !== 'pick') { g.ui.toast('You need a pickaxe.'); return false; }
    const lvl = g.skills.level('mining');
    if (lvl < K.level) { g.ui.toast(`You need Mining ${K.level}.`); return false; }
    if (tool.tier < K.tier) { g.ui.toast('Your pick skids off. You need a better one.'); return false; }
    g.audio.play('mine');
    g.particles?.burst(new THREE.Vector3(node.x, node.h + 0.8, node.z), 0xa09080, 8);
    const chance = Math.min(0.95, 0.35 + lvl * 0.02 + tool.tier * 0.12 - K.level * 0.01);
    if (Math.random() < chance) {
      const left = g.inventory.add(K.item, 1);
      if (left) this.dropItem(K.item, left, new THREE.Vector3(node.x, node.h + 1, node.z));
      g.skills.add('mining', K.xp);
      g.events.emit('mined', node.kind);
      if (node.kind !== 'stone' && Math.random() < 0.3) g.inventory.add('stone', 1);
      node.remaining--;
      if (node.remaining <= 0) {
        node.set.setVisible(node.index, false); this.flush(node);
        node.target.enabled = false;
        node.collider.enabled = false;
        node.respawnAt = this.time + 360;
        this.depleted.add(node);
      }
    }
    return true;
  }

  // ---------- small gatherables ----------
  populateGatherables() {
    const put = (kind, n, ok, opts) => { for (const [x, z, h] of this.scatter(n, ok, opts)) this.addGatherable(kind, x, z, h); };
    const land = (x, z, h) => this.dryFlat(x, z, h, 0.35) && h < 35;
    put('stick', 260, (x, z, h) => land(x, z, h) && this.noise.fbm(x / 70, z / 70, 3) > -0.3);
    put('stick', 14, (x, z, h) => land(x, z, h), { center: PLACES.village, radius: 60 });
    put('stone', 200, land);
    put('stone', 12, (x, z, h) => land(x, z, h), { center: PLACES.village, radius: 60 });
    put('flint', 70, (x, z, h) => h > 0.25 && h < 2.2 && this.distTo('mere', x, z) < 1.4);
    put('flint', 40, (x, z, h) => h > 0.2 && h < 3 && this.terrain.slopeAt(x, z) < 0.4 && this.distTo('marsh', x, z) < 1.2);
    put('grass', 380, (x, z, h) => land(x, z, h) && !this.inVillage(x, z, 0.7) && this.distTo('hollow', x, z) > 1);
    put('grass', 20, (x, z, h) => land(x, z, h) && !this.inVillage(x, z, 0.75), { center: PLACES.village, radius: 70 });
    put('reeds', 140, (x, z, h) => h > 0.1 && h < 1.4);
    put('berrybush', 110, (x, z, h) => land(x, z, h) && !this.inVillage(x, z) && this.distTo('hollow', x, z) > 1.2);
    put('berrybush', 25, (x, z, h) => land(x, z, h), { center: PLACES.wasp_grove, radius: 45 });
    put('mushroom', 120, (x, z, h) => land(x, z, h) && (this.noise.fbm(x / 70, z / 70, 3) > 0.1 || this.distTo('hollow', x, z) < 1.1));
    put('bloodroot', 70, (x, z, h) => land(x, z, h) && this.noise.fbm(x / 70, z / 70, 3) > 0.15);
    put('ashleaf', 45, (x, z, h) => h > 0.4 && this.distTo('marsh', x, z) < 1.3);
    put('ashleaf', 20, (x, z, h) => h > 0.4 && h < 3 && this.distTo('mere', x, z) < 1.5);
    put('moonpetal', 60, (x, z, h) => land(x, z, h) && !this.inVillage(x, z));
  }

  addGatherable(kind, x, z, h) {
    const G = GATHER[kind];
    const set = this.set('g:' + kind, () => procModel(G.model), 600);
    const scale = 0.8 + this.rand() * 0.5;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, h - 0.02, z), new THREE.Quaternion().setFromAxisAngle(UP, this.rand() * 6.28), new THREE.Vector3(scale, scale, scale));
    const index = set.add(m);
    const node = this.addNode({ type: 'gather', kind, set, index, x, z, h });
    if (G.depletedModel) {
      node.altSet = this.set('g:' + G.depletedModel, () => procModel(G.depletedModel), 300);
      node.altIndex = node.altSet.add(m);
      node.altSet.setVisible(node.altIndex, false);
    }
    const big = kind === 'berrybush' || kind === 'reeds';
    if (kind === 'berrybush') node.collider = this.colliders.add({ kind: 'circle', x, z, r: 0.55, y0: h - 1, y1: h + 1 });
    node.target = this.targets.add({
      x, z, r: big ? 0.8 : 0.4, y0: h - 0.3, y1: h + (big ? 1.4 : 0.5), node,
      name: G.name || ITEMS[G.item].name,
      prompt: () => `${G.verb} ${G.name || ITEMS[G.item].name}`,
      use: (g) => this.gather(node),
    });
    if (G.nightOnly) { node.nightOnly = true; }
  }

  gather(node) {
    const g = this.game, G = GATHER[node.kind];
    const lvl = g.skills.level(G.skill);
    if (G.level && lvl < G.level) { g.ui.toast(`You need Foraging ${G.level} to recognize this.`); return; }
    let n = G.n[0] + Math.floor(Math.random() * (G.n[1] - G.n[0] + 1));
    if (G.n[1] > 1 && Math.random() < lvl * 0.012) n++;
    const left = g.inventory.add(G.item, n);
    if (left === n) { g.ui.toast('Your pack is full.'); g.audio.play('error'); return; }
    g.audio.play('pickup');
    g.skills.add(G.skill, G.xp);
    node.respawnAt = this.time + G.respawn;
    this.depleted.add(node);
    node.target.enabled = false;
    if (node.altSet) node.altSet.setVisible(node.altIndex, true);
    node.set.setVisible(node.index, false); this.flush(node);
  }

  restoreNode(node) {
    node.respawnAt = null;
    this.depleted.delete(node);
    if (node.type === 'tree') {
      node.remaining = node.max;
      if (node.stump) { this.scene.remove(node.stump); node.stump = null; }
      node.collider.enabled = true;
    }
    if (node.type === 'rock') { node.remaining = node.max; node.collider.enabled = true; }
    if (node.altSet) node.altSet.setVisible(node.altIndex, false);
    const visible = !(node.nightOnly && !this.sky.isNight);
    node.set.setVisible(node.index, visible);
    node.target.enabled = visible;
  }

  // ---------- scenery without interaction ----------
  populateDecor() {
    for (const [x, z, h] of this.scatter(22000, (x, z, h) => h > 0.6 && h < 32 && this.terrain.slopeAt(x, z) < 0.3 && !this.inVillage(x, z, 0.7) && roadDistance(x, z) > 2 && this.distTo('hollow', x, z) > 0.9, { tries: 4 })) {
      const set = this.set('t:tuft', () => procModel('tuft'), 22000);
      const s = 0.7 + this.rand() * 0.8;
      set.add(new THREE.Matrix4().compose(new THREE.Vector3(x, h - 0.03, z), new THREE.Quaternion().setFromAxisAngle(UP, this.rand() * 6), new THREE.Vector3(s, s, s)));
    }
    for (const [x, z, h] of this.scatter(500, (x, z, h) => this.dryFlat(x, z, h, 0.4) && h < 30 && !this.inVillage(x, z, 0.75))) {
      const set = this.set('d:bush', () => procModel('bush'), 600);
      const s = 0.6 + this.rand() * 0.8;
      set.add(new THREE.Matrix4().compose(new THREE.Vector3(x, h - 0.1, z), new THREE.Quaternion().setFromAxisAngle(UP, this.rand() * 6), new THREE.Vector3(s, s * (0.7 + this.rand() * 0.5), s)));
    }
    for (const [x, z, h] of this.scatter(90, (x, z, h) => h > 0.5 && this.terrain.slopeAt(x, z) > 0.12 && !this.inVillage(x, z))) {
      const set = this.set('d:bigrock', () => procModel('bigrock'), 120);
      const s = 1.2 + this.rand() * 2.5;
      set.add(new THREE.Matrix4().compose(new THREE.Vector3(x, h - s * 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(this.rand(), this.rand() * 6, this.rand() * 0.5)), new THREE.Vector3(s, s * 0.8, s)));
      this.colliders.add({ kind: 'circle', x, z, r: s * 0.85, y0: h - 5, y1: h + s * 1.1 });
    }
  }

  // ---------- doors ----------
  addDoor(pivot, worldRot) {
    pivot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(pivot);
    const door = { pivot, open: false, angle: 0, target: null };
    door.collider = this.colliders.add({ kind: 'box', minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, y0: box.min.y, y1: box.max.y });
    const c = box.getCenter(new THREE.Vector3());
    door.target = this.targets.add({
      x: c.x, z: c.z, r: 0.6, y0: box.min.y, y1: box.max.y, name: 'Door',
      prompt: () => (door.open ? 'Close door' : 'Open door'),
      use: (g) => { door.open = !door.open; door.collider.enabled = !door.open; g.audio.play('door'); },
    });
    this.doors.push(door);
  }

  // ---------- fires and lights ----------
  addFire(f) { this.fires.push(f); return f; }
  nearestFire(pos, maxD = 4, onlyLit = true) {
    let best = null, bd = maxD;
    for (const f of this.fires) {
      if (onlyLit && !f.lit) continue;
      const d = Math.hypot(f.pos.x - pos.x, f.pos.z - pos.z);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
  warmthAt(pos) { // 0..1 how close to a lit fire
    let w = 0;
    for (const f of this.fires) if (f.lit) w = Math.max(w, 1 - Math.hypot(f.pos.x - pos.x, f.pos.z - pos.z) / (f.radius || 8));
    return Math.max(0, w);
  }

  // ---------- dropped items ----------
  dropItem(id, n, pos, extra = {}) {
    const obj = makeItemObject(id, 0.35);
    const y = Math.max(this.heightAt(pos.x, pos.z), this.floorAt(pos)) ;
    obj.position.set(pos.x + (Math.random() - 0.5) * 0.6, y + 0.05, pos.z + (Math.random() - 0.5) * 0.6);
    this.scene.add(obj);
    const drop = { id, n, obj, extra, born: this.time };
    drop.target = this.targets.add({
      x: obj.position.x, z: obj.position.z, r: 0.4, y0: y - 0.2, y1: y + 0.6, name: ITEMS[id].name,
      prompt: () => `Take ${ITEMS[id].name}${drop.n > 1 ? ' ×' + drop.n : ''}`,
      use: (g) => {
        const left = g.inventory.add(id, drop.n, drop.extra);
        if (left === drop.n) { g.ui.toast('Your pack is full.'); return; }
        g.audio.play(id === 'coin' ? 'coin' : 'pickup');
        drop.n = left;
        if (left <= 0) this.removeDrop(drop);
      },
    });
    this.drops.push(drop);
    return drop;
  }
  removeDrop(drop) {
    this.scene.remove(drop.obj);
    this.targets.remove(drop.target);
    this.drops.splice(this.drops.indexOf(drop), 1);
  }
  floorAt(pos) {
    let top = -Infinity;
    for (const c of this.colliders.query(pos.x, pos.z, 0.5)) if (c.platform && pos.x > c.minX && pos.x < c.maxX && pos.z > c.minZ && pos.z < c.maxZ) top = Math.max(top, c.top);
    return top;
  }

  // ---------- per-frame ----------
  update(dt, playerPos) {
    this.time += dt;
    this.sky.update(dt, playerPos);
    this.terrain.update(dt);

    for (let i = this.anims.length - 1; i >= 0; i--) if (!this.anims[i](dt)) this.anims.splice(i, 1);

    // keep only nearby instances on the GPU
    this._cullT = (this._cullT || 0) - dt;
    const movedFar = !this._cullAt || this._cullAt.distanceToSquared(playerPos) > 100;
    if (this._cullT <= 0 || movedFar) {
      this._cullT = 0.5;
      if (movedFar) this._cullAt = playerPos.clone();
      for (const s of this.sets.values()) if (s.dirty || movedFar) s.rebuild(this._cullAt);
    }

    // respawns, checked a few times a second
    this._respawnTick = (this._respawnTick || 0) - dt;
    if (this._respawnTick <= 0) {
      this._respawnTick = 0.5;
      for (const n of [...this.depleted]) if (n.respawnAt != null && this.time >= n.respawnAt) {
        if (n.type === 'tree' && Math.hypot(n.x - playerPos.x, n.z - playerPos.z) < 6) continue;
        this.restoreNode(n);
      }
      // moonpetal shows itself only at night
      const night = this.sky.isNight;
      if (night !== this.nightVisible) {
        this.nightVisible = night;
        for (const n of this.nodes) if (n.nightOnly && !this.depleted.has(n)) { n.set.setVisible(n.index, night); n.target.enabled = night; }
      }
    }

    for (const d of this.drops) { d.obj.rotation.y += dt; }
    for (const door of this.doors) {
      const goal = door.open ? -Math.PI / 2 : 0;
      door.angle += (goal - door.angle) * Math.min(1, dt * 6);
      door.pivot.children[0].rotation.y = door.angle;
    }

    // assign the light pool to the nearest burning things
    const lit = this.fires.filter(f => f.lit).map(f => ({ f, d: f.pos.distanceToSquared(playerPos) })).sort((a, b) => a.d - b.d);
    const t = this.time;
    this.lightPool.forEach((l, i) => {
      const e = lit[i];
      if (!e || e.d > 70 * 70) { l.intensity = 0; return; }
      l.position.copy(e.f.pos).add(new THREE.Vector3(0, e.f.lightY ?? 1, 0));
      l.color.set(e.f.color || 0xff8a3a);
      l.distance = e.f.radius ? e.f.radius * 2.2 : 18;
      l.intensity = (e.f.intensity ?? 45) * (0.85 + Math.sin(t * 13 + i) * 0.07 + Math.sin(t * 7.3 + i * 2) * 0.08);
    });
  }

  // ---------- persistence ----------
  serialize() {
    return {
      time: this.time, hour: this.sky.hour, day: this.sky.day,
      depleted: [...this.depleted].map(n => [n.idx, Math.round(n.respawnAt - this.time), n.remaining ?? 0]),
      partial: this.nodes.filter(n => (n.type === 'tree' || n.type === 'rock') && n.remaining < n.max && !this.depleted.has(n)).map(n => [n.idx, n.remaining]),
      containers: Object.fromEntries(Object.entries(this.containers).map(([k, c]) => [k, { items: c.items, opened: c.opened }])),
      doors: this.doors.map(d => d.open),
    };
  }
  load(d) {
    this.time = d.time || 0;
    this.sky.hour = d.hour ?? 8; this.sky.day = d.day ?? 1;
    for (const [idx, left, rem] of d.depleted || []) {
      const n = this.nodes[idx];
      if (!n) continue;
      if (n.type === 'tree') { n.remaining = 1; this.fellTreeSilently(n); }
      else if (n.type === 'rock') { n.remaining = 0; n.set.setVisible(n.index, false); n.target.enabled = false; n.collider.enabled = false; this.depleted.add(n); }
      else { this.depleted.add(n); n.target.enabled = false; n.set.setVisible(n.index, false); if (n.altSet) n.altSet.setVisible(n.altIndex, true); }
      n.respawnAt = this.time + left;
    }
    for (const [idx, rem] of d.partial || []) if (this.nodes[idx]) this.nodes[idx].remaining = rem;
    for (const [k, c] of Object.entries(d.containers || {})) if (this.containers[k]) Object.assign(this.containers[k], c);
    (d.doors || []).forEach((o, i) => { if (this.doors[i]) { this.doors[i].open = o; this.doors[i].collider.enabled = !o; } });
  }
  fellTreeSilently(node) {
    node.set.setVisible(node.index, false); this.flush(node);
    node.target.enabled = false;
    node.collider.enabled = false;
    const stump = procModel('stump').instance();
    stump.position.set(node.x, node.h - 0.1, node.z);
    stump.scale.setScalar(node.scale * 0.9);
    this.scene.add(stump);
    node.stump = stump;
    this.depleted.add(node);
  }
}
