# Spellbound Express

A 3D spelling game: spell your way along a railway to a magical castle.

- **The ride.** Each level is a freshly generated valley with hills, a river and
  stone bridge, forests, far mountains, and a winding railway. The level's theme
  rotates: Blossom Meadow, Golden Autumn, Snowy Peaks, Candy Sunset. The train
  stops at numbered word gates. A correct spelling sends it on to the next one.
  Level *n* needs 8 + 2n words (Level 1 = 10, Level 2 = 12, …, up to 30).
- **Questions.** There are four kinds, and each can be switched on or off in
  Settings:
  - **Flash:** look at the word, then spell it.
  - **Listen and spell:** the word is spoken, with an optional definition.
  - **Fill in the blanks:** some letters are hidden, and the definition is shown.
  - **Pick the right spelling:** one correct spelling and two believable
    misspellings.

  A wrong answer shows the correct spelling, the player copies it once, and the
  word comes back a couple of stops later.
- **Tickets.** Each level starts with 🎟️🎟️🎟️. Each mistake punches one. On the
  third, after copying the word, a cheerful card ("Uh oh! All out of tickets… You
  can do it!") sends the train rolling back to the station (`WORLD.goBack`). The
  word gates reset, and that level starts again with the missed words first.
- **Words.** The 2026–27 School Spelling Bee study list (450 words) is in
  `js/words.js`: words 1–150 are **One Bee**, 151–300 **Two Bee**, and 301–450
  **Three Bee**. Settings picks One, Two, Three, or a **Mix** with three
  percentages that always add up to 100. Words the player hasn't spelled right
  yet come up first. Typing ignores capitals, spaces and accents, and the list's
  alternate spellings count.
- **Avatar.** A rounded 3D character built from primitives (`js/avatar.js`).
  The player chooses skin, eyes, smile, glasses (5 styles, 14 frame colours with greens first, clear or tinted lenses), 9 hair styles, hair colour,
  top, bottoms and shoes. 53 treasures (hats, eyewear, items held in the hand,
  backs, badges, pets, shoes; clothes, fun, science, math, magic) attach to the
  avatar.
- **The castle.** Every arrival turns the sky to a random twilight and plays a
  combination of three effects not used in recent celebrations. The effects
  are fireworks (sphere, ring, heart or star bursts), confetti, a rainbow, sky
  lanterns, balloons, a sparkle spiral, a tower light show, shooting stars, an
  aurora, and a star shower. A fanfare plays in a random key and melody. The
  player then picks 1 of 3 treasures, from different categories when possible.

## Files

| File | What it does |
| --- | --- |
| `index.html` | All screens and styles |
| `js/color.js` | Colours are written as sRGB and converted to linear (the renderer outputs sRGB with ACES tone mapping) |
| `js/words.js` | The word list, tiers, alternates, `spellMatch` |
| `js/speak.js` | Word audio (Wiktionary recordings with a text-to-speech fallback) and definitions with the word blanked out |
| `js/audio.js` | Synthesised sounds: chuff, whistle, brakes, chimes, fanfares |
| `js/avatar.js` | Avatar builder, poses and animations, the item catalogue, item thumbnails |
| `js/world.js` | Valley generation, track, train, castle, camera, word stops |
| `js/effects.js` | Castle celebrations |
| `js/game.js` | Profiles, menu, ride, questions, rewards, avatar editor, settings |

Three.js r128 is loaded from cdnjs. There's no build step. Players are saved in
the browser's `localStorage` (one profile per name, per device).

Run it locally with `python3 -m http.server 7863`.
For testing, `window.__sbe` exposes the current player, ride and question.
