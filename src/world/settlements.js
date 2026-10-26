// Thornmere village and the landmarks of the vale.
import * as THREE from 'three';
import { getModel } from '../engine/assets.js';
import { procModel } from '../engine/procmodels.js';
import { PLACES } from '../data/places.js';
import { ITEMS } from '../data/items.js';
import { buildHouse, placeObj } from './village.js';

export const PROP_MODELS = [
  'Bed_Twin1', 'Bed_Twin2', 'Nightstand_Shelf', 'Candle_1', 'Candle_2', 'Bottle_1', 'Cauldron', 'BookStand', 'Bookcase_2', 'Bench',
  'CandleStick_Stand', 'CandleStick_Triple', 'Chandelier', 'Banner_1', 'Banner_2', 'Workbench', 'Workbench_Drawers', 'WeaponStand', 'Crate_Metal',
  'Chain_Coil', 'Anvil_Log', 'Whetstone', 'Barrel', 'Bucket_Metal', 'Shelf_Small_Bottles', 'Cabinet', 'Crate_Wooden', 'FarmCrate_Apple',
  'Barrel_Apples', 'FarmCrate_Carrot', 'FarmCrate_Empty', 'Stall_Cart_Empty', 'Stall_Empty', 'Lantern_Wall', 'Dummy', 'Barrel_Holder',
  'Cage_Small', 'Vase_Rubble_Medium', 'Coin_Pile', 'Coin_Pile_2', 'Table_Large', 'Chair_1', 'Mug', 'Table_Plate', 'Pot_1', 'Stool',
  'Book_5', 'Book_Stack_1', 'BookGroup_Small_1', 'Carrot', 'Scroll_1', 'Shelf_Simple', 'Vase_2', 'Vase_4', 'Chest_Wood', 'Torch_Metal',
  'Rope_2', 'Bag', 'Pouch_Large', 'Key_Metal', 'Peg_Rack', 'Shelf_Arch', 'Chalice',
].map(n => 'props/' + n);
export const LANDMARK_MODELS = ['items/Chest_Closed', 'items/Skull', 'items/Skull2', 'items/Bone', 'items/Crown', 'items/FishBone'];

// ---------- loot ----------
const LOOT = {
  common: [['stick', 2, 4, 0.5], ['fiber', 2, 5, 0.5], ['bandage', 1, 2, 0.35], ['coin', 2, 9, 0.6], ['carrot', 1, 2, 0.3], ['apple', 1, 2, 0.3], ['rope', 1, 2, 0.3], ['cloth', 1, 1, 0.2], ['bottle', 1, 1, 0.15], ['arrow', 3, 6, 0.15]],
  smith: [['bronze_bar', 1, 1, 0.5], ['copper_ore', 1, 3, 0.6], ['tin_ore', 1, 3, 0.6], ['coal', 1, 2, 0.4], ['leather', 1, 2, 0.5], ['rope', 1, 1, 0.5]],
  pantry: [['carrot', 1, 3, 0.7], ['apple', 1, 3, 0.7], ['mushroom', 1, 2, 0.4], ['honeycomb', 1, 1, 0.2], ['bottle', 1, 1, 0.5]],
  camp: [['rope', 1, 2, 1], ['torch', 1, 1, 1], ['arrow', 6, 10, 0.8], ['bottle', 1, 1, 1], ['coin', 5, 15, 1], ['bandage', 2, 3, 1]],
};
function rollLoot(table, fixed = []) {
  const out = fixed.map(([id, n]) => ({ id, n, ...(ITEMS[id].dur ? { dur: ITEMS[id].dur } : {}) }));
  for (const [id, a, b, p] of LOOT[table] || []) if (Math.random() < p) out.push({ id, n: a + Math.floor(Math.random() * (b - a + 1)), ...(ITEMS[id].dur ? { dur: ITEMS[id].dur } : {}) });
  const slots = new Array(12).fill(null);
  out.slice(0, 12).forEach((s, i) => { slots[i] = s; });
  return slots;
}

