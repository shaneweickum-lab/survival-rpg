// Asset loading: OBJ models from the repo's packs, mapped onto shared materials.
// Each loaded model becomes a "ModelDef": a list of { geometry, material } parts,
// merged per material so they can be cloned cheaply or instanced by the thousand.
import * as THREE from 'three';
import { OBJLoader } from '../../vendor/three/addons/OBJLoader.js';
import { mergeGeometries } from '../../vendor/three/addons/BufferGeometryUtils.js';
import { makeProceduralTexture } from './proctex.js';

const MODEL_ROOT = 'assets/models/';
const TEX_ROOT = 'assets/textures/';

const texLoader = new THREE.TextureLoader();
const texCache = new Map();
function tex(name, srgb = true) {
  const key = name + srgb;
  if (!texCache.has(key)) {
    const t = texLoader.load(TEX_ROOT + name);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4;
    texCache.set(key, t);
  }
  return texCache.get(key);
}

// The trim-sheet sets shipped with the furniture/props pack.
function trimMaterial(set) {
  const orm = tex(`T_Trim_${set}_ORM.jpg`, false);
  return new THREE.MeshStandardMaterial({
    map: tex(`T_Trim_${set}_BaseColor.jpg`),
    normalMap: tex(`T_Trim_${set}_Normal.jpg`, false),
    roughnessMap: orm, metalnessMap: orm, aoMap: orm,
    metalness: set === 'Metal' ? 0.55 : 0.15, roughness: 1,
  });
}

// Colors for materials whose textures were not shipped (village kit) or are placeholders (trees).
const OVERRIDES = {
  Bark: { color: 0x5a4030, tex: 'bark' },
  Birch_Bark: { color: 0xd8d2c4, tex: 'birch' },
  Tree_Leaves: { color: 0x4f7a32, tex: 'leaves' },
  Birch_Leaves: { color: 0x7d9a3a, tex: 'leaves' },
  Pine_Leaves: { color: 0x2f5a35, tex: 'leaves' },
  MI_Plaster: { color: 0xd9ccb0, tex: 'plaster' },
  MI_WoodTrim: { color: 0x6b4a2e, tex: 'wood' },
  MI_WoodTrim_Wear: { color: 0x5d4128, tex: 'wood' },
  MI_RockTrim: { color: 0x8a8378, tex: 'stone' },
  MI_Brick: { color: 0x9a5a42, tex: 'brick' },
  MI_RedBrick: { color: 0x8a3b2c, tex: 'brick' },
  MI_UnevenBrick: { color: 0x8c7f6c, tex: 'stone' },
  MI_RoundTiles: { color: 0x8a3f2a, tex: 'tiles' },
  MI_MetalOrnaments: { color: 0x2a2a2e, metal: 0.7 },
  MI_WindowGlass: { color: 0x9ec4c8, glass: true },
  MI_Vine: { color: 0x3d6b2a, tex: 'leaves' },
};

function parseMtl(text) {
  const mats = {};
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('newmtl ')) { cur = mats[line.slice(7).trim()] = { kd: [0.8, 0.8, 0.8] }; }
    else if (cur && line.startsWith('Kd ')) cur.kd = line.split(/\s+/).slice(1, 4).map(Number);
    else if (cur && line.startsWith('map_Kd ')) cur.map = line.slice(7).trim();
    else if (cur && line.startsWith('d ')) cur.d = Number(line.split(/\s+/)[1]);
  }
  return mats;
}

const materialCache = new Map();
function resolveMaterial(name, info) {
  const map = info?.map || '';
  const trim = map.match(/T_Trim_(\w+?)_BaseColor/);
  const key = trim ? 'trim:' + trim[1] : OVERRIDES[name] ? 'ov:' + name : 'kd:' + name + ':' + (info?.kd || []).join(',');
  if (materialCache.has(key)) return materialCache.get(key);
  let mat;
  if (trim) mat = trimMaterial(trim[1]);
  else if (name === 'MI_Page_Empty') mat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, map: tex('T_Page_Noise.jpg'), roughness: 0.95 });
  else if (OVERRIDES[name]) {
    const o = OVERRIDES[name];
    mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: o.glass ? 0.1 : 0.9, metalness: o.metal || 0 });
    if (o.tex) mat.map = makeProceduralTexture(o.tex);
    if (o.tex) mat.color.set(0xffffff);
    if (o.glass) { mat.transparent = true; mat.opacity = 0.45; }
    if (o.tex === 'leaves') { mat.color.set(o.color).multiplyScalar(1.6); }
    if (name.startsWith('MI_')) mat.side = THREE.DoubleSide; // kit walls are one-sided; seen from inside they vanish
  } else {
    const kd = info?.kd || [0.8, 0.8, 0.8];
    const lower = name.toLowerCase();
    mat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0 });
    mat.color.setRGB(kd[0], kd[1], kd[2]);
    if (/gold|golden/.test(lower)) { mat.metalness = 0.8; mat.roughness = 0.3; mat.color.multiplyScalar(1.6); }
    if (/steel|metal/.test(lower)) { mat.metalness = 0.6; mat.roughness = 0.4; mat.color.multiplyScalar(1.8); }
    if (lower === 'glass') { mat.transparent = true; mat.opacity = 0.35; mat.roughness = 0.05; }
    if (lower.startsWith('liquid')) { mat.emissive.copy(mat.color).multiplyScalar(0.5); }
    if (/crystal|snowflake|cyan|teal/.test(lower)) { mat.emissive.copy(mat.color).multiplyScalar(0.25); }
  }
  mat.name = name;
  materialCache.set(key, mat);
  return mat;
}

