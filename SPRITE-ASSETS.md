# Original-atlas character assets

Every active player, musician, outfit, hairstyle, shoe, hat, glasses, and accessory layer is derived from the unchanged `coda_arcade_phase73_characters.png`. The manifest declares `sourcePolicy: original-atlas-only`, and all 38 layer descriptors declare `source: original-atlas`. Characters share the original head, face, shading language, and compact 53-pixel world template. Variants use source-pixel extraction, cloning, reshaping, and recoloring; different costumes are not claimed to be byte-identical to the hero.

## Original player and stable motion

The canonical default and the boutique's **Original arcade look** preset use a neutral template from `original-hero.png`. The original face, outfit, nearest-neighbor pixel style, and **53-world-pixel** standing height remain. The canonical front-facing idle render preserves the original RGBA pixels. Player and musician animations share the same continuous joint rig.

The source sheet has malformed profile artwork: all five right-facing caps are cut flat at the top, several profile crops contain blue divider lines, and one right-facing walk pose abruptly spreads the legs. The baker removes divider pixels and mirrors the clean left-facing artwork for the right-facing view. It leaves `coda_arcade_phase73_characters.png` unchanged. The compiled output therefore deliberately differs from the old raw profile crops.

A cached neutral body combines skin, outfit, and shoes before connected arms and legs move. Sleeves, hands, trousers, and footwear therefore share one limb transform. Hair, hats, glasses, and decorative accessories follow the character root; held trumpets and microphones use their arm's transform. Dress and coat skirts stay on the torso while only the exposed lower feet animate.

Walking follows continuous distance phase at the display's update rate. Emotes move the same neutral artwork through continuous gestures, without swapping faces or jumping among six baked steps. Idle and reduced motion use exact neutral transforms; spin still turns through the four directions. The renderer prewarms the default player and musician looks in a bounded cache, so ordinary animation does not recolor pixels every tick.

## One active source atlas

| Source or helper | Use |
| --- | --- |
| `coda_arcade_phase73_characters.png` | The only artwork input: hero poses, original visitor hair and eyewear, garments, footwear, and small prop source pieces |
| `scripts/original-sprite-layers.cjs` | Extracts hair and cap pixels, fits the shared head template, protects face openings, and derives six RGB shading samples from the original atlas |
| `scripts/original-wardrobe-layers.cjs` | Extracts six outfits and five shoe styles from original garment and footwear pixels for the shared animation rig |
| `scripts/original-accessory-layers.cjs` | Builds hats, glasses, and props from the original cap, emblem, gloves, and visitor glasses using pixel cloning and recoloring |

The six earlier generated plates in `assets/characters/source/`—`body-poses.png`, `hair.png`, `outfits.png`, `headwear.png`, `accessories.png`, and `shoes-props.png`—are retained only as history. **The current baker never reads them.** Its artwork endpoint serves only the immutable original atlas; generated outputs use a separate write endpoint.

Historical musician depictions and imagined dialogue do not imply endorsement or establish rights clearance; see [MUSICIANS.md](MUSICIANS.md).

## Sheet layout and animation

`assets/characters/manifest.json` records cell size, foot anchor, source rectangles, layer files, and `motionRig`. Deploy the manifest and generated PNGs together with the original atlas.

- Cell size: **80 × 96 pixels**; foot anchor: **[40, 88]**. Transparent padding does not enlarge the visible world character.
- Facing order: **down, left, up, right**.
- Legacy sheet transport: **112 cells** in 8 columns, with 28 per facing. Every cell within a facing repeats its neutral template; these are not 112 distinct animation poses.
- Directional cosmetic sheets: four neutral cells.

The old idle, walk, wave, dance, interact, talk, and sit offsets remain for format compatibility. `CodaSpriteAnimation.sample()` still exposes that selector; `rigDefinition()` supplies joints and masks, and `rigPose()` supplies continuous transforms. The active renderer reads neutral cells when `motionRig.version === 1` and uses those joint transforms for motion.

