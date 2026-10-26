// Things the player builds and places: fires, stations, beds, storage, and building pieces.
import * as THREE from 'three';
import { getModel } from '../engine/assets.js';
import { procModel } from '../engine/procmodels.js';
import { ITEMS } from '../data/items.js';
import { placeObj } from './village.js';

const GRID = new Set(['floor', 'wall', 'wall_door', 'wall_window', 'roof', 'fence']);
const KIT = Object.fromEntries(Object.values(ITEMS).filter(i => i.place).map(i => [i.place, i.id]));

export const STRUCTURE_INFO = {
  campfire: { name: 'Campfire', proc: 'campfire' },
  workbench: { name: 'Workbench', model: 'props/Workbench', station: 'workbench' },
  bloomery: { name: 'Bloomery', proc: 'bloomery', station: 'bloomery' },
  anvil: { name: 'Anvil', model: 'props/Anvil_Log', station: 'anvil' },
  cauldron: { name: 'Cauldron', model: 'props/Cauldron', station: 'cauldron' },
  bedroll: { name: 'Bedroll', proc: 'bedroll', bed: true },
  bed: { name: 'Bed', model: 'props/Bed_Twin1', bed: true },
  chest: { name: 'Storage Chest', model: 'props/Chest_Wood', storage: 24 },
  rain_barrel: { name: 'Rain Barrel', model: 'props/Barrel' },
  torchstand: { name: 'Standing Torch', model: 'props/CandleStick_Stand' },
  fence: { name: 'Fence', model: 'village/Prop_WoodenFence_Single' },
  floor: { name: 'Timber Floor', model: 'village/Floor_WoodDark' },
  wall: { name: 'Plaster Wall', model: 'village/Wall_Plaster_Straight' },
  wall_door: { name: 'Doorway Wall', model: 'village/Wall_Plaster_Door_Flat' },
  wall_window: { name: 'Window Wall', model: 'village/Wall_Plaster_Window_Wide_Flat' },
  roof: { name: 'Tiled Roof', model: 'village/Roof_RoundTiles_4x4' },
};
export const STRUCTURE_MODELS = [...new Set(Object.values(STRUCTURE_INFO).filter(s => s.model).map(s => s.model)), 'village/Door_1_Flat'];

const defOf = (info) => (info.proc ? procModel(info.proc) : getModel(info.model));

