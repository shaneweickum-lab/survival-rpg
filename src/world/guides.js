// The shades who teach: floating lantern-lights that wait where each tutorial lesson happens.
import * as THREE from 'three';
import { getModel } from '../engine/assets.js';
import { GUIDES, TUTORIAL, GUIDE_FIREPITS } from '../data/tutorial.js';
import { QUESTS } from '../data/quests.js';

const IDLE = {
  ysolde: ['The vale is yours now. I am only the light by the well.', 'Read what the Warden wrote. It was me. I am sorry for it.'],
  tam: ['Keep your fire fed and your axe dry.', 'Pine wants a bronze edge. Don’t waste flint on it.'],
  nell: ['The mere gives and the mere takes. Boil everything.', 'Fish bite better for the patient.'],
  teague: ['Eat across all three. A body is a hearth: it wants all kinds of wood.', 'Bloodroot in the shade of oaks. Ashleaf by the marsh. Moonpetal only at night.'],
  bram: ['Guard, then strike. Not the other way round.', 'If it is bigger than you, use a bow. If it is much bigger, use a door.'],
  hadrig: ['Iron wants a bronze pick and coal wants patience.', 'Four bars and a stump for an anvil. Remember the grips.'],
  quill: ['Floors first. Then walls. Then a roof, before the rain finds you.', 'A house is a fire you can sleep inside.'],
  aldous: ['Every bone you bury, someone sleeps easier.', 'Pray where it is warm. The words come easier.'],
};

function beamTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
}

export class Guides {
  constructor(game) {
    this.game = game;
    const w = game.world;
    this.list = {};
    const homes = {};
    for (const t of TUTORIAL) homes[t.guide] ??= t.at;
    const tex = beamTexture();
    for (const [id, G] of Object.entries(GUIDES)) {
      const group = new THREE.Group();
      const lantern = getModel('props/Lantern_Wall').instance();
      lantern.scale.setScalar(0.8);
      lantern.position.y = -0.6;
      group.add(lantern);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: G.color, transparent: true, opacity: 0.9 }));
      flame.position.y = 0.05;
      group.add(flame);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 70, 12, 1, true), new THREE.MeshBasicMaterial({ map: tex, color: G.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      beam.position.y = 34;
      beam.visible = false;
      group.add(beam);
      w.scene.add(group);
      const home = homes[id];
      const pos = new THREE.Vector3(home.x, this.groundAt(home.x, home.z) + 1.9, home.z);
      group.position.copy(pos);
      const fire = w.addFire({ pos: pos.clone(), lit: true, radius: 5, color: G.color, intensity: 14, lightY: 0, noHeat: true });
      const guide = { id, G, group, beam, flame, pos, goal: pos.clone(), fire };
      guide.target = w.targets.add({
        x: pos.x, z: pos.z, r: 0.8, y0: pos.y - 2.2, y1: pos.y + 0.8, name: G.name,
        prompt: () => `Speak with ${G.name}`,
        use: () => this.talk(id),
      });
      this.list[id] = guide;
    }
    // the fire pits the guides keep, and Hadrig's old bloomery
    for (const f of GUIDE_FIREPITS) game.structures.create('campfire', f.x, f.z, 0, { builtin: true, eternal: true, lit: true, fuel: 9999 });
    game.structures.create('bloomery', 13, -9, 0.4, { builtin: true });
  }

  groundAt(x, z) { const w = this.game.world; return Math.max(w.heightAt(x, z), w.floorAt(new THREE.Vector3(x, 99, z))); }

  talk(id) {
    const g = this.game, guide = this.list[id], q = g.quests;
    const tut = q.tutorial;
    if (tut && tut.q.guide === id) {
      if (tut.s.stage === 0) {
        g.ui.say(id, tut.q.hello);
        q.setFlag('talk:' + tut.id);
      } else {
        const st = tut.q.stages[1];
        const left = st.goals.filter((_, i) => !q.goalDone(tut.id, i)).map(x => x.label.toLowerCase());
        g.ui.say(id, [`${st.text}${left.length ? ' Still to do: ' + left.join(', ') + '.' : ''}`]);
      }
      return;
    }
    if (tut) {
      const other = GUIDES[tut.q.guide];
      g.ui.say(id, [`Not me, little light. ${other.name} is waiting for you. Follow the beam.`]);
      return;
    }
    const lines = IDLE[id];
    g.ui.say(id, [lines[Math.floor(Math.random() * lines.length)]]);
    g.audio.play('chant', 0.4);
  }

  update(dt) {
    const g = this.game, t = g.quests.tutorial, w = g.world;
    const time = w.time, p = g.player.pos;
    for (const guide of Object.values(this.list)) {
      const active = t && t.q.guide === guide.id;
      if (active) guide.goal.set(t.q.at.x, this.groundAt(t.q.at.x, t.q.at.z) + 1.9, t.q.at.z);
      // drift toward the next lesson's spot
      const d = guide.pos.distanceTo(guide.goal);
      if (d > 0.05) guide.pos.lerp(guide.goal, Math.min(1, dt * (d > 30 ? 0.6 : 1.5)));
      guide.group.position.set(guide.pos.x, guide.pos.y + Math.sin(time * 1.4 + guide.pos.x) * 0.12, guide.pos.z);
      guide.group.rotation.y += dt * 0.4;
      guide.flame.scale.setScalar(1 + Math.sin(time * 9 + guide.pos.z) * 0.12);
      guide.fire.pos.copy(guide.group.position);
      if (Math.abs(guide.target.x - guide.pos.x) + Math.abs(guide.target.z - guide.pos.z) > 0.3) w.targets.move(guide.target, guide.pos.x, guide.pos.z);
      guide.target.y0 = guide.pos.y - 2.2; guide.target.y1 = guide.pos.y + 0.8;
      // a beam of light marks whoever you are looking for
      const far = Math.hypot(p.x - guide.pos.x, p.z - guide.pos.z) > 7;
      guide.beam.visible = !!active && far;
      guide.beam.material.opacity = 0.35 + Math.sin(time * 2) * 0.1;
      if (active && Math.random() < dt * 4) g.particles.glow(guide.group.position, guide.G.color, 1, 0.3);
    }
  }
}

export function guideName(id) { return GUIDES[id]?.name || id; }
export function isTutorialQuest(id) { return !!QUESTS[id]?.tutorial; }
