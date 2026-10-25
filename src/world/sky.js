// Day, night, weather. One in-game hour passes per real minute.
import * as THREE from 'three';
import { clamp, smoothstep, mulberry32 } from '../engine/noise.js';

export const SECONDS_PER_HOUR = 60;

const KEYS = [
  // hour, zenith, horizon, fog, sun color, sun intensity, ambient intensity
  [0, 0x070a14, 0x161c2a, 0x0c0f16, 0x7a8ac0, 0.32, 0.32],
  [4.5, 0x0a0c18, 0x1c1e2c, 0x14141c, 0x7a8ac0, 0.3, 0.3],
  [6, 0x3a4a6a, 0xd08850, 0x8a6a58, 0xffa060, 1.2, 0.5],
  [8, 0x4a78b0, 0xb8c8d0, 0xa8b4b8, 0xfff0d8, 2.4, 0.85],
  [12, 0x3a6ab0, 0xc0d4e0, 0xb0c0c8, 0xffffff, 2.9, 1.0],
  [17, 0x4a70a8, 0xd0c0a0, 0xb0a890, 0xffe8c8, 2.3, 0.85],
  [19, 0x2a2a50, 0xd06a3a, 0x7a4a40, 0xff7030, 1.0, 0.5],
  [20.5, 0x0c0e1a, 0x2a1e2a, 0x18141c, 0x7a8ac0, 0.3, 0.3],
  [24, 0x070a14, 0x161c2a, 0x0c0f16, 0x7a8ac0, 0.32, 0.32],
];

function sample(hour) {
  let a = KEYS[0], b = KEYS[1];
  for (let i = 0; i < KEYS.length - 1; i++) if (hour >= KEYS[i][0] && hour <= KEYS[i + 1][0]) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  const t = (hour - a[0]) / (b[0] - a[0] || 1);
  const c = (i) => new THREE.Color(a[i]).lerp(new THREE.Color(b[i]), t);
  return { zenith: c(1), horizon: c(2), fog: c(3), sun: c(4), sunI: a[5] + (b[5] - a[5]) * t, ambI: a[6] + (b[6] - a[6]) * t };
}

export class Sky {
  constructor(scene) {
    this.hour = 7.5;
    this.day = 1;
    this.rain = 0; // 0..1
    this.rainTarget = 0;
    this.weatherTimer = 240;
    this.scene = scene;

    this.uniforms = { zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunColor: { value: new THREE.Color() } };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
      fragmentShader: `uniform vec3 zenith; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; varying vec3 vDir;
        void main(){ float h = clamp(vDir.y, -0.2, 1.0); vec3 col = mix(horizon, zenith, pow(max(h,0.0), 0.55));
        float s = max(dot(normalize(vDir), sunDir), 0.0); col += sunColor * (pow(s, 600.0) * 2.5 + pow(s, 12.0) * 0.25);
        gl_FragColor = vec4(col, 1.0); }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), skyMat);
    this.dome.renderOrder = -1;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    const rand = mulberry32(7);
    const starPos = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
      const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      starPos.set([Math.cos(th) * r * 850, Math.abs(u) * 850, Math.sin(th) * r * 850], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    this.moon = new THREE.Mesh(new THREE.SphereGeometry(18, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdde4f0, fog: false }));
    scene.add(this.moon);

    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = this.sun.shadow.camera;
    s.left = -45; s.right = 45; s.top = 45; s.bottom = -45; s.near = 1; s.far = 260;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xcfe0ff, 0x4a4030, 0.8);
    scene.add(this.hemi);
    scene.fog = new THREE.Fog(0xb0c0c8, 30, 260);

    // rain
    const rainCount = 2500;
    const rp = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) rp.set([(rand() - 0.5) * 60, rand() * 30, (rand() - 0.5) * 60], i * 3);
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    this.rainMat = new THREE.PointsMaterial({ color: 0xaabbcc, size: 0.08, transparent: true, opacity: 0, depthWrite: false });
    this.rainPts = new THREE.Points(rg, this.rainMat);
    this.rainPts.frustumCulled = false;
    scene.add(this.rainPts);
  }

  get isNight() { return this.hour >= 20.5 || this.hour < 5.5; }
  get darkness() { // 0 by day, 1 at deep night
    const h = this.hour;
    if (h >= 7 && h <= 18.5) return 0;
    if (h > 18.5 && h < 21) return smoothstep(18.5, 21, h);
    if (h >= 5 && h < 7) return 1 - smoothstep(5, 7, h);
    return 1;
  }
  get timeString() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  advance(hours) {
    this.hour += hours;
    while (this.hour >= 24) { this.hour -= 24; this.day++; }
  }

  update(dt, center) {
    this.advance(dt / SECONDS_PER_HOUR);

    this.weatherTimer -= dt;
    if (this.weatherTimer < 0) {
      this.weatherTimer = 150 + Math.random() * 300;
      this.rainTarget = Math.random() < 0.3 ? 0.6 + Math.random() * 0.4 : 0;
    }
    this.rain += clamp(this.rainTarget - this.rain, -dt * 0.05, dt * 0.05);

    const k = sample(this.hour);
    const gloom = this.rain * 0.55;
    const grey = new THREE.Color(0x5a6068);
    k.zenith.lerp(grey, gloom); k.horizon.lerp(grey, gloom);
    k.fog.copy(k.horizon);

    const ang = ((this.hour - 6) / 24) * Math.PI * 2; // sunrise at 6
    const sunDir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0.35).normalize();
    const moonDir = sunDir.clone().negate();
    moonDir.z = 0.35;
    moonDir.normalize();
    const lightDir = sunDir.y > -0.05 ? sunDir : moonDir;

    this.uniforms.zenith.value.copy(k.zenith);
    this.uniforms.horizon.value.copy(k.horizon);
    this.uniforms.sunDir.value.copy(sunDir);
    this.uniforms.sunColor.value.copy(k.sun).multiplyScalar(sunDir.y > -0.1 ? 1 - gloom : 0);
    this.dome.position.copy(center);
    this.stars.position.copy(center);
    this.starMat.opacity = this.darkness * (1 - this.rain);
    this.moon.position.copy(center).addScaledVector(moonDir, 800);
    this.moon.visible = moonDir.y > -0.1;

    this.sun.color.copy(k.sun);
    this.sun.intensity = k.sunI * (1 - gloom * 0.7);
    this.sun.position.copy(center).addScaledVector(lightDir, 150);
    this.sun.target.position.copy(center);
    this.hemi.intensity = k.ambI;
    this.hemi.color.copy(k.zenith).lerp(new THREE.Color(0xffffff), 0.5);
    this.hemi.groundColor.copy(k.fog).multiplyScalar(0.5);
    this.scene.fog.color.copy(k.fog);
    this.scene.fog.far = 230 - this.rain * 100 - this.darkness * 70;
    this.scene.fog.near = 20 - this.rain * 10;

    if (this.water) this.water.material.emissive.copy(k.horizon).multiplyScalar(0.18);
    this.rainMat.opacity = this.rain * 0.7;
    this.rainPts.visible = this.rain > 0.02;
    if (this.rainPts.visible) {
      const p = this.rainPts.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * 22;
        if (y < 0) y += 30;
        p.setY(i, y);
      }
      p.needsUpdate = true;
      this.rainPts.position.set(center.x, center.y - 10, center.z);
    }
  }
}
