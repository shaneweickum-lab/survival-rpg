// Thornmere: the game loop and the wiring between every system.
import * as THREE from 'three';
import { preload } from './engine/assets.js';
import { Audio } from './engine/audio.js';
import { Input } from './engine/input.js';
import { Particles } from './engine/particles.js';
import { Events, Inventory, Skills, Quests } from './game/state.js';
import { SaveSystem } from './game/save.js';
import { itemModelPaths, itemIcon } from './game/itemvisuals.js';
import { World, NATURE_MODELS } from './world/world.js';
import { VILLAGE_MODELS } from './world/village.js';
import { PROP_MODELS, LANDMARK_MODELS } from './world/settlements.js';
import { Structures, STRUCTURE_MODELS } from './world/structures.js';
import { Creatures, CREATURE_MODELS } from './entities/creatures.js';
import { Projectiles, Graves } from './entities/projectiles.js';
import { Player } from './player/player.js';
import { UI } from './ui/ui.js';
import { CREATURES } from './data/creatures.js';
import { ITEMS } from './data/items.js';
import { PLACES, WATER_LEVEL } from './data/places.js';

const $ = (id) => document.getElementById(id);

class Game {
  constructor() {
    this.events = new Events();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.lowGfx = new URLSearchParams(location.search).get('gfx') === 'low';
    this.renderer.setPixelRatio(this.lowGfx ? 0.6 : Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    $('game').append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 1200);
    this.scene.add(this.camera);
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    this.input = new Input(this.renderer.domElement);
    this.audio = new Audio();
    this.loreRead = {};
    this.ending = null;
    this.started = false;
    this.clock = new THREE.Clock();
  }

  setShadows(on) {
    this.renderer.shadowMap.enabled = on;
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  }