// Split a (non-indexed) OBJLoader geometry by its material groups.
function splitGroups(geometry, materials) {
  if (!Array.isArray(materials) || !geometry.groups.length) return [{ geo: geometry, mat: materials }];
  const out = [];
  for (const g of geometry.groups) {
    const sub = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(geometry.attributes)) {
      const size = attr.itemSize;
      sub.setAttribute(name, new THREE.BufferAttribute(attr.array.slice(g.start * size, (g.start + g.count) * size), size));
    }
    out.push({ geo: sub, mat: materials[g.materialIndex] });
  }
  return out;
}

export class ModelDef {
  constructor(name, parts) {
    this.name = name;
    this.parts = parts; // [{ geometry, material }]
    const box = new THREE.Box3();
    for (const p of parts) { p.geometry.computeBoundingBox(); box.union(p.geometry.boundingBox); }
    this.box = box;
    this.size = box.getSize(new THREE.Vector3());
  }
  // A fresh Object3D sharing geometry/materials. `materialFn` may swap materials (tints, ghosts).
  instance(materialFn) {
    const g = new THREE.Group();
    for (const p of this.parts) {
      const m = new THREE.Mesh(p.geometry, materialFn ? materialFn(p.material) : p.material);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
    }
    g.name = this.name;
    return g;
  }
}

const defs = new Map();
const pending = new Map();
const objLoader = new OBJLoader();

export async function loadModel(path) {
  if (defs.has(path)) return defs.get(path);
  if (pending.has(path)) return pending.get(path);
  const p = (async () => {
    const [objText, mtlText] = await Promise.all([
      fetch(MODEL_ROOT + path + '.obj').then(r => { if (!r.ok) throw new Error('missing model ' + path); return r.text(); }),
      fetch(MODEL_ROOT + path + '.mtl').then(r => (r.ok ? r.text() : '')).catch(() => ''),
    ]);
    const mtl = parseMtl(mtlText);
    const group = objLoader.parse(objText);
    group.updateMatrixWorld(true);
    const byMat = new Map();
    group.traverse(o => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const resolved = mats.map(m => resolveMaterial(m.name, mtl[m.name]));
      for (const { geo, mat } of splitGroups(o.geometry, Array.isArray(o.material) ? resolved : resolved[0])) {
        geo.applyMatrix4(o.matrixWorld);
        if (!geo.attributes.normal) geo.computeVertexNormals();
        if (!geo.attributes.uv) {
          geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
        }
        if (!byMat.has(mat)) byMat.set(mat, []);
        byMat.get(mat).push(geo);
      }
    });
    const parts = [];
    for (const [material, geos] of byMat) {
      for (const g of geos) for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      parts.push({ geometry, material });
    }
    const def = new ModelDef(path, parts);
    defs.set(path, def);
    return def;
  })();
  pending.set(path, p);
  return p;
}

export function getModel(path) {
  const d = defs.get(path);
  if (!d) throw new Error('Model not preloaded: ' + path);
  return d;
}

export async function preload(paths, onProgress) {
  let done = 0;
  const unique = [...new Set(paths)];
  await Promise.all(unique.map(p => loadModel(p).catch(e => { console.warn(e.message); }).then(() => onProgress?.(++done / unique.length, p))));
}

// Material variants, cached so tinted copies are shared.
const tintCache = new Map();
export function tinted(mat, color, key = '') {
  const k = mat.uuid + ':' + color + ':' + key;
  if (!tintCache.has(k)) {
    const m = mat.clone();
    m.color = new THREE.Color(color);
    if (m.map) m.color.multiplyScalar(1.4);
    tintCache.set(k, m);
  }
  return tintCache.get(k);
}
