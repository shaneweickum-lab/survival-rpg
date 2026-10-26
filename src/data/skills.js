// Skills are trained by use, RuneScape-style, on the classic experience curve.

export const SKILLS = {
  vitality: { name: 'Vitality', icon: '❤', color: '#c84a4a', desc: 'Raised by fighting. Each level adds maximum health.' },
  blade: { name: 'Melee', icon: '⚔', color: '#c88a4a', desc: 'Damage with swords, axes, hammers and clubs.' },
  block: { name: 'Block', icon: '🛡', color: '#8a8ac8', desc: 'Damage absorbed and stamina spent while guarding.' },
  marksman: { name: 'Marksman', icon: '🏹', color: '#6aa84a', desc: 'Bow damage and draw speed.' },
  athletics: { name: 'Athletics', icon: '🏃', color: '#4ab0a8', desc: 'Run speed and stamina recovery. Trained by running.' },
  woodcutting: { name: 'Woodcutting', icon: '🪓', color: '#8a6a3a', desc: 'Chop faster. Pine needs level 15.' },
  mining: { name: 'Mining', icon: '⛏', color: '#7a7a8a', desc: 'Mine faster. Iron 15, coal 20, gold 30, aether 35.' },
  smithing: { name: 'Smithing', icon: '⚒', color: '#a85a3a', desc: 'Smelt bars and forge tools, weapons and armor.' },
  crafting: { name: 'Crafting', icon: '✂', color: '#b89a6a', desc: 'Woodwork, leather, bowyery and building.' },
  cooking: { name: 'Cooking', icon: '🍖', color: '#c86a3a', desc: 'Burn less food. Unlocks stews and cakes.' },
  firemaking: { name: 'Firemaking', icon: '🔥', color: '#e0802a', desc: 'Light fires faster. Fires burn longer.' },
  foraging: { name: 'Foraging', icon: '🌿', color: '#5a9a4a', desc: 'Gather more from bushes and herbs.' },
  fishing: { name: 'Fishing', icon: '🎣', color: '#4a7ac8', desc: 'Faster bites, fewer lost fish.' },
  alchemy: { name: 'Alchemy', icon: '⚗', color: '#9a4ac8', desc: 'Brew draughts, tinctures and elixirs.' },
};

export const MAX_LEVEL = 60;

// Classic curve: xp for level L = floor(sum_{l=1}^{L-1} floor(l + 300 * 2^(l/7)) / 4)
export const XP_TABLE = (() => {
  const t = [0, 0];
  let pts = 0;
  for (let l = 1; l < MAX_LEVEL + 1; l++) {
    pts += Math.floor(l + 300 * Math.pow(2, l / 7));
    t[l + 1] = Math.floor(pts / 4);
  }
  return t;
})();

export function levelForXp(xp) {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= XP_TABLE[lvl + 1]) lvl++;
  return lvl;
}