  async load() {
    const models = [...VILLAGE_MODELS, ...PROP_MODELS, ...LANDMARK_MODELS, ...NATURE_MODELS, ...STRUCTURE_MODELS, ...CREATURE_MODELS, ...itemModelPaths()];
    await preload(models, (f, name) => {
      $('loadbar').style.width = (f * 85) + '%';
      $('loadtext').textContent = 'Gathering ' + name.split('/').pop().replace(/_/g, ' ').toLowerCase() + '…';
    });
    $('loadtext').textContent = 'Raising the vale…';
    await new Promise(r => setTimeout(r, 30));

    this.inventory = new Inventory(undefined, this.events);
    this.skills = new Skills(this.events);
    this.particles = new Particles(this.scene);
    this.structures = new Structures(this);
    this.quests = new Quests(this);
    this.world = new World(this);
    this.world.build();
    this.creatures = new Creatures(this);
    this.projectiles = new Projectiles(this);
    this.graves = new Graves(this);
    this.player = new Player(this);
    this.ui = new UI(this);
    this.save = new SaveSystem(this);
    this.save.loadSettings();
    if (this.lowGfx) { this.setShadows(false); this.world.lightPool.slice(2).forEach(l => { l.visible = false; }); }
    this.world.removeTaken = (id) => { const b = this.world.bookTargets[id]; if (b) { this.world.scene.remove(b.obj); b.t.enabled = false; this.world.taken.add(id); } };

    $('loadtext').textContent = 'Lighting the lanterns…';
    await new Promise(r => setTimeout(r, 30));
    for (const id of Object.keys(ITEMS)) itemIcon(id); // warm the icon cache
    $('loadbar').style.width = '100%';

    // a first frame so shaders compile behind the title
    this.player.spawnAt(this.world.spawnPoint.pos, this.world.spawnPoint.yaw);
    this.player.updateCamera(0);
    this.world.update(0.01, this.player.pos);
    this.renderer.compile(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
    this.bindInput();
    this.showMenu();
    this.renderer.setAnimationLoop(() => this.frame());
    window.thornmere = this; // handy for poking at the game from the console
  }

  showMenu() {
    $('loading').classList.add('hidden');
    $('menu').classList.remove('hidden');
    if (this.save.has()) $('btn-continue').classList.remove('hidden');
    $('btn-new').onclick = () => this.newGame();
    $('btn-continue').onclick = () => this.continueGame();
    $('btn-controls').onclick = () => { $('title').classList.add('hidden'); this.ui.openControls(); this.ui.panel.onClose = () => $('title').classList.remove('hidden'); };
  }

  begin() {
    this.audio.init();
    this.audio.setVolume(this.audio.volume);
    $('title').classList.add('hidden');
    $('hud').classList.remove('hidden');
    this.started = true;
    this.ui.renderBelt();
    this.input.lock();
  }

  newGame() {
    this.audio.init();
    $('title').classList.add('hidden');
    this.ui.playIntro(() => {
      this.begin();
      this.player.spawnAt(this.world.spawnPoint.pos, this.world.spawnPoint.yaw);
      this.world.sky.hour = 7.2;
      this.quests.start('main');
      setTimeout(() => this.ui.toast('Look around with the mouse. E to take things. Tab for your pack, Q to craft.'), 1500);
    });
  }

  continueGame() {
    this.begin();
    if (!this.save.load()) this.newGame();
    else this.ui.toast('You return to Thornmere.');
  }

  endingChosen(kind, silent = false) {
    this.ending = kind;
    this.quests.flags[kind === 'seal' ? 'sealed' : 'woke'] = true;
    if (!silent) {
      this.inventory.remove('hollow_crown', 1);
      this.inventory.add(kind === 'seal' ? 'gilded_armor' : 'ember_heart', 1);
      this.quests.setFlag('ending');
      this.save.autosave();
    }
    // the hearth burns again, gold if sealed, pale blue if awake
    const h = this.world.hearth.position;
    this.world.addFire({ pos: new THREE.Vector3(h.x, h.y + 0.9, h.z), lit: true, radius: 10, color: kind === 'seal' ? 0xffb050 : 0x90b0ff, intensity: 40, lightY: 0.5, hearth: true });
    if (kind === 'wake') { CREATURES.wisp.passive = true; CREATURES.wisp.aggro = 0; CREATURES.wisp.nightAggro = 0; }
    if (kind === 'seal') CREATURES.wisp.sealed = true;
  }

  stationsNear() {
    const p = this.player.pos, out = new Set(['hand']);
    for (const t of this.world.targets.near(p.x, p.z, 3.5)) {
      if (!t.station) continue;
      if (Math.hypot(t.x - p.x, t.z - p.z) > 3.5) continue;
      const s = typeof t.station === 'function' ? t.station() : t.station;
      if (s) out.add(s);
    }
    return out;
  }

  bindInput() {
    this.input.onLockChange = (locked) => {
      if (!locked && this.started && !this.ui.modalOpen && !this.player.dead) this.ui.openPause();
    };
    this.renderer.domElement.addEventListener('click', () => {
      if (this.started && !this.ui.modalOpen && !this.player.dead) this.input.lock();
    });
    document.addEventListener('click', (e) => {
      if (this.started && !this.ui.modalOpen && !this.input.locked && !this.player.dead && !e.target.closest('button')) this.input.lock();
    });
  }

  handleKeys() {
    const input = this.input, ui = this.ui;
    if (!this.started || this.player.dead) return;
    if (input.hit('Escape') && ui.modalOpen && !['death', 'ending'].includes(ui.panel.name)) { ui.closeAll(); return; }
    if (input.hit('Tab') || input.hit('KeyI')) ui.toggle('inventory', () => ui.openInventory());
    if (input.hit('KeyQ')) ui.toggle('crafting', () => ui.openCrafting());
    if (input.hit('KeyK')) ui.toggle('skills', () => ui.openSkills());
    if (input.hit('KeyJ')) ui.toggle('journal', () => ui.openJournal());
    if (input.hit('KeyM')) ui.toggle('map', () => ui.openMap());
    if (ui.modalOpen) {
      if (input.hit('KeyE') && ['container', 'book', 'trade'].includes(ui.panel.name)) ui.closeAll();
      return;
    }
    if (!input.locked) return;

    // what are we looking at?
    const p = this.player;
    const { origin, dir } = p.viewRay();
    const pick = this.world.targets.pick(origin, dir, 3.3);
    const lines = [];
    const t = pick?.target;
    if (t && !this.structures.ghost) {
      const text = t.prompt?.();
      if (text) lines.push(['E', text]);
      if (t.hit && t.hitVerb) {
        const lvl = t.skill ? this.skills.level(t.skill) : 99;
        const held = p.held?.def;
        const lacksTool = t.tool && held?.tool !== t.tool;
        const lacksLvl = t.level && lvl < t.level;
        lines.push(['LMB', `${t.hitVerb} ${t.name}${lacksLvl ? ` — needs ${t.skill[0].toUpperCase() + t.skill.slice(1)} ${t.level}` : lacksTool ? ` — needs ${t.tool === 'axe' ? 'an axe' : 'a pickaxe'}` : ''}`, lacksLvl || lacksTool]);
      }
      if (t.alt) lines.push(['F', t.altPrompt || 'Use']);
      if (input.hit('KeyE') && t.use) t.use(this);
      if (input.hit('KeyF') && t.alt) t.alt(this);
    } else if (!this.structures.ghost) {
      const water = p.lookingAtWater(3.3) || (p.isSwimming() ? p.pos : null);
      if (water) {
        lines.push(['E', 'Drink from the water']);
        if (p.held?.slot.id === 'bottle') lines.push(['LMB', 'Fill the bottle']);
        if (input.hit('KeyE')) p.drinkWater(14, true);
      }
    }
    if (p.held?.def.tool === 'rod' && p.fishing?.bite) lines.unshift(['LMB', 'Strike!']);
    ui.setPrompt(lines);
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.tick(dt);
    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }

  tick(dt) {
    if (this.started) {
      const paused = this.ui.modalOpen && ['pause', 'controls', 'ending', 'map', 'skills', 'journal', 'book'].includes(this.ui.panel.name);
      this.handleKeys();
      if (!paused) {
        this.player.update(dt);
        this.world.update(dt, this.player.pos);
        this.structures.update(dt);
        this.creatures.update(dt);
        this.projectiles.update(dt);
        this.graves.update();
        this.save.update(dt);
      } else this.player.updateCamera(dt);
      this.particles.update(dt);
      this.ui.update(dt);
      this.updateAmbience();
    } else {
      // slow drift over the village behind the title
      this.titleT = (this.titleT || 0) + dt;
      const a = this.titleT * 0.03;
      this.camera.position.set(Math.cos(a) * 46, 24, Math.sin(a) * 46);
      this.camera.lookAt(0, 6, 0);
      this.world.update(dt * 0.3, this.camera.position);
      this.structures.update(dt);
      this.particles.update(dt);
    }
  }

  updateAmbience() {
    const w = this.world, p = this.player;
    const inHollow = Math.hypot(p.pos.x - PLACES.hollow.x, p.pos.z - PLACES.hollow.z) < PLACES.hollow.r;
    const nearWater = w.heightAt(p.pos.x, p.pos.z) < 2.5 || Math.hypot(p.pos.x - PLACES.mere.x, p.pos.z - PLACES.mere.z) < PLACES.mere.r * 1.1;
    this.audio.setAmbience({
      wind: 0.04 + Math.max(0, p.pos.y - 10) * 0.004 + w.sky.darkness * 0.03,
      rain: w.sky.rain,
      fire: w.warmthAt(p.pos),
      water: nearWater ? 0.6 : 0,
      drone: (inHollow ? 0.8 : 0) + (p.resolve < 30 ? (1 - p.resolve / 30) : 0) + w.sky.darkness * 0.2,
    });
  }
}

const game = new Game();
game.load().catch((e) => {
  console.error(e);
  $('loadtext').textContent = 'Something went wrong while loading: ' + e.message;
});
