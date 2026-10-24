# Musicians, movement, and wardrobe

The connected world has nine live visitors: J. S. Bach, Mozart, Beethoven, Clara Schumann, Scott Joplin, Duke Ellington, Ella Fitzgerald, Nina Simone, and Miles Davis. Use **Meet musicians** to see the cast and find a visitor. Walk nearby and press **E** to talk. Conversation choices offer musical background, a practice tip, their current activity, and their preferred arcade game.

These are original, imagined conversations with historically grounded musical facts, not quotations, recordings, or endorsements. Every active character and wardrobe layer now comes from the existing arcade atlas. This implementation does not establish likeness, publicity, trademark, or other rights clearance; classroom use is not an automatic exemption.

Visitors retain their identities, preferred games, dialogue, and activity routines when their costumes change. They play cabinets, relax in the lounge, dance, and explore. Cabinet destinations follow edited cabinet positions; visitors abandon hidden or unreachable game stations. They share the editable walking map, yield to the player and other visitors, and retry blocked routes with a delay. Each cabinet has one NPC reservation at a time. Conversations pause the selected visitor while the rest of the room continues. Opening full panels, playing a cabinet, or editing the world pauses world movement. If an edit blocks a visitor's standing position, they briefly despawn and reenter at an open location rather than crossing the new wall.

Musicians keep facing their route during brief crowd-avoidance sidesteps. Those sidesteps still advance their walking phase, without flashing a different facing for one frame.

The default player and **Original arcade look** preset use neutral artwork derived from the unchanged `coda_arcade_phase73_characters.png`. The original face, red-and-white cap, outfit, nearest-neighbor sampling, and compact 53-pixel standing template remain; the frontal idle render preserves the original RGBA pixels. The baker removes profile divider lines and mirrors clean left-facing artwork for the right-facing view because the source's right caps are truncated.

Walking and emotes animate connected limbs continuously from that neutral artwork. Body, clothing, and shoes are combined before a limb moves; held instruments share the arm transform. Heads and cosmetic layers stay together rather than swapping source faces. Dress and coat skirts remain continuous while lower feet step. A bounded cache prewarms default player and cast looks to avoid recoloring them every tick.

Customized characters and musicians use the same original-atlas source for body, face, hair, all six outfits, all five shoe styles, hats, glasses, and accessories. Every piece fits the same compact 53-pixel template. The shared head layout preserves the original face opening; extracted hair uses six shading samples from the original artwork. Tests require zero RGBA differences in the exposed front-facing original face core across all 48 hairstyle/outfit combinations and all nine musicians when compared at the same skin color and without face-covering wearables. This proves a shared core and source policy, not that different costumes have identical full-sprite pixels. Musicians retain their distinct costumes and identities.

The 80 × 96 cells, foot anchor, four facings, and seven clip names remain: idle, walk, wave, dance, interact, talk, and sit. The legacy 112-cell sheet layout is retained, with 28 cells per facing repeating a neutral template. It does not contain 112 distinct animation poses; the runtime joint rig supplies motion at the display's update rate. Hats, glasses, and accessories remain independent. Walking phase follows actual movement, blocked characters stop stepping, and reduced motion suppresses cosmetic animation. See [SPRITE-ASSETS.md](SPRITE-ASSETS.md) for provenance and rebuilding.

## Using the boutique

Use **Your avatar**, or visit the boutique, to open the wardrobe. The **Customize** selector switches between your player and the nine musicians. You can change hairstyle, outfit, skin and hair colors, separate upper and lower clothing colors, hat, glasses, accessory, shoes, and selected emote. Hats and glasses no longer compete for the accessory slot. Existing player achievement requirements still apply; NPC costume editing offers the available clothing without changing their musical identities.

The four-direction preview shows draft choices in idle, walking, or selected-emote poses. Its 1.5× display scale improves legibility without enlarging world characters. The world backdrop freezes while the wardrobe is open, and its preview continues on its own clock. **Original arcade look** previews the player’s classic red-and-white cap and matching outfit without applying it until Save. **Save my look** applies player changes to the world and existing browser profile. **Save NPC look** applies the selected musician's costume. Canceling, closing the panel, or switching targets leaves an unsaved draft unapplied. A musician's name remains fixed.

Player cosmetics remain in the existing `musicArcadeV1` profile, alongside exploration and game progress. NPC costume overrides are stored separately in `codaNPCOutfitsV1`, keyed by stable cast ID. They do not overwrite the player's outfit or change NPC dialogue and routines. These are local browser saves; another browser or origin has separate storage. Existing account integration remains a separate feature.

Press **Q** in the world to perform your selected emote. Musician activities continue to select their own talking, cabinet interaction, sitting, or dancing animations. Default looks keep historical costume cues, including Miles's trumpet and Ella's microphone; boutique edits can change the visual outfit without changing the character's identity.

## Implementation

- `npc-behavior.js` owns cast metadata, original dialogue, activity states, reservations, and route scheduling. `CodaMusicianCast` remains the identity roster.
- `sprite-animation.js` exposes continuous joint geometry and transforms through `CodaSpriteAnimation.rigDefinition()` and `rigPose()`. The legacy frame selector remains compatible.
- `character-renderer.js` loads the manifest's `motionRig`, caches neutral composed looks, and applies connected limb transforms. It also owns normalized cosmetics and default appearances keyed by cast ID.
- `scripts/original-sprite-layers.cjs` fits extracted hair to the shared head, protects face openings, and derives six source RGB shades. `scripts/original-wardrobe-layers.cjs` extracts six outfits and five shoe styles from original garment and footwear pixels. `scripts/original-accessory-layers.cjs` derives hats, glasses, and props from original caps, emblems, gloves, and visitor eyewear. `scripts/build-character-sprites.cjs` cleans profile dividers, mirrors left artwork for the right-facing view, and packages neutral templates.
- `musician-ui.js` and `musician-ui.css` provide the roster, conversations, and four-direction preview. `boutique-ui.js` and `boutique-ui.css` provide draft wardrobe controls shared by player and NPC targets.
- `world-preview.html` connects navigation, edited cabinet anchors, rendering, boutique targets, and local profile storage. It caches glowing note glyphs and renders soft lighting at quarter resolution up to 24 Hz; sharp world characters update at the display rate. Full/Lite/Off FX preferences remain available.

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
python3 tests/world-animation-performance.py
```

Node tests cover continuous joint motion, legacy frame selection, cosmetic normalization, wardrobe drafts, and NPC behavior. Browser suites exercise connected sprites, original frontal idle pixels, saved customization, player/NPC isolation, shared face detail, source provenance, and the world editor. The performance suite verifies cached note glyphs, a small lighting surface, and paused modal backdrops with live previews. It tests rendering work rather than setting a device-dependent FPS threshold. One prepared Chromium software-rendering profile improved from roughly 2.3 to 53 fps with Full FX; other devices can differ. Browser tests require Python Playwright and Chromium and use disposable contexts.
