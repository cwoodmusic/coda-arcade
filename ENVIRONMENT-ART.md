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

## Glass floor palette and sparse stars

The exposed main floor, connecting walkways and nightclub perimeter use quiet
dark-blue glass. The dense cosmic dust and isolated reflection splotches are
removed. Forty-eight small warm-white and icy-blue stars pulse and gently flicker
behind objects and actors. The lounge carpet, walls, signs, doorways, object
placements and collision stay intact.

The image-generated palette source is `assets/environment/source/glass-floor.png`.
The previous cosmic reference and original backdrop remain in that source
directory. Rebuild the scoped composite from the repository root with
`node scripts/build-cosmic-floor.cjs`. Its reviewed masks are in
`scripts/cosmic-floor-regions.json`; pixels outside those masks are preserved
exactly. Floor repair paint is rebased onto the new material while the authored
wall-top repair keeps its coverage and transparency.

Dance-floor colors advance about once per second with smooth transitions.
Grounded footsteps brighten the tile beneath the player. Color animation and
star pulses pause with Motion Off or reduced motion. FX Off hides stars and
holds the dance-floor palette still, with footstep feedback available.

## Emerald wall and jade counter

The back-wall masonry around the main Coda sign and beside the cyan Piano Lab
entrance is emerald green. The long
shop counter uses jade panels and mint lighting with its original gold trim.
The three existing counter icons use a matching mint/emerald rendering palette;
their stored image data and player artwork remain intact.

The generated sources are `source/green-back-wall.png` and
`source/jade-counter.png` inside `assets/environment/`. Original counter and
backdrop references are retained alongside them. Run
`node scripts/build-green-accents.cjs` to rebuild the scoped palette edit.
The floor builder runs that step automatically, so regenerating glass does not
remove the green accents. Floor, sign and lamp pixels outside the masonry mask
remain unchanged; the counter retains its alpha silhouette and original gold
pixels. No project reset or layout change is needed.

## Saved floor-paint compatibility

Older environment-v1 editor projects may contain painted blue floor repairs
that cover the newer glass backdrop. `floor-palette-compat.js` resolves only
known old RGBA pixels at their recorded positions, for both the base background
and structural fragments. It preserves local project JSON, object placement,
collision, transparent object erasures and custom paint with different colors.
The saved project does not need a Reset. Legacy scenery without environment-v1
keeps its original rendering.

`scripts/build-floor-palette-compat.cjs` rebuilds the compatibility manifest from
its retained old-color rules and the current published background journal. Run
it after the floor builder, then use `--check` to verify reproducibility. The
reviewed native floor mask and repair-color predicate retain lamps and wall
trim rather than painting the entire bounding rectangle as floor.

## Walkway joins and lamp cleanup

The boutique-to-nightclub walkway is a continuous glass surface with clean
wall-cap joins. The generated cleanup removes the old flat repair band, blue
stub and clipped divider-lamp glow within a narrow reviewed mask. The lamp and
wall stay in their existing positions.

`source/walkway-cleanup.png` is composited only through
`scripts/walkway-cleanup-regions.json` by `scripts/build-walkway-cleanup.cjs`.
This runs after the floor and green accents. The cleaned native artwork owns
that mask, so the builder removes only overlapping published background-journal
pixels. It retains all edits outside the mask, object erasures and layout data.
Regenerate `scripts/build-floor-palette-compat.cjs` afterward; historical floor
pigments then reveal the cleaned source in existing local projects too.

## Reshaped boutique path

The current path follows the newer editor export: the west wall segment and
dance-floor disco ball remain hidden, and its six collision edits are retained.
The 10,543 transparent background pixels defining the removed area reveal a
scoped glass underlay. Foreground fragments keep those same pixels transparent,
so the removed wall cannot cover actors on the new floor. The opaque authored
outline, saved JSON and custom paint remain intact. Nightclub ambience is
clipped below the refreshed north wall, so its former lighting boundary cannot
paint a rectangular haze band across this new walkway.

`assets/environment/boutique-pathway-shape.json` records the reviewed row masks.
`pathway-floor-fill.js` samples approved glass from the empty main-floor artwork
and draws it behind the background composition. Both the floor repair pass and
walkway cleanup protect the newer authored pixels, preserving the reshaped path
on repeated builds instead of restoring the earlier diagonal.

## Rectangular boutique lamp wall

The later rectangular-wall edit replaces the boutique's diagonal lantern return
with a flat wall and continuous glass below it. Its generated source is
`source/boutique-rectangle.png`; `scripts/boutique-rectangle-regions.json` limits
ownership to the reviewed wall and floor. `build-boutique-rectangle.cjs` runs
after the older floor, green and walkway passes so those earlier sources cannot
restore the diagonal. Only background journal pixels inside this newer mask
are removed. Exact legacy journal colors are mapped to the current artwork at
render time; imported project data and stored backups remain unchanged.

The dance-room corner is also a south-facing rectangle: its top and bottom
end at the same vertical edge, and both music plaques face forward. The final
`build-stage-wall.cjs` pass owns only `scripts/stage-wall-regions.json`; that
mask explicitly protects the painted dance tiles. The removed return wall
reveals glass around the existing sofa and cactus. Published collision follows
the new walls and open floor, and refreshed-scene lamp anchors follow the new
artwork while the original scene retains its original anchors.
The stage source is normalized from its declared 1671×941 size with nearest
sampling. Reflection edges blend only over existing glass beyond the removed
masonry, using the saved pre-edit plate so repeated builds do not accumulate
the blend.

## DJ stage lighting

The four-head rig above DJ Coda projects colored beams and soft pools of light
onto the dance floor. Beam origins follow the visible lamps when the rig is
moved, resized, rotated or flipped. The published rig uses a 280-pixel throw and
75% intensity; its existing editor controls still adjust these values. Light is
composited above the tile-color animation and below props and characters, with
matching light in the foreground-brush source. Hiding or disabling the rig,
setting its opacity/intensity to zero, or choosing FX Off removes its light.
Motion Off and reduced motion hold the colors and beam directions steady.

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
