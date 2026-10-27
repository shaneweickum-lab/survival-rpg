// The interface: HUD, panels (inventory, crafting, skills, journal, map, trade), books, and screens.
import * as THREE from 'three';
import { ITEMS } from '../data/items.js';
import { RECIPES, STATIONS } from '../data/recipes.js';
import { SKILLS, XP_TABLE, MAX_LEVEL, LEVELS_PER_PLAYER_LEVEL } from '../data/skills.js';
import { INCANTATIONS } from '../data/incantations.js';
import { QUESTS } from '../data/quests.js';
import { LORE, ENDINGS, LANTERN_LINES, INTRO } from '../data/lore.js';
import { PLACES } from '../data/places.js';
import { CREATURES } from '../data/creatures.js';
import { itemIcon } from '../game/itemvisuals.js';
import { BELT } from '../game/state.js';
import { BUFF_INFO, MAX_CALORIES } from '../player/player.js';
import { GUIDES, TUTORIAL_COUNT } from '../data/tutorial.js';

const $ = (id) => document.getElementById(id);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};

// Every menu sits behind Tab, one page per tab. [panel name, label, hotkey, opener]
const MENU = [['inventory', 'Pack', 'Tab'], ['crafting', 'Crafting', 'Q'], ['skills', 'Skills', 'K'], ['prayer', 'Prayer', 'P'], ['journal', 'Journal', 'J'], ['map', 'Map', 'M']];
const MENU_OPEN = { inventory: 'openInventory', crafting: 'openCrafting', skills: 'openSkills', prayer: 'openPrayer', journal: 'openJournal', map: 'openMap' };

const WARES = [
  ['bottle', 10], ['bandage', 12], ['arrow', 4], ['torch', 18], ['rope', 12], ['flint', 6], ['fishing_rod', 35], ['leather', 22], ['cloth', 16],
  ['potion_health', 70], ['potion_antidote', 60], ['potion_resolve', 80], ['satchel', 75], ['iron_bar', 80], ['kit_bedroll', 30], ['book_lantern', 1],
];

export class UI {
  constructor(game) {
    this.game = game;
    this.panel = null;
    this.toastCount = 0;
    this.lastBelt = '';
    this.buildCompass();
    this.buildNeeds();
    const ev = game.events;
    ev.on('inventory', () => { this.renderBelt(); if (this.panel?.refresh) this.panel.refresh(); });
    ev.on('belt', () => this.renderBelt());
    ev.on('buffs', () => this.renderBuffs());
    ev.on('xp', (id, amt) => this.xpDrop(id, amt));
    ev.on('levelup', (id, lvl) => this.levelUp(id, lvl));
    ev.on('playerlevel', (lvl) => { setTimeout(() => { this.questBanner('You have grown', `Level ${lvl}`); this.game.audio.play('quest'); }, 1200); });
    ev.on('questsChanged', () => { if (this.panel?.name === 'journal') this.panel.refresh(); });
    addEventListener('mousemove', (e) => { this.mx = e.clientX; this.my = e.clientY; this.placeTooltip(); });
    $('tooltip').classList.add('hidden');
  }

  get modalOpen() { return !!this.panel; }

