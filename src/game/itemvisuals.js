// Turning items into 3D objects (in the world, in the hand) and into inventory icons.
import * as THREE from 'three';
import { getModel, tinted } from '../engine/assets.js';
import { procModel } from '../engine/procmodels.js';
import { ITEMS } from '../data/items.js';

export function itemModelPaths() {
  return [...new Set(Object.values(ITEMS).filter(i => i.model && !i.proc).map(i => i.model))];
}

function defFor(it) { return it.proc ? procModel(it.proc) : getModel(it.model); }

function materialFn(it) {
  if (it.tint) return m => tinted(m, it.tint);
  if (it.tints) return m => (it.tints[m.name] !== undefined ? tinted(m, it.tints[m.name]) : m);
  return null;
}

// A new object for the item, scaled so its longest side equals `size`, resting on y = 0, centered.
export function makeItemObject(id, size = 0.4) {
  const it = ITEMS[id];
  const def = defFor(it);
  const obj = def.instance(materialFn(it));
  const s = size / Math.max(def.size.x, def.size.y, def.size.z, 0.001);
  const inner = new THREE.Group();
  inner.add(obj);
  obj.scale.setScalar(s);
  const c = def.box.getCenter(new THREE.Vector3());
  obj.position.set(-c.x * s, -def.box.min.y * s, -c.z * s);
  inner.userData.itemId = id;
  return inner;
}

// Icons are rendered once with a small offscreen renderer.
let iconRenderer, iconScene, iconCam;
const icons = new Map();
export function itemIcon(id) {
  if (icons.has(id)) return icons.get(id);
  if (!iconRenderer) {
    iconRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    iconRenderer.setSize(96, 96);
    iconRenderer.outputColorSpace = THREE.SRGBColorSpace;
    iconScene = new THREE.Scene();
    iconScene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a3020, 2.2));
    const d = new THREE.DirectionalLight(0xffffff, 2.2);
    d.position.set(2, 3, 4);
    iconScene.add(d);
    iconCam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  }
  const it = ITEMS[id];
  const obj = makeItemObject(id, 1);
  const def = defFor(it);
  // lay long thin things diagonally so they read well
  const sz = def.size;
  if (sz.y > sz.x * 1.8 && sz.y > sz.z * 1.8) obj.rotation.z = -Math.PI / 4;
  else if (sz.x > sz.y * 2.5) obj.rotation.z = Math.PI / 8;
  obj.rotation.y = Math.PI / 6;
  const pivot = new THREE.Group();
  pivot.add(obj);
  const box = new THREE.Box3().setFromObject(pivot);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.sub(c);
  iconScene.add(pivot);
  const r = box.getSize(new THREE.Vector3()).length() / 2;
  iconCam.position.set(0, r * 0.6, r * 3.4);
  iconCam.lookAt(0, 0, 0);
  iconRenderer.render(iconScene, iconCam);
  const url = iconRenderer.domElement.toDataURL();
  iconScene.remove(pivot);
  icons.set(id, url);
  return url;
}
