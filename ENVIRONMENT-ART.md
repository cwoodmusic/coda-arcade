# Empty arcade background and independent props

The main arcade's refreshed environment uses `scenery: "environment-v1"` in a
world-project export. `assets/environment/v1/empty-arcade.png` is a complete
1672 × 941 empty-room image. Floors, carpet, masonry, trim, doorways and fixed
wall signs are finished behind movable furniture, plants, counters and cabinets.
Moving or hiding a prop reveals this image rather than a repeated floor sample.

`environment-art.js` loads the backdrop and clean transparent prop images. It
retains the source dimensions and identities of 36 furniture, plant and bollard
pieces. The lounge keeps its large curved couch and its existing placement.
Counter, mirror and DJ-console props share the new visual style. The four
speaker stacks are independent image assets in the published project. Cabinet
and disco-ball art continues to use its existing isolated sources, so game
screens, lights and interactions remain connected.

The renderer uses the empty backdrop as the base and draws props separately in
depth order. Structural foreground pieces are cut from the finished architecture;
old annotated masks and clone patches are not layered onto the refreshed scene.
Additional defaults are a movable four-head DJ floodlight rig and a large rectangle rug in front of the Notes shop. The other 47 library images stay unplaced until added. Their source art and reproducible extraction are in `assets/decor/` and `scripts/build-decor-props.cjs`; rug extraction uses `scripts/build-rug-props.cjs`. NPC appearance, accessories, accounts and game progress are separate systems.

## Cosmic floor palette

The exposed main floor, connecting walkways and nightclub perimeter use a dark
teal and charcoal starfield with warm gold, coral and emerald details. The old
isolated neon reflection splotches are removed. The lounge carpet, dance-tile
geometry, walls, signs, doorways, object placements and collision stay intact.

The image-generated palette source is `assets/environment/source/cosmic-floor.png`.
The original backdrop is retained as `source/empty-arcade-before-cosmic.png` in
that same environment directory. Rebuild the scoped composite from the repository
root with `node scripts/build-cosmic-floor.cjs`. Its reviewed floor masks are in
`scripts/cosmic-floor-regions.json`; pixels outside those masks are preserved
exactly. The builder removes only floor pixels from the published background
repair journal so old blue paint cannot cover the new floor. The authored wall-top repair keeps its exact pixel coverage and transparency,
with its old blue paint recolored from the same cosmic material. Other structural
repairs and every non-artwork project field remain unchanged.

The measured dance tiles cycle through a wider neon palette and brighten under
grounded footsteps. Color animation pauses with Motion Off, reduced motion or
FX Off; footstep feedback stays available.

## Projects and compatibility

New browsers load the refreshed published project. Its object placements,
collision overrides and room projects are retained from the previous export.
Its old main-world brush strokes and pixel repairs are retired because they
refer to the previous artwork. The complete pre-refresh export, including all
793 main-world strokes and pixel repairs, is preserved in
`assets/environment/legacy-world-project.json`.

Existing local projects and imports without a `scenery` field continue to use
their original artwork and edits. No automatic migration overwrites them. To
switch an existing editor workspace, export a backup, then use **Project →
Reset project**. Undo can restore the previous project. Exported refreshed
projects retain their scenery revision through import, save and reload.

## Source art and rebuilding sprites

The approved transparent source sheets are retained in
`assets/environment/source/`. The finished empty-room PNG is retained separately.
Run from the repository root:

```sh
node scripts/build-environment-props.cjs
```

This uses the installed Chromium to slice the source sheets into separate PNGs,
keeping original RGBA pixels inside each crop. It does not regenerate the art.
`assets/environment/v1/sprite-sources.json` records the source cells and crops.
The runtime fits sprites into the existing source canvases without changing
their aspect ratios or clipping their silhouettes.

Checks:

```sh
node --test tests/environment-art.test.cjs
PYTHONDONTWRITEBYTECODE=1 python3 tests/environment-scenery-console-browser.py
PYTHONDONTWRITEBYTECODE=1 python3 tests/environment-world-browser.py
PYTHONDONTWRITEBYTECODE=1 python3 tests/published-world-browser.py
```

The last suite explicitly serves the archived export to retain the previous
world's compatibility checks. The environment suite exercises current defaults.
