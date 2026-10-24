# Musicians, movement, and wardrobe

The connected world has nine live visitors: J. S. Bach, Mozart, Beethoven, Clara Schumann, Scott Joplin, Duke Ellington, Ella Fitzgerald, Nina Simone, and Miles Davis. Use **Meet musicians** to see the cast and find a visitor. Walk nearby and press **E** to talk. Conversation choices offer musical background, a practice tip, their current activity, and their preferred arcade game.

These are original, imagined conversations with historically grounded musical facts, not quotations, recordings, or endorsements. Every active character and wardrobe layer now comes from the existing arcade atlas. This implementation does not establish likeness, publicity, trademark, or other rights clearance; classroom use is not an automatic exemption.

Visitors retain their identities, preferred games, dialogue, and activity routines when their costumes change. They play cabinets, relax in the lounge, dance, and explore. Cabinet destinations follow edited cabinet positions; visitors abandon hidden or unreachable game stations. They share the editable walking map, yield to the player and other visitors, and retry blocked routes with a delay. Each cabinet has one NPC reservation at a time. Conversations pause the selected visitor while the rest of the room continues. Opening full panels, playing a cabinet, or editing the world pauses world movement. If an edit blocks a visitor's standing position, they briefly despawn and reenter at an open location rather than crossing the new wall.

The default player and **Original arcade look** preset draw the actual hero pixels from the unchanged `coda_arcade_phase73_characters.png` sheet. Idle and walking use the old 53-pixel height, nearest-neighbor sampling, original aspect ratio, 39-pixel width cap, and rounded positioning. Pixel regression tests compare all four facings and the original walk artwork with the legacy draw formula and require zero differing RGBA channels. This exact-match guarantee applies to the canonical player’s idle and walking appearance, not every custom costume or emote.

Customized characters and musicians use the same original-atlas source for body, face, hair, all six outfits, all five shoe styles, hats, glasses, and accessories. Every piece fits the same compact 53-pixel template. The shared head layout preserves the original face opening; extracted hair uses six shading samples from the original artwork. Tests require zero RGBA differences in the exposed front-facing original face core across all 48 hairstyle/outfit combinations and all nine musicians when compared at the same skin color and without face-covering wearables. This proves a shared core and source policy, not that different costumes have identical full-sprite pixels. Musicians retain their distinct costumes and identities.

The 80 × 96 cells, foot anchor, four facings, and seven clips remain: idle, walk, wave, dance, interact, talk, and sit. Animated sheets contain 112 frames, with 28 per facing. Hats, glasses, and accessories remain independent. Walking frames follow actual movement; blocked characters stop stepping. Reduced-motion preferences suppress cosmetic animation. See [SPRITE-ASSETS.md](SPRITE-ASSETS.md) for asset provenance and rebuilding.

## Using the boutique

Use **Your avatar**, or visit the boutique, to open the wardrobe. The **Customize** selector switches between your player and the nine musicians. You can change hairstyle, outfit, skin and hair colors, separate upper and lower clothing colors, hat, glasses, accessory, shoes, and selected emote. Hats and glasses no longer compete for the accessory slot. Existing player achievement requirements still apply; NPC costume editing offers the available clothing without changing their musical identities.

The four-direction preview shows draft choices in idle, walking, or selected-emote poses. Its 1.5× display scale improves preview legibility without enlarging characters in the world. **Original arcade look** previews the player’s classic red-and-white cap and matching outfit without applying it until Save. **Save my look** applies player changes to the world and the existing browser profile. **Save NPC look** applies the selected musician's costume. Canceling, closing the panel, or switching targets leaves an unsaved draft unapplied. A musician's name remains fixed.

Player cosmetics remain in the existing `musicArcadeV1` profile, alongside exploration and game progress. NPC costume overrides are stored separately in `codaNPCOutfitsV1`, keyed by stable cast ID. They do not overwrite the player's outfit or change NPC dialogue and routines. These are local browser saves; another browser or origin has separate storage. Existing account integration remains a separate feature.

Press **Q** in the world to perform your selected emote. Musician activities continue to select their own talking, cabinet interaction, sitting, or dancing animations. Default looks keep historical costume cues, including Miles's trumpet and Ella's microphone; boutique edits can change the visual outfit without changing the character's identity.

## Implementation

- `npc-behavior.js` owns cast metadata, original dialogue, activity states, reservations, and route scheduling. `CodaMusicianCast` remains the identity roster.
- `sprite-animation.js` maps facing, movement, activity, emotes, and reduced-motion preferences to frame indices.
- `character-renderer.js` loads `assets/characters/manifest.json`, draws the original atlas directly for the canonical idle/walk look, and composites extracted layers for custom looks. It also owns normalized cosmetics and default appearances keyed by cast ID.
- `scripts/original-sprite-layers.cjs` fits extracted hair to the shared head, protects face openings, and derives six source RGB shades. `scripts/original-wardrobe-layers.cjs` builds six outfits and five shoe styles from all five original source poses. `scripts/original-accessory-layers.cjs` derives hats, glasses, and props from original caps, emblems, gloves, and visitor eyewear. `scripts/build-character-sprites.cjs` assembles these into the sprite sheets.
- `musician-ui.js` and `musician-ui.css` provide the roster, conversations, and four-direction preview. `boutique-ui.js` and `boutique-ui.css` provide draft wardrobe controls shared by player and NPC targets.
- `world-preview.html` connects navigation, edited cabinet anchors, rendering, boutique targets, and local profile storage.

All 38 active manifest layers declare `source: original-atlas`, and the manifest declares `sourcePolicy: original-atlas-only`. The six earlier generated plates in `assets/characters/source/` remain as history; the current baker never reads them. The game loads the checked-in PNGs as ordinary static assets. Runtime play does not call an image-generation or AI service, synthesize anyone's voice, or add recordings. Local guest play needs no credentials.

## Checks

From the repository root:

```sh
node --test tests/*.test.cjs
python3 tests/clean-world-art.py
python3 tests/character-sprite-art.py
python3 tests/developer-console-browser.py
python3 tests/sprite-boutique-browser.py
python3 tests/original-sprite-browser.py
python3 tests/unified-sprite-browser.py
```

Node tests cover frame selection, cosmetic normalization, layered rendering, draft wardrobe behavior, and NPC navigation and conversations. The browser suites exercise the clean room, developer console, raster sprite loading, preview and save behavior, player/NPC wardrobe isolation, movement, exact canonical sprite pixels, shared faces across every wardrobe combination and musician, the original-only source policy, and a bald back view without inherited hair. They require Python Playwright and Chromium and use disposable browser contexts.
