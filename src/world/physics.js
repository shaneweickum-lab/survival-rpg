// Simple collision world: vertical circles and boxes in a spatial hash, plus walkable platforms.
import * as THREE from 'three';

const CELL = 8;

export class Colliders {
  constructor() { this.grid = new Map(); this.all = new Set(); }

  _keys(minX, minZ, maxX, maxZ) {
    const out = [];
    for (let i = Math.floor(minX / CELL); i <= Math.floor(maxX / CELL); i++)
      for (let j = Math.floor(minZ / CELL); j <= Math.floor(maxZ / CELL); j++) out.push(i + ',' + j);
    return out;
  }

  add(c) {
    // c: { kind:'circle', x, z, r, y0, y1 } | { kind:'box', minX, maxX, minZ, maxZ, y0, y1, top? }
    const [a, b, cc, d] = c.kind === 'circle' ? [c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r] : [c.minX, c.minZ, c.maxX, c.maxZ];
    c._keys = this._keys(a, b, cc, d);
    for (const k of c._keys) { if (!this.grid.has(k)) this.grid.set(k, new Set()); this.grid.get(k).add(c); }
    c.enabled = c.enabled ?? true;
    this.all.add(c);
    return c;
  }

  remove(c) {
    if (!c?._keys) return;
    for (const k of c._keys) this.grid.get(k)?.delete(c);
    this.all.delete(c);
  }

  query(x, z, r) {
    const out = new Set();
    for (const k of this._keys(x - r, z - r, x + r, z + r)) for (const c of this.grid.get(k) || []) if (c.enabled) out.add(c);
    return out;
  }

  // Box collider from an object's world-space bounding box (works for 90° rotations).
  addBoxFromObject(obj, opts = {}) {
    const box = new THREE.Box3().setFromObject(obj);
    const shrink = opts.shrink ?? 0;
    return this.add({ kind: 'box', minX: box.min.x + shrink, maxX: box.max.x - shrink, minZ: box.min.z + shrink, maxZ: box.max.z - shrink, y0: box.min.y, y1: box.max.y, ...opts });
  }

  // Push a vertical capsule (feet y, height h, radius r) out of colliders. Returns ground height from platforms.
  resolve(pos, r, h, stepUp = 0.45) {
    let ground = -Infinity;
    for (const c of this.query(pos.x, pos.z, r + 1)) {
      if (c.platform) {
        if (pos.x > c.minX && pos.x < c.maxX && pos.z > c.minZ && pos.z < c.maxZ && pos.y >= c.top - stepUp) ground = Math.max(ground, c.top);
        continue;
      }
      if (pos.y + h < c.y0 || pos.y + stepUp > c.y1) continue; // above or below it (or can step onto it)
      if (c.kind === 'circle') {
        const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), min = r + c.r;
        if (d < min && d > 1e-5) { pos.x = c.x + dx / d * min; pos.z = c.z + dz / d * min; }
      } else {
        const cx = Math.max(c.minX, Math.min(pos.x, c.maxX)), cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
        const dx = pos.x - cx, dz = pos.z - cz, d = Math.hypot(dx, dz);
        if (d < r) {
          if (d > 1e-5) { pos.x = cx + dx / d * r; pos.z = cz + dz / d * r; }
          else { // inside: push out along the shallowest axis
            const pen = [[pos.x - c.minX + r, -1, 0], [c.maxX - pos.x + r, 1, 0], [pos.z - c.minZ + r, 0, -1], [c.maxZ - pos.z + r, 0, 1]].sort((a, b) => a[0] - b[0])[0];
            pos.x += pen[1] * pen[0]; pos.z += pen[2] * pen[0];
          }
        }
      }
    }
    return ground;
  }

  // Ray against vertical-extent colliders (for arrows and line of sight).
  blocksSegment(a, b) {
    const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    dir.normalize();
    const ray = new THREE.Ray(a, dir), box = new THREE.Box3(), hit = new THREE.Vector3();
    for (const c of this.query((a.x + b.x) / 2, (a.z + b.z) / 2, len / 2 + 1)) {
      if (c.platform) continue;
      if (c.kind === 'box') box.set(new THREE.Vector3(c.minX, c.y0, c.minZ), new THREE.Vector3(c.maxX, c.y1, c.maxZ));
      else box.set(new THREE.Vector3(c.x - c.r * 0.7, c.y0, c.z - c.r * 0.7), new THREE.Vector3(c.x + c.r * 0.7, c.y1, c.z + c.r * 0.7));
      if (ray.intersectBox(box, hit) && hit.distanceTo(a) < len) return hit.clone();
    }
    return null;
  }
}

// Instanced copies of a ModelDef, with per-instance show/hide.
// Only instances within `range` of the viewer are written to the GPU, and only those
// within `shadowRange` cast shadows; `rebuild` refreshes both lists.
export class InstancedSet {
  constructor(def, capacity, { shadows = true, range = 200, shadowRange = 55 } = {}) {
    this.def = def;
    this.range = range;
    this.shadowRange = shadows ? shadowRange : 0;
    const make = (cast) => def.parts.map(p => {
      const m = new THREE.InstancedMesh(p.geometry, p.material, capacity);
      m.count = 0;
      m.castShadow = cast; m.receiveShadow = true;
      m.frustumCulled = false;
      return m;
    });
    this.near = make(shadows);
    this.far = make(false);
    this.meshes = [...this.near, ...this.far];
    this.matrices = [];
    this.visible = [];
    this.slotOf = [];   // [list, slot] where each instance currently lives
    this.dirty = true;
    this.group = new THREE.Group();
    this.group.add(...this.meshes);
  }
  add(matrix) {
    const i = this.matrices.length;
    this.matrices.push(matrix.clone());
    this.visible.push(true);
    this.slotOf.push(null);
    this.dirty = true;
    return i;
  }
  setVisible(i, v) { if (this.visible[i] !== v) { this.visible[i] = v; this.dirty = true; } }
  // write a temporary matrix for instance i (used for wobble animations)
  setTemp(i, matrix) {
    const s = this.slotOf[i];
    if (!s) return;
    for (const m of s[0]) { m.setMatrixAt(s[1], matrix); m.instanceMatrix.needsUpdate = true; }
  }
  rebuild(center) {
    const r2 = this.range * this.range, s2 = this.shadowRange * this.shadowRange;
    let nn = 0, nf = 0;
    for (let i = 0; i < this.matrices.length; i++) {
      this.slotOf[i] = null;
      if (!this.visible[i]) continue;
      const el = this.matrices[i].elements;
      const dx = el[12] - center.x, dz = el[14] - center.z, d2 = dx * dx + dz * dz;
      if (d2 > r2) continue;
      if (d2 < s2) { for (const m of this.near) m.setMatrixAt(nn, this.matrices[i]); this.slotOf[i] = [this.near, nn++]; }
      else { for (const m of this.far) m.setMatrixAt(nf, this.matrices[i]); this.slotOf[i] = [this.far, nf++]; }
    }
    for (const m of this.near) { m.count = nn; m.instanceMatrix.needsUpdate = true; }
    for (const m of this.far) { m.count = nf; m.instanceMatrix.needsUpdate = true; }
    this.dirty = false;
  }
  finalize() { this.dirty = true; }
}
