// Every item in Thornmere. `model` points into assets/models; `proc` names a procedural model.
// Nutrition values are in percent of each need: { water, carbs, fat, protein }.

const ORE_TINT = { copper: 0xc0703a, tin: 0xb8c4c8, iron: 0x8a4a3a, coal: 0x1c1c1e, gold: 0xf0c040, stone: 0x8a8378 };

export const ITEMS = {
  // ---------- raw materials ----------
  stick: { name: 'Stick', type: 'material', proc: 'stick', stack: 30, value: 1, desc: 'A length of fallen wood. Kindling, handle, splint.' },
  stone: { name: 'Stone', type: 'material', proc: 'stone', stack: 30, value: 1, desc: 'River-rounded and heavy in the palm.' },
  flint: { name: 'Flint', type: 'material', proc: 'flint', stack: 30, value: 3, desc: 'Breaks to an edge sharper than it looks. Found by water.' },
  fiber: { name: 'Plant Fiber', type: 'material', proc: 'fiber', stack: 40, value: 1, desc: 'Stripped from reeds and tall grass.' },
  rope: { name: 'Rope', type: 'material', model: 'props/Rope_1', stack: 20, value: 6, desc: 'Fiber twisted until it forgets it was ever grass.' },
  log: { name: 'Log', type: 'material', proc: 'log', stack: 20, value: 4, desc: 'Oak or birch, cut to carry.' },
  pine_log: { name: 'Pine Log', type: 'material', proc: 'pinelog', stack: 20, value: 8, desc: 'Resinous and straight. Smiths prize the heat it gives.' },
  deadwood: { name: 'Deadwood', type: 'material', proc: 'deadwood', stack: 20, value: 2, desc: 'Dry as old bone. Catches fire easily.' },
  plank: { name: 'Plank', type: 'material', proc: 'plank', stack: 30, value: 7, desc: 'Split and smoothed timber.' },
  copper_ore: { name: 'Copper Ore', type: 'material', model: 'items/Mineral', tints: { Pink: ORE_TINT.copper }, stack: 20, value: 6, desc: 'Green-veined. Soft metal for soft beginnings.' },
  tin_ore: { name: 'Tin Ore', type: 'material', model: 'items/Mineral', tints: { Pink: ORE_TINT.tin }, stack: 20, value: 6, desc: 'Pale as frost. Married to copper, it becomes bronze.' },
  iron_ore: { name: 'Iron Ore', type: 'material', model: 'items/Mineral', tints: { Pink: ORE_TINT.iron }, stack: 20, value: 14, desc: 'Rust-red and stubborn.' },
  coal: { name: 'Coal', type: 'material', model: 'items/Mineral', tints: { Pink: ORE_TINT.coal, Grey: 0x333333 }, stack: 30, value: 10, desc: 'Black fire, sleeping.' },
  gold_ore: { name: 'Gold Ore', type: 'material', model: 'items/Mineral', tints: { Pink: ORE_TINT.gold }, stack: 20, value: 40, desc: 'It has always made men foolish.' },
  aether_shard: { name: 'Aether Shard', type: 'material', model: 'items/Crystal3', stack: 20, value: 60, desc: 'Hums when held near the dead.' },
  bronze_bar: { name: 'Bronze Bar', type: 'material', model: 'items/Gold_Ingots', tint: 0xb87333, stack: 20, value: 20, desc: 'Copper and tin, wedded in fire.' },
  iron_bar: { name: 'Iron Bar', type: 'material', model: 'items/Gold_Ingots', tint: 0x6a6a72, stack: 20, value: 40, desc: 'Hard-won. Heavier than it should be.' },
  gold_bar: { name: 'Gold Bar', type: 'material', model: 'items/Gold_Ingots', stack: 20, value: 120, desc: 'Gleaming, useless, coveted.' },
  rat_hide: { name: 'Rat Hide', type: 'material', model: 'items/Pouch', tint: 0x5a4a40, stack: 20, value: 5, desc: 'Coarse grey pelt. It still smells of the burrow.' },
  leather: { name: 'Leather', type: 'material', model: 'items/Glove', tint: 0x7a5232, stack: 20, value: 12, desc: 'Hide scraped, dried, and made useful.' },
  spider_silk: { name: 'Spider Silk', type: 'material', proc: 'silk', stack: 30, value: 8, desc: 'Stronger than it has any right to be.' },
  chitin: { name: 'Chitin Plate', type: 'material', proc: 'chitin', stack: 20, value: 10, desc: 'A shard of shell, black and faintly warm.' },
  venom_sac: { name: 'Venom Sac', type: 'material', proc: 'venom', stack: 20, value: 15, desc: 'Handle carefully. Alchemists turn poison into its own cure.' },
  stinger: { name: 'Wasp Stinger', type: 'material', model: 'items/Dart', stack: 30, value: 6, desc: 'A needle the length of a finger.' },
  bone: { name: 'Bone', type: 'material', model: 'items/Bone', stack: 30, value: 2, desc: 'Whose? Better not to wonder.' },
  skull: { name: 'Skull', type: 'material', model: 'items/Skull', stack: 10, value: 5, desc: 'It watches you even in the pack.' },
  wisp_ash: { name: 'Wisp Ash', type: 'material', proc: 'ash', stack: 30, value: 18, desc: 'What is left when the hollow dead are given rest.' },
  toad_slime: { name: 'Toad Slime', type: 'material', proc: 'slime', stack: 20, value: 4, desc: 'Cool and faintly luminous.' },
  cloth: { name: 'Cloth', type: 'material', model: 'props/Banner_1_Cloth', stack: 20, value: 6, desc: 'Woven fiber or silk. Bandages, bedrolls, banners.' },
  coin: { name: 'Coin', type: 'currency', model: 'items/Coin', stack: 9999, value: 1, desc: 'Stamped with a crown no one remembers.' },

  // ---------- herbs and forage ----------
  berries: { name: 'Thornberries', type: 'food', proc: 'berries', stack: 20, value: 2, food: { water: 4, carbs: 9, fat: 0, protein: 0 }, desc: 'Sweet, then bitter. Grows where the thorn grows.' },
  carrot: { name: 'Carrot', type: 'food', model: 'props/Carrot', stack: 20, value: 3, food: { water: 5, carbs: 12, fat: 0, protein: 1 }, desc: 'Somebody planted these. Somebody is gone.' },
  apple: { name: 'Apple', type: 'food', proc: 'apple', stack: 20, value: 3, food: { water: 8, carbs: 14, fat: 0, protein: 0 }, desc: 'Crisp, a little wormy. Still good.' },
  mushroom: { name: 'Gloamcap', type: 'food', proc: 'mushroom', stack: 20, value: 4, food: { water: 2, carbs: 3, fat: 2, protein: 6 }, raw: { chance: 0.25, effect: 'sick' }, desc: 'Eaten raw it turns the stomach. Cooked, it is earth and smoke.' },
  moonpetal: { name: 'Moonpetal', type: 'material', proc: 'moonpetal', stack: 30, value: 8, desc: 'Opens only after dusk. Steadies the mind.' },
  bloodroot: { name: 'Bloodroot', type: 'material', proc: 'bloodroot', stack: 30, value: 8, desc: 'The sap runs red. Closes wounds.' },
  ashleaf: { name: 'Ashleaf', type: 'material', proc: 'ashleaf', stack: 30, value: 8, desc: 'Grey and bitter. Draws venom out of blood.' },
  honeycomb: { name: 'Honeycomb', type: 'food', proc: 'honey', stack: 20, value: 12, food: { water: 2, carbs: 25, fat: 0, protein: 1 }, desc: 'Stolen gold.' },

  // ---------- meat and cooking ----------
  raw_meat: { name: 'Raw Meat', type: 'food', model: 'items/ChickenLeg', tints: { Brown: 0xb0505a, Beige: 0xe8c8c0 }, stack: 20, value: 3, food: { water: 0, carbs: 0, fat: 8, protein: 12 }, raw: { chance: 0.6, effect: 'sick' }, spoils: 600, desc: 'Eat it raw if you must. You should not.' },
  cooked_meat: { name: 'Cooked Meat', type: 'food', model: 'items/ChickenLeg', stack: 20, value: 10, food: { water: 0, carbs: 0, fat: 14, protein: 26 }, spoils: 1200, desc: 'Charred outside, red-warm within.' },
  burnt_meat: { name: 'Burnt Meat', type: 'food', model: 'items/ChickenLeg', tint: 0x222018, stack: 20, value: 1, food: { water: 0, carbs: 0, fat: 2, protein: 6 }, desc: 'Ash with a bone in it.' },
  frog_leg: { name: 'Toad Leg', type: 'food', model: 'items/ChickenLeg', tints: { Brown: 0x8ab070, Beige: 0xd0e0b0 }, stack: 20, value: 2, food: { water: 0, carbs: 0, fat: 10, protein: 8 }, raw: { chance: 0.5, effect: 'sick' }, spoils: 600, desc: 'Pale and rubbery.' },
  cooked_frog: { name: 'Roast Toad Leg', type: 'food', model: 'items/ChickenLeg', tint: 0xa08050, stack: 20, value: 8, food: { water: 0, carbs: 0, fat: 18, protein: 16 }, desc: 'Better than it sounds.' },
  raw_fish: { name: 'Raw Silverfin', type: 'food', proc: 'fish', stack: 20, value: 4, food: { water: 2, carbs: 0, fat: 6, protein: 14 }, raw: { chance: 0.35, effect: 'sick' }, spoils: 500, desc: 'Still twitching.' },
  cooked_fish: { name: 'Cooked Silverfin', type: 'food', proc: 'fish_cooked', stack: 20, value: 12, food: { water: 2, carbs: 0, fat: 12, protein: 28 }, desc: 'Flaky and clean.' },
  baked_carrot: { name: 'Roasted Carrot', type: 'food', model: 'props/Carrot', tint: 0xa0502a, stack: 20, value: 6, food: { water: 4, carbs: 20, fat: 1, protein: 1 }, desc: 'Sweeter for the fire.' },
  cooked_mushroom: { name: 'Fire-roast Gloamcap', type: 'food', proc: 'mushroom_cooked', stack: 20, value: 8, food: { water: 2, carbs: 6, fat: 4, protein: 12 }, desc: 'Earth and smoke.' },
  hearth_stew: { name: 'Hearth Stew', type: 'food', model: 'props/Mug', stack: 10, value: 30, food: { water: 25, carbs: 30, fat: 25, protein: 30 }, buff: 'well_fed', desc: 'The old recipe. It tastes like being remembered.' },
  honey_bread: { name: 'Honey Cake', type: 'food', proc: 'cake', stack: 10, value: 25, food: { water: 0, carbs: 45, fat: 15, protein: 4 }, buff: 'well_fed', desc: 'Dense, golden, absurd in a dying land.' },

  // ---------- water ----------
  bottle: { name: 'Empty Bottle', type: 'container', model: 'props/Bottle_1', stack: 5, value: 4, desc: 'Fill it at the water. Boil what you fill.' },
  bottle_murky: { name: 'Bottle of Murky Water', type: 'drink', model: 'props/Bottle_1', tint: 0x6a7a50, stack: 5, value: 4, food: { water: 30, carbs: 0, fat: 0, protein: 0 }, raw: { chance: 0.4, effect: 'sick' }, returns: 'bottle', desc: 'Things move in it.' },
  bottle_clean: { name: 'Bottle of Clean Water', type: 'drink', model: 'props/Bottle_1', tint: 0x80b0d0, stack: 5, value: 8, food: { water: 40, carbs: 0, fat: 0, protein: 0 }, returns: 'bottle', desc: 'Boiled. Safe. Precious.' },

  // ---------- potions ----------
  potion_health: { name: 'Bloodroot Draught', type: 'potion', model: 'items/Potion1_Filled', stack: 10, value: 40, effect: { heal: 50, cure: ['bleeding'] }, desc: 'Restores 50 health and closes wounds.' },
  potion_antidote: { name: 'Ashleaf Tincture', type: 'potion', model: 'items/Potion4_Filled', stack: 10, value: 35, effect: { cure: ['poisoned', 'sick'] }, desc: 'Cures venom and sickness.' },
  potion_resolve: { name: 'Moonpetal Elixir', type: 'potion', model: 'items/Potion7_Filled', stack: 10, value: 45, effect: { resolve: 50 }, desc: 'Steadies the mind. Restores 50 resolve.' },
  potion_stamina: { name: 'Honeyed Vigor', type: 'potion', model: 'items/Potion2_Filled', stack: 10, value: 40, effect: { buff: 'vigor' }, desc: 'Stamina regenerates swiftly for two minutes.' },
  potion_wisp: { name: 'Lantern Oil', type: 'potion', model: 'items/Potion10_Filled', stack: 10, value: 90, effect: { buff: 'wardlight', resolve: 25 }, desc: 'Drink and the dark will hesitate. Wards against the hollow dead.' },

  // ---------- medicine ----------
  bandage: { name: 'Bandage', type: 'medicine', proc: 'bandage', stack: 10, value: 6, effect: { cure: ['bleeding'], heal: 8 }, desc: 'Stops bleeding.' },
  poultice: { name: 'Herb Poultice', type: 'medicine', proc: 'poultice', stack: 10, value: 14, effect: { cure: ['bleeding', 'poisoned'], heal: 15 }, desc: 'Bloodroot and ashleaf, chewed and bound.' },

  // ---------- tools ----------
  flint_hatchet: { name: 'Flint Hatchet', type: 'tool', tool: 'axe', tier: 1, dmg: 6, speed: 1.0, dur: 80, model: 'items/Axe_small', tints: { Steel: 0x6a6660, LightSteel: 0x8a8478 }, hold: 0.55, stack: 1, value: 8, desc: 'Flint lashed to a stick. It will do.' },
  flint_pick: { name: 'Flint Pick', type: 'tool', tool: 'pick', tier: 1, dmg: 5, speed: 0.9, dur: 80, model: 'props/Pickaxe_Bronze', tint: 0x8a8478, hold: 0.6, stack: 1, value: 8, desc: 'Crude, but the stone yields.' },
  bronze_axe: { name: 'Bronze Axe', type: 'tool', tool: 'axe', tier: 2, dmg: 11, speed: 1.1, dur: 200, model: 'props/Axe_Bronze', hold: 0.6, stack: 1, value: 45, desc: 'A proper axe. Fells pine.' },
  bronze_pick: { name: 'Bronze Pickaxe', type: 'tool', tool: 'pick', tier: 2, dmg: 9, speed: 1.0, dur: 200, model: 'props/Pickaxe_Bronze', hold: 0.65, stack: 1, value: 45, desc: 'Bites into iron.' },
  iron_axe: { name: 'Iron Greataxe', type: 'tool', tool: 'axe', tier: 3, dmg: 20, speed: 0.85, dur: 400, model: 'items/Axe_Double', hold: 0.8, stack: 1, value: 140, desc: 'Heavy enough to argue with oaks and men alike.' },
  iron_pick: { name: 'Iron Pickaxe', type: 'tool', tool: 'pick', tier: 3, dmg: 12, speed: 1.15, dur: 400, model: 'props/Pickaxe_Bronze', tint: 0x7a7a84, hold: 0.7, stack: 1, value: 120, desc: 'Gold and aether open to it.' },
  fishing_rod: { name: 'Fishing Rod', type: 'tool', tool: 'rod', tier: 1, dur: 120, proc: 'rod', hold: 1.0, stack: 1, value: 15, desc: 'Look at water and hold the strike to cast.' },
  torch: { name: 'Torch', type: 'tool', tool: 'light', tier: 0, dmg: 4, speed: 1, dur: 300, proc: 'torch', hold: 0.55, light: true, stack: 1, value: 10, desc: 'Fire carried in the hand. Burns down slowly.' },

  // ---------- weapons ----------
  club: { name: 'Knotted Club', type: 'weapon', dmg: 8, speed: 1.0, reach: 2.4, dur: 60, proc: 'club', hold: 0.6, stack: 1, value: 4, desc: 'A heavy branch. Honest violence.' },
  bone_dagger: { name: 'Bone Knife', type: 'weapon', dmg: 9, speed: 1.6, reach: 2.0, dur: 80, model: 'items/Dagger', tints: { Steel: 0xe8e0c8, LightSteel: 0xf0e8d8, DarkSteel: 0xc8bca0 }, hold: 0.4, stack: 1, value: 12, desc: 'Quick and cruel. Skins a carcass cleanly.' },
  bronze_sword: { name: 'Bronze Sword', type: 'weapon', dmg: 16, speed: 1.15, reach: 2.6, dur: 220, model: 'props/Sword_Bronze', hold: 0.85, stack: 1, value: 60, desc: 'Thornmere bronze. The first good blade in a long time.' },
  iron_sword: { name: 'Iron Longsword', type: 'weapon', dmg: 26, speed: 1.05, reach: 2.8, dur: 400, model: 'items/Sword', hold: 0.95, stack: 1, value: 160, desc: 'Grey, plain, absolutely certain.' },
  iron_dagger: { name: 'Iron Dagger', type: 'weapon', dmg: 15, speed: 1.7, reach: 2.0, dur: 300, model: 'items/Dagger', hold: 0.45, stack: 1, value: 80, desc: 'For close and quiet work.' },
  war_hammer: { name: 'Iron Warhammer', type: 'weapon', dmg: 34, speed: 0.75, reach: 2.7, dur: 450, model: 'items/Hammer_Double', hold: 0.85, stagger: 1.6, stack: 1, value: 190, desc: 'Staggers whatever it strikes.' },
  dawnwake: { name: 'Dawnwake', type: 'weapon', dmg: 44, speed: 1.15, reach: 3.0, dur: 9999, model: 'items/Sword_big_Golden', hold: 1.05, legendary: true, holy: 2, stack: 1, value: 900, desc: 'A sword of the old hearth-keepers. Doubly fierce against the hollow dead.' },
  wooden_bow: { name: 'Ash Bow', type: 'bow', dmg: 14, dur: 200, model: 'items/Bow_Wooden', hold: 0.9, stack: 1, value: 35, desc: 'Hold to draw, release to loose.' },
  golden_bow: { name: 'Sunstring', type: 'bow', dmg: 30, dur: 9999, model: 'items/Bow_Golden', hold: 0.95, legendary: true, stack: 1, value: 700, desc: 'It draws itself halfway.' },
  arrow: { name: 'Arrow', type: 'ammo', model: 'items/Arrow', stack: 60, value: 2, desc: 'Flint-tipped, fletched with whatever was at hand.' },

  // ---------- armor ----------
  wooden_shield: { name: 'Wooden Shield', type: 'shield', slot: 'offhand', block: 0.6, dur: 200, model: 'props/Shield_Wooden', stack: 1, value: 30, desc: 'Hold the guard to block. Absorbs most of a blow.' },
  leather_armor: { name: 'Leather Jerkin', type: 'armor', slot: 'body', armor: 6, model: 'items/Armor_Leather', stack: 1, value: 50, desc: 'Stitched rat hide and leather.' },
  chitin_armor: { name: 'Chitin Mail', type: 'armor', slot: 'body', armor: 11, resist: { poisoned: 0.5 }, model: 'items/Armor_Black', stack: 1, value: 140, desc: 'Spider-plate over silk. Venom slides off it.' },
  iron_armor: { name: 'Iron Cuirass', type: 'armor', slot: 'body', armor: 16, model: 'items/Armor_Metal', stack: 1, value: 220, desc: 'Heavy, cold, and very reassuring.' },
  gilded_armor: { name: 'Hearthward Plate', type: 'armor', slot: 'body', armor: 24, model: 'items/Armor_Golden', legendary: true, stack: 1, value: 1200, desc: 'Worn by the last warden. Warm, somehow.' },
  ring_vigor: { name: 'Ring of the Long Road', type: 'trinket', slot: 'trinket', bonus: { stamina: 30 }, model: 'items/Ring4', stack: 1, value: 160, desc: '+30 maximum stamina.' },
  ring_life: { name: 'Bloodstone Ring', type: 'trinket', slot: 'trinket', bonus: { health: 30 }, model: 'items/Ring3', stack: 1, value: 180, desc: '+30 maximum health.' },
  amulet_resolve: { name: 'Wardens Locket', type: 'trinket', slot: 'trinket', bonus: { resolve: 40 }, model: 'items/Necklace2', stack: 1, value: 200, desc: '+40 maximum resolve. Holds a curl of someone’s hair.' },

  // ---------- bags ----------
  satchel: { name: 'Satchel', type: 'bag', slots: 6, model: 'items/Bag', stack: 1, value: 40, desc: 'Carry six more things. Use to strap it on.' },
  backpack: { name: 'Traveler’s Pack', type: 'bag', slots: 12, model: 'items/Backpack', stack: 1, value: 120, desc: 'Carry twelve more things. Use to strap it on.' },

  // ---------- placeables (crafted, then placed in the world) ----------
  kit_campfire: { name: 'Campfire', type: 'placeable', place: 'campfire', proc: 'campfire', stack: 5, value: 3, desc: 'Place, then light it. Cook, boil water, keep the dark back.' },
  kit_workbench: { name: 'Workbench', type: 'placeable', place: 'workbench', model: 'props/Workbench', stack: 1, value: 25, desc: 'For woodwork, bowyery, and leather.' },
  kit_bloomery: { name: 'Bloomery', type: 'placeable', place: 'bloomery', proc: 'bloomery', stack: 1, value: 30, desc: 'A clay-and-stone furnace. Smelts ore into bars.' },
  kit_anvil: { name: 'Anvil', type: 'placeable', place: 'anvil', model: 'props/Anvil_Log', stack: 1, value: 60, desc: 'Where bars become blades.' },
  kit_cauldron: { name: 'Cauldron', type: 'placeable', place: 'cauldron', model: 'props/Cauldron', stack: 1, value: 50, desc: 'Stews and alchemy.' },
  kit_bedroll: { name: 'Bedroll', type: 'placeable', place: 'bedroll', proc: 'bedroll', stack: 1, value: 12, desc: 'Sleep through the dark. Sets where you wake if you fall.' },
  kit_bed: { name: 'Bed', type: 'placeable', place: 'bed', model: 'props/Bed_Twin1', stack: 1, value: 60, desc: 'Real rest. Restores resolve fully.' },
  kit_chest: { name: 'Storage Chest', type: 'placeable', place: 'chest', model: 'props/Chest_Wood', stack: 1, value: 30, desc: 'Twenty-four slots of safekeeping.' },
  kit_barrel: { name: 'Rain Barrel', type: 'placeable', place: 'rain_barrel', model: 'props/Barrel', stack: 1, value: 20, desc: 'Collects clean rainwater over time.' },
  kit_torchstand: { name: 'Standing Torch', type: 'placeable', place: 'torchstand', model: 'props/CandleStick_Stand', stack: 5, value: 12, desc: 'Light that stays where you leave it.' },
  kit_fence: { name: 'Wooden Fence', type: 'placeable', place: 'fence', model: 'village/Prop_WoodenFence_Single', stack: 20, value: 6, desc: 'Snaps to the building grid.' },
  kit_floor: { name: 'Timber Floor', type: 'placeable', place: 'floor', model: 'village/Floor_WoodDark', stack: 20, value: 10, desc: '2×2 m. Snaps to the building grid.' },
  kit_wall: { name: 'Plaster Wall', type: 'placeable', place: 'wall', model: 'village/Wall_Plaster_Straight', stack: 20, value: 14, desc: 'Snaps to the building grid edges.' },
  kit_wall_door: { name: 'Doorway Wall', type: 'placeable', place: 'wall_door', model: 'village/Wall_Plaster_Door_Flat', stack: 10, value: 18, desc: 'A wall with a door that opens.' },
  kit_wall_window: { name: 'Window Wall', type: 'placeable', place: 'wall_window', model: 'village/Wall_Plaster_Window_Wide_Flat', stack: 10, value: 16, desc: 'Let the light in. Keep the rats out.' },
  kit_roof: { name: 'Tiled Roof', type: 'placeable', place: 'roof', model: 'village/Roof_RoundTiles_4x4', stack: 10, value: 30, desc: 'Covers a 4×4 m room. Keeps rain off your fire.' },

  // ---------- books and quest items ----------
  book_warden: { name: 'Warden’s Daybook', type: 'book', lore: 'warden', model: 'items/Book1_Closed', stack: 1, value: 10, desc: 'Water-stained. The last pages are torn out.' },
  book_bell: { name: 'Of the Bell Without a Tongue', type: 'book', lore: 'bell', model: 'items/Book2_Closed', stack: 1, value: 10, desc: 'A hymnal, mostly. One page is not.' },
  book_smith: { name: 'Ledger of Hadrig the Smith', type: 'book', lore: 'smith', model: 'items/Book3_Closed', stack: 1, value: 10, desc: 'Numbers, then a confession.' },
  book_brood: { name: 'Scratched Bark Tablet', type: 'book', lore: 'brood', model: 'items/Parchment', stack: 1, value: 10, desc: 'Letters gouged with a knife point.' },
  book_lantern: { name: 'The Lantern-Keeper’s Rule', type: 'book', lore: 'lantern', model: 'items/Scroll', stack: 1, value: 10, desc: 'Sold to you for one coin. It insisted.' },
  book_herbs: { name: 'Hedge-Witch’s Almanac', type: 'book', lore: 'herbs', model: 'items/Book4_Closed', stack: 1, value: 15, desc: 'Margins full of pressed petals.' },
  book_children: { name: 'A Child’s Counting Rhyme', type: 'book', lore: 'rhyme', model: 'props/Book_5', stack: 1, value: 5, desc: 'Written in a careful, wobbling hand.' },
  hollow_crown: { name: 'The Hollow Crown', type: 'quest', model: 'items/Crown2', stack: 1, value: 0, desc: 'Cold. The center where a jewel should sit is empty, and it seems deeper than the crown is thick.' },
  ember_heart: { name: 'Ember of the First Hearth', type: 'trinket', slot: 'trinket', bonus: { resolve: 60, health: 20 }, legendary: true, model: 'items/Heart', tint: 0xff7030, stack: 1, value: 0, desc: 'Warm as a held hand. It beats, slowly. +60 resolve, +20 health.' },
  };

for (const [id, it] of Object.entries(ITEMS)) { it.id = id; it.stack ??= 1; }

export function item(id) {
  const it = ITEMS[id];
  if (!it) throw new Error('Unknown item ' + id);
  return it;
}

export const ORE = ORE_TINT;
