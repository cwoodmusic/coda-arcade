# Musicians, movement, and wardrobe

The connected world has nine live visitors: J. S. Bach, Mozart, Beethoven, Clara Schumann, Scott Joplin, Duke Ellington, Ella Fitzgerald, Nina Simone, and Miles Davis. Use **Meet musicians** to see the cast and find a visitor. Walk nearby and press **E** to talk. Conversation choices offer musical background, a practice tip, their current activity, and their preferred arcade game.

These are original, imagined conversations with historically grounded musical facts, not quotations, recordings, or endorsements. The stylized sprite artwork was image-generated for this classroom prototype. This implementation does not establish likeness, publicity, trademark, or other rights clearance; classroom use is not an automatic exemption.

Visitors retain their identities, preferred games, dialogue, and activity routines when their costumes change. They play cabinets, relax in the lounge, dance, and explore. Cabinet destinations follow edited cabinet positions; visitors abandon hidden or unreachable game stations. They share the editable walking map, yield to the player and other visitors, and retry blocked routes with a delay. Each cabinet has one NPC reservation at a time. Conversations pause the selected visitor while the rest of the room continues. Opening full panels, playing a cabinet, or editing the world pauses world movement. If an edit blocks a visitor's standing position, they briefly despawn and reenter at an open location rather than crossing the new wall.

Characters now use layered **raster PNG sprites**, rather than bodies drawn from geometric shapes at runtime. Their 80 × 96 pixel cells share a foot anchor, four facings, and seven animation clips: idle, walk, wave, dance, interact, talk, and sit. The animated sheets contain 112 frames: 28 per facing. Hats, glasses, and accessories have independent layers so they can be worn together. Walking frames follow actual movement; blocked characters do not keep stepping in place. Reduced-motion preferences suppress cosmetic animation. See [SPRITE-ASSETS.md](SPRITE-ASSETS.md) for the asset layout and build process.

## Using the boutique

Use **Your avatar**, or visit the boutique, to open the wardrobe. The **Customize** selector switches between your player and the nine musicians. You can change hairstyle, outfit, skin and hair colors, separate upper and lower clothing colors, hat, glasses, accessory, shoes, and selected emote. Hats and glasses no longer compete for the accessory slot. Existing player achievement requirements still apply; NPC costume editing offers the available clothing without changing their musical identities.

The four-direction preview shows draft choices in idle, walking, or selected-emote poses. **Save my look** applies player changes to the world and the existing browser profile. **Save NPC look** applies the selected musician's costume. Canceling, closing the panel, or switching targets leaves an unsaved draft unapplied. A musician's name remains fixed.

Player cosmetics remain in the existing `musicArcadeV1` profile, alongside exploration and game progress. NPC costume overrides are stored separately in `codaNPCOutfitsV1`, keyed by stable cast ID. They do not overwrite the player's outfit or change NPC dialogue and routines. These are local browser saves; another browser or origin has separate storage. Existing account integration remains a separate feature.

Press **Q** in the world to perform your selected emote. Musician activities continue to select their own talking, cabinet interaction, sitting, or dancing animations. Default looks keep historical costume cues, including Miles's trumpet and Ella's microphone; boutique edits can change the visual outfit without changing the character's identity.

## Implementation

- `npc-behavior.js` owns cast metadata, original dialogue, activity states, reservations, and route scheduling. `CodaMusicianCast` remains the identity roster.
- `sprite-animation.js` maps facing, movement, activity, emotes, and reduced-motion preferences to frame indices.
- `character-renderer.js` loads `assets/characters/manifest.json`, selects PNG frames, applies cosmetic tints, and composites the layers. It also owns normalized cosmetics and default appearances keyed by cast ID.
- `musician-ui.js` and `musician-ui.css` provide the roster, conversations, and four-direction preview. `boutique-ui.js` and `boutique-ui.css` provide draft wardrobe controls shared by player and NPC targets.
- `world-preview.html` connects navigation, edited cabinet anchors, rendering, boutique targets, and local profile storage.

The game loads the checked-in PNGs as ordinary static assets. Runtime play does not call an image-generation or AI service, synthesize anyone's voice, or add recordings. Local guest play needs no credentials.

## Checks

From the repository root:

```sh
node --test tests/*.test.cjs
python3 tests/clean-world-art.py
python3 tests/character-sprite-art.py
python3 tests/developer-console-browser.py
python3 tests/sprite-boutique-browser.py
```

Node tests cover frame selection, cosmetic normalization, layered rendering, draft wardrobe behavior, and NPC navigation and conversations. The browser suites exercise the clean room, developer console, raster sprite loading, preview and save behavior, player/NPC wardrobe isolation, and movement. They require Python Playwright and Chromium and use disposable browser contexts.
