# Thornmere

*The bell of Thornmere has no tongue.*

A first-person medieval survival RPG that runs in the browser, built with Three.js from the
assets in this repository. It mixes three kinds of play:

- **Green Hell**: you survive with your body. Water must be boiled. Carbs, fats and protein
  are tracked separately. Wounds bleed, venom burns, raw meat sickens, and the dark wears
  down your mind (**Resolve**).
- **RuneScape**: 18 skills rise by use on the classic experience curve up to level 100, with XP
  drops and level-up fanfares. Every 18 skill levels you gain raises your player level by one.
  Bury bones for Prayer and speak incantations with mana.
- **Oblivion**: an open vale to wander, a compass with quest markers, lootable houses,
  readable books, tap or hold attacks, blocking, bows, and a main quest with an ending choice.

## Running it

You need [Node.js](https://nodejs.org) (any recent version). There are no dependencies to install.

```bash
npm start
```

Then open **http://localhost:8080** in Chrome, Edge or Firefox. Click the game to capture the
mouse. Your progress saves in the browser automatically (and from the pause menu).

On a slow machine, open **http://localhost:8080/?gfx=low**, or turn off shadows in the pause menu.

To browse every model in the repo, open **http://localhost:8080/gallery.html**.

## Deploying to Vercel

The game is a plain static site, so there is nothing to build.

1. In Vercel, choose **Add New → Project** and import this GitHub repository.
2. Leave the settings as they are. `vercel.json` already sets *no framework, no install,
   no build, serve the repository root*.
3. Deploy. The game is at your project's URL, and the asset gallery is at `/gallery`.

`.vercelignore` leaves out files the game never loads (the original zip uploads and the
full-size texture sources), which keeps each deployment to about 30 MB. Saves live in each
player's browser, so no database is needed.

## Controls

| Key | Action |
| --- | --- |
| WASD / Shift / Space | move / run / jump (and swim up) |
| C or Ctrl | sneak (creatures notice you less) |
| Mouse | look |
| Left mouse | strike, chop, mine, eat or use whatever is in your hand |
| Hold left mouse | power attack, or draw a bow |
| Right mouse | block (better with a shield) |
| E | interact: take, open, drink, read, sleep, talk |
| F | secondary action: feed a fire, pick a structure back up |
| 1–8 or mouse wheel | choose the item in your hand from your belt |
| Tab | the menu: pack, crafting, skills, prayer, journal, map (one tab each) |
| I / Q / K / P / J / M | jump straight to pack / crafting / skills / prayer / journal / map |
| G | speak your chosen incantation |
| R | rotate while placing a structure |
| Esc | pause and settings |

## The Lights of Thornmere (tutorial)

A new game asks whether you want to walk with the guides. Like RuneScape's Tutorial Island, it's
a chain of 20 short lessons. Each guide is a lantern-light, the shade of someone who used to live
here, waiting at a place in or near the village. Follow the beam of light and the compass marker,
press **E** to speak, do what they ask, and take your reward. Some guides hand you what you need.

| # | Guide | Where | Lesson |
| --- | --- | --- | --- |
| 1–2 | Ysolde (the last Warden) | the well, the house you woke in | the Tab menu, taking things, searching containers |
| 3–7 | Tam (woodsman) | the west fields and treeline | gathering, rope, a flint hatchet, chopping, a campfire |
| 8–10 | Nell (fisher) | the mere's north shore | filling, boiling and drinking water, fishing |
| 11–12 | Mother Teague (cook) | the granary, her cottage | cooking, the needs and calories, bandages |
| 13–15 | Sergeant Bram (soldier) | the training dummy | striking and guarding, a first kill, the bow |
| 16–17 | Hadrig (smith) | the Greenstone Hills, his bloomery | mining copper and tin, smelting bronze, weight |
| 18 | Quill (mason) | north of the granary | floors and walls, moving furniture |
| 19–20 | Brother Aldous (bell-keeper) | the Hearth-House | burying bones, speaking an incantation |

The tracker in the top-left corner shows where you are. When the last lesson ends, the story
begins at the Hearth-House. You can skip the rest from the pause menu at any time.

## Survival in short

- Drink **boiled** water. Fill a bottle at the mere, then boil it at a lit campfire.
  Mere water drunk raw can make you sick.
- Eat a mix of foods. Each of carbs, fats and protein that runs low weakens you in its own way.
- Cook meat, fish and mushrooms first. Raw food may make you sick.
- Keep near fire after dark. Light, sleep, books and potions restore Resolve.
- If you fall, your belt stays with you and your pack lies where you died. Go back for it.
- Sleep in a bed or bedroll to skip the night and set where you wake.
- Watch your **calories** as well as your three foods. Running, fighting and hauling burn them faster.
- Everything has a weight. Past your limit you can't run or jump; far past it you can barely move.
  Strength raises the limit, and so do bags.
- Crafting takes time. A quick job takes a game minute or two, a suit of armor most of an hour,
  and the clock moves forward when it's done. Walking away stops the work.
- Light furniture (stools, chairs, benches, buckets, pots, vases) can be picked up with **F**
  and set down somewhere else.
- Make a **Stone Hammer** by hand and you can knap flint from stone at a workbench. Most
  stones break wrong; Crafting improves the odds.
- Bury bones to train **Prayer**. At Prayer 5 you learn the Words of Mending (heal 5); more
  incantations follow at 10, 15, 22, 30, 40 and 50.

## What's in the vale

- **Thornmere village**: the house where you wake, the Hearth-House (chapel), Hadrig's
  smithy, the herbalist's cottage, a family home, the granary, the square and its well,
  a carrot field, and the Lantern-Keeper's stall (a merchant).
- **The Drowned Mere** to the south (water, flint, fishing, toads), **Sedge Marsh** (vipers,
  ashleaf), the **Greenstone Hills** to the west (copper and tin), the **Pinewood Rise** to
  the north (pine, iron, coal), **Ember Grove** (wasp hives and honey), the **Old Barrow**
  (gold, aether, and something worth finding), and **Thornback Hollow**, the Broodmother's nest.

## Project layout

```
index.html, style.css      the page and its interface
server.js                  tiny zero-dependency static server (npm start)
gallery.html               asset browser
vendor/three/              Three.js r169 (MIT), vendored so it works offline
assets/models/props/       furniture and props (shared trim-sheet textures)
assets/models/items/       weapons, armor, potions, books, jewelry (from the item zip)
assets/models/nature/      trees: oak, birch, pine, dead (from the nature zip)
assets/models/creatures/   rat, frog, snake, spider, wasp (from the creature zip)
assets/models/village/     modular medieval building kit (from the village zip)
assets/textures/           1024px web copies of the trim textures; originals in source/
assets/source-archives/    the original uploaded zip files
src/main.js                game loop and wiring
src/data/                  items, recipes, skills, creatures, quests, lore, places
src/engine/                asset loading, procedural models and textures, audio, input, particles
src/world/                 terrain, sky, village and landmarks, resources, structures, collisions
src/entities/              creatures, arrows, graves
src/player/                movement, needs, combat, the held item
src/ui/                    HUD and every panel
docs/                      design notes
```

## Extending it

Most content is plain data:

- **New item**: add an entry to `src/data/items.js`. Point `model` at any file under
  `assets/models` (without the extension), or use `tint`/`tints` to recolor it.
- **New recipe**: add a line to `src/data/recipes.js` with its inputs, station, skill and level.
- **New creature**: add it to `src/data/creatures.js` and a spawn zone in `src/entities/creatures.js`.
- **New quest stage or book**: `src/data/quests.js` and `src/data/lore.js`.
- **New models**: drop `.obj`/`.mtl` files into a pack folder and regenerate
  `src/data/manifest.js` so the gallery sees them.

Material notes: the village kit's original textures were not part of the upload (its `.mtl`
files point at paths on the author's computer), so walls, bricks and roof tiles use painted
canvas textures generated in `src/engine/proctex.js`. If you add the kit's real textures later,
map them in `OVERRIDES` in `src/engine/assets.js`.
