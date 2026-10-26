// The player: movement, needs, status, combat, tools and the held item.
import * as THREE from 'three';
import { ITEMS, item } from '../data/items.js';
import { WATER_LEVEL } from '../data/places.js';
import { clamp } from '../engine/noise.js';
import { makeItemObject } from '../game/itemvisuals.js';
import { BELT, BASE_SLOTS } from '../game/state.js';

const EYE = 1.62, RADIUS = 0.35, HEIGHT = 1.75;
const BUFF_INFO = {
  bleeding: { name: 'Bleeding', bad: true, icon: '🩸' },
  poisoned: { name: 'Poisoned', bad: true, icon: '☠' },
  sick: { name: 'Sick', bad: true, icon: '🤢' },
  well_fed: { name: 'Well Fed', icon: '🍲' },
  vigor: { name: 'Vigor', icon: '⚡' },
  wardlight: { name: 'Wardlight', icon: '🕯' },
  sharpened: { name: 'Sharpened', icon: '🗡' },
  rested: { name: 'Rested', icon: '💤' },
};
export { BUFF_INFO };

export class Player {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.onGround = true;
    this.hp = 100; this.stamina = 100; this.resolve = 100;
    this.needs = { water: 85, carbs: 70, fat: 70, protein: 70, energy: 90 };
    this.buffs = {};
    this.equip = { body: null, offhand: null, trinket: null, bag: null };
    this.belt = 0;
    this.swing = null;      // { t, dur, power, hitDone }
    this.charge = 0;        // seconds LMB held
    this.draw = 0;          // bow draw 0..1
    this.blocking = false;
    this.action = null;     // timed action { label, t, dur, done }
    this.dead = false;
    this.sleeping = false;
    this.speedNow = 0;
    this.stepPhase = 0;
    this.shake = 0;
    this.hurtFlash = 0;
    this.respawn = null;
    this.fishing = null;
    this.lastDamage = 0;

