// Arrows in flight, and the remains you leave behind when you fall.
import * as THREE from 'three';
import { makeItemObject } from '../game/itemvisuals.js';
import { getModel } from '../engine/assets.js';
import { placeObj } from '../world/village.js';

export class Projectiles {
  constructor(game) { this.game = game; this.list = []; }

  fire(pos, vel, dmg) {
    const obj = makeItemObject('arrow', 0.75);
    const holder = new THREE.Group();
    obj.rotation.x = Math.PI / 2; // the arrow model points up; lay it along +z
    obj.position.set(0, 0, 0);
    holder.add(obj);
    holder.position.copy(pos);
    this.game.scene.add(holder);
    this.list.push({ obj: holder, pos: pos.clone(), vel: vel.clone(), dmg, life: 6, stuck: false });
  }

  update(dt) {
    const g = this.game, w = g.world;
    for (const a of [...this.list]) {
      a.life -= dt;
      if (a.life <= 0) { g.scene.remove(a.obj); this.list.splice(this.list.indexOf(a), 1); continue; }
      if (a.stuck) continue;
      const prev = a.pos.clone();
      a.vel.y -= 9.8 * dt;
      a.pos.addScaledVector(a.vel, dt);
      a.obj.position.copy(a.pos);
      a.obj.lookAt(a.pos.clone().add(a.vel));
      // creatures
      for (const c of g.creatures.list) {
        if (c.dead) continue;
        const center = c.pos.clone().setY(c.pos.y + c.height * 0.5);
        const line = new THREE.Line3(prev, a.pos);
        const closest = line.closestPointToPoint(center, true, new THREE.Vector3());
        if (closest.distanceTo(center) < c.radius + 0.25) {
          g.creatures.damage(c, a.dmg, { from: prev, knock: 0.3, skill: 'marksman' });
          g.audio.play('hit');
          g.scene.remove(a.obj); this.list.splice(this.list.indexOf(a), 1);
          if (Math.random() < 0.5) w.dropItem('arrow', 1, c.pos.clone());
          break;
        }
      }
      if (!this.list.includes(a)) continue;
      // ground and walls: the arrow sticks and can be picked up
      const hitWall = w.colliders.blocksSegment(prev, a.pos);
      if (a.pos.y < w.heightAt(a.pos.x, a.pos.z) || hitWall) {
        if (hitWall) a.pos.copy(hitWall);
        a.stuck = true; a.life = 30;
        a.obj.position.copy(a.pos);
        const t = w.targets.add({ x: a.pos.x, z: a.pos.z, r: 0.35, y0: a.pos.y - 0.5, y1: a.pos.y + 0.5, name: 'Arrow', prompt: () => 'Take Arrow', use: () => {
          g.inventory.add('arrow', 1); g.audio.play('pickup'); g.scene.remove(a.obj); w.targets.remove(t); const i = this.list.indexOf(a); if (i >= 0) this.list.splice(i, 1);
        } });
        a.target = t;
        setTimeout(() => w.targets.remove(t), 30000);
      }
    }
  }
}

export class Graves {
  constructor(game) { this.game = game; this.list = []; }
  add(pos, items, silent = false) {
    const w = this.game.world;
    const obj = getModel('props/Pouch_Large').instance();
    placeObj(obj, pos.x, Math.max(w.heightAt(pos.x, pos.z), w.floorAt(pos)), pos.z, 0);
    w.scene.add(obj);
    const id = 'grave_' + Date.now() + Math.random().toString(36).slice(2, 5);
    const slots = new Array(Math.max(24, items.length)).fill(null);
    items.forEach((s, i) => { slots[i] = s; });
    const container = w.containers[id] = { id, name: 'What You Left Behind', items: slots, opened: true, grave: true };
    const grave = { id, pos: pos.clone(), obj, container };
    grave.target = w.targets.add({ x: pos.x, z: pos.z, r: 0.6, y0: pos.y - 0.5, y1: pos.y + 1, name: 'Your Pack', prompt: () => 'Recover your pack', use: (g) => g.ui.openContainer(container) });
    this.list.push(grave);
    if (!silent) this.game.ui.toast('Your pack lies where you fell. Go back for it.');
  }
  update() {
    for (const gr of [...this.list]) if (!gr.container.items.some(Boolean)) {
      const w = this.game.world;
      w.scene.remove(gr.obj); w.targets.remove(gr.target); delete w.containers[gr.id];
      this.list.splice(this.list.indexOf(gr), 1);
    }
  }
  serialize() { return this.list.map(g => ({ pos: g.pos.toArray(), items: g.container.items })); }
  load(arr) { for (const g of arr || []) this.add(new THREE.Vector3().fromArray(g.pos), g.items.filter(Boolean), true); }
}
