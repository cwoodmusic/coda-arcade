# Musicians, movement, and wardrobe

The connected world has nine live visitors: J. S. Bach, Mozart, Beethoven, Clara Schumann, Scott Joplin, Duke Ellington, Ella Fitzgerald, Nina Simone, and Miles Davis. Use **Meet musicians** to see the cast and find a visitor. Walk nearby and press **E** to talk. Conversation choices offer musical background, a practice tip, their current activity, and their preferred arcade game.

These are original, imagined conversations with historically grounded musical facts, not quotations, recordings, or endorsements. Bodies and clothing use the redrawn base artwork; modular cosmetics use the existing arcade atlas. This implementation does not establish likeness, publicity, trademark, or other rights clearance; classroom use is not an automatic exemption.

Visitors retain their identities, preferred games, dialogue, and activity routines when their costumes change. They play cabinets, relax in the lounge, dance, and explore. Cabinet destinations follow edited cabinet positions; visitors abandon hidden or unreachable game stations. They share the editable walking map, yield to the player and other visitors, and retry blocked routes with a delay. Each cabinet has one NPC reservation at a time. Conversations pause the selected visitor while the rest of the room continues. Opening full panels, playing a cabinet, or editing the world pauses world movement. If an edit blocks a visitor's standing position, they briefly despawn and reenter at an open location rather than crossing the new wall.

Musicians keep facing their route during brief crowd-avoidance sidesteps. Those sidesteps still advance their walking phase, without flashing a different facing for one frame.

The default player and **Plain base avatar** preset are bald, wear neutral gray clothing, and have no hat, glasses, or accessories. Their complete front, left, back, and right views come from `assets/characters/source/base-avatar-gray.png`, fitted to the compact 53-pixel standing template. The head is drawn without a cap; hair and headwear are separate choices. The former original-face pixel guarantee is replaced by checks against this new source.

Walking and emotes animate connected limbs continuously from that neutral artwork. Body, clothing, and shoes are combined before a limb moves; held instruments share the arm transform. Heads and cosmetic layers stay together rather than swapping source faces. Dress and coat skirts remain continuous while lower feet step. A bounded cache prewarms default player and cast looks to avoid recoloring them every tick.

Players and musicians share the redrawn body and face, six outfits, and five shoe styles. Hair, hats, glasses, and accessories retain original-arcade pixels fitted to the new head. Hats hide the hair crown beneath them and sit above the eyes; back views hide glasses lenses. Gray upper and lower clothing preserve their source shading until explicitly dyed, with independent colors. Shared-face tests reference the redraw across hairstyles, outfits, and musicians rather than claiming fidelity to the old capped character. Musicians retain distinct costumes and identities.

The 80 × 96 cells, foot anchor, four facings, and seven clip names remain: idle, walk, wave, dance, interact, talk, and sit. The legacy 112-cell sheet layout is retained, with 28 cells per facing repeating a neutral template. It does not contain 112 distinct animation poses; the runtime joint rig supplies motion at the display's update rate. Hats, glasses, and accessories remain independent. Walking phase follows actual movement, blocked characters stop stepping, and reduced motion suppresses cosmetic animation. See [SPRITE-ASSETS.md](SPRITE-ASSETS.md) for provenance and rebuilding.

## Using the boutique

Use **Your avatar**, or visit the boutique, to open the wardrobe. The **Customize** selector switches between your player and the nine musicians. You can change hairstyle, outfit, skin and hair colors, separate upper and lower clothing colors, hat, glasses, accessory, shoes, and selected emote. Hats and glasses no longer compete for the accessory slot. Existing player achievement requirements still apply; NPC costume editing offers the available clothing without changing their musical identities.

The four-direction preview shows draft choices in idle, walking, or selected-emote poses. Its 1.5× display scale improves legibility without enlarging world characters. The world backdrop freezes while the wardrobe is open, and its preview continues on its own clock. **Plain base avatar** previews the bald gray base; **Classic cap look** optionally adds modular short hair, cap, and classic clothing colors. Neither applies until Save. **Save my look** applies player changes to the world and browser profile. **Save NPC look** applies the selected musician's costume. Canceling, closing, or switching targets leaves an unsaved draft unapplied. A musician's name remains fixed.

Player cosmetics remain in `musicArcadeV1`, alongside exploration and game progress. Recognizable old system defaults migrate to the plain base while explicit custom hats and costumes are preserved. Earned rewards remain available without automatically equipping a halo. NPC costume overrides stay separately in `codaNPCOutfitsV1`, keyed by cast ID; they do not overwrite the player or change dialogue and routines. These are local browser saves; another browser or origin has separate storage. Existing account integration remains a separate feature.

Press **Q** in the world to perform your selected emote. Musician activities continue to select their own talking, cabinet interaction, sitting, or dancing animations. Default looks keep historical costume cues, including Miles's trumpet and Ella's microphone; boutique edits can change the visual outfit without changing the character's identity.

## Implementation

- `npc-behavior.js` owns cast metadata, original dialogue, activity states, reservations, and route scheduling. `CodaMusicianCast` remains the identity roster.
- `sprite-animation.js` exposes continuous joint geometry and transforms through `CodaSpriteAnimation.rigDefinition()` and `rigPose()`. The legacy frame selector remains compatible.
- `character-renderer.js` reads `motionRig` and the new `baseAvatar` geometry, caches neutral composed looks, and applies connected limb transforms. The redraw uses modular cosmetics throughout, including the optional cap preset. It also owns normalized cosmetics and cast appearances.
- `scripts/redrawn-base-layers.cjs` fits the new four-view source and derives bodies, garments, footwear, dye regions, face windows, and joints. Original sprite/accessory helpers supply hair, headwear, eyewear, and props. `scripts/build-character-sprites.cjs` packages both sources and their metadata into neutral templates.
- `musician-ui.js` and `musician-ui.css` provide the roster, conversations, and four-direction preview. `boutique-ui.js` and `boutique-ui.css` provide draft wardrobe controls shared by player and NPC targets.
- `world-preview.html` connects navigation, edited cabinet anchors, rendering, boutique targets, and local profile storage. It caches glowing note glyphs and renders soft lighting at quarter resolution up to 24 Hz; sharp world characters update at the display rate. Full/Lite/Off FX preferences remain available.

The manifest declares `sourcePolicy: redrawn-base-and-original-cosmetics`; body, garment, footwear, and neutral-player layers declare `source: redrawn-base`, while cosmetics declare `source: original-atlas`. `baseAvatar` records the active source URL, crop frames, neutral colors, and new rig geometry. The six older generated plates remain historical; the new `source/base-avatar-gray.png` is active. The game loads checked-in PNGs as ordinary static assets. Runtime play does not call an image-generation service, synthesize voices, or add recordings. Local guest play needs no credentials. The asset revision is `plain-base-20`.

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

Node tests cover continuous joint motion, legacy selectors, defaults and migration, wardrobe drafts, and NPC behavior. Browser suites compare the base with its actual new source, and exercise bald gray defaults, explicit dyes, modular equipment, connected movement, saved customization, player/NPC isolation, shared face detail, provenance, and the editor. The performance suite checks cached note glyphs, a small lighting surface, and paused backdrops with live previews rather than enforcing device-dependent FPS. One earlier Chromium software-rendering profile improved from roughly 2.3 to 53 fps with Full FX; other devices can differ. Browser tests use Python Playwright, Chromium, and disposable contexts.