// ---------- placement helpers ----------
function prop(world, path, x, z, rot = 0, { y = null, collide = 'auto', scale = 1 } = {}) {
  const obj = getModel(path).instance();
  obj.scale.setScalar(scale);
  const baseY = y ?? Math.max(world.heightAt(x, z), world.floorAt(new THREE.Vector3(x, 99, z)));
  placeObj(obj, x, baseY, z, rot);
  world.scene.add(obj);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  if (collide === 'box' || (collide === 'auto' && size.y > 0.5 && Math.max(size.x, size.z) > 0.45)) {
    world.colliders.add({ kind: 'box', minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, y0: box.min.y, y1: box.max.y });
  }
  obj.userData.box = box;
  return obj;
}

function targetFor(world, obj, spec) {
  const box = obj.userData.box || new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  return world.targets.add({ x: c.x, z: c.z, r: Math.max(0.35, Math.max(s.x, s.z) / 2), y0: box.min.y, y1: box.max.y + 0.1, obj, ...spec });
}

export function addContainer(world, obj, id, name, table, fixed = [], onOpen = null) {
  world.containers[id] = { id, name, items: null, table, fixed, opened: false };
  return targetFor(world, obj, {
    name, prompt: () => `Search ${name}`,
    use: (g) => {
      const c = world.containers[id];
      if (!c.items) c.items = rollLoot(table, fixed);
      c.opened = true;
      g.audio.play('door', 0.5);
      g.ui.openContainer(c);
      onOpen?.(g);
    },
  });
}

function bookOn(world, lore, itemId, x, y, z, rot = 0) {
  const obj = getModel(ITEMS[itemId].model).instance();
  const def = getModel(ITEMS[itemId].model);
  const s = 0.32 / Math.max(def.size.x, def.size.y, def.size.z);
  obj.scale.setScalar(s);
  placeObj(obj, x, y, z, rot);
  world.scene.add(obj);
  const t = targetFor(world, obj, {
    name: ITEMS[itemId].name, prompt: () => `Take ${ITEMS[itemId].name}`,
    use: (g) => {
      if (g.inventory.add(itemId, 1)) { g.ui.toast('Your pack is full.'); return; }
      world.scene.remove(obj); t.enabled = false; world.taken.add(itemId);
      g.audio.play('pickup');
      g.ui.readBook(lore);
    },
  });
  t.r = 0.4; t.y0 -= 0.1;
  world.bookTargets[itemId] = { t, obj };
  return obj;
}

// A container that refills over time (apple barrels, carrot crates).
function forageProp(world, obj, name, itemId, n, respawn, skillXp = 5) {
  const state = { ready: true, at: 0 };
  const t = targetFor(world, obj, {
    name, prompt: () => (state.ready ? `Take from ${name}` : `${name} (empty)`),
    use: (g) => {
      if (!state.ready) { g.ui.toast('Nothing left. Come back later.'); return; }
      g.inventory.add(itemId, n);
      g.skills.add('foraging', skillXp);
      g.audio.play('pickup');
      state.ready = false; state.at = world.time + respawn;
    },
  });
  world.anims.push(() => { if (!state.ready && world.time > state.at) state.ready = true; return true; });
  return t;
}

const topOf = (obj) => new THREE.Box3().setFromObject(obj).max.y;

