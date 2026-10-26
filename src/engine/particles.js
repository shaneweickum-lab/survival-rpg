// A pooled particle system: fire, embers, smoke, sparks, blood, splashes.
import * as THREE from 'three';

function spriteTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

class Pool {
  constructor(scene, n, blending, sizeScale, opacity = 1) {
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.size = new Float32Array(n);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.maxLife = new Float32Array(n);
    this.base = new Float32Array(n);
    this.grav = new Float32Array(n);
    this.next = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: spriteTexture() }, scale: { value: sizeScale }, opacity: { value: opacity } },
      vertexShader: `attribute float size; attribute vec3 color; varying vec3 vColor; uniform float scale;
        void main(){ vColor = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; uniform float opacity; varying vec3 vColor; void main(){ vec4 t = texture2D(map, gl_PointCoord); if (t.a < 0.02) discard; gl_FragColor = vec4(vColor, t.a * opacity); }`,
      transparent: true, depthWrite: false, blending,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  emit(p, v, color, size, life, grav = 0) {
    const i = this.next; this.next = (this.next + 1) % this.n;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    this.col.set([c.r, c.g, c.b], i * 3);
    this.base[i] = size; this.size[i] = size;
    this.life[i] = life; this.maxLife[i] = life; this.grav[i] = grav;
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.size[i] = 0; continue; }
      this.life[i] -= dt;
      const k = i * 3;
      this.vel[k + 1] -= this.grav[i] * dt;
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.size[i] = this.base[i] * Math.max(0, t);
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = true; a.size.needsUpdate = true; a.color.needsUpdate = true;
  }
}

export class Particles {
  constructor(scene) {
    this.add = new Pool(scene, 1500, THREE.AdditiveBlending, 300, 0.55);
    this.norm = new Pool(scene, 800, THREE.NormalBlending, 300, 0.6);
    this.smoke = new Pool(scene, 400, THREE.NormalBlending, 300, 0.12);
    this.v = new THREE.Vector3();
    this.p = new THREE.Vector3();
  }
  flame(pos, strength = 1) {
    const r = Math.random;
    this.p.set(pos.x + (r() - 0.5) * 0.3 * strength, pos.y + 0.05, pos.z + (r() - 0.5) * 0.3 * strength);
    this.v.set((r() - 0.5) * 0.15, 0.6 + r() * 0.8, (r() - 0.5) * 0.15);
    const c = new THREE.Color().setHSL(0.02 + r() * 0.07, 1, 0.32 + r() * 0.12);
    this.add.emit(this.p, this.v, c, (0.28 + r() * 0.3) * strength, 0.45 + r() * 0.3);
    if (r() < 0.1) { this.v.set((r() - 0.5) * 0.6, 1.5 + r() * 1.5, (r() - 0.5) * 0.6); this.add.emit(this.p, this.v, 0xffa040, 0.06, 1.4 + r()); }
    if (r() < 0.06) { this.p.y += 0.7; this.v.set((r() - 0.5) * 0.3, 0.5 + r() * 0.4, (r() - 0.5) * 0.3); this.smoke.emit(this.p, this.v, 0x8a8278, 1.4 * strength, 3); }
  }
  burst(pos, color, n = 10, speed = 3, size = 0.12, grav = 9) {
    for (let i = 0; i < n; i++) {
      this.v.set((Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed);
      this.norm.emit(pos, this.v, color, size, 0.5 + Math.random() * 0.4, grav);
    }
  }
  glow(pos, color, n = 6, size = 0.3) {
    for (let i = 0; i < n; i++) {
      this.v.set((Math.random() - 0.5) * 1.2, Math.random() * 1.2, (Math.random() - 0.5) * 1.2);
      this.add.emit(pos, this.v, color, size, 0.6 + Math.random() * 0.5, -0.5);
    }
  }
  update(dt) { this.add.update(dt); this.norm.update(dt); this.smoke.update(dt); }
}
