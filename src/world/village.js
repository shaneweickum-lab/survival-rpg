// Thornmere village, assembled from the modular medieval kit and the furniture pack.
import * as THREE from 'three';
import { getModel } from '../engine/assets.js';
import { procModel } from '../engine/procmodels.js';

export const VILLAGE_MODELS = [
  'Wall_Plaster_Straight', 'Wall_Plaster_Door_Flat', 'Wall_Plaster_Window_Wide_Flat', 'Wall_Plaster_Window_Thin_Round', 'Wall_Plaster_WoodGrid',
  'Wall_UnevenBrick_Straight', 'Wall_UnevenBrick_Door_Round', 'Wall_UnevenBrick_Window_Wide_Round', 'Wall_UnevenBrick_Window_Thin_Round',
  'Corner_Exterior_Wood', 'Corner_Exterior_Brick', 'Floor_WoodDark', 'Floor_Brick', 'Floor_WoodLight',
  'Roof_RoundTiles_4x4', 'Roof_RoundTiles_4x6', 'Roof_RoundTiles_6x6', 'Roof_RoundTiles_6x10', 'Roof_RoundTiles_6x8',
  'Roof_Front_Brick4', 'Roof_Front_Brick6', 'Door_1_Flat', 'Door_2_Round', 'Prop_Chimney', 'Prop_WoodenFence_Single',
  'Prop_Wagon', 'Prop_Vine1', 'Prop_Vine4', 'Prop_Crate', 'Prop_MetalFence_Ornament', 'WindowShutters_Wide_Flat_Open',
].map(n => 'village/' + n);

const TMP_BOX = new THREE.Box3();

// Rotate, then move so the bbox center sits at (x, z) and its base at y (or pivot at y with keepPivot).
export function placeObj(obj, x, y, z, rotY = 0, { keepPivot = false } = {}) {
  obj.rotation.y = rotY;
  obj.position.set(0, 0, 0);
  obj.updateMatrixWorld(true);
  if (keepPivot) { obj.position.set(x, y, z); }
  else {
    TMP_BOX.setFromObject(obj);
    const c = TMP_BOX.getCenter(new THREE.Vector3());
    obj.position.set(x - c.x, y - TMP_BOX.min.y, z - c.z);
  }
  obj.updateMatrixWorld(true);
  return obj;
}

const inst = (name) => getModel(name.includes('/') ? name : 'village/' + name).instance();

