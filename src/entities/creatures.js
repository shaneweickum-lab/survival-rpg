// Creatures: spawning, simple AI, procedural motion, combat and loot.
import * as THREE from 'three';
import { getModel, tinted } from '../engine/assets.js';
import { CREATURES } from '../data/creatures.js';
import { PLACES } from '../data/places.js';

export const CREATURE_MODELS = [...new Set(Object.values(CREATURES).flatMap(c => [c.model, c.angryModel].filter(Boolean)))];

const SPAWNERS = [
  { type: 'rat', place: 'village', radius: 120, minR: 60, max: 5 },
  { type: 'rat', ambient: true, max: 3 },
  { type: 'frog', place: 'mere', radius: 70, max: 6 },
  { type: 'frog', place: 'marsh', radius: 50, max: 5 },
  { type: 'snake', place: 'marsh', radius: 50, max: 5 },
  { type: 'snake', place: 'mere', radius: 60, max: 2 },
  { type: 'spider', place: 'hollow', radius: 50, max: 6 },
  { type: 'spider', ambient: true, night: true, max: 2 },
  { type: 'wasp', place: 'wasp_grove', radius: 30, max: 6 },
  { type: 'wisp', ambient: true, night: true, max: 4 },
  { type: 'wisp', place: 'barrow', radius: 22, max: 3 },
];

const tmp = new THREE.Vector3();

