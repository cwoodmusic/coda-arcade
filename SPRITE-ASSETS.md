# Raster character assets

The connected-world player and musician NPCs share a layered raster sprite system. Runtime drawing selects and composites transparent PNG cells; it does not construct character bodies from rectangles, circles, or vector paths. Cosmetic tinting retains the shading and outlines from the source artwork. The active art follows the original `coda_arcade_phase73_characters.png` reference: large heads, compact bodies, short legs, bold dark outlines, and bright pixel shading. The original sheet is preserved.

The original image-generated source plates are checked into `assets/characters/source/`:

| Source plate | Contents |
| --- | --- |
| `body-poses.png` | Four-direction body poses used to build animation frames |
| `hair.png` | Directional hairstyle variants |
| `outfits.png` | Shirts, pants, shorts, dresses, overalls, suits, and coats |
| `headwear.png` | Hats, headwraps, and headphones |
| `accessories.png` | Eyewear and small wearable accessories |
| `shoes-props.png` | Shoes, microphone, trumpet, and additional headphones |

These source images are original generated art for the prototype, not a third-party sprite-pack download. Historical musician depictions and imagined dialogue do not imply endorsement or establish rights clearance; see [MUSICIANS.md](MUSICIANS.md).

## Sheet layout and layers

`assets/characters/manifest.json` records cell size, foot anchor, direction order, clip offsets, layer files, and frame attachment offsets. Keep the manifest and generated PNGs together when deploying the static site.

- Cell size: **80 × 96 pixels**; shared foot anchor: **[40, 88]**.
- Facing order: **down, left, up, right**.
- Animated sheets: **112 cells**, arranged in 8 columns, with 28 animation frames per facing.
- Directional cosmetic sheets: four cells, with attachment offsets supplied by the selected animation frame.

| Clip | Offset within each facing | Frames | Playback rate |
| --- | ---: | ---: | ---: |
| Idle | 0 | 2 | 2 fps |
| Walk | 2 | 6 | 8 fps |
| Wave | 8 | 4 | 8 fps |
| Dance | 12 | 6 | 8 fps |
| Interact | 18 | 4 | 6 fps |
| Talk | 22 | 4 | 6 fps |
| Sit | 26 | 2 | 2 fps |

Body, outfit, and shoe sheets use animated cells. Hair, headwear, eyewear, and accessories use directional cells aligned to the shared rig. The renderer composites the body, clothing, shoes, hair, hat, accessory, and glasses in a fixed order. Headwear, eyewear, and accessory are independent selections, so a hat, glasses, and another accessory can appear together. Supported descriptors can also provide a back layer.

The baker extracts raster art from the source plates, removes plate backgrounds, fits pieces to the rig, and assembles the clip frames. It detects actual opaque row and column bands; generated sheets have uneven gutters, so dividing the image into equal rectangles would clip shoes and mix neighboring outfits. It reuses authored poses with pixel transforms where appropriate. The runtime uses those baked frames, rather than generating new poses or artwork. `sprite-animation.js` selects frames from actual walking phase, idle time, activity, and emote state. The spin emote cycles facings; robot and disco emotes reuse the appropriate authored clips. Reduced motion selects quiet poses while gameplay movement continues.

## Rebuilding

Use Node.js and Chromium. The prepared cloud environment provides Node 24 and Chromium at `/usr/bin/chromium`; the script uses Node's built-in `fetch` and `WebSocket`. No npm dependencies, image-generation request, or credentials are needed to rebuild the checked-in source plates.

From the repository root:

```sh
node scripts/build-character-sprites.cjs
```

The baker starts a temporary loopback server and headless Chromium, reads `assets/characters/source/*.png`, and writes the generated layer PNGs and `manifest.json` directly into `assets/characters/`. It closes the browser and removes its temporary browser profile afterward. Rebuilding intentionally replaces the generated artifacts; keep source art changes and their rebuilt outputs together for review.

Treat the PNG cells, manifest clip offsets, facing order, and runtime animation definitions as one format. Changing their layout requires updating the baker, renderer expectations, and frame-selection tests together. Existing player and NPC appearance saves contain cosmetic IDs and colors, not copies of the sprite PNGs, so rebuilding the same IDs does not require changing those saves.

## Cosmetics and storage

The player and all musicians use the same frame and layer layout. `character-renderer.js` supplies their default looks and normalizes stored cosmetics. Its `classic-15` art revision versions both the manifest and every PNG URL so returning browsers load the complete matching asset set. Custom asset loaders can supply `artVersion`, or set it to `false` to use unversioned URLs. Upper clothing (`shirt`) and lower clothing (`lowerColor`) have separate tint channels, alongside skin and hair colors. Existing saves using a single accessory slot are migrated into independent headwear and eyewear selections when those fields are absent.

The boutique edits a draft and shows it from all four directions. The player-only **Original arcade look** preset previews the dark-haired, red-and-white-cap look with a red vest, white shirt, blue pants, and sneakers; it requires Save to apply and preserves the player nickname and progress. Saving applies the complete draft; closing, canceling, or changing the target leaves the saved look unchanged. Player appearance remains in `musicArcadeV1`; musician costume overrides are stored under `codaNPCOutfitsV1` by stable cast ID. NPC styling does not rename the musician or alter dialogue, game preferences, collision, or routines. Local browser/origin storage remains separate from account services and from world-editor project JSON.

## Verification

```sh
node --test tests/*.test.cjs
python3 tests/clean-world-art.py
python3 tests/character-sprite-art.py
python3 tests/developer-console-browser.py
python3 tests/sprite-boutique-browser.py
```

The browser commands require Python Playwright and Chromium. Verify that sprite assets load, all facings render, walking frames change with movement, blocked characters stop stepping, and hats/glasses/accessories remain aligned through animation. Wardrobe checks cover draft cancellation, saved reloads, separate upper/lower colors, and isolation between player and NPC outfits. **Q** performs the player's selected emote in the connected world.
