// The vale: a heightfield shaped around named places, with biome coloring and a mere.
import * as THREE from 'three';
import { Simplex2, smoothstep, lerp, clamp } from '../engine/noise.js';
import { makeProceduralTexture } from '../engine/proctex.js';
import { PLACES, WORLD_SIZE, WATER_LEVEL } from '../data/places.js';

const SEG = 256;
const noise = new Simplex2(1337);
const noise2 = new Simplex2(4242);

export const ROADS = [
  [[0, 0], [10, 40], [-4, 72]],
  [[0, 0], [-40, -6], [-80, -4], [-105, -8]],
  [[0, 0], [-8, -60], [-20, -120], [-28, -150]],
  [[0, 0], [40, -30], [90, -80], [120, -112]],
  [[0, 0], [-50, 50], [-100, 105]],
  [[30, 70], [80, 100], [105, 115]],
];

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
export function roadDistance(x, z) {
  let d = Infinity;
  for (const road of ROADS) for (let i = 0; i < road.length - 1; i++) d = Math.min(d, distToSeg(x, z, road[i][0], road[i][1], road[i + 1][0], road[i + 1][1]));
  return d;
}

const near = (p, x, z) => Math.hypot(x - p.x, z - p.z) / p.r;

// The analytic height. The mesh samples this; physics samples the mesh grid.
export function rawHeight(x, z) {
  let h = 7 + noise.fbm(x / 200, z / 200, 4) * 12 + noise2.fbm(x / 45, z / 45, 3) * 3;

  // hills and highlands
  const hills = 1 - smoothstep(0.2, 1.3, near(PLACES.copper_hills, x, z));
  h += hills * (10 + Math.abs(noise.noise(x / 25, z / 25)) * 9);
  const pine = 1 - smoothstep(0.1, 1.4, near(PLACES.pinewood, x, z));
  h += pine * (14 + noise2.fbm(x / 30, z / 30, 3) * 6);
  const barrow = 1 - smoothstep(0.0, 1.0, near(PLACES.barrow, x, z));
  h += barrow * 5;

  // the hollow: a sunken basin inside a broken rim
  const dh = near(PLACES.hollow, x, z);
  h = lerp(h, 2.2 + noise.noise(x / 12, z / 12) * 0.6, 1 - smoothstep(0.55, 0.95, dh));
  h += Math.exp(-Math.pow((dh - 1.05) * 4, 2)) * (6 + noise2.noise(x / 9, z / 9) * 3);

  // marsh flats
  const marsh = 1 - smoothstep(0.4, 1.1, near(PLACES.marsh, x, z));
  h = lerp(h, 0.9 + noise.noise(x / 8, z / 8) * 1.1, marsh);

  // the mere
  const dm = near(PLACES.mere, x, z) + noise2.noise(x / 30, z / 30) * 0.15;
  h = lerp(h, -4.5, 1 - smoothstep(0.35, 1.0, dm));

  // village plateau
  const dv = near(PLACES.village, x, z);
  h = lerp(h, 6, 1 - smoothstep(0.75, 1.25, dv));

  // roads are worn a little flatter
  const rd = roadDistance(x, z);
  if (rd < 5 && dv > 0.8) h = lerp(h, Math.max(h - 0.3, 1.2), 1 - rd / 5);

  // the edge of the world: mountains
  const r = Math.max(Math.abs(x), Math.abs(z));
  h += smoothstep(WORLD_SIZE / 2 - 70, WORLD_SIZE / 2 - 5, r) * (45 + noise.fbm(x / 40, z / 40, 3) * 20);
  return h;
}