    // the hand
    this.hand = new THREE.Group();
    this.offHand = new THREE.Group();
    game.camera.add(this.hand, this.offHand);
    this.heldId = null;
    this.torchLight = new THREE.PointLight(0xffa050, 0, 14, 1.5);
    this.torchLight.position.set(0.3, 0.1, -0.4);
    game.camera.add(this.torchLight);
  }

  get inv() { return this.game.inventory; }
  get held() { const s = this.inv.slots[this.belt]; return s ? { slot: s, def: ITEMS[s.id] } : null; }
  get maxHp() { return 70 + this.game.skills.level('vitality') * 3 + (this.bonus('health')); }
  get maxStamina() { return (100 + this.bonus('stamina')) * (this.needs.carbs < 15 ? 0.6 : 1); }
  get maxResolve() { return 100 + this.bonus('resolve'); }
  get armor() { return (this.equip.body ? ITEMS[this.equip.body.id].armor : 0); }
  bonus(k) { const t = this.equip.trinket; return t ? (ITEMS[t.id].bonus?.[k] || 0) : 0; }
  hasBuff(b) { return (this.buffs[b] || 0) > 0; }
  addBuff(b, secs) { this.buffs[b] = Math.max(this.buffs[b] || 0, secs); this.game.events.emit('buffs'); }
  cure(b) { delete this.buffs[b]; this.game.events.emit('buffs'); }

  spawnAt(pos, yaw = 0) {
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    this.yaw = yaw; this.pitch = 0;
  }

  // ---------- per-frame ----------
  update(dt) {
    const g = this.game, input = g.input, w = g.world;
    if (this.dead || this.sleeping) { this.updateCamera(dt); return; }
    const uiOpen = g.ui.modalOpen;

    // look
    if (input.locked && !uiOpen) {
      this.yaw -= input.mouse.dx * input.sensitivity;
      this.pitch -= input.mouse.dy * input.sensitivity * (input.invertY ? -1 : 1);
      this.pitch = clamp(this.pitch, -1.5, 1.5);
    }

    // belt selection
    if (!uiOpen) {
      for (let i = 0; i < BELT; i++) if (input.hit('Digit' + (i + 1))) this.selectBelt(i);
      if (input.mouse.wheel && !g.structures.ghost) this.selectBelt((this.belt + input.mouse.wheel + BELT) % BELT);
    }

    // move
    const swimming = this.isSwimming();
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const wish = new THREE.Vector3();
    if (!uiOpen) {
      if (input.down('KeyW')) wish.add(fwd);
      if (input.down('KeyS')) wish.sub(fwd);
      if (input.down('KeyD')) wish.add(right);
      if (input.down('KeyA')) wish.sub(right);
    }
    if (wish.lengthSq() > 0) { wish.normalize(); if (this.action?.cancelOnMove) this.cancelAction(); }
    this.sneaking = input.down('KeyC') || input.down('ControlLeft');
    const athletics = g.skills.level('athletics');
    let speed = 3.4;
    const running = input.down('ShiftLeft') && this.stamina > 1 && wish.lengthSq() > 0 && !this.sneaking && !this.blocking;
    if (running) speed = 6.2 + athletics * 0.03;
    if (this.sneaking) speed = 1.8;
    if (this.blocking || this.draw > 0) speed *= 0.55;
    if (this.needs.energy < 15) speed *= 0.8;
    if (swimming) speed = running ? 3.0 : 2.2;
    if (this.action) speed *= 0.4;

    const accel = this.onGround || swimming ? 12 : 2.5;
    this.vel.x += (wish.x * speed - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (wish.z * speed - this.vel.z) * Math.min(1, accel * dt);
    if (swimming) {
      this.vel.y += ((WATER_LEVEL - 1.25) - this.pos.y) * 4 * dt - this.vel.y * 3 * dt;
      if (input.down('Space')) this.vel.y += 6 * dt;
    } else {
      this.vel.y -= 20 * dt;
      if (this.onGround && input.hit('Space') && !uiOpen && this.stamina > 8) { this.vel.y = 6.2; this.onGround = false; this.useStamina(8); g.skills.add('athletics', 1); }
    }
    const prev = this.pos.clone();
    this.pos.addScaledVector(this.vel, dt);

    // world bounds
    const lim = w.terrain.size / 2 - 8;
    this.pos.x = clamp(this.pos.x, -lim, lim); this.pos.z = clamp(this.pos.z, -lim, lim);

    // collide
    const platform = w.colliders.resolve(this.pos, RADIUS, HEIGHT);
    const terrainY = w.heightAt(this.pos.x, this.pos.z);
    // steep slopes push you back
    const slope = w.terrain.slopeAt(this.pos.x, this.pos.z);
    if (slope > 0.42 && terrainY > prev.y + 0.05 && platform === -Infinity) { this.pos.x = prev.x; this.pos.z = prev.z; }
    const groundY = Math.max(w.heightAt(this.pos.x, this.pos.z), platform);
    if (this.pos.y <= groundY) {
      if (!this.onGround && this.vel.y < -11) this.hurt((-this.vel.y - 11) * 6, 'fall');
      this.pos.y = groundY; this.vel.y = Math.max(0, this.vel.y); this.onGround = true;
    } else this.onGround = this.pos.y - groundY < 0.05;
    if (swimming) this.onGround = false;

    const moved = Math.hypot(this.pos.x - prev.x, this.pos.z - prev.z);
    this.speedNow = moved / Math.max(dt, 1e-4);
    if (running && moved > 0.01) { this.useStamina(9 * dt); this.athleticsAcc = (this.athleticsAcc || 0) + moved; if (this.athleticsAcc > 25) { this.athleticsAcc = 0; g.skills.add('athletics', 6); } }
    if (swimming) { this.useStamina(4 * dt * (running ? 2 : 1)); if (this.stamina <= 0) this.hurt(8 * dt, 'drown'); }

    // footsteps
    if (this.onGround && moved > 0.005) {
      this.stepPhase += moved * 1.7;
      if (this.stepPhase > Math.PI) { this.stepPhase -= Math.PI; g.audio.play(platform > -Infinity ? 'stepwood' : 'step', this.sneaking ? 0.4 : running ? 1.2 : 0.8); }
    }
    if (swimming && moved > 0.01 && Math.random() < dt * 2) g.audio.play('splash', 0.4);

    this.updateCombat(dt, uiOpen);
    this.updateNeeds(dt);
    this.updateAction(dt);
    this.updateHand(dt);
    this.updateCamera(dt);
  }

  isSwimming() {
    const w = this.game.world;
    return w.heightAt(this.pos.x, this.pos.z) < WATER_LEVEL - 1.3 && this.pos.y < WATER_LEVEL - 0.6;
  }

  updateCamera(dt) {
    const cam = this.game.camera;
    let bob = 0;
    if (this.onGround && this.speedNow > 0.5) bob = Math.sin(this.stepPhase * 2) * 0.035 * Math.min(1, this.speedNow / 4);
    const eye = this.sleeping ? 0.4 : this.dead ? 0.3 : this.sneaking ? EYE - 0.45 : EYE;
    this.eyeY = (this.eyeY ?? eye) + (eye - (this.eyeY ?? eye)) * Math.min(1, dt * 8);
    cam.position.set(this.pos.x, this.pos.y + this.eyeY + bob, this.pos.z);
    this.shake = Math.max(0, this.shake - dt * 2);
    const sh = this.shake * this.shake;
    cam.rotation.set(this.pitch + (Math.random() - 0.5) * sh * 0.08, this.yaw + (Math.random() - 0.5) * sh * 0.08, this.dead ? 0.6 : 0, 'YXZ');
  }

  viewRay() {
    const cam = this.game.camera, dir = new THREE.Vector3();
    cam.updateMatrixWorld();
    cam.getWorldDirection(dir);
    return { origin: cam.position.clone(), dir };
  }

  // ---------- stats ----------
  useStamina(n) { this.stamina = Math.max(0, this.stamina - n); this.staminaDelay = 0.8; }
  hurt(n, cause) {
    if (this.dead || n <= 0) return;
    this.hp -= n;
    this.lastDamage = this.game.world.time;
    this.hurtFlash = Math.min(1, this.hurtFlash + n / 25);
    this.shake = Math.min(1.2, this.shake + n / 20);
    if (n > 2) this.game.audio.play('hurt', Math.min(1, n / 15));
    if (this.hp <= 0) this.die(cause);
  }

  takeHit(c) {
    const C = c.C, g = this.game;
    let dmg = C.dmg * (0.85 + Math.random() * 0.3);
    const toC = c.pos.clone().sub(this.pos).setY(0).normalize();
    const facing = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).dot(toC) > 0.3;
    if (this.blocking && facing && this.stamina > 0) {
      const lvl = g.skills.level('block');
      const shield = this.equip.offhand ? ITEMS[this.equip.offhand.id].block : 0;
      const absorb = Math.min(0.95, (shield ? shield : 0.35) + lvl * 0.006);
      this.useStamina(dmg * 1.6 * (1 - lvl * 0.008));
      g.skills.add('block', Math.round(dmg * 1.5));
      g.audio.play('block');
      this.shake += 0.2;
      if (this.equip.offhand) { this.equip.offhand.dur = (this.equip.offhand.dur ?? 200) - 1; if (this.equip.offhand.dur <= 0) { g.ui.toast('Your shield splinters apart!'); this.equip.offhand = null; this.refreshOffhand(); } }
      dmg *= 1 - absorb;
      c.stagger = 0.5;
    }
    dmg *= 100 / (100 + this.armor * 5);
    this.hurt(dmg, c.type);
    const resist = this.equip.body ? (ITEMS[this.equip.body.id].resist?.poisoned || 0) : 0;
    if (C.poison && Math.random() < C.poison * (1 - resist) && dmg > 1) { this.addBuff('poisoned', 45); g.ui.toast('Venom burns in your blood.'); }
    if (C.bleed && Math.random() < C.bleed && dmg > 2) { this.addBuff('bleeding', 60); g.ui.toast('You are bleeding. A bandage will stop it.'); }
    if (C.resolveDmg) this.resolve = Math.max(0, this.resolve - C.resolveDmg);
  }

  updateNeeds(dt) {
    const g = this.game, w = g.world, n = this.needs;
    const running = this.speedNow > 5;
    const drain = (k, rate) => { n[k] = clamp(n[k] - rate * dt, 0, 100); };
    drain('water', 0.1 + (running ? 0.08 : 0) + (w.warmthAt(this.pos) > 0.5 ? 0.03 : 0));
    drain('carbs', 0.05 + (running ? 0.05 : 0));
    drain('fat', 0.032);
    drain('protein', 0.038);
    drain('energy', 0.026 + (w.sky.isNight ? 0.015 : 0));

    // buffs tick down
    for (const k of Object.keys(this.buffs)) { this.buffs[k] -= dt; if (this.buffs[k] <= 0) { delete this.buffs[k]; g.events.emit('buffs'); } }
    if (this.hasBuff('bleeding')) this.hurt(0.4 * dt, 'bleeding');
    if (this.hasBuff('poisoned')) this.hurt(0.7 * dt, 'poison');
    if (this.hasBuff('sick')) { drain('water', 0.15); drain('carbs', 0.05); if (Math.random() < dt * 0.05) { g.ui.toast('Your stomach heaves.'); this.shake += 0.6; } }

    // stamina
    this.staminaDelay = Math.max(0, (this.staminaDelay || 0) - dt);
    if (this.staminaDelay <= 0 && !this.blocking) {
      let regen = 14 + g.skills.level('athletics') * 0.25;
      if (this.hasBuff('vigor')) regen *= 2.5;
      if (n.water < 15) regen *= 0.4;
      this.stamina = Math.min(this.maxStamina, this.stamina + regen * dt);
    }
    this.stamina = Math.min(this.stamina, this.maxStamina);

    // health
    const fed = n.water > 40 && n.carbs > 30 && n.fat > 30 && n.protein > 30;
    if (fed && !this.hasBuff('bleeding') && !this.hasBuff('poisoned') && w.time - this.lastDamage > 6) {
      this.hp = Math.min(this.maxHp, this.hp + (this.hasBuff('well_fed') ? 0.7 : 0.3) * dt);
    }
    if (n.water <= 0) this.hurt(0.6 * dt, 'thirst');
    for (const k of ['carbs', 'fat', 'protein']) if (n[k] <= 0) this.hurt(0.25 * dt, 'hunger');
    if (n.energy <= 0 && !this.sleeping) { g.ui.toast('Your legs give out. The dark takes you.'); this.sleep('ground', this.pos, true); }

    // resolve: the dark presses in; fire and company push it back
    const warmth = w.warmthAt(this.pos);
    const indoors = w.floorAt(this.pos) > -Infinity && Math.abs(w.floorAt(this.pos) - this.pos.y) < 0.2;
    const lightHeld = this.held?.def.light;
    let dr = 0;
    if (warmth > 0) dr += 0.8 * warmth;
    else if (w.sky.darkness > 0.5) dr -= (0.09 + (lightHeld || indoors ? 0 : 0.07)) * w.sky.darkness;
    if (n.water < 15 || n.carbs < 15 || n.protein < 15 || n.fat < 15) dr -= 0.04;
    if (this.hasBuff('wardlight')) dr = Math.max(dr, 0.1);
    this.resolve = clamp(this.resolve + dr * dt, 0, this.maxResolve);
    if (this.resolve <= 0) this.hurt(0.5 * dt, 'dread');
    if (this.resolve < 30 && Math.random() < dt * 0.08) g.audio.play('whisper', 1 - this.resolve / 30);
    if (this.hp < this.maxHp * 0.25 && Math.random() < dt * 1.1) g.audio.play('heartbeat', 0.8);

    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.5);
  }

  // ---------- eating, drinking, using ----------
  consume(slotIndex) {
    const g = this.game, s = this.inv.slots[slotIndex];
    if (!s) return;
    const def = ITEMS[s.id];
    if (def.type === 'food' || def.type === 'drink') {
      const f = def.food;
      for (const k of ['water', 'carbs', 'fat', 'protein']) this.needs[k] = clamp(this.needs[k] + (f[k] || 0), 0, 100);
      if (def.raw && Math.random() < def.raw.chance) { this.addBuff(def.raw.effect, 40); g.ui.toast(def.type === 'drink' ? 'Something in the water was alive.' : 'That was a mistake.'); }
      if (def.buff) this.addBuff(def.buff, 300);
      if (s.id === 'burnt_meat') this.resolve = Math.max(0, this.resolve - 3);
      this.inv.takeSlot(slotIndex, 1);
      if (def.returns) this.inv.add(def.returns, 1);
      g.audio.play(def.type === 'drink' ? 'drink' : 'eat');
      g.events.emit(def.type === 'drink' ? 'drank' : 'ate', s.id, !def.raw);
      return;
    }
    if (def.type === 'potion' || def.type === 'medicine') {
      const e = def.effect;
      if (e.heal) this.hp = Math.min(this.maxHp, this.hp + e.heal);
      for (const c of e.cure || []) this.cure(c);
      if (e.resolve) this.resolve = Math.min(this.maxResolve, this.resolve + e.resolve);
      if (e.buff) this.addBuff(e.buff, 120);
      this.inv.takeSlot(slotIndex, 1);
      if (def.type === 'potion') this.inv.add('bottle', 1);
      g.audio.play(def.type === 'potion' ? 'drink' : 'craft');
      g.ui.toast(def.name + '.');
      return;
    }
    if (def.type === 'book') { g.ui.readBook(def.lore); return; }
    if (def.type === 'placeable') { this.selectSlotForPlacement(slotIndex); return; }
    if (['armor', 'shield', 'trinket', 'bag'].includes(def.type)) { this.equipItem(slotIndex); return; }
  }

  drinkWater(amount, murky) {
    const g = this.game;
    this.needs.water = clamp(this.needs.water + amount, 0, 100);
    g.audio.play('drink');
    if (murky && Math.random() < 0.3) { this.addBuff('sick', 40); g.ui.toast('The water tastes of rot.'); }
    g.events.emit('drank', murky ? 'murky' : 'clean');
  }

  selectSlotForPlacement(i) {
    const g = this.game;
    if (i >= BELT) { // move it to the belt first
      const free = this.inv.slots.findIndex((s, k) => k < BELT && !s);
      if (free >= 0) { this.inv.swap(i, free); i = free; } else { this.inv.swap(i, this.belt); i = this.belt; }
    }
    this.selectBelt(i);
    g.ui.closeAll();
    g.structures.beginPlacement(this.inv.slots[i].id);
  }

  equipItem(slotIndex) {
    const g = this.game, s = this.inv.slots[slotIndex];
    const def = ITEMS[s.id];
    if (def.type === 'bag') {
      if (this.equip.bag && ITEMS[this.equip.bag.id].slots >= def.slots) { g.ui.toast('You already carry a bigger bag.'); return; }
      this.inv.takeSlot(slotIndex, 1);
      if (this.equip.bag) this.inv.add(this.equip.bag.id, 1);
      this.equip.bag = { id: s.id };
      this.inv.resize(BASE_SLOTS + def.slots);
      g.ui.toast(`${def.name} strapped on. +${def.slots} slots.`);
      g.audio.play('pickup');
      g.events.emit('inventory');
      return;
    }
    const slot = def.slot;
    const old = this.equip[slot];
    this.inv.slots[slotIndex] = old ? { ...old } : null;
    this.equip[slot] = { ...s };
    this.inv.changed();
    if (slot === 'offhand') this.refreshOffhand();
    g.audio.play('pickup');
    g.ui.toast(`Equipped ${def.name}.`);
  }
  unequip(slot) {
    const g = this.game, e = this.equip[slot];
    if (!e || slot === 'bag') return;
    if (this.inv.add(e.id, 1, e.dur != null ? { dur: e.dur } : {})) { g.ui.toast('No room in your pack.'); return; }
    this.equip[slot] = null;
    if (slot === 'offhand') this.refreshOffhand();
    g.events.emit('inventory');
  }

  sharpen() {
    const h = this.held;
    if (!h || h.def.type !== 'weapon') { this.game.ui.toast('Hold a blade to sharpen it.'); return; }
    this.startAction('Sharpening…', 2.5, () => { this.addBuff('sharpened', 300); this.game.audio.play('anvil', 0.5); this.game.ui.toast(`${h.def.name} bites deeper.`); });
  }

  selectBelt(i) {
    if (this.belt !== i) { this.belt = i; this.swing = null; this.draw = 0; this.charge = 0; this.game.structures.cancelPlacement(); }
    this.game.events.emit('belt');
  }

  // ---------- timed actions (kindling, sharpening, fishing) ----------
  startAction(label, dur, done, { cancelOnMove = true } = {}) {
    this.action = { label, t: 0, dur, done, cancelOnMove };
  }
  cancelAction() { if (this.action) { this.action = null; this.game.ui.toast('Interrupted.'); } this.fishing = null; }
  updateAction(dt) {
    if (!this.action) return;
    this.action.t += dt;
    if (this.action.t >= this.action.dur) { const a = this.action; this.action = null; a.done(); }
  }

  // ---------- combat and tool use ----------
  updateCombat(dt, uiOpen) {
    const g = this.game, input = g.input, m = input.mouse;
    if (uiOpen || !input.locked) { this.blocking = false; return; }
    const h = this.held;
    const def = h?.def;

    if (g.structures.ghost) {
      if (m.leftPressed) g.structures.confirmPlacement();
      if (m.rightPressed) g.structures.cancelPlacement();
      if (input.hit('KeyR')) g.structures.rotateGhost();
      return;
    }

    // block with shield or any weapon
    this.blocking = m.right && (this.equip.offhand || def?.type === 'weapon' || def?.tool === 'axe') && def?.type !== 'bow' && this.stamina > 0 && !this.swing;

    if (def?.type === 'bow') {
      if (m.left && this.inv.count('arrow') > 0) { this.draw = Math.min(1, this.draw + dt * (0.9 + g.skills.level('marksman') * 0.02)); if (this.draw < 1) this.useStamina(2 * dt); }
      else if (m.left && m.leftPressed) g.ui.toast('You have no arrows.');
      if (m.leftReleased && this.draw > 0.15) this.fireArrow();
      if (!m.left) this.draw = 0;
      return;
    }
    if (def && ['food', 'drink', 'potion', 'medicine', 'book', 'placeable', 'armor', 'shield', 'trinket', 'bag'].includes(def.type)) {
      if (m.leftPressed) this.consume(this.belt);
      return;
    }
    if (def?.type === 'container' && h.slot.id === 'bottle') {
      if (m.leftPressed) this.tryFillBottle();
      return;
    }
    if (def?.tool === 'rod') {
      if (m.leftPressed) this.tryFish();
      return;
    }

    // swings: tap for a quick strike, hold for a power attack
    if (this.swing) {
      const s = this.swing;
      s.t += dt;
      if (!s.hitDone && s.t >= s.dur * 0.45) { s.hitDone = true; this.resolveSwing(s); }
      if (s.t >= s.dur) this.swing = null;
      return;
    }
    if (m.left) this.charge += dt;
    if (m.leftReleased || (m.left && this.charge > 0.9)) {
      const power = this.charge > 0.4 && this.stamina >= 18;
      this.charge = 0;
      if (this.stamina < 4) { g.ui.toast('Too winded.'); return; }
      const speed = def?.speed || 1.3;
      this.swing = { t: 0, dur: (power ? 0.75 : 0.5) / speed, power, hitDone: false };
      this.useStamina(power ? 18 : 6);
      g.audio.play('swing', power ? 1.2 : 0.8);
    }
  }

  resolveSwing(s) {
    const g = this.game, h = this.held, def = h?.def;
    const { origin, dir } = this.viewRay();
    const reach = def?.reach || (def?.type === 'tool' ? 2.6 : 2.2);
    const blade = g.skills.level('blade');
    let dmg = (def?.dmg || 3) * (1 + blade * 0.025) * (s.power ? 1.8 : 1);
    if (this.hasBuff('sharpened') && def?.type === 'weapon') dmg *= 1.2;
    if (this.needs.protein < 15) dmg *= 0.7;
    const creature = g.creatures.findMeleeTarget(origin, dir, reach);
    if (creature) {
      if (def?.holy && creature.C.hollow) dmg *= def.holy;
      g.creatures.damage(creature, dmg, { from: this.pos, knock: (s.power ? 1.2 : 0.4) * (def?.stagger || 1), power: s.power || (def?.stagger || 0) > 1 });
      g.audio.play('hit');
      this.wear(1);
      return;
    }
    const pick = g.world.targets.pick(origin, dir, reach + 0.4);
    if (pick?.target.hit) {
      const used = pick.target.hit(g, { tool: def?.type === 'tool' ? def : null, weapon: def, power: s.power, dmg });
      if (used) this.wear(1);
    }
  }

  wear(n) {
    const h = this.held;
    if (!h || h.slot.dur == null) return;
    h.slot.dur -= n;
    if (h.slot.dur <= 0) {
      this.game.ui.toast(`Your ${h.def.name} breaks!`);
      this.game.audio.play('block');
      this.inv.slots[this.belt] = null;
      this.inv.changed();
    } else if (h.slot.dur === 10) this.game.ui.toast(`Your ${h.def.name} is nearly broken.`);
  }

  fireArrow() {
    const g = this.game, def = this.held.def;
    if (!this.inv.remove('arrow', 1)) return;
    const { origin, dir } = this.viewRay();
    const power = this.draw;
    const dmg = def.dmg * (0.4 + power * 0.8) * (1 + g.skills.level('marksman') * 0.03);
    g.projectiles.fire(origin.clone().addScaledVector(dir, 0.5), dir.clone().multiplyScalar(18 + power * 34), dmg);
    g.audio.play('bow');
    this.draw = 0;
    this.wear(1);
  }

  lookingAtWater(max = 3.2) {
    const { origin, dir } = this.viewRay();
    const w = this.game.world;
    for (let t = 0.5; t < max; t += 0.15) {
      const p = origin.clone().addScaledVector(dir, t);
      const ground = w.heightAt(p.x, p.z);
      if (p.y < ground) return null;
      if (p.y <= WATER_LEVEL && ground < WATER_LEVEL - 0.1) return p;
    }
    return null;
  }

  tryFillBottle() {
    const g = this.game;
    if (!this.lookingAtWater(3.5) && !this.isSwimming()) { g.ui.toast('Look at water to fill the bottle.'); return; }
    this.inv.takeSlot(this.belt, 1);
    this.inv.add('bottle_murky', 1);
    g.audio.play('splash');
    g.ui.toast('Murky water. Boil it at a fire.');
  }

  tryFish() {
    const g = this.game;
    if (this.fishing) {
      if (this.fishing.bite) {
        const lvl = g.skills.level('fishing');
        if (Math.random() < 0.6 + lvl * 0.02) { g.inventory.add('raw_fish', 1); g.skills.add('fishing', 35); g.ui.toast('A silverfin!'); g.audio.play('splash'); }
        else g.ui.toast('It slips the hook.');
        this.wear(1);
      } else g.ui.toast('Too soon. The line goes slack.');
      this.fishing = null; this.action = null;
      return;
    }
    const spot = this.lookingAtWater(14);
    if (!spot) { g.ui.toast('Cast into open water.'); return; }
    g.audio.play('splash', 0.5);
    const wait = Math.max(2, 9 - g.skills.level('fishing') * 0.15) * (0.6 + Math.random() * 0.8);
    this.fishing = { bite: false, spot };
    g.particles.burst(spot, 0xc0d8e0, 8, 2, 0.1);
    this.startAction('Waiting for a bite…', wait, () => {
      if (!this.fishing) return;
      this.fishing.bite = true;
      g.audio.play('splash');
      g.particles.burst(spot, 0xc0d8e0, 14, 3, 0.12);
      g.ui.toast('A bite! Strike now!');
      this.action = { label: 'Strike!', t: 0, dur: 1.2, done: () => { if (this.fishing) { g.ui.toast('It got away.'); this.fishing = null; } }, cancelOnMove: true };
    });
  }

  // ---------- the hand ----------
  updateHand(dt) {
    const h = this.held;
    const id = h?.slot.id || null;
    if (id !== this.heldId) {
      this.heldId = id;
      this.hand.clear();
      if (id) {
        const def = ITEMS[id];
        const obj = makeItemObject(id, def.hold || 0.28);
        if (def.type === 'bow') { obj.rotation.set(0, Math.PI / 2, 0.15); }
        else if (def.light) { obj.rotation.set(-0.25, 0, 0.15); obj.position.y = -0.18; }
        else if (def.type === 'weapon' || def.type === 'tool') { obj.rotation.set(-0.35, Math.PI / 2 + 0.25, 0); obj.position.y = -0.12; }
        else obj.rotation.set(0.2, 0.6, 0);
        obj.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 10; } });
        this.hand.add(obj);
        if (def.light) { this.tip = new THREE.Object3D(); this.tip.position.set(0, (def.hold || 0.5) * 0.95, 0); obj.add(this.tip); } else this.tip = null;
      }
    }
    // pose
    const def = h?.def;
    const base = def?.type === 'bow' ? new THREE.Vector3(0.05, -0.28, -0.55) : new THREE.Vector3(0.34, -0.36, -0.55);
    const bob = Math.sin(this.stepPhase * 2) * 0.012 * Math.min(1, this.speedNow / 4);
    this.hand.position.copy(base).add(new THREE.Vector3(0, bob, 0));
    this.hand.rotation.set(0, 0, 0);
    if (this.swing) {
      const t = this.swing.t / this.swing.dur;
      const arc = Math.sin(Math.min(1, t * 1.2) * Math.PI);
      const amp = this.swing.power ? 1.6 : 1.1;
      this.hand.rotation.x = -arc * amp + (t < 0.3 ? t * 1.2 : 0);
      this.hand.rotation.z = arc * 0.5;
      this.hand.position.x -= arc * 0.18;
      this.hand.position.z -= arc * 0.15;
    } else if (this.charge > 0.15) {
      const c = Math.min(1, this.charge / 0.6);
      this.hand.rotation.x = c * 0.5;
      this.hand.position.y += c * 0.06;
      this.hand.position.x += (Math.random() - 0.5) * 0.004 * c;
    }
    if (this.blocking && !this.equip.offhand) { this.hand.rotation.z = 1.2; this.hand.position.x = 0.1; this.hand.position.y = -0.2; }
    if (def?.type === 'bow') { this.hand.position.z += this.draw * 0.08; this.hand.position.x -= this.draw * 0.03; }
    if (this.action && /Sharpen|Kindl/.test(this.action.label)) this.hand.rotation.x = Math.sin(this.action.t * 14) * 0.2;
    // offhand shield
    this.offHand.position.set(-0.38, this.blocking ? -0.22 : -0.48, this.blocking ? -0.45 : -0.55);
    this.offHand.rotation.set(0, this.blocking ? 0.2 : 0.6, 0);
    // torchlight
    this.torchLight.intensity = def?.light ? 26 + Math.sin(this.game.world.time * 15) * 3 : 0;
    if (def?.light) {
      this.wearTimer = (this.wearTimer || 0) + dt;
      if (this.wearTimer > 2) { this.wearTimer = 0; this.wear(1); }
      if (this.tip && Math.random() < dt * 30) {
        this.hand.updateMatrixWorld(true);
        this.game.particles.flame(this.tip.getWorldPosition(new THREE.Vector3()), 0.18);
      }
    }
  }
  refreshOffhand() {
    this.offHand.clear();
    if (this.equip.offhand) {
      const obj = makeItemObject(this.equip.offhand.id, 0.45);
      obj.rotation.set(0, Math.PI, 0);
      obj.traverse(o => { if (o.isMesh) o.castShadow = false; });
      this.offHand.add(obj);
    }
  }

  // ---------- sleep and death ----------
  sleep(kind, where, forced = false) {
    const g = this.game, w = g.world;
    if (!forced && g.creatures.list.some(c => !c.dead && c.state === 'chase' && c.pos.distanceTo(this.pos) < 25)) { g.ui.toast('You cannot rest with enemies nearby.'); return; }
    if (!forced && this.needs.energy > 85 && !w.sky.isNight) { g.ui.toast('You are not tired.'); return; }
    this.sleeping = true;
    const hours = forced ? 4 : w.sky.isNight ? ((30 - w.sky.hour) % 24) || 8 : 3;
    g.ui.fade(true, forced ? 'You collapse.' : 'You sleep.');
    setTimeout(() => {
      const secs = hours * 60;
      const n = this.needs;
      for (const k of ['water', 'carbs', 'fat', 'protein']) n[k] = Math.max(5, n[k] - secs * 0.03 * 0.35);
      const quality = kind === 'bed' ? 1 : kind === 'bedroll' ? 0.75 : 0.45;
      n.energy = Math.min(100, n.energy + 100 * quality);
      this.resolve = Math.min(this.maxResolve, this.resolve + 45 * quality + (kind === 'bed' ? 30 : 0));
      this.hp = Math.min(this.maxHp, this.hp + 40 * quality);
      w.sky.advance(hours);
      w.time += secs * 0.5; // the world moves on while you sleep
      if (kind !== 'ground') { this.respawn = { pos: this.pos.clone(), yaw: this.yaw }; g.ui.toast('You will wake here if you fall.'); }
      if (quality === 1) this.addBuff('rested', 600);
      g.ui.fade(false);
      this.sleeping = false;
      g.save?.autosave();
    }, 2200);
  }

  die(cause) {
    const g = this.game;
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    g.audio.play('death');
    // like an old tale: your pack stays where you fell
    const pack = this.inv.slots.slice(BELT).filter(Boolean);
    if (pack.length) {
      g.graves.add(this.pos.clone(), pack);
      for (let i = BELT; i < this.inv.size; i++) this.inv.slots[i] = null;
      this.inv.changed();
    }
    this.buffs = {};
    g.ui.deathScreen(cause, pack.length > 0);
  }

  revive() {
    const g = this.game, w = g.world;
    const r = this.respawn || w.spawnPoint;
    this.spawnAt(r.pos.clone().add(new THREE.Vector3(0, 0.2, 0)), r.yaw);
    this.dead = false;
    this.hp = this.maxHp * 0.6;
    this.stamina = this.maxStamina;
    this.resolve = Math.max(this.resolve, 50);
    for (const k of ['water', 'carbs', 'fat', 'protein', 'energy']) this.needs[k] = Math.max(this.needs[k], 45);
    g.creatures.list.forEach(c => { if (c.state === 'chase') c.state = 'return'; });
  }

  serialize() {
    return { pos: this.pos.toArray(), yaw: this.yaw, pitch: this.pitch, hp: this.hp, stamina: this.stamina, resolve: this.resolve, needs: this.needs, buffs: this.buffs, equip: this.equip, belt: this.belt, respawn: this.respawn ? { pos: this.respawn.pos.toArray(), yaw: this.respawn.yaw } : null };
  }
  load(d) {
    this.pos.fromArray(d.pos); this.yaw = d.yaw; this.pitch = d.pitch || 0;
    this.hp = d.hp; this.stamina = d.stamina; this.resolve = d.resolve;
    Object.assign(this.needs, d.needs); this.buffs = d.buffs || {};
    this.equip = { body: null, offhand: null, trinket: null, bag: null, ...d.equip };
    this.belt = d.belt || 0;
    this.respawn = d.respawn ? { pos: new THREE.Vector3().fromArray(d.respawn.pos), yaw: d.respawn.yaw } : null;
    if (this.equip.bag) this.inv.resize(BASE_SLOTS + ITEMS[this.equip.bag.id].slots);
    this.refreshOffhand();
  }
}