Body, outfit, shoe, and original-player sheets retain the legacy transport layout; hair, headwear, eyewear, and accessories use directional cells. Material tints and shared face openings remain compatible. Hats, glasses, and another accessory can be worn together. Upper clothing (`shirt`), lower clothing (`lowerColor`), skin, and hair have independent colors. The boutique preview alone requests a **1.5× display scale**; world characters keep their original size and foot position.

## World rendering

Speaker notes reuse cached glowing glyphs. Soft lighting renders to a quarter-resolution surface at up to 24 Hz, while the sharp world and characters render at the display's update rate. Opening a modal freezes its world backdrop; the boutique's live preview keeps its own wall-clock animation. The player's Full/Lite/Off FX preference is preserved.

One prepared Chromium software-rendering profile improved from about **2.3 to 53 fps** with Full FX. This is a local measurement, not a frame-rate guarantee across devices. The regression suite checks rendering work directly rather than enforcing a hardware-dependent FPS threshold.

## Rebuilding

Use Node.js and Chromium. The prepared cloud environment provides Node 24 and Chromium at `/usr/bin/chromium`; the baker uses Node's built-in `fetch` and `WebSocket`. No npm dependencies, image-generation request, or credentials are needed to rebuild from the checked-in artwork.

From the repository root:

```sh
node scripts/build-character-sprites.cjs
```

The baker starts a temporary loopback server and headless Chromium, reads only the immutable original atlas, invokes the three extraction helpers above, and writes the layer PNGs, `original-hero.png`, and `manifest.json` into `assets/characters/`. It closes Chromium and removes the temporary browser profile afterward. Rebuilding intentionally replaces generated artifacts; keep source changes, extraction helpers, and rebuilt outputs together for review.

Original atlas rectangles, mirrored right-facing source, and divider cleanup are explicit. Joint geometry and gestures live in `sprite-animation.js`; the baker produces neutral templates. Keep the original face core, stable standing scale, and shared limb attachments when changing either side.

Treat PNG layouts, manifest offsets, facing order, and runtime rig definitions as one format. Changing that format requires updating the baker, renderer expectations, and tests together. The `continuous-19` art revision versions the manifest and every loaded PNG URL so returning browsers fetch a matching set. Custom loaders can supply `artVersion`, or set it to `false` to disable revision queries; existing explicit URL versions are preserved.

## Boutique and saved looks

The player-only **Original arcade look** preset previews the actual old dark-haired, red-and-white-cap avatar with its original outfit. Save is required to apply it, and the player's nickname and progress are preserved. Customization still offers independent hats, glasses, accessories, hairstyle, outfit, colors, shoes, and emote. **Q** performs the player's selected emote in the world.

The boutique edits a draft shown from four directions. Saving applies it; closing, canceling, or switching targets leaves the saved look unchanged. Player appearance stays in `musicArcadeV1`; musician costume overrides stay in `codaNPCOutfitsV1` under stable cast IDs. The saved cosmetic IDs and color schema remain compatible. NPC costumes keep the original face style without renaming the musician or changing dialogue, preferences, collision, or routines. Local appearance storage remains separate from account services and world-editor project JSON.

## Verification

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

Browser checks require Python Playwright and Chromium. They cover asset loading, directional motion, connected limbs and held props, complete caps, exact frontal idle pixels, preview foot placement, draft cancellation, saved reloads, and player/NPC outfit isolation. Node tests sample continuous joint motion between the old frame boundaries and across cycle wraps. The performance suite checks cached note glyphs, a small soft-light surface, and a frozen modal backdrop alongside a live preview.

The unified-sprite suite additionally compares the exposed front-facing original face core with zero RGBA differences across all 48 hairstyle/outfit combinations and all nine musicians at a matching skin color, without hats or facial wearables. It checks compact proportions, the original-only provenance declarations and loaded assets, and that the bald back view contains no inherited blue hair. These targeted face and provenance guarantees do not imply identical whole-sprite pixels across directions, animation phases, different clothes, or chosen colors.
