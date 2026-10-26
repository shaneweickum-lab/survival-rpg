// Recipes. `station` null means it can be made by hand anywhere.
// Stations: fire (a lit campfire), workbench, bloomery, anvil, cauldron.

export const STATIONS = {
  hand: 'By Hand', fire: 'Campfire', workbench: 'Workbench', bloomery: 'Bloomery', anvil: 'Anvil', cauldron: 'Cauldron',
};

const R = (id, out, n, inputs, station, skill, level, xp, extra = {}) => ({ id, out, n, in: inputs, station, skill, level, xp, ...extra });

export const RECIPES = [
  // --- by hand ---
  R('campfire', 'kit_campfire', 1, { stick: 4, stone: 4 }, 'hand', 'firemaking', 1, 15),
  R('rope', 'rope', 1, { fiber: 4 }, 'hand', 'crafting', 1, 8),
  R('flint_hatchet', 'flint_hatchet', 1, { stick: 2, flint: 2, fiber: 2 }, 'hand', 'crafting', 1, 20),
  R('flint_pick', 'flint_pick', 1, { stick: 2, flint: 3, rope: 1 }, 'hand', 'crafting', 2, 25),
  R('club', 'club', 1, { log: 1, fiber: 2 }, 'hand', 'crafting', 1, 10),
  R('torch', 'torch', 1, { stick: 1, fiber: 3, deadwood: 1 }, 'hand', 'firemaking', 1, 12),
  R('bandage', 'bandage', 1, { fiber: 3 }, 'hand', 'crafting', 1, 6),
  R('bandage_cloth', 'bandage', 2, { cloth: 1 }, 'hand', 'crafting', 3, 8),
  R('poultice', 'poultice', 1, { bloodroot: 1, ashleaf: 1, fiber: 1 }, 'hand', 'alchemy', 4, 22),
  R('bone_dagger', 'bone_dagger', 1, { bone: 2, rope: 1 }, 'hand', 'crafting', 4, 25),
  R('bedroll', 'kit_bedroll', 1, { fiber: 10, rat_hide: 2 }, 'hand', 'crafting', 3, 30),
  R('workbench', 'kit_workbench', 1, { log: 6, rope: 2, stone: 2 }, 'hand', 'crafting', 2, 45),

  // --- campfire ---
  R('cook_meat', 'cooked_meat', 1, { raw_meat: 1 }, 'fire', 'cooking', 1, 30, { burn: 'burnt_meat' }),
  R('cook_frog', 'cooked_frog', 1, { frog_leg: 1 }, 'fire', 'cooking', 1, 25, { burn: 'burnt_meat' }),
  R('cook_fish', 'cooked_fish', 1, { raw_fish: 1 }, 'fire', 'cooking', 5, 40, { burn: 'burnt_meat' }),
  R('cook_carrot', 'baked_carrot', 1, { carrot: 1 }, 'fire', 'cooking', 1, 12),
  R('cook_mushroom', 'cooked_mushroom', 1, { mushroom: 1 }, 'fire', 'cooking', 2, 18),
  R('boil_water', 'bottle_clean', 1, { bottle_murky: 1 }, 'fire', 'cooking', 1, 6),
  R('tan_hide', 'leather', 1, { rat_hide: 2 }, 'fire', 'crafting', 4, 18),

  // --- workbench ---
  R('plank', 'plank', 2, { log: 1 }, 'workbench', 'crafting', 1, 10),
  R('plank_pine', 'plank', 4, { pine_log: 1 }, 'workbench', 'crafting', 8, 18),
  R('fishing_rod', 'fishing_rod', 1, { stick: 2, rope: 1, fiber: 2 }, 'workbench', 'crafting', 3, 25),
  R('wooden_bow', 'wooden_bow', 1, { log: 1, rope: 2 }, 'workbench', 'crafting', 6, 40),
  R('arrows', 'arrow', 10, { stick: 3, flint: 2, fiber: 2 }, 'workbench', 'crafting', 5, 20),
  R('arrows_iron', 'arrow', 20, { stick: 4, iron_bar: 1, fiber: 2 }, 'workbench', 'crafting', 18, 35),
  R('wooden_shield', 'wooden_shield', 1, { plank: 4, rope: 1, leather: 1 }, 'workbench', 'crafting', 8, 50),
  R('leather_armor', 'leather_armor', 1, { leather: 4, rope: 2 }, 'workbench', 'crafting', 10, 80),
  R('chitin_armor', 'chitin_armor', 1, { chitin: 6, spider_silk: 6, leather: 2 }, 'workbench', 'crafting', 22, 180),
  R('cloth', 'cloth', 1, { spider_silk: 3 }, 'workbench', 'crafting', 6, 18),
  R('cloth_fiber', 'cloth', 1, { fiber: 8 }, 'workbench', 'crafting', 2, 14),
  R('satchel', 'satchel', 1, { leather: 3, rope: 2 }, 'workbench', 'crafting', 7, 60),
  R('backpack', 'backpack', 1, { leather: 6, cloth: 3, rope: 3 }, 'workbench', 'crafting', 16, 140),
  R('chest', 'kit_chest', 1, { plank: 6, rope: 1 }, 'workbench', 'crafting', 4, 40),
  R('rain_barrel', 'kit_barrel', 1, { plank: 5, rope: 2 }, 'workbench', 'crafting', 5, 40),
  R('bed', 'kit_bed', 1, { plank: 8, cloth: 3, rope: 2 }, 'workbench', 'crafting', 12, 90),
  R('torchstand', 'kit_torchstand', 1, { stick: 2, iron_bar: 1 }, 'workbench', 'crafting', 9, 30),
  R('bloomery', 'kit_bloomery', 1, { stone: 14, log: 4 }, 'workbench', 'smithing', 1, 40),
  R('cauldron', 'kit_cauldron', 1, { iron_bar: 3 }, 'workbench', 'smithing', 12, 70),
  R('fence', 'kit_fence', 2, { stick: 4, plank: 1 }, 'workbench', 'crafting', 2, 8),
  R('floor', 'kit_floor', 1, { plank: 4 }, 'workbench', 'crafting', 3, 15),
  R('wall', 'kit_wall', 1, { plank: 3, stone: 4, log: 1 }, 'workbench', 'crafting', 4, 20),
  R('wall_door', 'kit_wall_door', 1, { plank: 4, stone: 3, rope: 1 }, 'workbench', 'crafting', 5, 24),
  R('wall_window', 'kit_wall_window', 1, { plank: 3, stone: 3 }, 'workbench', 'crafting', 5, 22),
  R('roof', 'kit_roof', 1, { plank: 8, stone: 6 }, 'workbench', 'crafting', 7, 40),

  // --- bloomery ---
  R('bronze_bar', 'bronze_bar', 1, { copper_ore: 1, tin_ore: 1 }, 'bloomery', 'smithing', 1, 25),
  R('iron_bar', 'iron_bar', 1, { iron_ore: 1, coal: 1 }, 'bloomery', 'smithing', 15, 50),
  R('gold_bar', 'gold_bar', 1, { gold_ore: 1, coal: 1 }, 'bloomery', 'smithing', 30, 90),

  // --- anvil ---
  R('anvil', 'kit_anvil', 1, { bronze_bar: 4, log: 2 }, 'workbench', 'smithing', 3, 60),
  R('bronze_axe', 'bronze_axe', 1, { bronze_bar: 2, stick: 1 }, 'anvil', 'smithing', 2, 50),
  R('bronze_pick', 'bronze_pick', 1, { bronze_bar: 2, stick: 1 }, 'anvil', 'smithing', 3, 50),
  R('bronze_sword', 'bronze_sword', 1, { bronze_bar: 3, leather: 1 }, 'anvil', 'smithing', 5, 75),
  R('iron_axe', 'iron_axe', 1, { iron_bar: 3, plank: 1 }, 'anvil', 'smithing', 18, 120),
  R('iron_pick', 'iron_pick', 1, { iron_bar: 3, plank: 1 }, 'anvil', 'smithing', 17, 120),
  R('iron_sword', 'iron_sword', 1, { iron_bar: 4, leather: 1 }, 'anvil', 'smithing', 20, 160),
  R('iron_dagger', 'iron_dagger', 1, { iron_bar: 2, leather: 1 }, 'anvil', 'smithing', 16, 90),
  R('war_hammer', 'war_hammer', 1, { iron_bar: 6, plank: 2 }, 'anvil', 'smithing', 26, 220),
  R('iron_armor', 'iron_armor', 1, { iron_bar: 8, leather: 3 }, 'anvil', 'smithing', 28, 300),
  R('ring_vigor', 'ring_vigor', 1, { gold_bar: 2, aether_shard: 1 }, 'anvil', 'smithing', 32, 200),
  R('ring_life', 'ring_life', 1, { gold_bar: 2, aether_shard: 1, bloodroot: 4 }, 'anvil', 'smithing', 34, 220),

  // --- cauldron ---
  R('stew', 'hearth_stew', 1, { cooked_meat: 1, carrot: 2, mushroom: 1, bottle_clean: 1 }, 'cauldron', 'cooking', 8, 90, { returns: { bottle: 1 } }),
  R('honey_cake', 'honey_bread', 1, { honeycomb: 2, berries: 4, apple: 1 }, 'cauldron', 'cooking', 14, 110),
  R('potion_health', 'potion_health', 1, { bloodroot: 3, bottle_clean: 1 }, 'cauldron', 'alchemy', 3, 60),
  R('potion_antidote', 'potion_antidote', 1, { ashleaf: 2, venom_sac: 1, bottle_clean: 1 }, 'cauldron', 'alchemy', 7, 75),
  R('potion_resolve', 'potion_resolve', 1, { moonpetal: 3, bottle_clean: 1 }, 'cauldron', 'alchemy', 10, 90),
  R('potion_stamina', 'potion_stamina', 1, { honeycomb: 1, toad_slime: 2, bottle_clean: 1 }, 'cauldron', 'alchemy', 12, 95),
  R('potion_wisp', 'potion_wisp', 1, { wisp_ash: 3, moonpetal: 2, aether_shard: 1, bottle_clean: 1 }, 'cauldron', 'alchemy', 24, 200),
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]));