  // ---------- small messages ----------
  toast(msg) {
    const box = $('toasts');
    const t = h('div', { class: 'toast' }, msg);
    box.append(t);
    while (box.children.length > 6) box.firstChild.remove();
    setTimeout(() => t.remove(), 5100);
  }
  setHint(html) { $('hint').innerHTML = html; }
  questBanner(top, main) {
    const b = $('banner');
    b.classList.remove('hidden');
    $('banner-top').textContent = top.toUpperCase();
    $('banner-main').textContent = main;
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => b.classList.add('hidden'), 4600);
  }
  xpDrop(id, amt) {
    const s = SKILLS[id];
    const el = h('div', { class: 'xpdrop', style: `color:${s.color}` }, `${s.icon} +${amt} ${s.name}`);
    $('xpdrops').append(el);
    setTimeout(() => el.remove(), 1800);
  }
  levelUp(id, lvl) {
    const s = SKILLS[id];
    this.questBanner(`${s.name} level ${lvl}`, levelLine(id, lvl));
    this.game.audio.play('level');
    this.toast(`Your ${s.name} is now level ${lvl}.`);
  }
  fade(on, text = '') {
    $('fade').classList.toggle('on', on);
    $('fade-text').innerHTML = text;
  }

  // ---------- guide dialogue (a chat box, one line at a time) ----------
  say(guideId, lines) {
    const G = GUIDES[guideId];
    this.dialogue = { name: G ? G.name : guideId, color: G ? '#' + G.color.toString(16).padStart(6, '0') : '#d4a64a', lines: [...lines], i: 0 };
    this.showLine();
    this.game.audio.play('ui');
  }
  showLine() {
    const d = this.dialogue, box = $('dialogue');
    if (!d) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    box.innerHTML = '';
    box.onclick = () => this.nextLine();
    box.append(h('div', { class: 'dname', style: `color:${d.color}` }, d.name), h('div', { class: 'dtext' }, d.lines[d.i]),
      h('div', { class: 'dmore' }, d.i < d.lines.length - 1 ? 'E — continue' : 'E — close'));
    clearTimeout(this._dlgT);
    this._dlgT = setTimeout(() => { if (this.dialogue === d) this.nextLine(); }, 9000 + d.lines[d.i].length * 45);
  }
  nextLine() {
    const d = this.dialogue;
    if (!d) return;
    d.i++;
    if (d.i >= d.lines.length) this.dialogue = null;
    this.showLine();
  }

  // the tutorial tracker in the corner
  renderTutorial() {
    const g = this.game, t = g.quests.tutorial, box = $('tutorial');
    if (!t) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const st = t.q.stages[t.s.stage];
    const goals = st.goals.map((goal, i) => {
      const prog = g.quests.goalProgress(t.id, i), n = goal.n || 1, ok = prog >= n;
      return `<div class="tgoal${ok ? ' done' : ''}">${ok ? '✓' : '◇'} ${goal.label}${n > 1 ? ` (${Math.min(prog, n)}/${n})` : ''}</div>`;
    }).join('');
    const html = `<div class="ttop">TUTORIAL · ${t.q.index + 1} of ${TUTORIAL_COUNT}</div><div class="tbar2"><div style="width:${100 * (t.q.index + t.s.stage * 0.5) / TUTORIAL_COUNT}%"></div></div><div class="ttitle">${t.q.title.replace(/^\d+\. /, '')}</div>${goals}`;
    if (html !== this._tutHtml) { this._tutHtml = html; box.innerHTML = html; }
  }

  openTutorialChoice(onWalk, onSkip) {
    this.open('tutorialChoice', (root) => {
      root.append(h('div', { class: 'ptitle' }, 'The Lights of Thornmere'));
      root.append(h('p', { style: 'max-width:600px;font-size:18px;line-height:1.6;font-style:italic' }, 'Out in the grey morning, small lights hang in the air where people used to stand. They are waiting for someone to teach.'));
      root.append(h('div', { class: 'choice' },
        h('button', { onclick: () => { this.closeAll(); onWalk(); } }, h('b', {}, 'Walk with the guides'), 'Twenty short lessons, from your first fire to your first prayer. Each one has a reward. Recommended.'),
        h('button', { onclick: () => { this.closeAll(); onSkip(); } }, h('b', {}, 'I know the way'), 'Skip the lessons and begin the story at once. The guides stay in the village if you want them later.')));
    }, { keepUnlocked: false, noClose: true });
  }

  // ---------- HUD ----------
  buildCompass() {
    const strip = $('compass-strip');
    this.ticks = [];
    for (let d = 0; d < 360; d += 15) {
      const label = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }[d];
      const el = h('div', { class: 'ctick' + (label && label.length === 1 ? '' : ' minor') }, label || '·');
      strip.append(el);
      this.ticks.push({ el, b: d });
    }
    this.questTick = h('div', { class: 'ctick quest' }, '◆');
    strip.append(this.questTick);
    this.placeTicks = [];
  }
  buildNeeds() {
    const box = $('needs');
    const defs = [['calories', 'Calories', '#e0a060', '🔥'], ['water', 'Water', '#5aa0e0', '💧'], ['carbs', 'Carbs', '#e0c040', '🌾'], ['fat', 'Fats', '#e08a3a', '🧈'], ['protein', 'Protein', '#d0504a', '🍖'], ['energy', 'Energy', '#9a8ad0', '☾']];
    this.needEls = defs.map(([k, label, color, ico]) => {
      const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const el = h('div', { class: 'need' });
      el.title = label;
      el.innerHTML = `<svg viewBox="0 0 46 46"><circle cx="23" cy="23" r="19" fill="rgba(0,0,0,0.5)" stroke="rgba(120,100,60,0.5)" stroke-width="4"/><text x="23" y="29" text-anchor="middle" font-size="16">${ico}</text></svg>${label}`;
      arc.setAttribute('cx', 23); arc.setAttribute('cy', 23); arc.setAttribute('r', 19);
      arc.setAttribute('fill', 'none'); arc.setAttribute('stroke', color); arc.setAttribute('stroke-width', 4);
      arc.setAttribute('transform', 'rotate(-90 23 23)');
      arc.setAttribute('stroke-dasharray', `${2 * Math.PI * 19}`);
      el.querySelector('svg').insertBefore(arc, el.querySelector('text'));
      box.append(el);
      return { k, el, arc };
    });
  }

  renderBelt() {
    const g = this.game, inv = g.inventory, belt = $('belt');
    belt.innerHTML = '';
    for (let i = 0; i < BELT; i++) {
      const s = inv.slots[i];
      const el = this.slotEl(s, i === g.player.belt ? 'sel' : '');
      el.append(h('span', { class: 'k' }, String(i + 1)));
      belt.append(el);
    }
    const held = inv.slots[g.player.belt];
    const name = held ? ITEMS[held.id].name : '';
    if (name !== this.lastBelt) {
      this.lastBelt = name;
      const bn = $('belt-name');
      bn.textContent = name;
      bn.style.opacity = 1;
      clearTimeout(this._bnT);
      this._bnT = setTimeout(() => { bn.style.opacity = 0; }, 2000);
    }
  }

  slotEl(s, cls = '') {
    const el = h('div', { class: 'slot ' + cls });
    if (s) {
      const def = ITEMS[s.id];
      if (def.legendary) el.classList.add('legend');
      el.append(h('img', { src: itemIcon(s.id), draggable: 'false' }));
      if (s.n > 1) el.append(h('span', { class: 'n' }, String(s.n)));
      if (s.dur != null && def.dur && def.dur < 9999) {
        const f = Math.max(0, s.dur / def.dur);
        el.append(h('div', { class: 'dur' }, h('div', { style: `width:${f * 100}%;background:${f > 0.5 ? '#7ac04a' : f > 0.2 ? '#d0b040' : '#d05030'}` })));
      }
      el.addEventListener('mouseenter', () => this.showTooltip(s));
      el.addEventListener('mouseleave', () => this.hideTooltip());
    }
    return el;
  }

  renderBuffs() {
    const p = this.game.player, box = $('buffs');
    box.innerHTML = '';
    for (const [k, t] of Object.entries(p.buffs)) {
      const b = BUFF_INFO[k];
      if (!b) continue;
      box.append(h('div', { class: 'buff' + (b.bad ? ' bad' : '') }, `${b.icon} ${b.name}${t < 9000 ? ' ' + Math.ceil(t) + 's' : ''}`));
    }
  }

  update(dt) {
    const g = this.game, p = g.player, w = g.world;
    $('hp-fill').style.width = (100 * p.hp / p.maxHp) + '%';
    $('st-fill').style.width = (100 * p.stamina / p.maxStamina) + '%';
    $('rs-fill').style.width = (100 * p.resolve / p.maxResolve) + '%';
    const C = 2 * Math.PI * 19;
    $('mn-fill').style.width = (100 * p.mana / p.maxMana) + '%';
    const lvlText = `Level ${g.skills.playerLevel}${p.burden > 1 ? ' · <span style="color:#e08a70">overburdened</span>' : ''}`;
    if (lvlText !== this._lvlText) { this._lvlText = lvlText; $('plevel').innerHTML = lvlText; }
    if (this.job && !p.action?.craft) { this.job = null; if (this.panel?.name === 'crafting') this.panel.refresh(); } // walked away mid-craft
    if (this.panel?.name === 'crafting') this.updateCraftJob();
    for (const n of this.needEls) {
      const v = n.k === 'calories' ? 100 * p.needs.calories / MAX_CALORIES : p.needs[n.k];
      n.arc.setAttribute('stroke-dashoffset', String(C * (1 - v / 100)));
      n.el.classList.toggle('low', v < 15);
    }
    this._buffT = (this._buffT || 0) - dt;
    if (this._buffT <= 0) { this._buffT = 1; this.renderBuffs(); }
    this._tutT = (this._tutT || 0) - dt;
    if (this._tutT <= 0) { this._tutT = 0.3; this.renderTutorial(); }

    // clock
    const sky = w.sky;
    $('clock').innerHTML = `${sky.timeString}<small>Day ${sky.day}${sky.rain > 0.3 ? ' · rain' : ''}${sky.isNight ? ' · night' : ''}</small>`;

    // compass
    const heading = ((-p.yaw * 180 / Math.PI) % 360 + 360) % 360;
    const W = $('compass').clientWidth, ppd = W / 180;
    const pos = (b) => { let d = ((b - heading + 540) % 360) - 180; return W / 2 + d * ppd; };
    for (const t of this.ticks) t.el.style.left = pos(t.b) + 'px';
    const tgt = g.quests.activeTarget();
    if (tgt) {
      const P = tgt;
      const b = (Math.atan2(P.x - p.pos.x, -(P.z - p.pos.z)) * 180 / Math.PI + 360) % 360;
      const near = Math.hypot(P.x - p.pos.x, P.z - p.pos.z) < P.r * 0.4;
      this.questTick.style.display = near ? 'none' : '';
      this.questTick.style.left = pos(b) + 'px';
    } else this.questTick.style.display = 'none';

    // vignettes and overlays
    const dread = Math.max(0, 1 - p.resolve / 35);
    const tired = Math.max(0, 1 - p.needs.energy / 15);
    $('vignette').style.opacity = String(Math.min(1, dread * 0.9 + tired * 0.6 + (p.hp < p.maxHp * 0.25 ? 0.4 : 0)));
    $('hurt').style.opacity = String(p.hurtFlash * 0.9 + (p.hasBuff('poisoned') ? 0.15 + Math.sin(w.time * 3) * 0.08 : 0));
    const thirsty = p.needs.water < 15 ? (1 - p.needs.water / 15) : 0;
    g.renderer.domElement.style.filter = `saturate(${1 - dread * 0.7}) blur(${thirsty * 1.2}px)${p.hasBuff('sick') ? ' hue-rotate(20deg)' : ''}`;

    // action bar
    const a = p.action;
    $('action').classList.toggle('hidden', !a);
    if (a) { $('action-label').textContent = a.label; $('action-fill').style.width = (100 * a.t / a.dur) + '%'; }

    // creature under the crosshair
    const { origin, dir } = p.viewRay();
    let c = g.creatures.findMeleeTarget(origin, dir, 28);
    if (c && (c.C.passive && c.state !== 'flee')) c = c.hp < c.maxHp ? c : null;
    const ti = $('target-info');
    if (c && !c.dead && !this.modalOpen) {
      ti.classList.remove('hidden');
      $('target-name').textContent = `${c.C.name}  (level ${c.C.level})`;
      $('target-hp').style.width = (100 * c.hp / c.maxHp) + '%';
    } else ti.classList.add('hidden');

    $('lockhint').classList.toggle('hidden', g.input.locked || this.modalOpen || p.dead || !g.started);
  }

  setPrompt(lines) {
    $('prompt').innerHTML = lines.map(([k, t, warn]) => `<div><span class="key">${k}</span>${warn ? `<span class="lvl">${t}</span>` : t}</div>`).join('');
    $('crosshair').classList.toggle('active', lines.length > 0);
  }

  // ---------- tooltips ----------
  showTooltip(s) {
    const def = ITEMS[s.id];
    const lines = [`<h4 class="${def.legendary ? 'legendary' : ''}">${def.name}</h4>`];
    const st = [];
    if (def.dmg) st.push(`Damage ${def.dmg}`);
    if (def.speed) st.push(`Speed ${def.speed}`);
    if (def.armor) st.push(`Armor ${def.armor}`);
    if (def.block) st.push(`Block ${Math.round(def.block * 100)}%`);
    if (def.tier) st.push(`Tier ${def.tier}`);
    if (def.food) st.push(`${def.kcal} kcal · ` + ['water', 'carbs', 'fat', 'protein'].filter(k => def.food[k]).map(k => `${k === 'fat' ? 'fats' : k} +${def.food[k]}`).join(', '));
    if (def.bury) st.push(`Bury for ${def.bury} Prayer xp`);
    st.push(`${def.weight} kg${s.n > 1 ? ` (${+(def.weight * s.n).toFixed(2)} kg)` : ''}`);
    if (s.dur != null && def.dur && def.dur < 9999) st.push(`Durability ${s.dur}/${def.dur}`);
    if (st.length) lines.push(`<div class="st">${st.join(' · ')}</div>`);
    lines.push(`<i>${def.desc}</i>`);
    if (def.value) lines.push(`<div style="color:#8a7a5a;margin-top:3px">Worth ${def.value} coin${def.value > 1 ? 's' : ''}</div>`);
    $('tooltip').innerHTML = lines.join('');
    $('tooltip').classList.remove('hidden');
    this.placeTooltip();
  }
  hideTooltip() { $('tooltip').classList.add('hidden'); }
  placeTooltip() {
    const t = $('tooltip');
    if (t.classList.contains('hidden')) return;
    const x = Math.min(this.mx + 16, innerWidth - t.offsetWidth - 8), y = Math.min(this.my + 16, innerHeight - t.offsetHeight - 8);
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }

  // ---------- panel framework ----------
  open(name, build, opts = {}) {
    const g = this.game;
    this.closeCtx();
    this.panel = { name, build, ...opts };
    this.openedAt = performance.now();
    const isMenu = MENU.some(m => m[0] === name);
    if (isMenu) { this.lastMenu = name; g.events.emit('act', 'menu'); }
    this.panel.refresh = () => {
      const inner = $('panel-inner');
      inner.innerHTML = '';
      if (!opts.noClose) inner.append(h('button', { class: 'close', onclick: () => this.closeAll() }, '✕'));
      if (isMenu) inner.append(h('div', { class: 'menutabs' }, MENU.map(([n, label, key]) => h('button', { class: 'menutab' + (n === name ? ' on' : ''), onclick: () => { if (n !== name) this.openMenu(n); } }, label, h('small', {}, key)))));
      build(inner);
    };
    $('panel').classList.remove('hidden');
    this.panel.refresh();
    g.input.unlock();
    g.audio.play('ui');
  }
  closeAll() {
    if (!this.panel) return;
    const was = this.panel;
    this.panel = null;
    this.closeCtx();
    this.hideTooltip();
    $('panel').classList.add('hidden');
    was.onClose?.();
    if (this.game.started && !this.game.player.dead && !was.keepUnlocked) this.game.input.lock();
  }
  toggle(name, fn) { if (this.panel?.name === name) this.closeAll(); else fn(); }
  openMenu(name) { this[MENU_OPEN[name] || 'openInventory'](); }
  // Tab: open the last menu page, or close whatever is open
  toggleMenu() { if (this.panel?.name === 'tutorialChoice') return; if (this.panel) this.closeAll(); else this.openMenu(this.lastMenu || 'inventory'); }

  // ---------- inventory ----------
  openInventory() {
    this.open('inventory', (root) => {
      const g = this.game, p = g.player;
      root.append(h('div', { class: 'ptitle' }, 'Pack', h('small', {}, 'drag to move · right-click for actions · drag out to drop')));
      const left = h('div', {});
      left.append(h('div', { class: 'sec' }, 'WORN'));
      const eq = h('div', { class: 'equip' });
      for (const [slot, label] of [['body', 'Body'], ['offhand', 'Off-hand'], ['trinket', 'Trinket'], ['bag', 'Bag']]) {
        const s = p.equip[slot];
        const el = this.slotEl(s ? { ...s, n: 1 } : null);
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => { p.unequip(slot); this.hideTooltip(); this.panel?.refresh(); });
        eq.append(el, h('div', { class: 'lbl' }, s ? ITEMS[s.id].name : label));
      }
      left.append(eq);
      const w = g.inventory.weight, cap = p.capacity, f = w / cap;
      left.append(h('div', { class: 'stats', html: `Level <b>${g.skills.playerLevel}</b> <span style="color:#8a7a5a">(${g.skills.toNextPlayerLevel} skill levels to next)</span><br>Combat level <b>${g.skills.combat}</b> · Total <b>${g.skills.total}</b><br>Armor <b>${p.armor}</b> · Coins <b>${g.inventory.count('coin')}</b><br>Mana <b>${Math.floor(p.mana)}/${p.maxMana}</b> · Calories <b>${Math.floor(p.needs.calories)}</b>` }));
      left.append(h('div', { class: 'stats', style: 'margin-top:6px' }, `Load ${w.toFixed(1)} / ${cap.toFixed(1)} kg`, h('div', { class: 'loadbar' }, h('div', { style: `width:${Math.min(100, f * 100)}%;background:${f > 1 ? '#c04a3a' : f > 0.75 ? '#c8a040' : '#6a9a4a'}` })),
        h('div', { style: 'font-size:13px;color:#8a7a5a' }, f > 1.5 ? 'Far too heavy to move.' : f > 1 ? 'Overburdened: no running or jumping.' : 'Strength raises how much you can carry.')));
      const right = h('div', {});
      right.append(h('div', { class: 'sec' }, 'BELT  (1–8)'));
      right.append(this.invGrid(0, BELT, 'beltslot'));
      right.append(h('div', { class: 'sec' }, 'PACK'));
      right.append(this.invGrid(BELT, g.inventory.size, ''));
      root.append(h('div', { class: 'row' }, left, right));
    });
  }

  invGrid(from, to, cls, onClick = null) {
    const g = this.game, inv = g.inventory;
    const grid = h('div', { class: 'grid' });
    for (let i = from; i < to; i++) {
      const s = inv.slots[i];
      const el = this.slotEl(s, cls + (i === g.player.belt ? ' sel' : ''));
      el.dataset.slot = i;
      el.addEventListener('mousedown', (e) => {
        if (e.button === 2) { if (s) this.ctxMenu(e, i); return; }
        if (onClick) { onClick(i, e); return; }
        if (s) this.beginDrag(e, i);
      });
      grid.append(el);
    }
    return grid;
  }

  beginDrag(e, from) {
    const g = this.game, inv = g.inventory;
    const ghost = h('img', { src: itemIcon(inv.slots[from].id), style: 'position:fixed;width:52px;height:52px;pointer-events:none;z-index:50;opacity:0.85' });
    document.body.append(ghost);
    const move = (ev) => { ghost.style.left = ev.clientX - 26 + 'px'; ghost.style.top = ev.clientY - 26 + 'px'; };
    move(e);
    let moved = false;
    const mm = (ev) => { moved = true; move(ev); };
    const up = (ev) => {
      removeEventListener('mousemove', mm); removeEventListener('mouseup', up); ghost.remove();
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.slot');
      if (!moved) {
        const now = performance.now();
        if (this._lastClick?.slot === from && now - this._lastClick.t < 400) { this._lastClick = null; g.player.consume(from); this.hideTooltip(); this.panel?.refresh(); return; }
        this._lastClick = { slot: from, t: now };
        if (from < BELT) { g.player.selectBelt(from); document.querySelectorAll('#panel-inner .grid .slot.sel').forEach(el => el.classList.remove('sel')); document.querySelector(`#panel-inner .grid .slot[data-slot="${from}"]`)?.classList.add('sel'); }
        return;
      }
      if (target?.dataset.slot != null) {
        const to = Number(target.dataset.slot);
        const a = inv.slots[from], b = inv.slots[to];
        if (a && b && a.id === b.id && ITEMS[a.id].stack > 1) { const k = Math.min(ITEMS[a.id].stack - b.n, a.n); b.n += k; a.n -= k; if (a.n <= 0) inv.slots[from] = null; inv.changed(); }
        else inv.swap(from, to);
      } else if (!document.elementFromPoint(ev.clientX, ev.clientY)?.closest('#panel-inner')) this.dropSlot(from, true);
    };
    addEventListener('mousemove', mm); addEventListener('mouseup', up);
  }

  dropSlot(i, all) {
    const g = this.game;
    const s = g.inventory.takeSlot(i, all ? 9999 : 1);
    if (!s) return;
    const { origin, dir } = g.player.viewRay();
    const p = origin.clone().addScaledVector(dir.setY(0).normalize(), 1.2);
    g.world.dropItem(s.id, s.n, p, s.dur != null ? { dur: s.dur } : {});
    g.audio.play('pickup');
  }

  ctxMenu(e, i) {
    this.closeCtx();
    const g = this.game, s = g.inventory.slots[i], def = ITEMS[s.id];
    const verbs = { food: 'Eat', drink: 'Drink', potion: 'Drink', medicine: 'Apply', book: 'Read', placeable: 'Place', armor: 'Wear', shield: 'Equip', trinket: 'Wear', bag: 'Strap on' };
    const items = [];
    if (def.bury) items.push(['Bury', () => g.player.consume(i)]);
    else if (verbs[def.type]) items.push([verbs[def.type], () => g.player.consume(i)]);
    if (i >= BELT) items.push(['Move to belt', () => { const free = g.inventory.slots.findIndex((x, k) => k < BELT && !x); g.inventory.swap(i, free >= 0 ? free : g.player.belt); }]);
    else items.push(['Hold', () => g.player.selectBelt(i)]);
    items.push(['Drop', () => this.dropSlot(i, true)]);
    if (s.n > 1) items.push(['Drop one', () => this.dropSlot(i, false)]);
    const menu = h('div', { class: 'ctx', style: `left:${e.clientX}px;top:${e.clientY}px` }, items.map(([label, fn]) => h('div', { onclick: () => { this.closeCtx(); fn(); this.panel?.refresh(); } }, label)));
    document.body.append(menu);
    this.ctx = menu;
    setTimeout(() => addEventListener('mousedown', this._ctxClose = (ev) => { if (!menu.contains(ev.target)) this.closeCtx(); }), 0);
  }
  closeCtx() { this.ctx?.remove(); this.ctx = null; if (this._ctxClose) removeEventListener('mousedown', this._ctxClose); }

  // ---------- containers ----------
  openContainer(c) {
    this.open('container', (root) => {
      const g = this.game, inv = g.inventory;
      root.append(h('div', { class: 'ptitle' }, c.name, h('small', {}, 'click an item to move it')));
      const cgrid = h('div', { class: 'grid' });
      c.items.forEach((s, i) => {
        const el = this.slotEl(s);
        el.addEventListener('mousedown', () => {
          if (!s) return;
          const left = inv.add(s.id, s.n, s.dur != null ? { dur: s.dur } : {});
          if (left) { s.n = left; this.toast('Your pack is full.'); } else c.items[i] = null;
          g.audio.play(s.id === 'coin' ? 'coin' : 'pickup');
          this.hideTooltip(); this.panel.refresh();
        });
        cgrid.append(el);
      });
      root.append(cgrid);
      root.append(h('div', { style: 'margin:10px 0' }, h('button', { onclick: () => {
        c.items.forEach((s, i) => { if (s) { const left = inv.add(s.id, s.n, s.dur != null ? { dur: s.dur } : {}); if (left) s.n = left; else c.items[i] = null; } });
        g.audio.play('pickup'); this.panel.refresh();
      } }, 'Take all')));
      root.append(h('div', { class: 'sec' }, 'YOUR PACK'));
      root.append(this.invGrid(0, inv.size, '', (i) => {
        const s = inv.slots[i];
        if (!s) return;
        if (c.grave) return;
        const free = c.items.findIndex(x => !x);
        const same = c.items.find(x => x && x.id === s.id && ITEMS[s.id].stack > 1);
        if (same) { same.n += s.n; inv.slots[i] = null; }
        else if (free >= 0) { c.items[free] = { ...s }; inv.slots[i] = null; }
        else { this.toast('It will not fit.'); return; }
        inv.changed(); g.audio.play('pickup'); this.hideTooltip();
      }));
    });
  }

  // ---------- crafting ----------
  openCrafting(station = null) {
    const g = this.game;
    const near = g.stationsNear();
    let tab = station || (this._lastTab && (near.has(this._lastTab) || this._lastTab === 'hand') ? this._lastTab : 'hand');
    let sel = null;
    this.open('crafting', (root) => {
      const near = g.stationsNear();
      this._lastTab = tab;
      root.append(h('div', { class: 'ptitle' }, 'Crafting', h('small', {}, 'stations nearby are marked green')));
      const tabs = h('div', { class: 'tabs' });
      for (const [k, label] of Object.entries(STATIONS)) {
        tabs.append(h('button', { class: 'tab' + (k === tab ? ' on' : '') + (k === 'hand' || near.has(k) ? ' near' : ''), onclick: () => { tab = k; sel = null; this.panel.refresh(); } }, label));
      }
      root.append(tabs);
      const list = h('div', { class: 'recipes' });
      const recipes = RECIPES.filter(r => r.station === tab);
      if (!sel || sel.station !== tab) sel = recipes.find(r => g.inventory.has(r.in) && g.skills.level(r.skill) >= r.level) || recipes[0];
      for (const r of recipes) {
        const lvlOk = g.skills.level(r.skill) >= r.level;
        const ready = lvlOk && g.inventory.has(r.in);
        list.append(h('div', { class: 'recipe' + (r === sel ? ' on' : '') + (lvlOk ? '' : ' locked') + (ready ? ' ready' : ''), onclick: () => { sel = r; this.panel.refresh(); } },
          h('img', { src: itemIcon(r.out) }), h('span', { class: 'rn' }, `${ITEMS[r.out].name}${r.n > 1 ? ' ×' + r.n : ''}`)));
      }
      const det = h('div', { class: 'rdetail' });
      if (sel) {
        const out = ITEMS[sel.out];
        const lvlOk = g.skills.level(sel.skill) >= sel.level;
        const atStation = sel.station === 'hand' || near.has(sel.station);
        det.append(h('h3', {}, out.name + (sel.n > 1 ? ` ×${sel.n}` : '')), h('div', { class: 'desc' }, out.desc));
        for (const [id, n] of Object.entries(sel.in)) {
          const have = g.inventory.count(id);
          det.append(h('div', { class: 'req ' + (have >= n ? 'ok' : 'no') }, h('img', { src: itemIcon(id) }), `${ITEMS[id].name}  ${have}/${n}`));
        }
        for (const tool of sel.tools || []) {
          const has = this.hasTool(tool);
          det.append(h('div', { class: 'req ' + (has ? 'ok' : 'no') }, h('img', { src: itemIcon(tool) }), `Tool: ${ITEMS[tool].name} ${has ? '✓' : '(needed, not used up)'}`));
        }
        det.append(h('div', { class: 'req ' + (lvlOk ? 'ok' : 'no'), style: 'margin-top:8px' }, `${SKILLS[sel.skill].icon} ${SKILLS[sel.skill].name} level ${sel.level}  ·  ${sel.xp} xp`));
        det.append(h('div', { class: 'req', style: 'color:#b3a585' }, `⌛ ${fmtMins(sel.mins)}${sel.chance ? `  ·  ${Math.round(this.craftChance(sel) * 100)}% chance` : ''}`));
        if (!atStation) det.append(h('div', { class: 'req no' }, `Requires a ${STATIONS[sel.station].toLowerCase()} nearby${sel.station === 'fire' ? ' (lit)' : ''}.`));
        const can = lvlOk && atStation && g.inventory.has(sel.in) && (sel.tools || []).every(t => this.hasTool(t)) && !this.job;
        const maxN = can ? Math.min(...Object.entries(sel.in).map(([id, n]) => Math.floor(g.inventory.count(id) / n))) : 0;
        det.append(h('div', { style: 'display:flex;gap:8px;margin-top:14px' },
          h('button', { disabled: can ? null : 'disabled', onclick: () => { this.startCraft(sel, 1); this.panel.refresh(); } }, 'Make'),
          h('button', { disabled: maxN > 1 ? null : 'disabled', onclick: () => { this.startCraft(sel, Math.min(maxN, 10)); this.panel.refresh(); } }, `Make ${Math.min(Math.max(maxN, 2), 10)}`)));
        if (this.job) det.append(h('div', { class: 'craftjob' }, h('div', { id: 'craftjob-label' }, ''), h('div', { class: 'abar' }, h('div', { id: 'craftjob-fill', style: 'height:100%;background:var(--gold);width:0' })), h('button', { onclick: () => { this.cancelCraft(); this.panel.refresh(); } }, 'Stop')));
      }
      root.append(h('div', { class: 'row' }, list, det));
    });
  }

  hasTool(id) { return this.game.inventory.slots.some(s => s && s.id === id); }
  craftChance(r) { return r.chance ? Math.min(0.9, r.chance + this.game.skills.level(r.skill) * (r.chanceLvl || 0)) : 1; }

  // Crafting takes time: a short real wait, then the clock jumps forward by the recipe's minutes.
  startCraft(r, times) {
    if (this.job) return;
    this.job = { r, left: times, total: times, made: 0 };
    this.nextCraft();
  }
  nextCraft() {
    const g = this.game, job = this.job;
    if (!job) return;
    if (job.left <= 0 || !g.inventory.has(job.r.in)) { this.endCraft(); return; }
    const real = Math.min(6, 0.6 + job.r.mins * 0.04);
    const label = `Making ${ITEMS[job.r.out].name}${job.total > 1 ? ` (${job.total - job.left + 1}/${job.total})` : ''}`;
    g.audio.play(job.r.station === 'anvil' ? 'anvil' : job.r.station === 'fire' || job.r.station === 'bloomery' ? 'fire' : 'craft', 0.6);
    g.player.startAction(label, real, () => { this.finishCraft(real); }, { cancelOnMove: true });
    g.player.action.craft = true;
  }
  finishCraft(realSecs) {
    const g = this.game, job = this.job;
    if (!job) return;
    const r = job.r;
    if (!g.inventory.has(r.in) || !(r.station === 'hand' || g.stationsNear().has(r.station))) { this.toast('You can no longer make that here.'); this.endCraft(); return; }
    for (const [id, n] of Object.entries(r.in)) g.inventory.remove(id, n);
    for (const t of r.tools || []) { // tools wear a little
      const slot = g.inventory.slots.find(s => s && s.id === t);
      if (slot && slot.dur != null && --slot.dur <= 0) { g.inventory.slots[g.inventory.slots.indexOf(slot)] = null; this.toast(`Your ${ITEMS[t].name} breaks.`); g.inventory.changed(); }
    }
    let out = r.out, xp = r.xp, failed = false;
    if (r.burn) {
      const lvl = g.skills.level(r.skill);
      if (Math.random() < Math.max(0, 0.45 - (lvl - r.level) * 0.04)) { out = r.burn; xp = Math.round(xp * 0.2); this.toast('You burn it.'); }
    }
    if (r.chance && Math.random() > this.craftChance(r)) { failed = true; xp = r.failXp || 0; this.toast(r.fail || 'It fails.'); }
    if (!failed) {
      const left = g.inventory.add(out, r.n);
      if (left) g.world.dropItem(out, left, g.player.pos.clone().add(new THREE.Vector3(0, 0.5, 0)));
      for (const [id, n] of Object.entries(r.returns || {})) g.inventory.add(id, n);
      if (out === r.out) { g.events.emit('crafted', r.out, r.n); job.made++; }
      if (r.skill === 'cooking' && ITEMS[out].type === 'food') g.events.emit('act', 'cook');
    }
    g.skills.add(r.skill, xp);
    // the rest of the work happens in the blink of the clock
    const skipped = Math.max(0, r.mins - realSecs);
    g.world.sky.advance(skipped / 60);
    g.world.time += skipped;
    g.player.passTime(skipped);
    g.structures.passTime(skipped);
    job.left--;
    if (job.left > 0) this.nextCraft();
    else this.endCraft();
  }
  cancelCraft() { if (this.game.player.action?.craft) this.game.player.action = null; this.endCraft(); }
  endCraft() {
    const job = this.job;
    this.job = null;
    if (job?.made) this.toast(`Made ${ITEMS[job.r.out].name}${job.made * job.r.n > 1 ? ' ×' + job.made * job.r.n : ''}.`);
    if (this.panel?.name === 'crafting') this.panel.refresh();
  }
  updateCraftJob() {
    const a = this.game.player.action;
    if (this.job && a?.craft) {
      const l = $('craftjob-label'), f = $('craftjob-fill');
      if (l) l.textContent = a.label + '…';
      if (f) f.style.width = (100 * a.t / a.dur) + '%';
    }
  }

  // ---------- skills ----------
  openSkills() {
    this.open('skills', (root) => {
      const g = this.game;
      root.append(h('div', { class: 'ptitle' }, `Level ${g.skills.playerLevel}`, h('small', {}, `Total skill level ${g.skills.total} · Combat level ${g.skills.combat} · every ${LEVELS_PER_PLAYER_LEVEL} skill levels raise your level (${g.skills.toNextPlayerLevel} to go)`)));
      const grid = h('div', { class: 'skillgrid' });
      for (const [k, s] of Object.entries(SKILLS)) {
        const lvl = g.skills.level(k), xp = g.skills.xp[k];
        const next = lvl < MAX_LEVEL ? XP_TABLE[lvl + 1] : xp;
        const el = h('div', { class: 'skill' }, h('div', { class: 'si', style: `color:${s.color}` }, s.icon),
          h('div', { style: 'flex:1' }, h('div', { class: 'sn' }, s.name), h('div', { class: 'sb' }, h('div', { style: `width:${g.skills.progress(k) * 100}%;background:${s.color}` }))),
          h('div', { class: 'sl' }, String(lvl)));
        el.addEventListener('mouseenter', () => { $('tooltip').innerHTML = `<h4>${s.name}</h4><div class="st">${xp.toLocaleString()} xp${lvl < MAX_LEVEL ? ` · ${(next - xp).toLocaleString()} to level ${lvl + 1}` : ''}</div><i>${s.desc}</i>`; $('tooltip').classList.remove('hidden'); this.placeTooltip(); });
        el.addEventListener('mouseleave', () => this.hideTooltip());
        grid.append(el);
      }
      root.append(grid);
    });
  }

  // ---------- prayer ----------
  openPrayer() {
    this.open('prayer', (root) => {
      const g = this.game, p = g.player, lvl = g.skills.level('prayer');
      root.append(h('div', { class: 'ptitle' }, 'Prayer', h('small', {}, `Prayer ${lvl} · Mana ${Math.floor(p.mana)}/${p.maxMana} · G speaks your chosen incantation`)));
      root.append(h('p', { style: 'max-width:620px;font-style:italic;color:#b3a585;margin-top:0' }, 'Bury the bones you find (hold them and strike, or right-click them in your pack). The dead remember who laid them down. From Prayer 5 the old words answer you.'));
      const grid = h('div', { class: 'incs' });
      for (const inc of INCANTATIONS) {
        const ok = lvl >= inc.level;
        grid.append(h('div', { class: 'inc' + (ok ? '' : ' locked') + (p.quickIncantation === inc.id ? ' quick' : '') },
          h('h4', {}, inc.name), h('div', { class: 'words' }, ok ? `“${inc.words}”` : '…'),
          h('div', { class: 'meta' }, `${inc.desc}  ·  ${inc.mana} mana  ·  Prayer ${inc.level}`),
          ok ? h('button', { onclick: () => { this.closeAll(); p.cast(inc.id); } }, 'Speak') : null,
          ok ? h('button', { onclick: () => { p.quickIncantation = inc.id; this.panel.refresh(); } }, p.quickIncantation === inc.id ? 'On G ✓' : 'Set to G') : null));
      }
      root.append(grid);
    });
  }

  // ---------- journal ----------
  openJournal() {
    let tab = 'quests';
    this.open('journal', (root) => {
      const g = this.game;
      root.append(h('div', { class: 'ptitle' }, 'Journal'));
      root.append(h('div', { class: 'tabs' }, ...['quests', 'lore', 'bestiary'].map(t => h('button', { class: 'tab' + (t === tab ? ' on' : ''), onclick: () => { tab = t; this.panel.refresh(); } }, t[0].toUpperCase() + t.slice(1)))));
      const body = h('div', { style: 'width:560px;max-height:60vh;overflow:auto' });
      if (tab === 'quests') {
        const tutDone = Object.keys(g.quests.state).filter(id => QUESTS[id].tutorial && g.quests.state[id].done).length;
        const ids = Object.keys(g.quests.state).filter(id => !(QUESTS[id].tutorial && g.quests.state[id].done)).sort((a, b) => g.quests.state[a].done - g.quests.state[b].done);
        if (!ids.length && !tutDone) body.append(h('p', {}, 'Nothing yet.'));
        if (tutDone) body.append(h('div', { class: 'quest' }, h('h3', {}, `The Lights of Thornmere — ${tutDone} of ${TUTORIAL_COUNT} lessons learned`)));
        for (const id of ids) {
          const s = g.quests.state[id], q = QUESTS[id];
          const box = h('div', { class: 'quest' }, h('h3', {}, q.title + (s.done ? '  — completed' : '')));
          if (!s.done) {
            const st = q.stages[s.stage];
            box.append(h('h4', {}, st.title), h('p', {}, st.text));
            st.goals.forEach((goal, i) => {
              const prog = g.quests.goalProgress(id, i), n = goal.n || 1;
              box.append(h('div', { class: 'goal' + (prog >= n ? ' done' : '') }, `◇ ${goal.label}${n > 1 ? ` (${prog}/${n})` : ''}`));
            });
          }
          body.append(box);
        }
      } else if (tab === 'lore') {
        const read = Object.keys(g.loreRead);
        if (!read.length) body.append(h('p', {}, 'You have read nothing yet. Books, ledgers and scraps lie where people left them.'));
        for (const k of read) body.append(h('div', { class: 'ware', style: 'margin-bottom:4px', onclick: () => this.readBook(k) }, '📜 ' + LORE[k].title));
      } else {
        for (const [k, c] of Object.entries(CREATURES)) {
          const n = g.creatures.killed[k] || 0;
          body.append(h('div', { class: 'goal' }, n ? `${c.name} — level ${c.level} — slain ${n}` : '??? — not yet met in battle'));
        }
      }
      root.append(body);
    });
  }

  // ---------- map ----------
  openMap() {
    this.open('map', (root) => {
      const g = this.game, p = g.player;
      root.append(h('div', { class: 'ptitle' }, 'The Vale of Thornmere', h('small', {}, 'north is up')));
      const size = Math.min(620, innerHeight * 0.75);
      const cv = h('canvas', { width: size, height: size });
      const ctx = cv.getContext('2d');
      g.mapImage ||= g.world.terrain.mapCanvas(320);
      ctx.drawImage(g.mapImage, 0, 0, size, size);
      ctx.fillStyle = 'rgba(255,240,210,0.08)'; ctx.fillRect(0, 0, size, size);
      const S = g.world.terrain.size;
      const m = (x, z) => [(x / S + 0.5) * size, (z / S + 0.5) * size];
      ctx.font = 'italic 13px "EB Garamond", Georgia';
      ctx.textAlign = 'center';
      for (const [k, P] of Object.entries(PLACES)) {
        if (k === 'chapel' || k === 'smithy' || k === 'drowned_oak') continue;
        const [x, y] = m(P.x, P.z);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(P.name, x + 1, y + 1);
        ctx.fillStyle = '#f0e0b8'; ctx.fillText(P.name, x, y);
      }
      const tgt = g.quests.activeTarget();
      if (tgt) { const [x, y] = m(tgt.x, tgt.z); ctx.fillStyle = '#ffcf50'; ctx.font = '18px serif'; ctx.fillText('◆', x, y - 14); }
      for (const gr of g.graves.list) { const [x, y] = m(gr.pos.x, gr.pos.z); ctx.fillStyle = '#e0a0a0'; ctx.fillText('✝', x, y); }
      for (const s of g.structures.list) if (s.type === 'bed' || s.type === 'bedroll' || s.type === 'campfire') { const [x, y] = m(s.x, s.z); ctx.fillStyle = s.type === 'campfire' ? '#ff9040' : '#a0c0ff'; ctx.fillRect(x - 2, y - 2, 4, 4); }
      const [px, py] = m(p.pos.x, p.pos.z);
      ctx.save(); ctx.translate(px, py); ctx.rotate(-p.yaw);
      ctx.fillStyle = '#ff4030'; ctx.strokeStyle = '#000';
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      root.append(h('div', { class: 'mapwrap' }, cv));
    });
  }

  // ---------- trade ----------
  openTrade() {
    const g = this.game;
    g.quests.start('lantern');
    const line = LANTERN_LINES[Math.floor(Math.random() * LANTERN_LINES.length)];
    this.open('trade', (root) => {
      const coins = g.inventory.count('coin');
      root.append(h('div', { class: 'ptitle' }, 'The Lantern-Keeper', h('small', {}, `you carry ${coins} coin${coins === 1 ? '' : 's'}`)));
      root.append(h('div', { class: 'speech' }, `“${line}”`));
      if (!g.quests.flags.lantern_paid && g.inventory.count('wisp_ash') >= 5) {
        root.append(h('button', { style: 'margin-bottom:12px', onclick: () => {
          g.inventory.remove('wisp_ash', 5); g.quests.setFlag('lantern_paid');
          g.inventory.add('ring_vigor', 1); g.inventory.add('coin', 50);
          this.toast('“The long road remembers you now.”'); g.audio.play('coin'); this.panel.refresh();
        } }, 'Offer five Wisp Ash'));
      }
      const buy = h('div', { class: 'trade-list' });
      for (const [id, price] of WARES) {
        buy.append(h('div', { class: 'ware', onclick: () => {
          if (g.inventory.count('coin') < price) { this.toast('“Light is cheap. Not that cheap.”'); g.audio.play('error'); return; }
          if (!g.inventory.canFit(id)) { this.toast('Your pack is full.'); return; }
          g.inventory.remove('coin', price); g.inventory.add(id, 1); g.audio.play('coin');
          if (id === 'book_lantern') this.readBook('lantern');
          this.panel.refresh();
        } }, h('img', { src: itemIcon(id) }), ITEMS[id].name, h('span', { class: 'price' }, `${price}¢`)));
      }
      root.append(h('div', { class: 'sec' }, 'BUY'), buy);
      root.append(h('div', { class: 'sec' }, 'SELL  (click an item — the Keeper pays two parts in five)'));
      root.append(this.invGrid(0, g.inventory.size, '', (i) => {
        const s = g.inventory.slots[i];
        if (!s || s.id === 'coin' || ITEMS[s.id].type === 'quest') return;
        const price = Math.max(1, Math.floor(ITEMS[s.id].value * 0.4));
        g.inventory.takeSlot(i, 1);
        g.inventory.add('coin', price);
        g.audio.play('coin');
        this.hideTooltip();
        this.panel.refresh();
      }));
    });
  }

  // ---------- books ----------
  readBook(key) {
    const g = this.game, L = LORE[key];
    if (!L) return;
    if (!g.loreRead[key]) { g.loreRead[key] = true; g.skills.add('vitality', 10); g.player.resolve = Math.min(g.player.maxResolve, g.player.resolve + 10); }
    g.events.emit('read', key);
    if (key === 'rhyme') g.quests.start('rhyme');
    this.open('book', (root) => {
      root.style.padding = '0';
      const b = h('div', { class: 'book' }, h('h2', {}, L.title));
      b.append(L.text);
      root.append(b);
    }, { onClose: () => { $('panel-inner').style.padding = ''; } });
  }

  // ---------- menus ----------
  openPause() {
    const g = this.game;
    this.open('pause', (root) => {
      root.append(h('div', { class: 'ptitle' }, 'Paused', h('small', {}, `Day ${g.world.sky.day}, ${g.world.sky.timeString}`)));
      const col = h('div', { style: 'display:flex;flex-direction:column;gap:8px;width:300px' });
      col.append(h('button', { onclick: () => this.closeAll() }, 'Return to the vale'));
      if (g.quests.tutorial) col.append(h('button', { onclick: () => { g.quests.endTutorial(true); this.toast('You leave the guides behind. Their lights stay where they are.'); this.closeAll(); } }, 'Skip the tutorial'));
      col.append(h('button', { onclick: () => { g.save.save(); this.toast('Saved.'); } }, 'Save'));
      col.append(h('button', { disabled: g.save.has() ? null : 'disabled', onclick: () => { this.closeAll(); g.save.load(); } }, 'Load last save'));
      col.append(h('button', { onclick: () => this.openControls(true) }, 'How to play'));
      const settings = h('div', { class: 'settings', style: 'margin-top:10px' });
      const sens = h('input', { type: 'range', min: '0.0006', max: '0.006', step: '0.0002', value: String(g.input.sensitivity) });
      sens.addEventListener('input', () => { g.input.sensitivity = Number(sens.value); g.save.saveSettings(); });
      const vol = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(g.audio.volume) });
      vol.addEventListener('input', () => { g.audio.setVolume(Number(vol.value)); g.save.saveSettings(); });
      const inv = h('input', { type: 'checkbox' }); inv.checked = g.input.invertY;
      inv.addEventListener('change', () => { g.input.invertY = inv.checked; g.save.saveSettings(); });
      const shadows = h('input', { type: 'checkbox' }); shadows.checked = g.renderer.shadowMap.enabled;
      shadows.addEventListener('change', () => { g.setShadows(shadows.checked); g.save.saveSettings(); });
      settings.append(h('label', {}, 'Mouse sensitivity', sens), h('label', {}, 'Volume', vol), h('label', {}, 'Invert mouse', inv), h('label', {}, 'Shadows', shadows));
      col.append(settings);
      col.append(h('button', { style: 'margin-top:10px', onclick: () => { g.save.save(); location.reload(); } }, 'Save and quit to title'));
      root.append(col);
    });
  }

  openControls(fromPause = false) {
    this.open('controls', (root) => {
      root.append(h('div', { class: 'ptitle' }, 'How to Play'));
      root.append(h('div', { class: 'controls', html: `
        <div><b>WASD</b> move</div><div><b>Shift</b> run</div><div><b>Space</b> jump · swim up</div><div><b>C / Ctrl</b> sneak</div>
        <div><b>Mouse</b> look</div><div><b>LMB</b> strike · chop · mine · use held item</div><div><b>Hold LMB</b> power attack · draw bow</div>
        <div><b>RMB</b> block</div><div><b>E</b> interact · drink · take</div><div><b>F</b> secondary action (feed fire, pick up)</div>
        <div><b>1–8 / Wheel</b> choose belt item</div><div><b>Tab</b> menu (pack, crafting, skills, prayer, journal, map)</div><div><b>Q / K / P</b> crafting / skills / prayer</div>
        <div><b>J / M</b> journal / map</div><div><b>G</b> speak your chosen incantation</div><div><b>R</b> rotate when building</div><div><b>Esc</b> pause</div>` }));
      root.append(h('p', { style: 'max-width:620px;font-style:italic;color:#b3a585;line-height:1.5', html: `Keep your body alive: drink boiled water, and eat across all three foods (carbs, fats, protein); each one you neglect weakens you in its own way.
        Keep your mind alive: the dark wears down your <b>Resolve</b>. Fire, rest, books and company restore it.
        Every skill rises with use. Chop, mine, cook, fight, run. Craft better tools at stations you build yourself.` }));
      if (fromPause) root.append(h('button', { onclick: () => this.openPause() }, 'Back'));
    }, { keepUnlocked: !this.game.started });
  }

  deathScreen(cause, grave) {
    const g = this.game;
    const words = { fall: 'The ground was harder than you.', bleeding: 'You bled out alone.', poison: 'The venom finished its work.', thirst: 'Your throat closed on nothing.', hunger: 'Your body ate itself, then stopped.', dread: 'The dark got in.', drown: 'The mere took you.', broodmother: 'She was so warm.' }[cause] || `Slain by ${CREATURES[cause]?.name || 'the vale'}.`;
    setTimeout(() => {
      this.open('death', (root) => {
        root.classList.add('death');
        root.append(h('div', { style: 'text-align:center;padding:10px 30px' }, h('h1', {}, 'You have fallen'), h('p', { style: 'font-style:italic;font-size:19px' }, words),
          grave ? h('p', { style: 'color:#b3a585' }, 'Your pack lies where you fell. Your belt stays with you.') : null,
          h('button', { onclick: () => { root.classList.remove('death'); this.closeAll(); g.player.revive(); } }, 'Rise again')));
      }, { keepUnlocked: false });
    }, 1500);
  }

  endingChoice() {
    const g = this.game;
    this.open('ending', (root) => {
      root.append(h('div', { class: 'ptitle' }, 'The Hearth'));
      root.append(h('p', { style: 'max-width:640px;font-size:18px;line-height:1.6;font-style:italic' }, 'The Crown is cold in your hands. Beneath the iron lid of the hearth, something waits that is not quite fire. It has been waiting a long time.'));
      root.append(h('div', { class: 'choice' },
        h('button', { onclick: () => this.playEnding('seal') }, h('b', {}, 'Seal the Ember'), 'Set the Crown upon the Hearth. Let Thornmere forget. Let it be warm.'),
        h('button', { onclick: () => this.playEnding('wake') }, h('b', {}, 'Let the Hearth Wake'), 'Do not set it down. Let the village remember everything, the river and what was done there.')));
    });
  }

  playEnding(kind) {
    const g = this.game;
    this.closeAll();
    g.input.unlock();
    g.endingChosen(kind);
    const lines = ENDINGS[kind];
    this.fade(true, `<div class="story">${lines.map((l, i) => `<p style="animation-delay:${i * 2.6}s">${l}</p>`).join('')}</div>`);
    g.audio.play('bell');
    setTimeout(() => g.audio.play('bell'), 6000);
    setTimeout(() => {
      $('fade-text').append(h('button', { style: 'margin-top:20px;pointer-events:auto', onclick: () => { this.fade(false); g.input.lock(); } }, 'Continue in the vale'));
    }, lines.length * 2600 + 1500);
  }

  playIntro(done) {
    this.fade(true, `<div class="story">${INTRO.map((l, i) => `<p style="animation-delay:${0.5 + i * 2.4}s">${l}</p>`).join('')}</div>`);
    const total = INTRO.length * 2400 + 2600;
    const finish = () => { clearTimeout(t); removeEventListener('keydown', skip); this.fade(false); done(); };
    const skip = (e) => { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') finish(); };
    const t = setTimeout(finish, total);
    addEventListener('keydown', skip);
  }
}

function fmtMins(m) { return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`; }

function levelLine(id, lvl) {
  if (id === 'prayer') { const inc = INCANTATIONS.find(i => i.level === lvl); if (inc) return `You remember the ${inc.name}`; }
  const unlocks = RECIPES.filter(r => r.skill === id && r.level === lvl).map(r => ITEMS[r.out].name);
  if (unlocks.length) return 'You can now make ' + unlocks.slice(0, 3).join(', ');
  return { woodcutting: lvl === 15 ? 'Pine yields to you now' : null, mining: { 15: 'Iron yields to you now', 20: 'You can mine coal', 30: 'Gold glints for you now', 35: 'The aether answers' }[lvl] }[id] || 'You grow stronger';
}