// ---------- Thornmere ----------
export function buildVillage(world) {
  world.taken = new Set();
  world.bookTargets = {};
  const g = world.game;
  const P = Math.PI;
  const inHouse = (h, path, lx, lz, lrot = 0, opts = {}) => { const p = h.local(lx, lz); return prop(world, path, p.x, p.z, h.rot + lrot, { y: h.floorY, ...opts }); };

  // the house where you wake
  const wake = buildHouse(world, { x: -16, z: 6, rot: P / 2, w: 2, d: 2, style: 'plaster', door: 'S', doorIndex: 1 });
  const bed = inHouse(wake, 'props/Bed_Twin1', -0.72, -0.45);
  targetFor(world, bed, { name: 'Bed', prompt: () => 'Sleep', use: (g) => g.player.sleep('bed', bed.position) });
  const ns = inHouse(wake, 'props/Nightstand_Shelf', 0.75, -1.35);
  const nsTop = topOf(ns);
  const cp = wake.local(0.62, -1.4);
  prop(world, 'props/Candle_1', cp.x, cp.z, 0, { y: nsTop, collide: false });
  const bp = wake.local(0.95, -1.3);
  const bottle = prop(world, 'props/Bottle_1', bp.x, bp.z, 0, { y: nsTop, collide: false });
  const bt = targetFor(world, bottle, {
    name: 'Empty Bottle', prompt: () => 'Take Empty Bottle',
    use: (g) => { g.inventory.add('bottle', 1); world.scene.remove(bottle); bt.enabled = false; world.taken.add('start_bottle'); g.audio.play('pickup'); },
  });
  bt.r = 0.3;
  world.bookTargets.start_bottle = { t: bt, obj: bottle };
  inHouse(wake, 'props/Stool', 0.9, 0.6);
  world.spawnPoint = { pos: wake.local(0.95, 0.2).setY(wake.floorY), yaw: -P / 2 };
  world.wakeHouse = wake;

  // the Hearth-House
  const chapel = buildHouse(world, { x: PLACES.chapel.x, z: PLACES.chapel.z - 2, rot: 0, w: 3, d: 5, style: 'brick', door: 'S', chimney: true });
  const hearth = inHouse(chapel, 'props/Cauldron', 0, -3.7);
  world.hearth = hearth;
  targetFor(world, hearth, {
    name: 'The Hearth', station: 'cauldron',
    prompt: () => (g.quests.stage('main')?.goals?.[0]?.flag === 'ending' && g.inventory.count('hollow_crown') ? 'Stand before the Hearth' : 'Use the Hearth-cauldron'),
    use: (g) => {
      if (g.quests.stage('main')?.goals?.[0]?.flag === 'ending' && g.inventory.count('hollow_crown')) g.ui.endingChoice();
      else g.ui.openCrafting('cauldron');
    },
  });
  const stand = inHouse(chapel, 'props/BookStand', -1.9, -3.9);
  bookOn(world, 'warden', 'book_warden', stand.position.x, topOf(stand) - 0.05, stand.position.z, 0.3);
  const bc = inHouse(chapel, 'props/Bookcase_2', 2.3, -1.2, -P / 2);
  addContainer(world, bc, 'chapel_books', 'Bookcase', 'common', [['book_bell', 1]]);
  for (const [lx, lz] of [[-1.25, 0.2], [1.25, 0.2], [-1.25, 2.0], [1.25, 2.0]]) inHouse(chapel, 'props/Bench', lx, lz);
  for (const lx of [-2.2, 2.2]) inHouse(chapel, 'props/CandleStick_Stand', lx, -4.2);
  const ch = chapel.local(0, -0.5);
  const chand = getModel('props/Chandelier').instance();
  placeObj(chand, ch.x, chapel.floorY + 3.05 - getModel('props/Chandelier').size.y, ch.z, 0);
  world.scene.add(chand);
  for (const lx of [-2.1, 2.1]) { const p = chapel.local(lx, 5.55); prop(world, lx < 0 ? 'props/Banner_1' : 'props/Banner_2', p.x, p.z, 0, { collide: 'box' }); }

  // Hadrig's smithy
  const smithy = buildHouse(world, { x: PLACES.smithy.x + 2, z: PLACES.smithy.z - 2, rot: -P / 2, w: 3, d: 3, style: 'plaster', door: 'S', chimney: true });
  const wb = inHouse(smithy, 'props/Workbench', 0, -2.1);
  targetFor(world, wb, { name: 'Workbench', station: 'workbench', prompt: () => 'Use Workbench', use: (g) => g.ui.openCrafting('workbench') });
  const drawers = inHouse(smithy, 'props/Workbench_Drawers', -2.15, 0.6, P / 2);
  const dp = smithy.local(-2.15, 0.6);
  bookOn(world, 'smith', 'book_smith', dp.x, topOf(drawers), dp.z, 1.2);
  inHouse(smithy, 'props/WeaponStand', 2.15, -0.6, -P / 2);
  const crate = inHouse(smithy, 'props/Crate_Metal', 2.0, 1.9);
  addContainer(world, crate, 'smith_crate', 'Iron-bound Crate', 'smith', [['bronze_bar', 1], ['leather', 1]]);
  inHouse(smithy, 'props/Chain_Coil', -1.9, -2.0);
  const anv = prop(world, 'props/Anvil_Log', 17.5, 8.5, 0.4);
  targetFor(world, anv, { name: 'Split Anvil', prompt: () => 'Examine the split anvil', use: (g) => g.ui.toast('Cracked clean through. You will have to raise your own.') });
  const ws = prop(world, 'props/Whetstone', 17.5, -4.5, 1.2);
  targetFor(world, ws, { name: 'Whetstone', prompt: () => 'Sharpen held blade', use: (g) => g.player.sharpen() });
  const bar = prop(world, 'props/Barrel', 19.2, 9.6);
  addContainer(world, bar, 'smith_barrel', 'Barrel', 'smith');
  prop(world, 'props/Bucket_Metal', 18.6, 10.6, 0, { collide: false });

  // the herbalist's cottage
  const herb = buildHouse(world, { x: -20, z: -14, rot: P / 2, w: 2, d: 3, style: 'plaster', door: 'S' });
  const hb = inHouse(herb, 'props/Bookcase_2', -1.0, -2.3);
  addContainer(world, hb, 'herb_books', 'Bookcase', 'common', [['book_herbs', 1], ['bloodroot', 2]]);
  const cab = inHouse(herb, 'props/Cabinet', 1.0, -2.3);
  addContainer(world, cab, 'herb_cabinet', 'Cabinet', 'pantry', [['bottle', 1], ['potion_health', 1]]);
  inHouse(herb, 'props/Bed_Twin2', -0.72, 1.0);
  inHouse(herb, 'props/Shelf_Small_Bottles', 1.3, 0.8, -P / 2);

  // the family's house
  const fam = buildHouse(world, { x: 20, z: -18, rot: -P / 2, w: 2, d: 3, style: 'brick', door: 'S' });
  inHouse(fam, 'props/Bed_Twin1', -0.72, -1.25);
  const ns2 = inHouse(fam, 'props/Nightstand_Shelf', 0.95, -2.2);
  const n2p = fam.local(0.95, -2.2);
  bookOn(world, 'rhyme', 'book_children', n2p.x, topOf(ns2), n2p.z, 0.4);
  const fc = inHouse(fam, 'props/Crate_Wooden', 1.0, 1.7);
  addContainer(world, fc, 'fam_crate', 'Crate', 'common');
  const fb = inHouse(fam, 'props/Barrel', -1.15, 2.0);
  addContainer(world, fb, 'fam_barrel', 'Barrel', 'pantry');

  // the granary
  const gran = buildHouse(world, { x: -2, z: 25, rot: P, w: 3, d: 3, style: 'plaster', door: 'S' });
  forageProp(world, inHouse(gran, 'props/FarmCrate_Apple', -1.6, -1.6), 'Apple Crate', 'apple', 3, 900);
  forageProp(world, inHouse(gran, 'props/Barrel_Apples', 1.7, -1.8), 'Apple Barrel', 'apple', 2, 700);
  forageProp(world, inHouse(gran, 'props/FarmCrate_Carrot', -1.6, 1.0), 'Carrot Crate', 'carrot', 3, 900);
  inHouse(gran, 'props/FarmCrate_Empty', 1.7, 0.4);
  const gc = inHouse(gran, 'props/Crate_Wooden', 1.6, 1.8);
  addContainer(world, gc, 'gran_crate', 'Crate', 'pantry', [['fiber', 4]]);

  // the square
  const wellObj = procModel('well').instance();
  placeObj(wellObj, 0, world.heightAt(0, 4), 4, 0);
  world.scene.add(wellObj);
  world.colliders.add({ kind: 'circle', x: 0, z: 4, r: 1.2, y0: 0, y1: 20 });
  world.targets.add({ x: 0, z: 4, r: 1.1, y0: 5, y1: 9, name: 'Well', prompt: () => 'Look into the well', use: (g) => g.ui.toast('The rope is cut. Far below, something glints and does not move.') });

  const cart = prop(world, 'props/Stall_Cart_Empty', 9, -7, -0.3);
  prop(world, 'props/Stall_Empty', -9, -7, 0.3);
  const lantern = getModel('props/Lantern_Wall').instance();
  const lanternBase = new THREE.Vector3(9.4, world.heightAt(9, -7) + 1.6, -6.2);
  lantern.position.copy(lanternBase);
  world.scene.add(lantern);
  const lfire = world.addFire({ pos: lanternBase.clone(), lit: true, radius: 7, color: 0xffd890, intensity: 28, lightY: 0.8, noHeat: true });
  world.anims.push((dt) => { lantern.position.y = lanternBase.y + Math.sin(world.time * 1.3) * 0.12; lantern.rotation.y += dt * 0.3; lfire.pos.y = lantern.position.y; return true; });
  world.targets.add({ x: lanternBase.x, z: lanternBase.z, r: 0.7, y0: lanternBase.y - 0.5, y1: lanternBase.y + 2, name: 'The Lantern-Keeper', prompt: () => 'Speak with the Lantern-Keeper', use: (g) => g.ui.openTrade() });
  world.merchantPos = lanternBase;

  const dummy = prop(world, 'props/Dummy', 11, 11, -0.8);
  targetFor(world, dummy, { name: 'Training Dummy', hitVerb: 'Strike', hit: (g, info) => { g.audio.play('hit'); if (g.skills.level('blade') < 10) g.skills.add('blade', 6); else g.ui.toast('The dummy has nothing left to teach you.'); return true; } });
  prop(world, 'village/Prop_Wagon', -11, 13, 0.4);
  prop(world, 'props/Barrel_Holder', 6, 12, P / 2);
  prop(world, 'props/Crate_Wooden', -7, 12.5, 0.2);
  for (const [x, z, r] of [[-4, 7.5, 0], [4, 7.5, 0], [-4, 0.5, P], [4, 0.5, P]]) prop(world, 'props/Bench', x, z, r);

  // the field
  const fx = -27, fz = 22;
  for (let i = 0; i < 4; i++) for (const [ox, oz, r] of [[i * 2 - 3, -4, 0], [i * 2 - 3, 4, 0]]) {
    const f = getModel('village/Prop_WoodenFence_Single').instance();
    placeObj(f, fx + ox, world.heightAt(fx + ox, fz + oz), fz + oz, r);
    world.scene.add(f);
  }
  for (const [ox, oz] of [[-4, -1], [-4, 1], [4, -1], [4, 1]]) {
    const f = getModel('village/Prop_WoodenFence_Single').instance();
    placeObj(f, fx + ox, world.heightAt(fx + ox, fz + oz), fz + oz, P / 2);
    world.scene.add(f);
  }
  for (let i = 0; i < 9; i++) {
    const x = fx - 2.5 + (i % 3) * 2.5, z = fz - 2 + Math.floor(i / 3) * 2;
    const c = getModel('props/Carrot').instance();
    placeObj(c, x, world.heightAt(x, z) - 0.15, z, i);
    world.scene.add(c);
    const state = { ready: true, at: 0 };
    const t = world.targets.add({
      x, z, r: 0.35, y0: world.heightAt(x, z) - 0.2, y1: world.heightAt(x, z) + 0.5, name: 'Carrot', prompt: () => 'Pull Carrot',
      use: (g) => { g.inventory.add('carrot', 1); g.skills.add('foraging', 6); g.audio.play('pickup'); c.visible = false; t.enabled = false; state.at = world.time + 600; },
    });
    world.anims.push(() => { if (!t.enabled && world.time > state.at) { t.enabled = true; c.visible = true; } return true; });
  }

  buildLandmarks(world);
}

