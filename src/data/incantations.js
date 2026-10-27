// Incantations: words the old hearth-keepers spoke. Each costs mana and needs a Prayer level.
// Effects: heal, resolve, cure [], buff [name, seconds], calories.

export const INCANTATIONS = [
  { id: 'mend', name: 'Words of Mending', level: 5, mana: 8, effect: { heal: 5 }, desc: 'Heal 5 health.', words: 'Close, little door. Close.' },
  { id: 'ember', name: 'Ember Hymn', level: 10, mana: 12, effect: { resolve: 20 }, desc: 'Restore 20 resolve.', words: 'Warm in the hand, warm in the hearth.' },
  { id: 'cleanse', name: 'Litany of Clean Blood', level: 15, mana: 16, effect: { cure: ['poisoned', 'bleeding', 'sick'] }, desc: 'Cure venom, bleeding and sickness.', words: 'What is not mine, go out of me.' },
  { id: 'iron', name: 'Words of Iron', level: 22, mana: 20, effect: { buff: ['ironskin', 90] }, desc: '+10 armor for 90 seconds.', words: 'Bone to stone. Stone to iron.' },
  { id: 'greater', name: 'Greater Mending', level: 30, mana: 26, effect: { heal: 35 }, desc: 'Heal 35 health.', words: 'Remember the shape you were.' },
  { id: 'hearth', name: 'Hearthcall', level: 40, mana: 35, effect: { buff: ['wardlight', 120] }, desc: 'The hollow dead flee from you for two minutes.', words: 'I carry the fire. Stand back.' },
  { id: 'table', name: 'Prayer of the Full Table', level: 50, mana: 40, effect: { calories: 600 }, desc: 'Restore 600 calories.', words: 'Bread for the road, and salt for the bread.' },
];

export const INCANTATION_BY_ID = Object.fromEntries(INCANTATIONS.map(i => [i.id, i]));
