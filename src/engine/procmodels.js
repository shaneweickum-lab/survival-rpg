// Small hand-built models for things the asset packs do not include.
import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/three/addons/BufferGeometryUtils.js';
import { ModelDef } from './assets.js';
import { mulberry32 } from './noise.js';
import { makeProceduralTexture } from './proctex.js';

const matCache = new Map();
export function flatMat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    const { texture, ...rest } = opts;
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...rest });
    if (texture) m.map = makeProceduralTexture(texture);
    matCache.set(key, m);
  }
  return matCache.get(key);
}

// Build a def from [geometry, color|material, transform?] pieces; pieces sharing a color are merged.
function build(name, pieces) {
  const groups = new Map();
  for (const [geo, c, tf] of pieces) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (tf) g.applyMatrix4(tf);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const mat = c instanceof THREE.Material ? c : flatMat(c);
    if (!groups.has(mat)) groups.set(mat, []);
    groups.get(mat).push(g);
  }
  const parts = [...groups].map(([material, geos]) => ({ material, geometry: geos.length > 1 ? mergeGeometries(geos) : geos[0] }));
  return new ModelDef(name, parts);
}

const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
const MS = (x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

function lumpy(radius, detail, seed, amt = 0.25) {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  const pos = g.attributes.position, rand = mulberry32(seed), v = new THREE.Vector3();
  const seen = new Map();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!seen.has(k)) seen.set(k, 1 + (rand() - 0.5) * 2 * amt);
    v.multiplyScalar(seen.get(k));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const BUILDERS = {
  stick: () => build('stick', [[new THREE.CylinderGeometry(0.025, 0.03, 0.7, 5), 0x6a4a2a, M(0, 0.03, 0, 0, 0, Math.PI / 2)], [new THREE.CylinderGeometry(0.012, 0.015, 0.18, 4), 0x6a4a2a, M(0.12, 0.06, 0.04, 0, 0, Math.PI / 3)]]),
  stone: () => build('stone', [[lumpy(0.12, 0, 3), 0x8a8378, MS(0, 0.07, 0, 1, 0.65, 0.85)]]),
  flint: () => build('flint', [[lumpy(0.09, 0, 9, 0.4), 0x3a3c44, MS(0, 0.05, 0, 1.2, 0.5, 0.8)]]),
  fiber: () => build('fiber', [0, 1, 2, 3, 4].map(i => [new THREE.ConeGeometry(0.03, 0.6, 3), 0x9aa050, M(Math.sin(i) * 0.04, 0.3, Math.cos(i) * 0.04, Math.sin(i * 2) * 0.2, 0, Math.cos(i * 3) * 0.2)])),
  log: () => build('log', [[new THREE.CylinderGeometry(0.16, 0.18, 1.0, 8), flatMat(0xffffff, { texture: 'bark' }), M(0, 0.17, 0, 0, 0, Math.PI / 2)], [new THREE.CircleGeometry(0.16, 8), 0xc8a070, M(0.501, 0.17, 0, 0, Math.PI / 2, 0)]]),
  pinelog: () => build('pinelog', [[new THREE.CylinderGeometry(0.14, 0.15, 1.2, 8), 0x6a4030, M(0, 0.15, 0, 0, 0, Math.PI / 2)], [new THREE.CircleGeometry(0.14, 8), 0xe0b080, M(0.601, 0.15, 0, 0, Math.PI / 2, 0)]]),
  deadwood: () => build('deadwood', [[new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6), 0x8a8070, M(0, 0.1, 0, 0, 0, Math.PI / 2)], [new THREE.CylinderGeometry(0.03, 0.04, 0.3, 4), 0x8a8070, M(0.2, 0.18, 0, 0, 0, 0.6)]]),
  plank: () => build('plank', [[new THREE.BoxGeometry(1.0, 0.04, 0.2), 0xb08050, M(0, 0.02, 0)], [new THREE.BoxGeometry(1.0, 0.04, 0.2), 0xa07040, M(0, 0.06, 0.02, 0, 0.1, 0)]]),
  silk: () => build('silk', [[new THREE.TorusGeometry(0.1, 0.04, 6, 10), 0xe8e8f0, M(0, 0.05, 0, Math.PI / 2)], [new THREE.SphereGeometry(0.07, 6, 5), 0xf0f0f8, M(0, 0.06, 0)]]),
  chitin: () => build('chitin', [[new THREE.SphereGeometry(0.18, 6, 4, 0, Math.PI, 0, Math.PI / 2), 0x1a1418, MS(0, 0, 0, 1, 0.5, 0.7)]]),
  venom: () => build('venom', [[new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ color: 0x6aa83a, emissive: 0x2a5010, roughness: 0.3 }), MS(0, 0.07, 0, 1, 1.3, 1)]]),
  ash: () => build('ash', [[new THREE.ConeGeometry(0.14, 0.12, 7), new THREE.MeshStandardMaterial({ color: 0x9aa0b0, emissive: 0x304060, flatShading: true }), M(0, 0.06, 0)]]),
  slime: () => build('slime', [[new THREE.SphereGeometry(0.09, 7, 5), new THREE.MeshStandardMaterial({ color: 0x9ae0a0, emissive: 0x204020, transparent: true, opacity: 0.8 }), MS(0, 0.04, 0, 1.3, 0.6, 1.1)]]),
  berries: () => build('berries', [...Array(7)].map((_, i) => [new THREE.SphereGeometry(0.035, 6, 5), 0x8a1a3a, M(Math.cos(i) * 0.05, 0.04 + (i % 3) * 0.02, Math.sin(i * 1.7) * 0.05)])),
  apple: () => build('apple', [[new THREE.SphereGeometry(0.07, 8, 6), 0xb02a20, MS(0, 0.07, 0, 1, 0.9, 1)], [new THREE.CylinderGeometry(0.005, 0.005, 0.04, 3), 0x4a3020, M(0, 0.145, 0)]]),
  mushroom: () => build('mushroom', [[new THREE.CylinderGeometry(0.03, 0.04, 0.14, 6), 0xe0d8c0, M(0, 0.07, 0)], [new THREE.SphereGeometry(0.09, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0x5a3a6a, MS(0, 0.13, 0, 1, 0.7, 1)]]),
  mushroom_cooked: () => build('mushroom_c', [[new THREE.CylinderGeometry(0.03, 0.04, 0.14, 6), 0x8a6a40, M(0, 0.07, 0)], [new THREE.SphereGeometry(0.09, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0x3a2418, MS(0, 0.13, 0, 1, 0.7, 1)]]),
  moonpetal: () => herb(0x8ab0ff, 0x3a6a3a, true),
  bloodroot: () => herb(0xb0202a, 0x4a5a2a, false),
  ashleaf: () => herb(0xa0a8a0, 0x707a70, false),
  honey: () => build('honey', [[new THREE.CylinderGeometry(0.1, 0.1, 0.05, 6), 0xe0a020, M(0, 0.025, 0)], [new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6), 0xf0c040, M(0.09, 0.025, 0.05)]]),
  fish: () => fish(0x9ab0c0),
  fish_cooked: () => fish(0xa07040),
  cake: () => build('cake', [[new THREE.CylinderGeometry(0.12, 0.13, 0.08, 10), 0xc89040, M(0, 0.04, 0)], [new THREE.CylinderGeometry(0.12, 0.12, 0.015, 10), 0xf0c050, M(0, 0.088, 0)]]),
  bandage: () => build('bandage', [[new THREE.CylinderGeometry(0.06, 0.06, 0.09, 10), 0xe8e0d0, M(0, 0.06, 0, 0, 0, Math.PI / 2)], [new THREE.BoxGeometry(0.15, 0.005, 0.07), 0xe0d8c8, M(0.1, 0.003, 0)]]),
  poultice: () => build('poultice', [[new THREE.SphereGeometry(0.08, 6, 4), 0x5a7a3a, MS(0, 0.04, 0, 1.2, 0.5, 1)], [new THREE.TorusGeometry(0.07, 0.01, 4, 10), 0xd0c8b0, M(0, 0.04, 0, Math.PI / 2)]]),
  rod: () => build('rod', [[new THREE.CylinderGeometry(0.008, 0.02, 1.4, 5), 0x8a6a3a, M(0, 0.7, 0)], [new THREE.TorusGeometry(0.03, 0.008, 4, 8), 0x6a6a6a, M(0, 0.3, 0.03, 0, Math.PI / 2)]]),
  club: () => build('club', [[new THREE.CylinderGeometry(0.07, 0.03, 0.8, 6), flatMat(0xffffff, { texture: 'bark' }), M(0, 0.4, 0)], [lumpy(0.08, 0, 4), 0x5a3a20, M(0, 0.72, 0.02)]]),
  campfire: () => {
    const p = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; p.push([lumpy(0.14, 0, i + 1), 0x7a7268, MS(Math.cos(a) * 0.55, 0.06, Math.sin(a) * 0.55, 1, 0.7, 1)]); }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.3; p.push([new THREE.CylinderGeometry(0.05, 0.06, 0.7, 6), 0x5a3a22, M(Math.cos(a) * 0.15, 0.2, Math.sin(a) * 0.15, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9)]); }
    p.push([new THREE.CircleGeometry(0.45, 9), 0x2a2420, M(0, 0.01, 0, -Math.PI / 2)]);
    return build('campfire', p);
  },
  bloomery: () => build('bloomery', [
    [new THREE.CylinderGeometry(0.45, 0.7, 1.5, 9), flatMat(0xffffff, { texture: 'stone' }), M(0, 0.75, 0)],
    [new THREE.CylinderGeometry(0.22, 0.3, 0.4, 8, 1, true), 0x4a4038, M(0, 1.65, 0)],
    [new THREE.BoxGeometry(0.4, 0.35, 0.3), new THREE.MeshStandardMaterial({ color: 0x200800, emissive: 0xff5010, emissiveIntensity: 1.2 }), M(0, 0.35, 0.55)],
    [new THREE.BoxGeometry(1.6, 0.12, 0.25), 0x5a3a22, M(0, 1.25, 0.35, 0.2)],
  ]),
  bedroll: () => build('bedroll', [[new THREE.BoxGeometry(0.85, 0.08, 1.9), 0x7a5a3a, M(0, 0.04, 0)], [new THREE.CylinderGeometry(0.12, 0.12, 0.85, 8), 0x8a6a4a, M(0, 0.12, -0.85, 0, 0, Math.PI / 2)], [new THREE.BoxGeometry(0.8, 0.03, 1.2), 0x5a6a4a, M(0, 0.1, 0.3)]]),

  // world-only scenery
  bush: () => {
    const p = [];
    for (let i = 0; i < 6; i++) { const a = i * 1.3; p.push([lumpy(0.45, 0, 30 + i, 0.2), 0x3a5a2a, M(Math.cos(a) * 0.35, 0.45 + (i % 2) * 0.2, Math.sin(a) * 0.35)]); }
    return build('bush', p);
  },
  berrybush: () => {
    const p = [];
    for (let i = 0; i < 5; i++) { const a = i * 1.3; p.push([lumpy(0.4, 0, 40 + i, 0.2), 0x2f5a2a, M(Math.cos(a) * 0.3, 0.4 + (i % 2) * 0.15, Math.sin(a) * 0.3)]); }
    for (let i = 0; i < 18; i++) { const a = i * 2.4, r = 0.55 + (i % 3) * 0.1; p.push([new THREE.SphereGeometry(0.05, 5, 4), 0x9a1a3a, M(Math.cos(a) * r, 0.35 + (i % 5) * 0.12, Math.sin(a) * r)]); }
    return build('berrybush', p);
  },
  reeds: () => build('reeds', [...Array(9)].map((_, i) => [new THREE.ConeGeometry(0.04, 1.4 + (i % 3) * 0.3, 3), 0x8a9a4a, M(Math.cos(i * 2.1) * 0.25, 0.7, Math.sin(i * 2.1) * 0.25, Math.sin(i) * 0.15, 0, Math.cos(i) * 0.15)])),
  tuft: () => build('tuft', [...Array(5)].map((_, i) => [new THREE.ConeGeometry(0.035, 0.28 + (i % 3) * 0.08, 3), 0x587a30, M(Math.cos(i * 2.5) * 0.09, 0.14, Math.sin(i * 2.5) * 0.09, Math.sin(i) * 0.35, 0, Math.cos(i) * 0.35)])),
  grass: () => build('grass', [...Array(7)].map((_, i) => [new THREE.ConeGeometry(0.05, 0.5 + (i % 3) * 0.15, 3), 0x6a8a3a, M(Math.cos(i * 2.3) * 0.15, 0.25, Math.sin(i * 2.3) * 0.15, Math.sin(i) * 0.3, 0, Math.cos(i) * 0.3)])),
  hive: () => build('hive', [[lumpy(0.6, 1, 77, 0.12), 0xb08030, MS(0, 0.9, 0, 1, 1.4, 1)], [new THREE.CircleGeometry(0.15, 8), 0x1a1008, M(0, 0.6, 0.62)], [new THREE.CylinderGeometry(0.08, 0.15, 0.5, 5), 0x5a3a22, M(0, 0.15, 0)]]),
  boulder: () => build('boulder', [[lumpy(1, 1, 101, 0.22), flatMat(0xffffff, { texture: 'stone' }), MS(0, 0.55, 0, 1.2, 0.85, 1)]]),
  bigrock: () => build('bigrock', [[lumpy(1, 1, 202, 0.3), flatMat(0xffffff, { texture: 'stone' }), MS(0, 0.5, 0, 1, 1, 1)]]),
  stump: () => build('stump', [[new THREE.CylinderGeometry(0.32, 0.4, 0.45, 8), flatMat(0xffffff, { texture: 'bark' }), M(0, 0.22, 0)], [new THREE.CircleGeometry(0.32, 8), 0xc8a070, M(0, 0.451, 0, -Math.PI / 2)]]),
  cobweb: () => build('cobweb', [[new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: webTexture(), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }), M(0, 1.3, 0)]]),
  torch: () => build('torch', [
    [new THREE.CylinderGeometry(0.022, 0.028, 0.55, 6), 0x5a3a22, M(0, 0.275, 0)],
    [new THREE.CylinderGeometry(0.05, 0.035, 0.13, 7), 0x8a7a5a, M(0, 0.58, 0)],
    [new THREE.CylinderGeometry(0.045, 0.05, 0.03, 7), 0x2a1a10, M(0, 0.655, 0)],
  ]),
  well: () => {
    const p = [[new THREE.CylinderGeometry(1.0, 1.05, 0.9, 12, 1, true), flatMat(0xffffff, { texture: 'stone', side: THREE.DoubleSide }), M(0, 0.45, 0)],
      [new THREE.CircleGeometry(0.98, 12), 0x10161a, M(0, 0.3, 0, -Math.PI / 2)],
      [new THREE.TorusGeometry(1.02, 0.1, 5, 12), flatMat(0xffffff, { texture: 'stone' }), M(0, 0.9, 0, Math.PI / 2)]];
    for (const s of [-1, 1]) p.push([new THREE.BoxGeometry(0.15, 2.0, 0.15), 0x5a3a22, M(s * 0.95, 1.0, 0)]);
    p.push([new THREE.ConeGeometry(1.5, 0.8, 4), 0x7a3a2a, M(0, 2.3, 0, 0, Math.PI / 4)]);
    p.push([new THREE.CylinderGeometry(0.08, 0.08, 2.0, 6), 0x6a4a2a, M(0, 1.6, 0, 0, 0, Math.PI / 2)]);
    return build('well', p);
  },
};

function webTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = 'rgba(235,235,245,0.9)';
  ctx.lineWidth = 1.2;
  const spokes = 11, cx = 128, cy = 128;
  for (let i = 0; i < spokes; i++) { const a = (i / spokes) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 126, cy + Math.sin(a) * 126); ctx.stroke(); }
  for (let r = 10; r < 124; r += 9) {
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) { const a = (i / spokes) * Math.PI * 2, rr = r * (0.92 + Math.sin(i * 7 + r) * 0.05); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (i) ctx.quadraticCurveTo(cx + Math.cos(a - 0.3) * rr * 0.93, cy + Math.sin(a - 0.3) * rr * 0.93, x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function herb(flower, leaf, glow) {
  const fm = glow ? new THREE.MeshStandardMaterial({ color: flower, emissive: flower, emissiveIntensity: 0.6, flatShading: true }) : flower;
  const p = [];
  for (let i = 0; i < 5; i++) p.push([new THREE.ConeGeometry(0.04, 0.3, 3), leaf, M(Math.cos(i * 1.3) * 0.05, 0.15, Math.sin(i * 1.3) * 0.05, Math.sin(i) * 0.4, 0, Math.cos(i) * 0.4)]);
  for (let i = 0; i < 3; i++) p.push([new THREE.OctahedronGeometry(0.045, 0), fm, M(Math.cos(i * 2.1) * 0.07, 0.32 + i * 0.02, Math.sin(i * 2.1) * 0.07)]);
  return build('herb', p);
}

function fish(color) {
  return build('fish', [
    [new THREE.SphereGeometry(0.1, 8, 6), color, MS(0, 0.06, 0, 2.2, 0.8, 0.5)],
    [new THREE.ConeGeometry(0.08, 0.14, 4), color, M(-0.28, 0.06, 0, 0, 0, Math.PI / 2)],
    [new THREE.SphereGeometry(0.015, 4, 3), 0x101010, M(0.17, 0.08, 0.04)],
  ]);
}

const procDefs = new Map();
export function procModel(name) {
  if (!procDefs.has(name)) {
    if (!BUILDERS[name]) throw new Error('No procedural model ' + name);
    procDefs.set(name, BUILDERS[name]());
  }
  return procDefs.get(name);
}

export function oreBoulder(color) {
  const key = 'ore' + color;
  if (!procDefs.has(key)) {
    const p = [[lumpy(1, 1, 101, 0.22), flatMat(0xffffff, { texture: 'stone' }), MS(0, 0.55, 0, 1.2, 0.85, 1)]];
    const rand = mulberry32(color & 0xffff);
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2, h = 0.3 + rand() * 0.6;
      p.push([new THREE.OctahedronGeometry(0.12 + rand() * 0.1, 0), new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4, flatShading: true, emissive: color, emissiveIntensity: 0.08 }), M(Math.cos(a) * 1.05, h, Math.sin(a) * 0.9, rand(), rand(), rand())]);
    }
    procDefs.set(key, build(key, p));
  }
  return procDefs.get(key);
}
