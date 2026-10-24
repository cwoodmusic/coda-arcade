# Musicians, movement, and wardrobe

The connected world has nine visitors: J. S. Bach, Mozart, Beethoven, Clara Schumann, Scott Joplin, Duke Ellington, Ella Fitzgerald, Nina Simone, and Miles Davis. **Meet musicians** finds them on the map; walk nearby and press **E** to talk. Conversations offer musical background, a practice tip, their current activity, and preferred games.

These are original, imagined conversations with historically grounded musical facts, not quotations, recordings, or endorsements. The implementation does not establish likeness, publicity, trademark, or other rights clearance.

## Characters

The active characters are the earlier JavaScript-drawn pixel people, restored from before the image-sprite experiments. They draw directly on Canvas and do not depend on generated character PNGs. The plain player base remains bald, in gray clothes, with no automatic hat or accessory. The boutique retains separate hair, skin, upper/lower clothing colors, hats, eyewear, accessories, shoes, and emotes.

Musicians retain distinct costume cues and their fixed identities. Wardrobe overrides affect appearance without renaming them or changing conversations and routines. Player and NPC drawings share four-direction movement and gestures, and reduced-motion preferences suppress cosmetic animation.

## Behavior

Visitors play cabinets, relax, dance, and explore using the editable collision map. Cabinet destinations follow moved cabinets; hidden or unreachable stations are abandoned. Visitors reserve stations, yield to others, and retry blocked routes. Brief avoidance steps keep their route-facing direction. Conversations pause the selected visitor while the rest of the room continues. Full panels, cabinets, and world editing pause movement. Visitors blocked by a new edit briefly despawn before safe reentry.

## Boutique and saving

**Your avatar** or the boutique opens the wardrobe. **Customize** switches between the player and the nine musicians. The four-direction preview shows draft choices in idle, walking, or selected-emote poses. **Plain base avatar** restores the bald gray draft; **Classic cap look** is optional. **Save my look** or **Save NPC look** applies it. Canceling, closing, or switching targets leaves the saved look intact. Names and gameplay progress are preserved.

Player cosmetics stay in `musicArcadeV1`; musician overrides stay in `codaNPCOutfitsV1`, keyed by cast ID. Explicit equipment remains equipped, while recognizable older automatic defaults migrate to the plain base. Unlocks do not automatically equip rewards. Local saves remain separate from account services and world-editor exports.

Press **Q** for the selected player emote. Musicians choose their own gestures through talking, cabinet play, sitting, and dancing activities. Miles's trumpet and Ella's microphone remain available as accessories.

## Implementation and checks

- `npc-behavior.js` owns cast metadata, dialogue, activity states, reservations, and routing.
- `character-renderer.js` draws the JavaScript characters and owns normalized cosmetic slots, cast appearances, motion, and a bounded palette cache.
- `musician-ui.js` provides conversations, the roster, and live previews; `boutique-ui.js` provides draft controls, presets, and safe default migration.
- `world-preview.html` connects these to movement, cabinets, editing, and storage, while preserving cached lighting and paused modal backdrops.

Image sprites and their build tools are retained but inactive. See [SPRITE-ASSETS.md](SPRITE-ASSETS.md) for the active renderer API and verification commands. Guest play needs no credentials; runtime characters do not call an image-generation or AI service.
