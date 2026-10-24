# Connected-world developer console

The editor lives in `world-preview.html`. The original `index.html` arcade and Song Machine are separate pages. Serve the repository with a static web server, for example:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `world-preview.html` from that server in your browser. Use the **Developer** button, **F2**, or **Shift+A** to open the editor. It edits scene data through controls; it does not evaluate JavaScript or require browser developer tools.

**C** opens Collision from gameplay or switches to it from another editor tab or playtest. **Shift+L** opens Layers the same way. These shortcuts leave text entry and browser modifier shortcuts alone. Opening the editor ends an active NPC conversation so map painting can receive pointer input. Fullscreen includes the map and its editor controls. On portrait phones, the console appears below the map; scroll between the tools and the canvas to paint without the panel covering the artwork.

For the live musician cast, conversations, and avatar customization, see [MUSICIANS.md](MUSICIANS.md). NPC routes use the same editable collision map and follow moved cabinet approach points.

## Objects

Choose a named object from **Existing world objects**, then click **Edit existing object**. You can also click its visible pixels on the map. **Lift a region** lets you select artwork outside the named catalog.

The list starts with **Disco balls** (Arcade and Dance floor) and **Arcade cabinets** (Pitch Race, Music Triad, Rhythm Room, and Song Machine). Moving or resizing a disco ball carries its animated sphere and projected rays; its spin speed and rays checkbox appear in the artwork controls. Hiding a ball hides its live effects. The global FX control still sets the overall effect quality.

Cabinet play prompts, NPC approach points, animated screens, and collision footprints follow the edited cabinet. Hiding an original cabinet removes its prompt; **Restore original** restores its original location and interaction. Duplicates are decorative copies and do not create additional game portals.

- Drag an object to move it. Drag its gold corner to resize or its round handle to rotate. Numeric fields provide precise position, size, rotation, and opacity.
- Use **Lock aspect** to preserve proportions, **Lock** to prevent canvas dragging, and **Visible** to hide artwork. Arrows nudge the selected object; Shift increases the nudge distance. Shift-drag bypasses the snap grid.
- **Add image(s)** uploads artwork. **Replace image** changes a selected object's appearance while retaining placement. **Duplicate** creates an independent copy.
- Choose **Background / behind actors**, **Actor depth / Y-sort**, or **Foreground / above actors** to control draw order. Actor-depth objects sort relative to the player's feet.
- **Restore original** removes an original object's edits and reveals its published artwork again. Deleting an edited original hides it while retaining its source cleanup; deleting a newly placed object removes it.

The room art is a flattened PNG: the original pixels beneath furniture and plants are unavailable. Moving or hiding an existing object covers its old silhouette with a tiled floor clone. Adjust **Floor sample X/Y**, or use **Pick floor sample on map**, to choose a clean patch matching that part of the room. This is an editable cleanup patch, not automatic recovery of hidden artwork. A lifted rectangular region includes all pixels inside that rectangle.

The room now uses a cleaned background and foreground atlas with all 33 painted people removed. Reconstructed cabinet fronts no longer have customer-shaped holes. The live player and NPC sprites remain separate and active. Existing painted light rays and halos outside a disco ball’s silhouette are still part of the room art; the movable live effects are separate. Previously embedded custom image copies are preserved as user artwork.

## Collision

Open the **Collision** tab, or press **C** from gameplay. Drag to paint **Block walking**, **Allow walking**, or **Restore original** with a 1, 3, or 5-cell brush. Cells are 10 world pixels across. Green cells allow walking; red cells block it. Outlined cells contain explicit overrides. These changes affect player movement and NPC pathfinding, including the original architectural walls.

The displayed cell grid is the shared authority for walking and pathfinding. Original room geometry generates its initial values; additional invisible geometry checks do not override the cells during play. Select **Playtest** after painting to walk the edited map, or close the console with **F2**. Editing mode pauses character movement.

Route smoothing checks every crossed collision cell and prevents shortcuts through blocked corners. This keeps NPCs from receiving a route that appears clear at widely spaced sample points but catches their walking position on a red-cell corner.

Object art and collision are separate. For an edited original, **Open collision at original position** releases its old rectangular source area. Enable **Solid collision footprint** to add a footprint that follows the object's position, size, and rotation; its left/top/width/height fields use percentages of the object's dimensions. Explicit collision paint takes priority over object footprints and released source areas. Restore removes painted overrides and returns those cells to the original map.

## Foreground and background masks

Open **Layers**, or press **Shift+L**. **Paint foreground** promotes pixels from the existing room artwork to an occluding layer. **Send to background / erase mask** removes foreground coverage while retaining the room art beneath actors. Adjust brush size and depth offset; **Show foreground masks** helps inspect coverage. Use object layer controls when changing the depth of a moved or newly added object.

