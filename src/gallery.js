// Asset gallery: browse every model pack in the repo. Open gallery.html?pack=props
import * as THREE from 'three';
import { PointerLockControls } from '../vendor/three/addons/PointerLockControls.js';
import { loadModel } from './engine/assets.js';
import { MANIFEST } from './data/manifest.js';

const params = new URLSearchParams(location.search);
const pack = params.get('pack') || 'props';
const bar = document.getElementById('bar');
for (const p of Object.keys(MANIFEST)) {
  const b = document.createElement('button');
  b.textContent = p; b.onclick = () => { location.search = '?pack=' + p; };
  bar.appendChild(b);
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a241e);
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x403020, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(5, 10, 8);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 500);

const names = MANIFEST[pack];
const cols = Math.ceil(Math.sqrt(names.length));
const cell = { props: 2.6, items: 2.6, nature: 10, creatures: 8, village: 10 }[pack] || 3;
const labels = [];
await Promise.all(names.map(async (n, i) => {
  const def = await loadModel(`${pack}/${n}`);
  const obj = def.instance();
  const x = (i % cols) * cell, z = Math.floor(i / cols) * cell;
  obj.position.set(x - def.box.getCenter(new THREE.Vector3()).x, -def.box.min.y, z);
  scene.add(obj);
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(x, 0.02, z), cell * 0.3, 0xff4040);
  scene.add(arrow);
  const el = document.createElement('div');
  el.className = 'lbl'; el.textContent = n; document.body.appendChild(el);
  labels.push({ el, pos: new THREE.Vector3(x, -0.15, z + cell * 0.35) });
}));
const grid = new THREE.Mesh(new THREE.PlaneGeometry(cols * cell + cell, cols * cell + cell), new THREE.MeshStandardMaterial({ color: 0x3a3228 }));
grid.rotation.x = -Math.PI / 2;
grid.position.set((cols - 1) * cell / 2, 0, (cols - 1) * cell / 2);
scene.add(grid);

const span = cols * cell;
camera.position.set(span / 2 - cell / 2, span * 0.75, span * 1.25);
camera.lookAt(span / 2 - cell / 2, 0, span / 2 - cell / 2);
const controls = new PointerLockControls(camera, document.body);
renderer.domElement.addEventListener('click', () => controls.lock());
const keys = {};
addEventListener('keydown', e => keys[e.code] = true);
addEventListener('keyup', e => keys[e.code] = false);
const v = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const sp = keys.ShiftLeft ? 0.6 : 0.2;
  if (keys.KeyW) controls.moveForward(sp); if (keys.KeyS) controls.moveForward(-sp);
  if (keys.KeyD) controls.moveRight(sp); if (keys.KeyA) controls.moveRight(-sp);
  if (keys.KeyE) camera.position.y += sp; if (keys.KeyQ) camera.position.y -= sp;
  renderer.render(scene, camera);
  for (const l of labels) {
    v.copy(l.pos).project(camera);
    l.el.style.display = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 ? '' : 'none';
    l.el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px';
    l.el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
  }
});
window.galleryReady = true;