// Build a house in local coordinates; modules are 2 m. Returns { group, walls, doors, interior }.
// spec: { w, d (modules), style: 'plaster'|'brick', door: 'S'|'N'|'E'|'W', doorIndex, windows: true }
export function buildHouse(world, spec) {
  const { x, z, rot = 0, w, d, style = 'plaster', door = 'S', doorIndex = Math.floor((spec.door === 'E' || spec.door === 'W' ? spec.d : spec.w) / 2) } = spec;
  const group = new THREE.Group();
  const W = w * 2, D = d * 2;
  const isBrick = style === 'brick';
  const piece = {
    wall: isBrick ? 'Wall_UnevenBrick_Straight' : 'Wall_Plaster_Straight',
    door: isBrick ? 'Wall_UnevenBrick_Door_Round' : 'Wall_Plaster_Door_Flat',
    window: isBrick ? 'Wall_UnevenBrick_Window_Thin_Round' : 'Wall_Plaster_Window_Wide_Flat',
    corner: isBrick ? 'Corner_Exterior_Brick' : 'Corner_Exterior_Wood',
    floor: isBrick ? 'Floor_Brick' : 'Floor_WoodDark',
  };
  const walls = [];
  const sides = [
    { side: 'N', n: w, pos: i => [-W / 2 + 1 + 2 * i, -D / 2], rot: Math.PI },
    { side: 'S', n: w, pos: i => [-W / 2 + 1 + 2 * i, D / 2], rot: 0 },
    { side: 'W', n: d, pos: i => [-W / 2, -D / 2 + 1 + 2 * i], rot: -Math.PI / 2 },
    { side: 'E', n: d, pos: i => [W / 2, -D / 2 + 1 + 2 * i], rot: Math.PI / 2 },
  ];
  let doorInfo = null;
  for (const s of sides) for (let i = 0; i < s.n; i++) {
    const [px, pz] = s.pos(i);
    const isDoor = s.side === door && i === doorIndex;
    const isWindow = !isDoor && spec.windows !== false && (i % 2 === 1) && s.n > 1;
    const m = inst(isDoor ? piece.door : isWindow ? piece.window : (style === 'plaster' && (i + s.side.charCodeAt(0)) % 3 === 0 ? 'Wall_Plaster_WoodGrid' : piece.wall));
    m.position.set(px, 0, pz);
    m.rotation.y = s.rot;
    group.add(m);
    walls.push({ obj: m, isDoor, rot: s.rot });
    if (isDoor) doorInfo = { x: px, z: pz, rot: s.rot };
  }
  for (const [cx, cz] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) {
    const c = inst(piece.corner);
    c.position.set(cx, 0, cz);
    group.add(c);
  }
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    const f = inst(piece.floor);
    f.position.set(-W / 2 + 1 + 2 * i, 0.02, -D / 2 + 1 + 2 * j);
    f.receiveShadow = true;
    group.add(f);
  }
  const roofName = `Roof_RoundTiles_${W}x${D}`;
  const roof = inst(roofName);
  roof.position.set(0, 3.05, 0);
  group.add(roof);
  if (spec.gables !== false) {
    for (const zs of [-1, 1]) {
      const g = inst(`Roof_Front_Brick${W}`);
      g.position.set(0, 3.05, zs * D / 2);
      g.rotation.y = zs > 0 ? 0 : Math.PI;
      group.add(g);
    }
  }
  if (spec.chimney) {
    const c = inst('Prop_Chimney');
    c.position.set(W / 2 - 0.8, 3.0, -D / 2 + 1.2);
    c.scale.y = 1.4;
    group.add(c);
  }

  // put it in the world
  group.position.set(x, world.terrain.heightAt(x, z) + 0.05, z);
  group.rotation.y = rot;
  group.updateMatrixWorld(true);
  world.scene.add(group);

  // collisions
  for (const wl of walls) {
    TMP_BOX.setFromObject(wl.obj);
    const b = TMP_BOX.clone();
    if (wl.isDoor) {
      const alongX = (b.max.x - b.min.x) > (b.max.z - b.min.z);
      const side = 0.42;
      if (alongX) {
        world.colliders.add({ kind: 'box', minX: b.min.x, maxX: b.min.x + side, minZ: b.min.z, maxZ: b.max.z, y0: b.min.y, y1: b.max.y });
        world.colliders.add({ kind: 'box', minX: b.max.x - side, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, y0: b.min.y, y1: b.max.y });
      } else {
        world.colliders.add({ kind: 'box', minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.min.z + side, y0: b.min.y, y1: b.max.y });
        world.colliders.add({ kind: 'box', minX: b.min.x, maxX: b.max.x, minZ: b.max.z - side, maxZ: b.max.z, y0: b.min.y, y1: b.max.y });
      }
    } else {
      world.colliders.add({ kind: 'box', minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, y0: b.min.y, y1: b.max.y });
    }
  }
  // floor platform
  const fb = new THREE.Box3();
  group.children.filter(c => c.name.includes('Floor')).forEach(c => fb.union(TMP_BOX.setFromObject(c)));
  world.colliders.add({ kind: 'box', platform: true, minX: fb.min.x, maxX: fb.max.x, minZ: fb.min.z, maxZ: fb.max.z, top: fb.max.y, y0: fb.min.y, y1: fb.max.y });

  // a door that opens
  if (doorInfo) {
    const pivot = new THREE.Group();
    const leaf = inst(isBrick ? 'Door_2_Round' : 'Door_1_Flat');
    leaf.position.set(0, 0, 0);
    pivot.add(leaf);
    const hinge = new THREE.Vector3(-0.53, 0, -0.08).applyAxisAngle(new THREE.Vector3(0, 1, 0), doorInfo.rot).add(new THREE.Vector3(doorInfo.x, 0, doorInfo.z));
    pivot.position.copy(hinge);
    pivot.rotation.y = doorInfo.rot;
    group.add(pivot);
    group.updateMatrixWorld(true);
    world.addDoor(pivot, doorInfo.rot + rot);
  }

  // helper to place furniture in house-local coordinates
  const local = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(new THREE.Vector3(x, 0, z));
  return { group, local, floorY: group.position.y + 0.03, rot, W, D };
}

export function procInst(name) { return procModel(name).instance(); }