Erasing foreground also works on lifted original objects and their animated screens or disco spheres: erased pixels render behind characters, while the rest retains the object's selected layer. Brush strokes stay at their world coordinates. Moving, resizing, or rotating an object recomputes its intersection with those strokes; the resulting split follows the object's animation.

Layer painting changes occlusion, not walking collision. Painting existing room pixels also does not create or redraw an object; use Objects for that.

## Playtest, undo, and saving

**Playtest** resumes normal WASD/arrow movement and click-to-walk with editor overlays hidden. Click **Stop playtest** to resume editing. Zoom with the wheel or +/− up to **800%** for detail work; reset with 0. Wheel zoom keeps the point under the cursor in place when map bounds allow it. Playtest and closing the console return to the 300% gameplay limit. Right-drag pans the editor when zoomed. Use the ⇄ button to dock the console on the other side when it covers artwork.

Undo and redo apply to complete project edits, including objects, collision, and layer strokes. Use the buttons, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, or Ctrl/Cmd+Y. Escape cancels a pending selection or closes the console.

Edits save locally in this browser and origin. The Project tab's **Save project** reports storage success or failure. **Export project JSON** backs up the whole project, including embedded uploaded images, source cleanup patches, collision overrides, and local foreground strokes. **Import project JSON** validates a backup before replacing the current project and can be undone. **Reset project** replaces the current layout with the shared published layout and saves that copy locally; it can also be undone. Individual object and collision **Restore original** tools still return to the underlying original artwork or collision cells.

Fresh browsers load `published-world-project.json` as the shared default. The checked-in file uses the latest supplied version-1 export, including 8 lifted objects, 1,085 collision overrides, and 99 foreground strokes. The dance-passage plant is hidden with a cleanup silhouette covering its leaves, trunk, and pot. Its floor repair preserves the corridor's horizontal grid rows and adjoining wall. The other seven objects and all uploaded collision and layer edits are preserved; the corridor's existing green cells already permit NPC passage, while the neighboring red wall cells remain solid.

Valid local projects, including deliberately empty projects, take priority; legacy local asset, collision, and layer edits are also preserved. Use **Project → Reset project** to replace those local edits with the current published layout. Merely visiting the world does not save a local override, so browsers without local edits receive later published updates. Movement waits for the layout to finish loading. If the shared file fails to load or validate, existing local edits remain intact and the editor reports the failure.

Export before switching browsers, clearing site data, or moving to another server origin. Browser storage is not a shared project database. The editor does not write source files, commit changes, update Firebase rules, or publish a live site. To publish a new shared default, replace `published-world-project.json` with a validated complete project export and deploy the site. Other browser sessions can import the export directly. The original PNG files remain unchanged.

Image uploads support PNG, JPEG, WebP, GIF, and APNG up to 8 MB each and 8192 × 8192 pixels. Sprite-sheet controls provide explicit animation frames; GIF/APNG animation depends on browser support. Projects allow up to 200 placed/edited objects and 1,000 local layer strokes. Imported project files are limited to 70 MB. Browser storage quotas may be lower, so keep JSON backups.

## Verification

From the repository root:

```sh
node --test tests/collision-editor.test.cjs
node --test tests/world-object-runtime.test.cjs
python3 tests/clean-world-art.py
python3 tests/developer-console-browser.py
python3 tests/published-world-browser.py
python3 tests/collision-integration-browser.py
python3 tests/dance-passage-browser.py
python3 tests/world-features-browser.py
```

The collision tests exercise override restoration, atomic rejection of invalid imports, and coordinate-aware interpolated pointer strokes. The browser runner requires Python Playwright and Chromium, starts its own temporary local server, and exercises the editor through its UI in disposable browser contexts. Existing local projects are preserved.

The published-world checks cover the exact shared export, local-save priority, Reset and undo, loading and failure handling, cabinet reachability, and lifted-object erasures, including transformed masks and actual character occlusion.

The collision integration checks compare walkability with every displayed cell, test a restored cell at a former hidden wall edge, and exercise real walking and click navigation against painted walls, opening cells and reloading saves, editor shortcuts, conversations, fullscreen controls, and portrait phone map access.

The dance-passage checks pin the uploaded object, collision, and layer data outside the authorized plant removal, preserve neighboring solid walls, and exercise the production NPC movement code through the former plant footprint in both directions.

The art checks require Pillow and verify that pixels outside the 33 repair regions are unchanged and that foreground atlas coordinates and alpha masks remain stable. To rebuild art from a new image-generated empty-room plate, run `node scripts/build-clean-world.cjs /path/to/empty-room-plate.png`. The plate must be exactly 1672 × 941. This uses Chromium to align repaired areas to surrounding pixels, feather their seams, and update only the affected foreground texels. The original images and live character atlas are retained.
