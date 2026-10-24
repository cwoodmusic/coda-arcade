# Redrawn base and modular character assets

Characters use a newly drawn bald base in gray clothes, with separate hair, hats, glasses, and accessories. The body, six outfits, and five shoe styles derive from `assets/characters/source/base-avatar-gray.png`; modular cosmetics derive from the unchanged `coda_arcade_phase73_characters.png`. The manifest declares `sourcePolicy: redrawn-base-and-original-cosmetics`. Layer descriptors identify their source as `redrawn-base` or `original-atlas`. All pieces fit the same compact 53-pixel world template.

## Plain base and stable motion

The default player and the boutique's **Plain base avatar** preset are bald, have no headwear or accessories, and wear a gray shirt and trousers with neutral sneakers. Upper and lower neutral colors are `#999ca6` and `#626875`. Gray clothing pixels retain their source shading until an explicit dye changes that region. The **Classic cap look** preset is optional and assembles a cap and hair over this same base; there is no baked-cap rendering shortcut.

The new source contains complete front, left, back, and right views. `scripts/redrawn-base-layers.cjs` extracts each connected figure and fits it to **53 world pixels**. The head is genuinely bald, rather than reconstructed from a cap. Hair and hats fit the new head and eye positions; hats hide the hair crown beneath them, and back views hide glasses lenses. The former original-face pixel guarantees no longer apply to this requested redraw.

A cached neutral body combines skin, outfit, and shoes before connected arms and legs move. Sleeves, hands, trousers, and footwear therefore share one limb transform. Hair, hats, glasses, and decorative accessories follow the character root; held trumpets and microphones use their arm's transform. Dress and coat skirts stay on the torso while only the exposed lower feet animate.

Walking follows continuous distance phase at the display's update rate. Emotes move the same neutral artwork through continuous gestures, without swapping faces or jumping among six baked steps. Idle and reduced motion use exact neutral transforms; spin still turns through the four directions. The renderer prewarms the default player and musician looks in a bounded cache, so ordinary animation does not recolor pixels every tick.

## Artwork and extraction

| Source or helper | Use |
| --- | --- |
| `assets/characters/source/base-avatar-gray.png` | Active redrawn source: four complete bald views in neutral gray clothing |
| `scripts/redrawn-base-layers.cjs` | Fits the new source and derives the body, outfits, footwear, face windows, dye regions, and joint geometry |
| `coda_arcade_phase73_characters.png` | Original source for modular hair, hats, eyewear, and small prop pieces; retained unchanged |
| `scripts/original-sprite-layers.cjs` | Extracts original hair and cap pixels for fitting to the redrawn head |
| `scripts/original-wardrobe-layers.cjs` | Retains legacy source-placement measurements used when fitting original cosmetics; current garments come from the redraw |
| `scripts/original-accessory-layers.cjs` | Builds hats, glasses, and props from the original cap, emblem, gloves, and visitor glasses using pixel cloning and recoloring |

The six earlier generated plates in `assets/characters/source/`—`body-poses.png`, `hair.png`, `outfits.png`, `headwear.png`, `accessories.png`, and `shoes-props.png`—remain historical and are not read by the baker. The new `base-avatar-gray.png` in that directory is an active input. Rebuilding uses the two checked-in source images and a separate output endpoint.

Historical musician depictions and imagined dialogue do not imply endorsement or establish rights clearance; see [MUSICIANS.md](MUSICIANS.md).

## Sheet layout and animation

`assets/characters/manifest.json` records cell size, foot anchor, layer files, and `motionRig`. Its `baseAvatar` section supplies the new source URL, crop frames, head and face windows, neutral colors, dye regions, and per-facing rig geometry. Deploy the manifest and generated PNGs together with both artwork sources.

- Cell size: **80 × 96 pixels**; foot anchor: **[40, 88]**. Transparent padding does not enlarge the visible world character.
- Facing order: **down, left, up, right**.
- Legacy sheet transport: **112 cells** in 8 columns, with 28 per facing. Every cell within a facing repeats its neutral template; these are not 112 distinct animation poses.
- Directional cosmetic sheets: four neutral cells.

The old idle, walk, wave, dance, interact, talk, and sit offsets remain for format compatibility. `CodaSpriteAnimation.sample()` still exposes that selector and `rigPose()` supplies continuous transforms. The active renderer reads neutral cells when `motionRig.version === 1` and uses `baseAvatar.rig` for the new body geometry. `rigDefinition()` remains the legacy geometry fallback.

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

The baker starts a temporary loopback server and headless Chromium, reads the checked-in redraw and original atlas, invokes the extraction helpers, and writes the layer PNGs, `original-hero.png`, and `manifest.json` into `assets/characters/`. Despite its retained filename, `original-hero.png` now contains the redrawn neutral base. The baker closes Chromium and removes the temporary browser profile afterward. Keep source changes, helpers, and rebuilt outputs together for review.

The source crop and fitting rules are explicit. The base helper supplies joint geometry, while `sprite-animation.js` supplies gestures. Keep the redrawn face, standing scale, and shared limb attachments aligned when changing either side.

Treat PNG layouts, manifest offsets, facing order, and runtime rig definitions as one format. Changing that format requires updating the baker, renderer expectations, and tests together. The `plain-base-20` art revision versions the manifest and every loaded PNG URL so returning browsers fetch a matching set. Custom loaders can supply `artVersion`, or set it to `false` to disable revision queries; existing explicit URL versions are preserved.

## Boutique and saved looks

The player-only **Plain base avatar** preset previews the bald gray base. **Classic cap look** optionally previews short hair, a red-and-white cap, and classic clothing colors as separate pieces. Both remain drafts until Save and preserve nickname and progress. Customization offers independent hats, glasses, accessories, hairstyle, outfit, colors, shoes, and emote. **Q** performs the selected emote.

The boutique edits a draft shown from four directions. Saving applies it; closing, canceling, or switching targets leaves the saved look unchanged. Player appearance stays in `musicArcadeV1`; musician costume overrides stay in `codaNPCOutfitsV1` under stable cast IDs. Recognizable old system defaults migrate to the plain base, while explicit custom hats and costumes remain intact. Unlocking a reward does not automatically equip a halo. The saved cosmetic IDs and color schema remain compatible. NPC styling does not rename musicians or change their dialogue, preferences, collision, or routines.

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

Browser checks require Python Playwright and Chromium. They compare the fitted base with the actual new source, and cover bald defaults, neutral grays and explicit dyes, modular hats and glasses, directional motion, connected limbs and props, preview placement, draft cancellation, saved reloads, and player/NPC outfit isolation. Node tests cover migration and continuous joint motion. The performance suite checks cached note glyphs, a small soft-light surface, and a frozen modal backdrop alongside a live preview.

The shared-face checks use the redrawn source as their reference across wardrobe combinations and musicians. Provenance checks distinguish the active redraw from original cosmetics and archived plates. These targeted checks do not claim identical whole-sprite pixels across directions, gestures, clothes, or chosen colors.
