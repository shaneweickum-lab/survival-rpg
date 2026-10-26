// Canvas-painted textures for surfaces whose image files were not part of the asset packs.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';

const cache = new Map();

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function speckle(ctx, size, rand, count, colors, rMin, rMax, alpha = 0.25) {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * rand();
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    const r = rMin + rand() * (rMax - rMin);
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const painters = {
  plaster(ctx, s, r) {
    ctx.fillStyle = '#d6c8aa'; ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, r, 900, ['#b8a888', '#e8dcc4', '#a89878', '#c9b896'], 2, 14, 0.3);
    speckle(ctx, s, r, 60, ['#8d7d63'], 6, 30, 0.12);
  },
  wood(ctx, s, r) {
    ctx.fillStyle = '#6b4a2e'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = r() > 0.5 ? 'rgba(40,24,12,0.35)' : 'rgba(140,100,60,0.25)';
      ctx.lineWidth = 1 + r() * 3;
      const y = r() * s;
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 4 + (r() - 0.5) * 2);
      ctx.stroke();
    }
  },
  bark(ctx, s, r) {
    ctx.fillStyle = '#4f3828'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = r() > 0.5 ? 'rgba(20,12,6,0.5)' : 'rgba(120,90,60,0.3)';
      ctx.lineWidth = 2 + r() * 4;
      const x = r() * s;
      ctx.beginPath(); ctx.moveTo(x, 0);
      for (let y = 0; y <= s; y += 12) ctx.lineTo(x + Math.sin(y * 0.05 + i) * 5, y);
      ctx.stroke();
    }
  },
  birch(ctx, s, r) {
    ctx.fillStyle = '#ddd6c6'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(30,25,20,${0.4 + r() * 0.5})`;
      ctx.fillRect(r() * s, r() * s, 6 + r() * 30, 2 + r() * 5);
    }
  },
  leaves(ctx, s, r) {
    ctx.fillStyle = '#5a5a5a'; ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, r, 1400, ['#7a7a7a', '#3c3c3c', '#959595', '#4a4a4a'], 2, 9, 0.6);
  },
  stone(ctx, s, r) {
    ctx.fillStyle = '#8a8378'; ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, r, 1200, ['#6e675c', '#a39c90', '#5c564d', '#968e82'], 1, 10, 0.35);
  },
  brick(ctx, s, r) {
    ctx.fillStyle = '#5c4a3e'; ctx.fillRect(0, 0, s, s);
    const bh = s / 8, bw = s / 4;
    for (let row = 0; row < 8; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < 5; col++) {
        const v = 0.8 + r() * 0.35;
        ctx.fillStyle = `rgb(${154 * v | 0},${88 * v | 0},${64 * v | 0})`;
        ctx.fillRect(col * bw + off + 3, row * bh + 3, bw - 6, bh - 6);
      }
    }
    speckle(ctx, s, r, 500, ['#3a2a20', '#c08a6a'], 1, 4, 0.3);
  },
  tiles(ctx, s, r) {
    ctx.fillStyle = '#4a2418'; ctx.fillRect(0, 0, s, s);
    const n = 8, w = s / n;
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
      const v = 0.75 + r() * 0.4;
      ctx.fillStyle = `rgb(${150 * v | 0},${70 * v | 0},${46 * v | 0})`;
      ctx.beginPath();
      ctx.ellipse(col * w + w / 2 + (row % 2) * w / 2, row * w + w / 2, w / 2 - 2, w / 2 + 3, 0, 0, Math.PI);
      ctx.fill();
    }
  },
  grass(ctx, s, r) {
    ctx.fillStyle = '#c4c4c4'; ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, r, 3000, ['#d8d8d8', '#a0a0a0', '#e8e8e8', '#909090'], 1, 3, 0.5);
    for (let i = 0; i < 1500; i++) {
      ctx.strokeStyle = r() > 0.5 ? 'rgba(60,60,60,0.35)' : 'rgba(180,180,180,0.3)';
      const x = r() * s, y = r() * s;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 4, y - 4 - r() * 6); ctx.stroke();
    }
  },
};

export function makeProceduralTexture(kind, size = 256) {
  if (cache.has(kind)) return cache.get(kind);
  const [c, ctx] = canvas(size);
  (painters[kind] || painters.stone)(ctx, size, mulberry32(kind.length * 977 + kind.charCodeAt(0)));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(kind, t);
  return t;
}