// ---------- beyond the village ----------
function chest(world, x, z, rot, id, name, fixed, onOpen) {
  const obj = prop(world, 'items/Chest_Closed', x, z, rot, { scale: 0.9 });
  return addContainer(world, obj, id, name, null, fixed, onOpen);
}

function scatterBones(world, cx, cz, n, r) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, d = Math.random() * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    const path = ['items/Bone', 'items/Skull', 'items/Skull2', 'items/Bone'][i % 4];
    const obj = getModel(path).instance();
    const s = (path.includes('Skull') ? 0.3 : 0.45) / Math.max(...getModel(path).size.toArray());
    obj.scale.setScalar(s);
    placeObj(obj, x, world.heightAt(x, z) - 0.02, z, Math.random() * 6);
    obj.rotation.z = (Math.random() - 0.5) * 0.6;
    world.scene.add(obj);
  }
}

function buildLandmarks(world) {
  const g = world.game;
  // the drowned oak and what Papa hid
  const D = PLACES.drowned_oak;
  const oak = getModel('nature/DeadTree_3').instance();
  placeObj(oak, D.x, world.heightAt(D.x, D.z) - 0.4, D.z, 0.7);
  oak.scale.setScalar(1.8);
  placeObj(oak, D.x, world.heightAt(D.x, D.z) - 0.4, D.z, 0.7);
  world.scene.add(oak);
  world.colliders.add({ kind: 'circle', x: D.x, z: D.z, r: 0.7, y0: -5, y1: 20 });
  for (const [ox, oz] of [[2.2, 1.0], [-1.8, 1.9]]) {
    const r = procModel('bigrock').instance();
    placeObj(r, D.x + ox, world.heightAt(D.x + ox, D.z + oz) - 0.3, D.z + oz, ox);
    world.scene.add(r);
    world.colliders.add({ kind: 'circle', x: D.x + ox, z: D.z + oz, r: 0.8, y0: -5, y1: 20 });
  }
  chest(world, D.x + 0.3, D.z + 2.4, 2.8, 'rhyme_chest', 'Papa’s Box', [['amulet_resolve', 1], ['coin', 35], ['potion_resolve', 1]], (g) => g.quests.setFlag('rhyme_chest'));

  // Thornback Hollow
  const H = PLACES.hollow;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * 6.28 + Math.random() * 0.3, d = 8 + Math.random() * 22, x = H.x + Math.cos(a) * d, z = H.z + Math.sin(a) * d;
    const w = procModel('cobweb').instance();
    placeObj(w, x, world.heightAt(x, z), z, a, { keepPivot: true });
    w.rotation.x = (Math.random() - 0.5) * 0.4;
    world.scene.add(w);
  }
  scatterBones(world, H.x, H.z, 40, 18);
  for (const [ox, oz, path] of [[6, -4, 'props/Cage_Small'], [-5, 6, 'props/Chain_Coil'], [3, 7, 'props/Vase_Rubble_Medium'], [-7, -3, 'props/Cage_Small']]) prop(world, path, H.x + ox, H.z + oz, ox);
  chest(world, H.x - 3, H.z - 6, 0.6, 'hollow_chest', 'Silk-bound Chest', [['golden_bow', 1], ['arrow', 25], ['coin', 70], ['potion_health', 2], ['aether_shard', 1]]);

  // the Old Barrow: standing stones and the warden's sword
  const B = PLACES.barrow;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 6.28, x = B.x + Math.cos(a) * 9, z = B.z + Math.sin(a) * 9;
    const s = procModel('bigrock').instance();
    s.scale.set(0.9, 3.2, 0.7);
    placeObj(s, x, world.heightAt(x, z) - 0.3, z, a);
    world.scene.add(s);
    world.colliders.add({ kind: 'circle', x, z, r: 0.8, y0: -5, y1: 30 });
  }
  scatterBones(world, B.x, B.z, 16, 7);
  prop(world, 'props/Coin_Pile', B.x + 1.6, B.z - 0.8, 0.4, { collide: false });
  prop(world, 'props/CandleStick_Triple', B.x - 1.4, B.z - 1.4, 0, { collide: false });
  chest(world, B.x, B.z - 1.5, 0, 'barrow_chest', 'Warden’s Cairn', [['dawnwake', 1], ['gold_bar', 2], ['coin', 120], ['potion_wisp', 1]]);

  // Ember Grove: hives
  const W = PLACES.wasp_grove;
  world.hives = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.28 + 0.4, d = 6 + (i % 3) * 7, x = W.x + Math.cos(a) * d, z = W.z + Math.sin(a) * d;
    const h = world.heightAt(x, z);
    const hive = procModel('hive').instance();
    placeObj(hive, x, h, z, a);
    world.scene.add(hive);
    world.colliders.add({ kind: 'circle', x, z, r: 0.6, y0: h - 1, y1: h + 2 });
    const state = { broken: false, at: 0 };
    const t = world.targets.add({
      x, z, r: 0.75, y0: h, y1: h + 1.8, name: 'Ember Wasp Hive', hitVerb: 'Break',
      hit: (g) => {
        g.audio.play('hit'); g.audio.play('buzz');
        state.hits = (state.hits || 0) + 1;
        g.creatures?.alertNear(new THREE.Vector3(x, h, z), 25, 'wasp');
        if (state.hits >= 3) {
          state.broken = true; state.hits = 0; state.at = world.time + 600;
          hive.visible = false; t.enabled = false;
          world.dropItem('honeycomb', 2, new THREE.Vector3(x, h + 0.5, z));
          g.skills.add('foraging', 30);
          g.creatures?.spawn('wasp', new THREE.Vector3(x, h + 1.5, z), true);
        }
        return true;
      },
    });
    world.anims.push(() => { if (state.broken && world.time > state.at) { state.broken = false; hive.visible = true; t.enabled = true; } return true; });
    world.hives.push({ x, z });
  }

  // an abandoned camp on the road north
  const cx = -22, cz = -138;
  g.structures.create('campfire', cx, cz, 0, { builtin: true });
  const bedroll = procModel('bedroll').instance();
  placeObj(bedroll, cx + 2.5, world.heightAt(cx + 2.5, cz), cz + 1, 0.5);
  world.scene.add(bedroll);
  world.targets.add({ x: cx + 2.5, z: cz + 1, r: 0.8, y0: world.heightAt(cx + 2.5, cz + 1) - 0.2, y1: world.heightAt(cx + 2.5, cz + 1) + 0.4, name: 'Old Bedroll', prompt: () => 'Sleep', use: (g) => g.player.sleep('bedroll', bedroll.position) });
  const campCrate = prop(world, 'props/Crate_Wooden', cx - 2, cz + 2, 0.8);
  addContainer(world, campCrate, 'camp_crate', 'Abandoned Crate', 'camp', [['flint_pick', 1]]);
}
