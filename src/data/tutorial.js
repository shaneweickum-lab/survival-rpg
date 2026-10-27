// The guided path through Thornmere: twenty short lessons from the shades who stayed behind.
// Each lesson: find the guide (a lantern-light), speak with them (E), do what they ask, take the reward.
// Goals use the quest system's types, plus: act (a counted action), xp (experience gained).

export const GUIDES = {
  ysolde: { name: 'Ysolde’s Shade', title: 'the last Warden', color: 0xffd890 },
  tam: { name: 'Tam’s Shade', title: 'woodsman', color: 0x9ad070 },
  nell: { name: 'Nell’s Shade', title: 'fisher', color: 0x80c0ff },
  teague: { name: 'Mother Teague’s Shade', title: 'cook and herb-wife', color: 0xffa070 },
  bram: { name: 'Sergeant Bram’s Shade', title: 'old soldier', color: 0xff6a50 },
  hadrig: { name: 'Hadrig’s Shade', title: 'smith', color: 0xffb040 },
  quill: { name: 'Quill’s Shade', title: 'mason', color: 0xd8c8a8 },
  aldous: { name: 'Brother Aldous’s Shade', title: 'bell-keeper', color: 0xe0d8ff },
};

// Fire pits the guides keep, so there is always somewhere to boil and cook.
export const GUIDE_FIREPITS = [{ x: 23, z: 75 }, { x: 3, z: 18 }];