export class Terrain {
  constructor() {
    this.size = WORLD_SIZE;
    this.seg = SEG;
    this.cell = WORLD_SIZE / SEG;
    const n = SEG + 1;
    this.heights = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      this.heights[j * n + i] = rawHeight(-WORLD_SIZE / 2 + i * this.cell, -WORLD_SIZE / 2 + j * this.cell);
    }
    this.mesh = this.buildMesh();
    this.water = this.buildWater();
  }

  heightAt(x, z) {
    const n = SEG + 1;
    const gx = (x + this.size / 2) / this.cell, gz = (z + this.size / 2) / this.cell;
    const i = clamp(Math.floor(gx), 0, SEG - 1), j = clamp(Math.floor(gz), 0, SEG - 1);
    const fx = clamp(gx - i, 0, 1), fz = clamp(gz - j, 0, 1);
    const h00 = this.heights[j * n + i], h10 = this.heights[j * n + i + 1];
    const h01 = this.heights[(j + 1) * n + i], h11 = this.heights[(j + 1) * n + i + 1];
    if (fx + fz <= 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  }

  normalAt(x, z, out = new THREE.Vector3()) {
    const e = 1;
    return out.set(this.heightAt(x - e, z) - this.heightAt(x + e, z), 2 * e, this.heightAt(x, z - e) - this.heightAt(x, z + e)).normalize();
  }

  slopeAt(x, z) { return 1 - this.normalAt(x, z).y; }

  biomeColor(x, z, h, slope, out) {
    const grassA = new THREE.Color(0x5d7a35), grassB = new THREE.Color(0x748a3c);
    const v = noise2.noise(x / 18, z / 18) * 0.5 + 0.5;
    out.copy(grassA).lerp(grassB, v);
    const mix = (hex, t) => { if (t > 0) out.lerp(new THREE.Color(hex), clamp(t, 0, 1)); };
    mix(0x3f5a32, 1 - smoothstep(0.2, 1.2, near(PLACES.pinewood, x, z))); // needles
    mix(0x4a5a30, (1 - smoothstep(0.3, 1.1, near(PLACES.marsh, x, z))) * 0.9); // marsh
    mix(0x4a4038, (1 - smoothstep(0.5, 1.05, near(PLACES.hollow, x, z))) * 0.9); // ash-grey hollow
    mix(0x8a7a3a, (1 - smoothstep(0.2, 1.0, near(PLACES.wasp_grove, x, z))) * 0.5); // dry gold grove
    mix(0x7a6a50, (1 - smoothstep(0.6, 0.85, near(PLACES.village, x, z))) * 0.55); // trodden village
    const rd = roadDistance(x, z);
    mix(0x7a6448, (1 - smoothstep(1.2, 3.2, rd)) * 0.85); // roads
    mix(0xb8a678, 1 - smoothstep(0.6, 1.8, h - WATER_LEVEL)); // shore sand
    mix(0x6a6450, smoothstep(-0.8, -3, h)); // lakebed
    mix(0x7a7268, smoothstep(0.18, 0.4, slope)); // rock on steep slopes
    mix(0xe8e8f0, smoothstep(38, 50, h)); // snow on the rim
    return out;
  }

  buildMesh() {
    const n = SEG + 1;
    const pos = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2), col = new Float32Array(n * n * 3);
    const c = new THREE.Color();
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = j * n + i, x = -this.size / 2 + i * this.cell, z = -this.size / 2 + j * this.cell, h = this.heights[k];
      pos.set([x, h, z], k * 3);
      uv.set([x / 4, z / 4], k * 2);
      this.biomeColor(x, z, h, this.slopeAt(x, z), c);
      col.set([c.r, c.g, c.b], k * 3);
    }
    const idx = new Uint32Array(SEG * SEG * 6);
    let p = 0;
    for (let j = 0; j < SEG; j++) for (let i = 0; i < SEG; i++) {
      const v00 = j * n + i, v10 = v00 + 1, v01 = v00 + n, v11 = v01 + 1;
      idx.set([v00, v01, v10, v10, v01, v11], p); p += 6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    const tex = makeProceduralTexture('grass', 256);
    const mat = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.95 });
    const mesh = new THREE.Mesh(g, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    return mesh;
  }

  buildWater() {
    const g = new THREE.PlaneGeometry(this.size, this.size, 1, 1);
    g.rotateX(-Math.PI / 2);
    const tex = makeProceduralTexture('leaves', 256).clone();
    tex.needsUpdate = true;
    tex.repeat.set(90, 90);
    const mat = new THREE.MeshPhongMaterial({ color: 0x3a6878, specular: 0x8899aa, shininess: 90, transparent: true, opacity: 0.8, bumpMap: tex, bumpScale: 0.6 });
    const m = new THREE.Mesh(g, mat);
    m.position.y = WATER_LEVEL;
    m.name = 'water';
    this.waterTex = tex;
    return m;
  }

  update(dt) { this.waterTex.offset.x += dt * 0.004; this.waterTex.offset.y += dt * 0.002; }

  // Paint a small top-down map image of the terrain.
  mapCanvas(px = 320) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(px, px);
    const c = new THREE.Color();
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
      const wx = (x / px - 0.5) * this.size, wz = (y / px - 0.5) * this.size, h = this.heightAt(wx, wz);
      if (h < WATER_LEVEL) c.set(0x2a4a5a).lerp(new THREE.Color(0x1a2a3a), clamp(-h / 5, 0, 1));
      else this.biomeColor(wx, wz, h, this.slopeAt(wx, wz), c);
      const shade = 0.75 + clamp((this.heightAt(wx - 2, wz - 2) - h) * 0.15, -0.25, 0.25);
      const k = (y * px + x) * 4;
      img.data[k] = c.r * 255 * shade; img.data[k + 1] = c.g * 255 * shade; img.data[k + 2] = c.b * 255 * shade; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}
