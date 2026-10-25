// Quests. Each stage has objectives; when all are met the next stage begins.
// Objective types: have, craft, place, light, drink, eat, chop, mine, kill, read, reach, flag.

export const QUESTS = {
  main: {
    title: 'The Unlit Hearth',
    stages: [
      {
        title: 'Ash and Waking',
        text: 'Cold has settled into your bones. Gather sticks and stones from the ground, make a campfire, and light it.',
        goals: [
          { type: 'have', item: 'stick', n: 4, label: 'Gather sticks' },
          { type: 'have', item: 'stone', n: 4, label: 'Gather stones' },
          { type: 'place', what: 'campfire', n: 1, label: 'Craft and place a campfire (Q)' },
          { type: 'light', n: 1, label: 'Light the campfire (hold E)' },
        ],
      },
      {
        title: 'The Water Remembers',
        text: 'Your throat burns. There is a bottle in the house where you woke. Fill it at the mere to the south, and boil it at your fire before you drink.',
        target: 'mere',
        goals: [
          { type: 'have', item: 'bottle_murky', n: 1, alt: ['bottle_clean'], label: 'Fill a bottle at the water' },
          { type: 'drink', item: 'bottle_clean', n: 1, label: 'Boil the water and drink it' },
        ],
      },
      {
        title: 'An Edge Against the World',
        text: 'Flint lies along the water’s edge. Bind it to a stick with fiber from the tall grass, and cut wood.',
        goals: [
          { type: 'craft', item: 'flint_hatchet', n: 1, label: 'Craft a Flint Hatchet' },
          { type: 'chop', n: 5, label: 'Chop logs' },
          { type: 'eat', n: 1, cooked: true, label: 'Eat something cooked' },
        ],
      },
      {
        title: 'What the Warden Wrote',
        text: 'The Hearth-House stands at the north of the square. Someone kept a daybook there.',
        target: 'chapel',
        goals: [{ type: 'read', lore: 'warden', label: 'Read the Warden’s Daybook' }],
      },
      {
        title: 'Bronze Before Courage',
        text: 'Hadrig’s ledger lies in the smithy east of the square. Mine copper and tin in the Greenstone Hills to the west, raise a bloomery, and smelt bronze.',
        target: 'copper_hills',
        goals: [
          { type: 'read', lore: 'smith', label: 'Read Hadrig’s Ledger' },
          { type: 'place', what: 'bloomery', n: 1, label: 'Build a Bloomery' },
          { type: 'craft', item: 'bronze_bar', n: 4, label: 'Smelt Bronze Bars' },
        ],
      },
      {
        title: 'The Anvil Wakes',
        text: 'Bars become an anvil. The anvil makes a blade.',
        goals: [
          { type: 'place', what: 'anvil', n: 1, label: 'Raise an Anvil' },
          { type: 'craft', item: 'bronze_sword', n: 1, label: 'Forge a Bronze Sword' },
        ],
      },
      {
        title: 'Into the Thornback Hollow',
        text: 'North and east, past the dead birches, the ground goes soft and black. The Broodmother keeps the Crown there.',
        target: 'hollow',
        goals: [
          { type: 'kill', creature: 'broodmother', n: 1, label: 'Slay the Broodmother' },
          { type: 'have', item: 'hollow_crown', n: 1, label: 'Take the Hollow Crown' },
        ],
      },
      {
        title: 'The Bell Without a Tongue',
        text: 'Carry the Crown to the Hearth in the Hearth-House. What you do there cannot be undone.',
        target: 'chapel',
        goals: [{ type: 'flag', flag: 'ending', label: 'Stand before the Hearth' }],
      },
    ],
  },
  rhyme: {
    title: 'For When We Are Big',
    stages: [
      {
        title: 'For When We Are Big',
        text: 'A child’s rhyme speaks of a box hidden by the drowned oak at the mere.',
        target: 'drowned_oak',
        goals: [{ type: 'flag', flag: 'rhyme_chest', label: 'Find what Papa hid' }],
      },
    ],
  },
  lantern: {
    title: 'Ash for the Lantern',
    stages: [
      {
        title: 'Ash for the Lantern',
        text: 'The Lantern-Keeper wants the ash of the hollow dead. Wisps walk at night.',
        goals: [{ type: 'have', item: 'wisp_ash', n: 5, label: 'Collect Wisp Ash' }, { type: 'flag', flag: 'lantern_paid', label: 'Bring it to the Lantern-Keeper' }],
      },
    ],
  },
};