export class Structures {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.ghost = null;
  }
  get world() { return this.game.world; }

  create(type, x, z, rot, state = {}, y = null) {
    const w = this.world, g = this.game, info = STRUCTURE_INFO[type];
    const obj = defOf(info).instance();
    const baseY = y ?? Math.max(w.heightAt(x, z), w.floorAt(new THREE.Vector3(x, 99, z)));
    if (GRID.has(type)) { obj.position.set(x, baseY + (type === 'roof' ? 3.05 : type === 'floor' ? 0.03 : 0), z); obj.rotation.y = rot; obj.updateMatrixWorld(true); }
    else placeObj(obj, x, baseY, z, rot);
    w.scene.add(obj);
    const s = { type, x, z, y: baseY, rot, state: { ...state }, obj, colliders: [], targets: [] };
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());

    // collisions
    if (type === 'floor') s.colliders.push(w.colliders.add({ kind: 'box', platform: true, minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, top: box.max.y, y0: box.min.y, y1: box.max.y }));
    else if (type === 'wall_door') {
      const alongX = size.x > size.z, sd = 0.42;
      const parts = alongX ? [[box.min.x, box.min.x + sd, box.min.z, box.max.z], [box.max.x - sd, box.max.x, box.min.z, box.max.z]] : [[box.min.x, box.max.x, box.min.z, box.min.z + sd], [box.min.x, box.max.x, box.max.z - sd, box.max.z]];
      for (const [a, b, cc, d] of parts) s.colliders.push(w.colliders.add({ kind: 'box', minX: a, maxX: b, minZ: cc, maxZ: d, y0: box.min.y, y1: box.max.y }));
      const pivot = new THREE.Group();
      pivot.add(getModel('village/Door_1_Flat').instance());
      pivot.position.copy(new THREE.Vector3(-0.53, 0, -0.08).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(obj.position));
      pivot.rotation.y = rot;
      w.scene.add(pivot);
      w.addDoor(pivot, rot);
      s.door = w.doors[w.doors.length - 1];
      s.extra = pivot;
    } else if (type !== 'roof' && type !== 'campfire' && type !== 'bedroll') {
      s.colliders.push(w.colliders.add({ kind: 'box', minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, y0: box.min.y, y1: box.max.y }));
    }

    const T = (spec) => { const t = w.targets.add({ x: c.x, z: c.z, r: Math.max(0.45, Math.max(size.x, size.z) / 2), y0: box.min.y, y1: box.max.y + 0.2, name: info.name, structure: s, ...spec }); s.targets.push(t); return t; };
    const pickUp = () => ({ altPrompt: 'Pick up', alt: () => this.pickUp(s) });

    if (type === 'campfire') {
      s.state.fuel ??= 0;
      s.state.lit ??= false;
      s.fire = w.addFire({ pos: new THREE.Vector3(x, baseY + 0.2, z), lit: s.state.lit, radius: 9, lightY: 0.8 });
      T({
        r: 0.8, y1: baseY + 1.0,
        prompt: () => (s.state.lit ? `Cook at the fire (${Math.ceil(s.state.fuel / 60)}m of fuel)` : 'Light the fire (hold)'),
        use: (g) => (s.state.lit ? g.ui.openCrafting('fire') : this.lightFire(s)),
        station: () => (s.state.lit ? 'fire' : null),
        altPrompt: s.state.builtin ? 'Add fuel' : 'Add fuel',
        alt: (g) => this.addFuel(s),
      });
    } else if (info.station) {
      T({ station: info.station, prompt: () => `Use ${info.name}`, use: (g) => g.ui.openCrafting(info.station), ...pickUp() });
      if (type === 'bloomery') s.fire = w.addFire({ pos: new THREE.Vector3(x, baseY + 0.3, z), lit: true, radius: 6, intensity: 22, lightY: 0.6, noHeat: true });
    } else if (info.bed) {
      T({ prompt: () => 'Sleep', use: (g) => g.player.sleep(type, obj.position), ...pickUp() });
    } else if (info.storage) {
      const id = s.state.cid ||= 'chest_' + Math.random().toString(36).slice(2, 9);
      w.containers[id] ??= { id, name: 'Storage Chest', items: s.state.items || new Array(info.storage).fill(null), opened: true, storage: true };
      s.container = w.containers[id];
      T({ prompt: () => 'Open chest', use: (g) => g.ui.openContainer(s.container), ...pickUp() });
    } else if (type === 'rain_barrel') {
      s.state.water ??= 0;
      T({
        prompt: () => `Rain Barrel (${Math.floor(s.state.water)}/5) — ${g.inventory.count('bottle') ? 'fill a bottle' : 'drink'}`,
        use: (g) => {
          if (s.state.water < 1) { g.ui.toast('The barrel is dry. Wait for rain.'); return; }
          s.state.water -= 1;
          if (g.inventory.count('bottle')) { g.inventory.remove('bottle', 1); g.inventory.add('bottle_clean', 1); g.audio.play('splash'); }
          else g.player.drinkWater(30, false);
        },
        ...pickUp(),
      });
    } else if (type === 'torchstand') {
      s.fire = w.addFire({ pos: new THREE.Vector3(x, box.max.y - 0.1, z), lit: true, radius: 8, intensity: 30, lightY: 0.3 });
      T({ prompt: () => null, ...pickUp() });
    } else {
      T({ r: type === 'roof' ? 2 : Math.max(0.45, Math.min(1.2, Math.max(size.x, size.z) / 2)), y0: type === 'roof' ? box.min.y : box.min.y, prompt: () => null, ...pickUp() });
    }
    this.list.push(s);
    return s;
  }

  lightFire(s) {
    const g = this.game;
    if (!g.inventory.count('stick') && !g.inventory.count('deadwood') && !g.inventory.count('fiber')) { g.ui.toast('You need tinder: a stick, fiber or deadwood.'); return; }
    const lvl = g.skills.level('firemaking');
    const time = Math.max(1.2, 4.5 - lvl * 0.12) * (this.world.sky.rain > 0.4 ? 1.6 : 1);
    g.player.startAction('Kindling…', time, () => {
      const chance = Math.min(0.97, 0.55 + lvl * 0.03) * (this.world.sky.rain > 0.4 ? 0.7 : 1);
      if (Math.random() > chance) { g.ui.toast('The spark dies. Try again.'); g.skills.add('firemaking', 3); return; }
      for (const id of ['fiber', 'stick', 'deadwood']) if (g.inventory.count(id)) { g.inventory.remove(id, 1); break; }
      s.state.lit = true;
      s.state.fuel = 300 + lvl * 15;
      s.fire.lit = true;
      g.audio.play('fire');
      g.skills.add('firemaking', 30);
      g.events.emit('lit');
    });
  }

  addFuel(s) {
    const g = this.game;
    const fuels = [['pine_log', 360], ['log', 300], ['deadwood', 240], ['coal', 400], ['plank', 150], ['stick', 60]];
    for (const [id, secs] of fuels) {
      if (g.inventory.count(id)) {
        g.inventory.remove(id, 1);
        s.state.fuel = Math.min(1800, s.state.fuel + secs * (1 + g.skills.level('firemaking') * 0.02));
        g.skills.add('firemaking', 8);
        g.audio.play('fire', 0.6);
        g.ui.toast(`Fed the fire with ${ITEMS[id].name.toLowerCase()}.`);
        if (!s.state.lit) this.lightFire(s);
        return;
      }
    }
    g.ui.toast('You have nothing to burn.');
  }

  pickUp(s) {
    const g = this.game, w = this.world;
    if (s.container && s.container.items.some(Boolean)) { g.ui.toast('Empty the chest first.'); return; }
    if (g.inventory.add(KIT[s.type], 1)) { g.ui.toast('Your pack is full.'); return; }
    this.remove(s);
    g.audio.play('pickup');
  }

  remove(s) {
    const w = this.world;
    w.scene.remove(s.obj);
    if (s.extra) w.scene.remove(s.extra);
    if (s.door) { w.colliders.remove(s.door.collider); w.targets.remove(s.door.target); w.doors.splice(w.doors.indexOf(s.door), 1); }
    for (const c of s.colliders) w.colliders.remove(c);
    for (const t of s.targets) w.targets.remove(t);
    if (s.fire) w.fires.splice(w.fires.indexOf(s.fire), 1);
    if (s.container) delete w.containers[s.container.id];
    this.list.splice(this.list.indexOf(s), 1);
  }

  update(dt) {
    const w = this.world, P = this.game.particles, rain = w.sky.rain;
    const cam = this.game.camera.position;
    for (const s of this.list) {
      if (s.type === 'campfire' && s.state.lit) {
        // a roof overhead keeps rain off
        const sheltered = this.list.some(o => o.type === 'roof' && Math.abs(o.x - s.x) < 2.2 && Math.abs(o.z - s.z) < 2.2);
        s.state.fuel -= dt * (1 + (sheltered ? 0 : rain * 1.5));
        if (s.state.fuel <= 0) { s.state.lit = false; s.fire.lit = false; s.state.fuel = 0; }
      }
      if (s.type === 'rain_barrel') s.state.water = Math.min(5, s.state.water + dt * (rain > 0.3 ? 0.02 : 0.0008));
      if (s.fire?.lit && s.fire.pos.distanceToSquared(cam) < 60 * 60) {
        const n = s.type === 'campfire' ? 3 : 1;
        for (let i = 0; i < n; i++) P.flame(s.fire.pos, s.type === 'torchstand' ? 0.35 : s.type === 'bloomery' ? 0.4 : 1);
      }
    }
    if (this.ghost) this.updateGhost();
  }

  // ---------- placement mode ----------
  beginPlacement(itemId) {
    const type = ITEMS[itemId].place;
    this.cancelPlacement();
    const info = STRUCTURE_INFO[type];
    const okMat = new THREE.MeshBasicMaterial({ color: 0x60ff80, transparent: true, opacity: 0.4, depthWrite: false });
    const badMat = new THREE.MeshBasicMaterial({ color: 0xff5040, transparent: true, opacity: 0.4, depthWrite: false });
    const obj = defOf(info).instance(() => okMat);
    obj.traverse(o => { o.castShadow = false; });
    this.world.scene.add(obj);
    this.ghost = { itemId, type, obj, rot: this.lastRot || 0, okMat, badMat, ok: false };
    this.game.ui.setHint(`Placing ${info.name}: <b>LMB</b> place · <b>R</b> rotate · <b>RMB</b> cancel`);
  }
  cancelPlacement() {
    if (!this.ghost) return;
    this.world.scene.remove(this.ghost.obj);
    this.ghost = null;
    this.game.ui.setHint('');
  }
  rotateGhost() { if (this.ghost) { this.ghost.rot += GRID.has(this.ghost.type) ? Math.PI / 2 : Math.PI / 8; this.lastRot = this.ghost.rot; } }

  updateGhost() {
    const gh = this.ghost, g = this.game, w = this.world;
    const cam = g.camera, dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    // march along the view ray to find the ground
    let hit = null;
    for (let t = 1.5; t < 7; t += 0.1) {
      const p = cam.position.clone().addScaledVector(dir, t);
      const gy = Math.max(w.heightAt(p.x, p.z), w.floorAt(p));
      if (p.y <= gy) { hit = p.setY(gy); break; }
    }
    if (!hit) hit = cam.position.clone().addScaledVector(dir.setY(0).normalize(), 4);
    let { x, z } = hit;
    let rot = gh.rot;
    const t = gh.type;
    const q = ((Math.round(rot / (Math.PI / 2)) % 4) + 4) % 4;
    if (t === 'floor') { x = Math.floor(x / 2) * 2 + 1; z = Math.floor(z / 2) * 2 + 1; }
    else if (t === 'roof') { x = Math.round(x / 2) * 2; z = Math.round(z / 2) * 2; }
    else if (GRID.has(t)) {
      if (q % 2 === 0) { x = Math.floor(x / 2) * 2 + 1; z = Math.round(z / 2) * 2; }
      else { x = Math.round(x / 2) * 2; z = Math.floor(z / 2) * 2 + 1; }
      rot = q * Math.PI / 2;
    }
    const nearFloor = this.list.filter(s => s.type === 'floor' && Math.abs(s.x - x) < 2.1 && Math.abs(s.z - z) < 2.1).map(s => s.y);
    const baseY = nearFloor.length ? Math.max(...nearFloor) : Math.max(w.heightAt(x, z), w.floorAt(new THREE.Vector3(x, 99, z)));
    gh.x = x; gh.z = z; gh.y = baseY; gh.finalRot = rot;
    const obj = gh.obj;
    if (GRID.has(t)) { obj.position.set(x, baseY + (t === 'roof' ? 3.05 : t === 'floor' ? 0.03 : 0), z); obj.rotation.y = rot; }
    else placeObj(obj, x, baseY, z, rot);
    // validity: not in water, not too far, not overlapping solid things (building pieces may touch)
    const dist = Math.hypot(x - cam.position.x, z - cam.position.z);
    let ok = dist < 7.5 && w.heightAt(x, z) > 0.2;
    if (ok && !GRID.has(t)) {
      for (const c of w.colliders.query(x, z, 0.6)) {
        if (c.platform) continue;
        if (c.kind === 'circle' ? Math.hypot(c.x - x, c.z - z) < c.r + 0.4 : x > c.minX - 0.3 && x < c.maxX + 0.3 && z > c.minZ - 0.3 && z < c.maxZ + 0.3) { ok = false; break; }
      }
    }
    if (ok !== gh.ok) { gh.ok = ok; obj.traverse(o => { if (o.isMesh) o.material = ok ? gh.okMat : gh.badMat; }); }
  }

  confirmPlacement() {
    const gh = this.ghost, g = this.game;
    if (!gh) return;
    if (!gh.ok) { g.ui.toast('You cannot build there.'); g.audio.play('error'); return; }
    if (!g.inventory.remove(gh.itemId, 1)) { this.cancelPlacement(); return; }
    this.create(gh.type, gh.x, gh.z, gh.finalRot, {}, gh.y);
    g.audio.play('craft');
    g.skills.add('crafting', 5);
    g.events.emit('placed', gh.type);
    if (!g.inventory.count(gh.itemId)) this.cancelPlacement();
  }

  serialize() {
    return this.list.filter(s => !s.state.builtin).map(s => ({ type: s.type, x: s.x, z: s.z, y: s.y, rot: s.rot, state: { ...s.state, items: s.container?.items }, open: s.door?.open }));
  }
  load(arr) {
    for (const s of [...this.list]) if (!s.state.builtin) this.remove(s);
    for (const d of arr || []) {
      const s = this.create(d.type, d.x, d.z, d.rot, d.state, d.y);
      if (s.container && d.state.items) s.container.items = d.state.items;
      if (s.door && d.open) { s.door.open = true; s.door.collider.enabled = false; }
    }
  }
}
