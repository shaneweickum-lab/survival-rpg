// Creatures of the vale. `size` is the target largest dimension in meters; `yaw` corrects model facing.

export const CREATURES = {
  rat: {
    name: 'Burrow Rat', model: 'creatures/Rat', size: 1.45, yaw: 0, level: 3,
    hp: 30, dmg: 5, speed: 3.4, aggro: 7, nightAggro: 15, attackRange: 1.4, attackRate: 1.3,
    gait: 'scurry', bleed: 0.15,
    loot: [['raw_meat', 1, 2, 1], ['rat_hide', 1, 1, 0.9], ['bone', 1, 2, 0.7]], xp: 30,
  },
  frog: {
    name: 'Bog Toad', model: 'creatures/Frog', size: 0.75, yaw: 0, level: 1,
    hp: 16, dmg: 0, speed: 3.0, passive: true, gait: 'hop',
    loot: [['frog_leg', 1, 2, 1], ['toad_slime', 1, 2, 0.7], ['bone', 1, 1, 0.3]], xp: 14,
  },
  snake: {
    name: 'Marsh Viper', model: 'creatures/Snake', angryModel: 'creatures/Snake_angry', size: 1.1, yaw: 0, level: 6,
    hp: 34, dmg: 7, speed: 2.6, aggro: 6, nightAggro: 8, attackRange: 1.6, attackRate: 1.6,
    gait: 'slither', poison: 0.4,
    loot: [['raw_meat', 1, 1, 0.8], ['venom_sac', 1, 1, 0.8], ['bone', 1, 2, 0.6]], xp: 55,
  },
  spider: {
    name: 'Thornback Spider', model: 'creatures/Spider', size: 1.9, yaw: 0, level: 11,
    hp: 70, dmg: 11, speed: 4.6, aggro: 13, nightAggro: 18, attackRange: 1.9, attackRate: 1.4,
    gait: 'skitter', poison: 0.3,
    loot: [['spider_silk', 1, 3, 1], ['chitin', 1, 2, 0.8], ['venom_sac', 1, 1, 0.4]], xp: 110,
  },
  wasp: {
    name: 'Ember Wasp', model: 'creatures/Wasp', size: 0.8, yaw: -Math.PI / 2, level: 5,
    hp: 14, dmg: 5, speed: 5.5, aggro: 9, nightAggro: 5, attackRange: 1.3, attackRate: 1.0,
    gait: 'fly', flyHeight: 1.5, poison: 0.1,
    loot: [['stinger', 1, 2, 1], ['honeycomb', 1, 1, 0.35]], xp: 40,
  },
  wisp: {
    name: 'Hollow Wisp', model: 'items/Skull', size: 0.55, yaw: 0, level: 14,
    hp: 45, dmg: 9, speed: 3.8, aggro: 22, nightAggro: 22, attackRange: 1.6, attackRate: 1.5,
    gait: 'float', flyHeight: 1.6, nocturnal: true, hollow: true, resolveDmg: 8,
    loot: [['wisp_ash', 1, 2, 1], ['bone', 1, 3, 0.9], ['skull', 1, 1, 0.3], ['coin', 3, 12, 0.6]], xp: 150,
  },
  broodmother: {
    name: 'The Broodmother', model: 'creatures/Spider', size: 4.6, yaw: 0, level: 32, boss: true,
    hp: 450, dmg: 22, speed: 4.2, aggro: 20, nightAggro: 20, attackRange: 3.4, attackRate: 1.8,
    gait: 'skitter', poison: 0.6, tint: 0x2a0f12,
    loot: [['hollow_crown', 1, 1, 1], ['chitin', 4, 6, 1], ['venom_sac', 2, 3, 1], ['aether_shard', 1, 2, 1]], xp: 1600,
  },
};
