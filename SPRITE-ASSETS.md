# Original-atlas character assets

Every active player, musician, outfit, hairstyle, shoe, hat, glasses, and accessory layer is derived from the unchanged `coda_arcade_phase73_characters.png`. The manifest declares `sourcePolicy: original-atlas-only`, and all 38 layer descriptors declare `source: original-atlas`. Characters share the original head, face, shading language, and compact 53-pixel world template. Variants use source-pixel extraction, cloning, reshaping, and recoloring; different costumes are not claimed to be byte-identical to the hero.

## Exact original player

The canonical default and the boutique's **Original arcade look** preset use a direct original-atlas draw path for idle and walking. It reproduces the legacy renderer:

- Character height is **53 world pixels**.
- Width is `min(39, 53 × sourceWidth / sourceHeight)`, with the original destination-size and position rounding.
- Sampling uses nearest neighbor, with no added character shadow or cosmetic tint on this path.
- The original five walk images are reused across six timing slots as `[0, 1, 2, 3, 4, 1]`.

The original atlas remains immutable. `tests/original-sprite-browser.py` draws the canonical avatar onto an isolated canvas and compares its full RGBA output against the legacy formula. All four idle facings and the walk timing slots require **zero differing channels**. Separate world lighting and labels are outside that comparison. Custom costumes are not claimed to be pixel-identical to the original hero.

Canonical emotes remain available. `original-hero.png`, registered as the optional `original/hero` manifest layer, supplies action frames by reusing complete original poses and pixel-aligned motion. Whole sprites preserve the face, shirt, and hands; no arm-shaped rectangle is erased from a finished character. They are distinct action poses, not part of the idle/walk exact-pixel guarantee.

## One active source atlas

| Source or helper | Use |
| --- | --- |
| `coda_arcade_phase73_characters.png` | The only artwork input: hero poses, original visitor hair and eyewear, garments, footwear, and small prop source pieces |
| `scripts/original-sprite-layers.cjs` | Extracts hair and cap pixels, fits the shared head template, protects face openings, and derives six RGB shading samples from the original atlas |
| `scripts/original-wardrobe-layers.cjs` | Builds six outfits and five shoe styles from all five original source poses, retaining the original body and stride positions |
| `scripts/original-accessory-layers.cjs` | Builds hats, glasses, and props from the original cap, emblem, gloves, and visitor glasses using pixel cloning and recoloring |

The six earlier generated plates in `assets/characters/source/`—`body-poses.png`, `hair.png`, `outfits.png`, `headwear.png`, `accessories.png`, and `shoes-props.png`—are retained only as history. **The current baker never reads them.** Its artwork endpoint serves only the immutable original atlas; generated outputs use a separate write endpoint.

Historical musician depictions and imagined dialogue do not imply endorsement or establish rights clearance; see [MUSICIANS.md](MUSICIANS.md).

## Sheet layout and animation

`assets/characters/manifest.json` records cell size, foot anchor, original source rectangles, clip offsets, layer files, and frame attachment offsets. Deploy the manifest and generated PNGs together with the original atlas.

- Cell size: **80 × 96 pixels**; foot anchor: **[40, 88]**. Transparent padding does not enlarge the visible world character.
- Facing order: **down, left, up, right**.
- Animated sheets: **112 cells** in 8 columns, with 28 frames per facing.
- Directional cosmetic sheets: four cells, with animation attachment offsets supplied by the shared rig.

| Clip | Offset within each facing | Frames | Playback rate |
| --- | ---: | ---: | ---: |
| Idle | 0 | 2 | 2 fps |
| Walk | 2 | 6 | 8 fps |
| Wave | 8 | 4 | 8 fps |
| Dance | 12 | 6 | 8 fps |
| Interact | 18 | 4 | 6 fps |
| Talk | 22 | 4 | 6 fps |
| Sit | 26 | 2 | 2 fps |

Body, outfit, shoe, and original-action sheets use animated cells. Hair, headwear, eyewear, and accessories use directional cells. The renderer composites customized characters from those original-derived layers and applies material tints. All variants use the same face aperture and body scale rather than switching to separately generated characters. Hats, glasses, and another accessory can be worn together. Upper clothing (`shirt`) and lower clothing (`lowerColor`) have independent tint channels, alongside skin and hair colors.

`sprite-animation.js` selects frames from actual walking phase, activity, and emote state. Spin cycles facings; robot and disco reuse the available action clips. Reduced motion selects quiet poses while gameplay movement continues. The boutique preview alone requests a **1.5× display scale**; the world retains the small original character size and gameplay foot position.

## Rebuilding

Use Node.js and Chromium. The prepared cloud environment provides Node 24 and Chromium at `/usr/bin/chromium`; the baker uses Node's built-in `fetch` and `WebSocket`. No npm dependencies, image-generation request, or credentials are needed to rebuild from the checked-in artwork.

From the repository root:

```sh
node scripts/build-character-sprites.cjs
```

The baker starts a temporary loopback server and headless Chromium, reads only the immutable original atlas, invokes the three extraction helpers above, and writes the layer PNGs, `original-hero.png`, and `manifest.json` into `assets/characters/`. It closes Chromium and removes the temporary browser profile afterward. Rebuilding intentionally replaces generated artifacts; keep source changes, extraction helpers, and rebuilt outputs together for review.

Original atlas rectangles and source-pose mappings are explicit. Shared placement and per-pose fitting keep hair, clothes, shoes, and hand props aligned across facings and gestures. Preserve the original face core and the per-facing legacy sampling rules when changing the canonical path.

Treat PNG layouts, manifest offsets, facing order, and runtime animation definitions as one format. Changing that format requires updating the baker, renderer expectations, and tests together. The `unified-17` art revision versions the manifest and every loaded PNG URL so returning browsers fetch a matching set. Custom loaders can supply `artVersion`, or set it to `false` to disable revision queries; existing explicit URL versions are preserved.

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
```

Browser checks require Python Playwright and Chromium. They cover asset loading, direction and movement, aligned layered cosmetics, draft cancellation, saved reloads, separate clothing colors, and player/NPC outfit isolation. The original-sprite suite additionally proves exact canonical idle/walk pixels, checks complete original action poses for cutout holes, and verifies that enlarged previews preserve the foot anchor.

The unified-sprite suite additionally compares the exposed front-facing original face core with zero RGBA differences across all 48 hairstyle/outfit combinations and all nine musicians at a matching skin color, without hats or facial wearables. It checks compact proportions, the original-only provenance declarations and loaded assets, and that the bald back view contains no inherited blue hair. These targeted guarantees supplement the canonical whole-sprite checks; they do not imply identical pixels across different clothes or chosen colors.