export const TUTORIAL = [
  {
    guide: 'ysolde', title: 'The Waking Bell', at: { x: 3, z: 8 },
    hello: ['You are awake. Good. Most who wake here do not stay that way long.', 'I was the Warden of this place. Now I am a light that will not go out.', 'Everything you carry, everything you know, lives behind one key. Press Tab. Look through the pages: your pack, crafting, skills, prayer, your journal, the map.'],
    task: 'Open the menu with Tab.',
    goals: [{ type: 'act', act: 'menu', n: 1, label: 'Open the menu (Tab)' }],
    done: ['There. The whole of you, in a few pages. When you forget something, look there first.'],
    reward: { items: [['coin', 10]], xp: {} },
  },
  {
    guide: 'ysolde', title: 'Things Left Behind', at: { x: -12, z: 4 },
    hello: ['This is the house you woke in. It belonged to a family who left in the night.', 'There is a bottle on the nightstand. Take it. Look at a thing and press E.', 'Then search a chest, a crate or a cabinet somewhere in the village. The dead do not mind. Not much.'],
    task: 'Take the bottle from the nightstand and search any container.',
    goals: [{ type: 'have', item: 'bottle', n: 1, alt: ['bottle_murky', 'bottle_clean'], label: 'Take the empty bottle' }, { type: 'act', act: 'search', n: 1, label: 'Search a container' }],
    done: ['Whatever you found, keep it. Tam will show you how to make more. He waits west, past the last house.'],
    reward: { items: [['bandage', 2]], xp: { foraging: 20 } },
  },
  {
    guide: 'tam', title: 'Fallen Wood', at: { x: -44, z: 2 },
    hello: ['Ha. A living one. Come closer, I don’t bite. Can’t, anymore.', 'Fire, tools, shelter: it all starts on the ground. Sticks under the trees, stones in the grass.', 'Look at them and press E. Bring me four of each.'],
    task: 'Gather 4 sticks and 4 stones.',
    goals: [{ type: 'have', item: 'stick', n: 4, label: 'Gather sticks' }, { type: 'have', item: 'stone', n: 4, label: 'Gather stones' }],
    done: ['Good hands. You will need them.'],
    reward: { items: [['fiber', 4]], xp: { foraging: 30 } },
  },
  {
    guide: 'tam', title: 'Grass into Rope', at: { x: -44, z: 2 },
    hello: ['Tall grass gives fiber. Fiber gives rope. Rope holds the world together.', 'Press Q for crafting. Choose Rope under By Hand, and press Make.', 'It takes a little while. Everything worth doing does. If you walk off mid-work, the work stops.'],
    task: 'Craft a rope.',
    goals: [{ type: 'craft', item: 'rope', n: 1, label: 'Craft a Rope (Q)' }],
    done: ['See how the clock moved? Work takes time. Time takes from you: water, food, warmth.'],
    reward: { items: [['stick', 2]], xp: { crafting: 30 } },
  },
  {
    guide: 'tam', title: 'First Edge', at: { x: -44, z: 2 },
    hello: ['Here. Two flints from my pocket. Flint lies by the water, when you need more.', 'Bind flint to a stick with fiber and you have a hatchet. Q, By Hand, Flint Hatchet.'],
    give: [['flint', 2], ['fiber', 2]],
    task: 'Craft a Flint Hatchet.',
    goals: [{ type: 'craft', item: 'flint_hatchet', n: 1, label: 'Craft a Flint Hatchet' }],
    done: ['Now you are dangerous to trees, at least.'],
    reward: { items: [], xp: { crafting: 25 } },
  },
  {
    guide: 'tam', title: 'The Felling', at: { x: -52, z: 12 },
    hello: ['Put the hatchet on your belt. The number keys choose what is in your hand: 1 to 8, or the mouse wheel.', 'Face a tree and strike with the left mouse button. Not every swing bites. Keep at it.'],
    task: 'Chop 3 logs.',
    goals: [{ type: 'chop', n: 3, label: 'Chop logs' }],
    done: ['Hear that? That is Woodcutting rising. Every skill rises by doing. Nothing else.'],
    reward: { items: [['apple', 2]], xp: { woodcutting: 40 } },
  },
  {
    guide: 'tam', title: 'Kindling', at: { x: -52, z: 12 },
    hello: ['Now the most important thing I will ever tell you.', 'Craft a Campfire: four sticks, four stones. Choose it on your belt and strike to set it down. R turns it.', 'Then look at it and hold E to light it. Feed it with F. Keep it fed. The dark is worse than you think.'],
    task: 'Build a campfire and light it.',
    goals: [{ type: 'place', what: 'campfire', n: 1, label: 'Place a campfire' }, { type: 'light', n: 1, label: 'Light it (E)' }],
    done: ['There. A little sun of your own.', 'Nell is down by the water, south along the road. She will teach you to drink without dying of it.'],
    reward: { items: [['deadwood', 2]], xp: { firemaking: 50 } },
  },
  {
    guide: 'nell', title: 'The Mere’s Gift', at: { x: 19, z: 76 },
    hello: ['Mind the edge, love. The mere is deeper than it looks, and colder. You came the long way, down the road and east along the shore.', 'Hold your empty bottle and strike while looking at the water to fill it.'],
    task: 'Fill your bottle at the mere.',
    goals: [{ type: 'have', item: 'bottle_murky', n: 1, alt: ['bottle_clean'], label: 'Fill a bottle with water' }],
    done: ['See how it clouds? There are things living in that.'],
    reward: { items: [['coin', 15]], xp: {} },
  },
  {
    guide: 'nell', title: 'Boil Before You Drink', at: { x: 19, z: 76 },
    hello: ['There is my old fire pit, just here. It never quite goes out. Nobody knows why. I don’t ask.', 'At a burning fire, open crafting and boil the murky water clean. Then drink it.', 'You can drink straight from the mere with E. You can also spend two days on your knees being sick.'],
    task: 'Boil your water at a fire and drink it.',
    goals: [{ type: 'drink', item: 'bottle_clean', n: 1, label: 'Drink clean water' }],
    done: ['Water first, always. A body goes dry long before it goes hungry.'],
    reward: { items: [['bottle', 1]], xp: { cooking: 20 } },
  },
  {
    guide: 'nell', title: 'Silverfins', at: { x: 19, z: 76 },
    hello: ['Take my rod. I have no use for it now.', 'Look at open water and strike to cast. Wait. When the water jumps, strike again, quick.'],
    give: [['fishing_rod', 1]],
    task: 'Catch a silverfin.',
    goals: [{ type: 'have', item: 'raw_fish', n: 1, alt: ['cooked_fish'], label: 'Catch a fish' }],
    done: ['A good fat one. Mother Teague will make something of it. The granary, north of here, in the village.'],
    reward: { items: [], xp: { fishing: 40 } },
  },
  {
    guide: 'teague', title: 'Mother’s Recipe', at: { x: -2, z: 19 },
    hello: ['Let me look at you. Too thin. Everyone is too thin.', 'Raw meat sickens. Raw fish sickens. Cook it. My fire pit is just there, and it is always burning.', 'At a burning fire, open crafting and cook your fish. Here, a bit of meat as well, in case.'],
    give: [['raw_meat', 1]],
    task: 'Cook something at a fire.',
    goals: [{ type: 'act', act: 'cook', n: 1, label: 'Cook food at a fire' }],
    done: ['Smell that. That is what being alive smells like.'],
    reward: { items: [['carrot', 3]], xp: { cooking: 40 } },
  },
  {
    guide: 'teague', title: 'Green Medicine', at: { x: -14, z: -15 },
    hello: ['This was my cottage. Mind the shelves.', 'You need four things in your belly: water, and carbs, fats and protein. And calories to burn, all day long. Watch the rings at the bottom of your sight.', 'Eat something now. Then make a bandage from fiber: Q, By Hand. Bites bleed. Bandages stop it.'],
    give: [['fiber', 3]],
    task: 'Eat something and craft a bandage.',
    goals: [{ type: 'eat', n: 1, label: 'Eat something' }, { type: 'craft', item: 'bandage', n: 1, label: 'Craft a Bandage' }],
    done: ['There. Now go see Bram at the training post by the square. He is shouting at nobody again.'],
    reward: { items: [['poultice', 1]], xp: { foraging: 30, crafting: 20 } },
  },
  {
    guide: 'bram', title: 'Steel and Stance', at: { x: 9, z: 14 },
    hello: ['RECRUIT. Stand up straight. Take this club.', 'Left mouse: a quick strike. Hold it, then let go: a heavy blow that costs stamina.', 'Right mouse: guard. Watch your stamina bar. Strike the dummy five times.'],
    give: [['club', 1]],
    task: 'Strike the training dummy 5 times.',
    goals: [{ type: 'act', act: 'dummy', n: 5, label: 'Strike the training dummy' }],
    done: ['Sloppy. Brave, though. Brave counts.'],
    reward: { items: [], xp: { blade: 60 } },
  },
  {
    guide: 'bram', title: 'Teeth in the Grass', at: { x: 9, z: 14 },
    hello: ['Rats. Big as hounds. They nest in the fields round the village.', 'Kill one. Watch its bar at the top of your sight. Guard when it rears back.', 'If it bites deep you will bleed. You have a bandage. Use it.'],
    task: 'Slay a Burrow Rat.',
    goals: [{ type: 'kill', creature: 'rat', n: 1, label: 'Slay a Burrow Rat' }],
    done: ['Ha. You will make a soldier yet. Or a corpse. Usually both, eventually.'],
    reward: { items: [['wooden_shield', 1]], xp: { vitality: 60 } },
  },
  {
    guide: 'bram', title: 'Loosing Arrows', at: { x: 9, z: 14 },
    hello: ['Shields go on the off-hand. Open your pack and wear it: right-click it, or double-click.', 'And take this bow, and these arrows. Hold the left mouse to draw, let go to loose. The longer you draw, the harder it hits.', 'Hit something living with an arrow.'],
    give: [['wooden_bow', 1], ['arrow', 15]],
    task: 'Wound a creature with an arrow.',
    goals: [{ type: 'xp', skill: 'marksman', n: 20, label: 'Earn Marksman experience' }],
    done: ['Arrows can be picked back up, mostly. Hadrig wants you at the Greenstone Hills, west along the road.'],
    reward: { items: [['arrow', 10]], xp: { marksman: 30 } },
  },
  {
    guide: 'hadrig', title: 'Stone That Sings', at: { x: -74, z: -4 },
    hello: ['Green veins are copper. Pale ones are tin. Bronze is the two of them, married in fire.', 'Take this pick. Strike the veined boulders. Bring me one of each.'],
    give: [['flint_pick', 1]],
    task: 'Mine copper ore and tin ore.',
    goals: [{ type: 'have', item: 'copper_ore', n: 1, label: 'Mine copper ore' }, { type: 'have', item: 'tin_ore', n: 1, label: 'Mine tin ore' }],
    done: ['Good. Now my bloomery, behind the smithy, east of the square. She still burns.'],
    reward: { items: [['copper_ore', 1], ['tin_ore', 1]], xp: { mining: 40 } },
  },
  {
    guide: 'hadrig', title: 'Fire and Bronze', at: { x: 14.5, z: -7 },
    hello: ['There she is. Ugly, but honest.', 'Stand by the bloomery, open crafting, and smelt a bronze bar. Copper and tin, one of each.', 'Bars become tools at an anvil. That will be your work, later. My anvil cracked.'],
    task: 'Smelt a bronze bar.',
    goals: [{ type: 'craft', item: 'bronze_bar', n: 1, label: 'Smelt a Bronze Bar' }],
    done: ['Feel the weight of it? Everything you carry has weight. Strength lets you carry more. Open your pack and look at your load.', 'Quill is laying stones north of the granary. Go and be useful.'],
    reward: { items: [['stone_hammer', 1]], xp: { smithing: 50, strength: 30 } },
  },
  {
    guide: 'quill', title: 'Four Walls', at: { x: 18, z: 24 },
    hello: ['A fire keeps you alive. Walls keep you sane.', 'Here: a floor and a wall. Choose the floor on your belt and strike to lay it. Walls snap to the floor’s edges. R turns them.', 'Most things you build can be picked up again with F. Stools and benches, too. Carry them where you like.'],
    give: [['kit_floor', 1], ['kit_wall', 1]],
    task: 'Lay a floor and raise a wall.',
    goals: [{ type: 'place', what: 'floor', n: 1, label: 'Lay a timber floor' }, { type: 'place', what: 'wall', n: 1, label: 'Raise a wall' }],
    done: ['Crooked. Well. The first one always is.', 'Brother Aldous waits at the Hearth-House, north of the square. He has something to say about the dead.'],
    reward: { items: [['plank', 4]], xp: { construction: 60 } },
  },
  {
    guide: 'aldous', title: 'Bury Them Kindly', at: { x: 0, z: -17 },
    hello: ['There are bones all through this vale. Most were somebody.', 'Bury them. Hold a bone and strike, or right-click it in your pack and choose Bury. Here are three to begin.', 'The dead remember who laid them down. That remembering is Prayer.'],
    give: [['bone', 3]],
    task: 'Bury 3 bones.',
    goals: [{ type: 'act', act: 'bury', n: 3, label: 'Bury bones' }],
    done: ['Rest, all of you.', 'There. You have heard them. You may speak the old words now.'],
    reward: { items: [], xp: { prayer: 340 } },
  },
  {
    guide: 'aldous', title: 'The Old Words', at: { x: 0, z: -17 },
    hello: ['Words of Mending. A small healing, for small wounds.', 'Press P for your prayers. Choose an incantation to speak it, or set it to G and speak it whenever you like. It costs mana, the blue bar. Mana returns by the fire and in sleep.'],
    task: 'Speak an incantation.',
    goals: [{ type: 'act', act: 'cast', n: 1, label: 'Speak an incantation (P or G)' }],
    done: ['You learn quickly. You will need to.', 'Ysolde asked me to say one more thing. The Warden kept a daybook. It is on the stand, inside, by the cold hearth. Read it.', 'After that, the vale is yours. Go carefully.'],
    reward: { items: [['satchel', 1], ['coin', 50], ['potion_health', 1]], xp: { prayer: 40 } },
  },
];

// Each lesson becomes a two-stage quest: find the guide, then do the task.
export function tutorialQuests() {
  const out = {};
  TUTORIAL.forEach((t, i) => {
    const id = 'tut' + String(i + 1).padStart(2, '0');
    const G = GUIDES[t.guide];
    out[id] = {
      title: `${i + 1}. ${t.title}`, tutorial: true, index: i, guide: t.guide, at: { ...t.at, r: 5, name: G.name },
      give: t.give, reward: t.reward, hello: t.hello, done: t.done,
      next: i + 1 < TUTORIAL.length ? 'tut' + String(i + 2).padStart(2, '0') : null,
      stages: [
        { title: `Find ${G.name}`, text: `${G.name}, ${G.title}, is waiting. Follow the light on your compass and speak with them (E).`, target: { ...t.at, r: 5, name: G.name }, goals: [{ type: 'flag', flag: 'talk:' + id, label: `Speak with ${G.name}` }] },
        { title: t.title, text: t.task, target: { ...t.at, r: 5, name: G.name }, goals: t.goals },
      ],
    };
  });
  return out;
}
export const TUTORIAL_FIRST = 'tut01';
export const TUTORIAL_COUNT = TUTORIAL.length;
