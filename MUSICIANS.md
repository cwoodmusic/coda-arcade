# Musicians, movement, and wardrobe

The connected world now has nine live visitors: J. S. Bach, Mozart, Beethoven, Clara Schumann, Scott Joplin, Duke Ellington, Ella Fitzgerald, Nina Simone, and Miles Davis. Use **Meet musicians** to see the cast and find a visitor. Walk nearby and press **E** to talk. Conversation choices offer musical background, a practice tip, their current activity, and their preferred arcade game.

These are original, imagined conversations with historically grounded musical facts. They are not quotations, recorded performances, or endorsements by the artists or their estates. Original stylized pixel artwork is drawn by the character renderer. Classroom/noncommercial use is not an automatic rights exemption; publishing and future monetization should receive jurisdiction-specific rights advice. This implementation does not establish publicity, likeness, trademark, or other rights clearance.

Visitors have different activity sequences and favorite games. They play cabinets, relax in the lounge, dance, and explore. Cabinet destinations follow edited cabinet positions; visitors abandon hidden or unreachable game stations. They share the editable walking map, yield to the player and other visitors, and retry blocked routes with a delay. Each cabinet has one NPC reservation at a time. Conversations pause the selected visitor while the rest of the room continues. Opening full panels, playing a cabinet, or editing the world pauses world movement. If an edit blocks a visitor's standing position, they despawn briefly and reenter at an open location rather than crossing the new wall.

Walking direction and animation depend on actual movement, so blocked characters do not keep stepping in place. Feet remain anchored at the gameplay position. The renderer shows idle, walking, playing, dancing, and conversation poses, with distinct historical costumes. Miles carries a trumpet and Ella a microphone. Reduced-motion preferences disable cosmetic movement.

Use **Your avatar**, or visit the boutique, to customize your player. The four-direction preview shows draft choices in idle, walking, or emote poses. **Save my look** applies the choices to the world and saves them in the existing browser profile. Closing the panel leaves the current look unchanged. Existing exploration and game-progress fields are preserved. Press **Q** in the world to use the selected emote.

## Implementation

- `npc-behavior.js` owns the cast metadata, original dialogue, activity state machine, and route scheduling. `CodaMusicianCast` is the roster used by the world, so cast changes have one source of identity.
- `character-renderer.js` owns normalized avatar cosmetics and the independent appearance definitions keyed by cast ID. It draws pixel shapes without changing the original character atlas.
- `musician-ui.js` and `musician-ui.css` provide the roster, conversation choices, and wardrobe preview.
- `world-preview.html` connects the modules to shared navigation, edited cabinet anchors, depth sorting, and profile storage.

These features do not call an AI service, synthesize anyone's voice, or add recordings. Existing account/profile integration remains separate; local guest use needs no credentials.

## Checks

```sh
node --test tests/*.test.cjs
python3 tests/clean-world-art.py
python3 tests/developer-console-browser.py
```

Node tests exercise conversations, route failures, wall-safe movement, crowd yielding, moved cabinets, drawing state, cosmetic normalization, and reduced motion. Browser checks exercise the actual roster, Miles's conversation, selective conversation pause, directional movement, live wardrobe preview, saved cosmetics, and the existing world editor.