export class Creatures {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.spawnTimer = 0;
    this.killed = {};
  }
  get world() { return this.game.world; }

  makeObject(type, angry = false) {
    const C = CREATURES[type];
    const def = getModel(angry && C.angryModel ? C.angryModel : C.model);
    const matFn = C.tint ? (m) => tinted(m, C.tint) : type === 'wisp' ? (m) => wispMat : null;
    const inner = def.instance(matFn);
    const s = C.size / Math.max(def.size.x, def.size.y, def.size.z);
    inner.scale.setScalar(s);
    const c = def.box.getCenter(new THREE.Vector3());
    inner.position.set(-c.x * s, -def.box.min.y * s, -c.z * s);
    const yawFix = new THREE.Group();
    yawFix.rotation.y = C.yaw || 0;
    yawFix.add(inner);
    const body = new THREE.Group();
    body.add(yawFix);
    const root = new THREE.Group();
    root.add(body);
    return { root, body, height: def.size.y * s, radius: Math.max(def.size.x, def.size.z) * s / 2 };
  }

  spawn(type, pos, alerted = false) {
    const C = CREATURES[type];
    const { root, body, height, radius } = this.makeObject(type);
    const c = {
      type, C, root, body, height, radius: Math.max(0.3, radius * 0.8),
      pos: pos.clone(), home: pos.clone(), yaw: Math.random() * 6.28, hp: C.hp, maxHp: C.hp,
      state: alerted ? 'chase' : 'wander', wanderTarget: null, timer: Math.random() * 3, attackCd: 0, windup: 0,
      stagger: 0, t: Math.random() * 10, dead: false, deadT: 0, flash: 0, angry: false, alerted,
    };
    if (C.boss) c.home = new THREE.Vector3(PLACES.hollow.x, 0, PLACES.hollow.z);
    root.position.copy(pos);
    this.world.scene.add(root);
    this.list.push(c);
    if (type === 'wisp') c.light = true;
    return c;
  }

  remove(c) {
    this.world.scene.remove(c.root);
    this.list.splice(this.list.indexOf(c), 1);
  }

  alertNear(pos, r, type = null) {
    for (const c of this.list) if (!c.dead && (!type || c.type === type) && c.pos.distanceTo(pos) < r) { c.state = 'chase'; c.alerted = true; }
  }

  // ---------- spawning ----------
  spawnTick() {
    const g = this.game, w = this.world, p = g.player.pos, night = w.sky.isNight;
    for (const sp of SPAWNERS) {
      if (sp.night && !night) continue;
      if (CREATURES[sp.type].sealed) continue;
      if (sp.night && sp.ambient && w.sky.day < 2) continue; // the first night is quiet, mostly
      const count = this.list.filter(c => c.spawner === sp && !c.dead).length;
      if (count >= sp.max) continue;
      let center, radius;
      if (sp.ambient) { center = p; radius = 70; }
      else { center = PLACES[sp.place]; radius = sp.radius; if (Math.hypot(center.x - p.x, center.z - p.z) > radius + 110) continue; }
      for (let tries = 0; tries < 8; tries++) {
        const a = Math.random() * 6.28, d = sp.ambient ? 35 + Math.random() * 35 : (sp.minR || 0) + Math.random() * (radius - (sp.minR || 0));
        const x = center.x + Math.cos(a) * d, z = center.z + Math.sin(a) * d;
        const dp = Math.hypot(x - p.x, z - p.z);
        if (dp < 28 || dp > 140) continue;
        const h = w.heightAt(x, z);
        const C = CREATURES[sp.type];
        if (h < (sp.type === 'frog' || sp.type === 'snake' ? -0.3 : 0.4)) continue;
        if (w.inVillage(x, z, 1.0) && sp.type !== 'rat') continue;
        if (w.inVillage(x, z, 0.85)) continue;
        if (C.nocturnal && w.warmthAt(new THREE.Vector3(x, 0, z)) > 0) continue;
        const c = this.spawn(sp.type, new THREE.Vector3(x, h, z));
        c.spawner = sp;
        break;
      }
    }
    // the Broodmother keeps her nest until she is slain
    if (!g.quests.flags.broodmother_dead && !this.list.some(c => c.type === 'broodmother')) {
      const H = PLACES.hollow;
      if (Math.hypot(H.x - p.x, H.z - p.z) < 150) this.spawn('broodmother', new THREE.Vector3(H.x, w.heightAt(H.x, H.z), H.z));
    }
    // despawn distant ordinary creatures; dawn burns wisps away
    for (const c of [...this.list]) {
      const far = c.pos.distanceTo(p) > 190;
      const dawn = c.C.nocturnal && !night && c.spawner?.ambient && c.pos.distanceTo(p) > 20;
      if (!c.C.boss && (far || dawn)) this.remove(c);
    }
  }

  // ---------- combat ----------
  findMeleeTarget(origin, dir, reach) {
    let best = null, bestD = Infinity;
    for (const c of this.list) {
      if (c.dead) continue;
      tmp.copy(c.pos).setY(c.pos.y + c.height * 0.5).sub(origin);
      const d = tmp.length() - c.radius;
      if (d > reach) continue;
      const ang = tmp.normalize().dot(dir);
      if (ang < 0.75 && d > 0.6) continue;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  damage(c, amount, { from = null, knock = 0.4, skill = 'blade', power = false } = {}) {
    if (c.dead) return;
    const g = this.game;
    c.hp -= amount;
    c.flash = 0.15;
    c.stagger = Math.max(c.stagger, (power ? 0.6 : 0.25) * (c.C.boss ? 0.35 : 1));
    c.windup = 0;
    if (from) { tmp.copy(c.pos).sub(from).setY(0).normalize(); c.pos.addScaledVector(tmp, knock * (c.C.boss ? 0.2 : 1)); }
    if (!c.C.passive) { c.state = 'chase'; c.alerted = true; } else c.state = 'flee';
    if (c.type === 'snake' && !c.angry) this.makeAngry(c);
    g.audio.play(c.type === 'wisp' ? 'wail' : c.type === 'rat' ? 'squeal' : c.type === 'snake' ? 'hiss' : c.type === 'wasp' ? 'buzz' : 'hit', 0.8);
    g.particles.burst(tmp.copy(c.pos).setY(c.pos.y + c.height * 0.6), c.type === 'wisp' ? 0x9ab0ff : c.type === 'spider' || c.type === 'broodmother' ? 0x6a8a2a : 0x8a1010, 10);
    g.skills.add(skill, Math.round(amount * 1.6));
    g.skills.add('vitality', Math.round(amount * 0.5));
    if (c.hp <= 0) this.kill(c);
  }

  makeAngry(c) {
    const { root, body } = this.makeObject(c.type, true);
    this.world.scene.remove(c.root);
    c.root = root; c.body = body; c.angry = true;
    this.world.scene.add(root);
  }

  kill(c) {
    const g = this.game;
    c.dead = true;
    c.hp = 0;
    c.deadT = 0;
    this.killed[c.type] = (this.killed[c.type] || 0) + 1;
    g.events.emit('killed', c.type);
    const hunt = g.skills.level('hunting');
    g.skills.add('hunting', Math.round(c.C.xp * 0.5));
    for (const [id, a, b, p] of c.C.loot) {
      if (Math.random() > p) continue;
      let n = a + Math.floor(Math.random() * (b - a + 1));
      // a practiced hunter butchers cleanly
      if (['raw_meat', 'frog_leg', 'rat_hide', 'spider_silk', 'chitin', 'honeycomb'].includes(id) && Math.random() < hunt * 0.008) n++;
      g.world.dropItem(id, n, c.pos.clone().add(new THREE.Vector3(0, 0.3, 0)));
    }
    if (c.C.boss) {
      g.quests.setFlag('broodmother_dead');
      g.audio.play('roar');
      g.ui.questBanner('The Broodmother', 'is slain');
    }
    if (c.type === 'wisp') g.particles.glow(c.pos.clone().setY(c.pos.y + 1), 0x9ab0ff, 30, 0.5);
  }

  // ---------- per-frame ----------
  update(dt) {
    const g = this.game, w = this.world, player = g.player;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.spawnTimer = 2; this.spawnTick(); }
    const pp = player.pos;
    const night = w.sky.isNight;
    const ward = player.hasBuff('wardlight');

    for (const c of [...this.list]) {
      const C = c.C;
      c.t += dt;
      if (c.dead) {
        c.deadT += dt;
        c.body.rotation.z = Math.min(Math.PI / 2, c.deadT * 5) * (C.gait === 'fly' || C.gait === 'float' ? 0 : 1);
        if (C.gait === 'fly' || C.gait === 'float') c.root.position.y = Math.max(w.heightAt(c.pos.x, c.pos.z), c.root.position.y - dt * 4);
        if (c.deadT > 5) c.root.position.y -= dt * 0.5;
        if (c.deadT > 8) this.remove(c);
        continue;
      }
      const toP = tmp.copy(pp).sub(c.pos); toP.y = 0;
      const dist = toP.length();
      const aggro = ((night ? C.nightAggro : C.aggro) || 0) * (player.sneaking ? 0.5 : 1);
      const fireNear = w.warmthAt(c.pos) > 0;

      // decide
      if (c.stagger > 0) c.stagger -= dt;
      else if (C.passive) {
        if (c.state === 'flee' && dist > 14) c.state = 'wander';
        if (dist < 4 && player.speedNow > 3.5) c.state = 'flee';
      } else {
        const playerSafe = player.dead || player.sleeping;
        if (c.state !== 'chase' && !playerSafe && dist < aggro) { c.state = 'chase'; if (C.boss && !c.roared) { c.roared = true; g.audio.play('roar'); } }
        if (c.state === 'chase' && (playerSafe || dist > Math.max(aggro, 12) * 2.5 || c.pos.distanceTo(c.home) > (C.boss ? 45 : 90))) { c.state = 'return'; c.alerted = false; }
        if (C.hollow && (ward || (fireNear && w.warmthAt(pp) > 0.2))) c.state = 'flee';
        if (c.state === 'return' && c.pos.distanceTo(c.home) < 4) c.state = 'wander';
      }

      // move
      let speed = 0, goal = null;
      if (c.stagger > 0) speed = 0;
      else if (c.state === 'chase') {
        goal = pp;
        speed = C.speed;
        if (dist < C.attackRange * 0.85) speed = 0;
        // attack
        c.attackCd -= dt;
        if (dist < C.attackRange && c.attackCd <= 0 && c.windup <= 0) { c.windup = C.boss ? 0.6 : 0.4; }
        if (c.windup > 0) {
          c.windup -= dt;
          speed = 0;
          if (c.windup <= 0) {
            c.attackCd = C.attackRate;
            if (dist < C.attackRange + 0.4) player.takeHit(c);
          }
        }
      } else if (c.state === 'flee') {
        goal = tmp.copy(c.pos).add(c.pos.clone().sub(pp).setY(0).normalize().multiplyScalar(10)).clone();
        speed = C.speed * 1.1;
      } else if (c.state === 'return') { goal = c.home; speed = C.speed * 0.7; }
      else {
        c.timer -= dt;
        if (c.timer <= 0) {
          c.timer = 3 + Math.random() * 5;
          const a = Math.random() * 6.28, r = Math.random() * (C.boss ? 12 : 14);
          c.wanderTarget = Math.random() < 0.4 ? null : c.home.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
        }
        if (c.wanderTarget) { goal = c.wanderTarget; speed = C.speed * 0.35; if (c.pos.distanceTo(c.wanderTarget) < 1) c.wanderTarget = null; }
      }

      if (goal) {
        const dx = goal.x - c.pos.x, dz = goal.z - c.pos.z;
        const targetYaw = Math.atan2(dx, dz);
        let dy = targetYaw - c.yaw;
        while (dy > Math.PI) dy -= 2 * Math.PI;
        while (dy < -Math.PI) dy += 2 * Math.PI;
        c.yaw += dy * Math.min(1, dt * 6);
      }
      let moving = false;
      if (speed > 0) {
        let sp = speed;
        if (C.gait === 'hop') sp *= (Math.sin(c.t * 5) > 0 ? 1.6 : 0.05);
        const nx = c.pos.x + Math.sin(c.yaw) * sp * dt, nz = c.pos.z + Math.cos(c.yaw) * sp * dt;
        const nh = w.heightAt(nx, nz);
        const flying = C.gait === 'fly' || C.gait === 'float';
        const okWater = flying || nh > (c.type === 'frog' || c.type === 'snake' ? -1.2 : -0.2);
        const intoFire = C.hollow && w.warmthAt(new THREE.Vector3(nx, 0, nz)) > 0.1;
        if (okWater && !intoFire) { c.pos.x = nx; c.pos.z = nz; moving = true; }
        else { c.timer = 0; c.wanderTarget = null; }
      }
      // collide with the world (and gently with each other)
      if (C.gait !== 'fly' && C.gait !== 'float') {
        const r = c.pos.clone().setY(c.pos.y);
        w.colliders.resolve(r, c.radius, c.height, 0.4);
        c.pos.x = r.x; c.pos.z = r.z;
      }
      const ground = Math.max(w.heightAt(c.pos.x, c.pos.z), w.floorAt(c.pos));
      c.pos.y = ground;
      if (C.flyHeight) c.pos.y = Math.max(ground, (c.state === 'chase' ? pp.y + 0.4 : ground) ) + C.flyHeight * (c.state === 'chase' ? 0.6 : 1);

      // animate
      const body = c.body;
      body.position.set(0, 0, 0);
      body.rotation.set(0, 0, 0);
      const k = moving ? 1 : 0.15;
      switch (C.gait) {
        case 'scurry': body.position.y = Math.abs(Math.sin(c.t * 18)) * 0.06 * k; body.rotation.y = Math.sin(c.t * 9) * 0.12 * k; break;
        case 'hop': body.position.y = Math.max(0, Math.sin(c.t * 5)) * 0.45 * k; body.rotation.x = -Math.max(0, Math.sin(c.t * 5)) * 0.4 * k; break;
        case 'slither': body.rotation.y = Math.sin(c.t * 4) * 0.35; body.scale.set(1 + Math.sin(c.t * 4) * 0.05, 1, 1); break;
        case 'skitter': body.position.y = Math.abs(Math.sin(c.t * 22)) * 0.05 * k * (C.boss ? 3 : 1); body.rotation.z = Math.sin(c.t * 11) * 0.05 * k; break;
        case 'fly': body.position.y = Math.sin(c.t * 6) * 0.15; body.rotation.x = moving ? 0.25 : 0; body.rotation.z = Math.sin(c.t * 30) * 0.03; break;
        case 'float': body.position.y = Math.sin(c.t * 2) * 0.2; body.rotation.y = Math.sin(c.t * 0.7) * 0.4; break;
      }
      if (c.windup > 0) { body.rotation.x = -0.35; body.position.y += 0.08; }
      if (c.stagger > 0) body.rotation.x = 0.25;
      c.root.position.copy(c.pos);
      c.root.rotation.y = c.yaw;
      if (c.type === 'wisp' && Math.random() < dt * 30) g.particles.glow(c.pos.clone().setY(c.pos.y + 0.3), 0x7a90ff, 1, 0.45);
      if (C.boss && moving && Math.random() < dt * 3) g.particles.burst(c.pos.clone(), 0x2a2420, 4, 2, 0.3, 4);
      // red flash when struck
      if (c.flash > 0) { c.flash -= dt; c.root.traverse(o => { if (o.isMesh) o.scale.setScalar(1); }); c.body.scale.multiplyScalar(1 + c.flash * 0.6); }
      else if (C.gait !== 'slither') c.body.scale.set(1, 1, 1);
    }
  }

  serialize() { return { killed: this.killed }; }
  load(d) { this.killed = d?.killed || {}; }
}

const wispMat = new THREE.MeshStandardMaterial({ color: 0xc8d0ff, emissive: 0x6a80ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.75, roughness: 0.4 });
