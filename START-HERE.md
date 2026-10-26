# Start at the Coda Arcade

`index.html` is the title screen. **Play as guest** opens the connected world;
**Open my profile** opens the student's picture-card screen, and **For teachers**
opens the teacher tools. The classroom buttons never start Google sign-in
automatically. Student profiles use private cards; Google sign-in is for staff.
Returning through the title screen in the same tab restores an active teacher
sign-in and rechecks account approval before showing class tools.

For your own teacher player, first use the device with your newest avatar,
level, Notes and achievements. Open **For teachers**, sign in with your approved
Google account, then choose **Save this player to my account** and confirm the
player shown. This first save is explicit; an older device is never adopted
automatically. Later sign-ins open that saved player across devices. If a student
profile is selected, it stays selected until you choose **Open my player**;
student progress is never turned into a teacher's personal save.

When this tab already has a classroom profile, the title screen offers
**Continue profile** and **Change player**. Changing players opens the existing
profile options, where the player can save and leave the device before using a
different card or playing as a guest. The title screen does not reset progress.

The **Motion** setting uses the same saved animation preference as the original
arcade and respects the device's reduced-motion setting. The title screen loads
existing arcade artwork without starting gameplay, music, or Firebase SDKs.

The original arcade remains available at `classic-arcade.html`, linked from the
title screen. In the connected world's **Settings**, **Title screen** returns
to the front door. Direct world links and existing picture-card links still work.
The main game's internal filename is still `world-preview.html`; it serves the
main Coda Arcade, not a separate preview build.

The shared project includes the main arcade and Piano Lab collision and layer
edits. A fresh browser loads those defaults without creating local editor saves,
so later published updates can still arrive. Existing complete-world projects
and standalone room edits keep priority. Explicit project import or reset still
replaces the selected editor data and supports undo.

The main hall, connecting walkways and nightclub approaches now use a smooth
blue floor up to the colored dance tiles. The lounge, colored tiles and room
fixtures keep their original artwork. Neon reflections, sparkles, disco beams
and floor pins remain active; disco projections draw after floor cleanup so
opaque repairs cannot cover their rays. The original tiled world and atlas are
retained. `assets/world/arcade-flat-floor-plate.png` is an image-generated clean
floor without cabinets; moved cabinets reuse its native coordinates.
`scripts/build-flat-floor.cjs` composites that plate only inside the floor masks
in `scripts/flat-floor-regions.json`, preserving fixtures and protected rooms.
Run that optional artwork script only when rebuilding the committed floor PNG;
the static site still needs no build step.
The derived `arcade-flat-floor-foreground.png` removes only the declared floor
fringes from fixture masks. To replace a scoped part of the floor plate, use
`node scripts/build-flat-floor.cjs --update-plate /path/to/generated-floor.png`.
The metadata pins the earlier plate and edit regions so the rest of the approved
floor remains unchanged; patch boundaries blend inside those regions.

Classroom profiles are enabled. An approved administrator signs into **For
teachers**, creates a class, and chooses **Make a new profile card** for each
student, then **Print card**. Use group labels, not student names. If the teacher
panel was open before account approval, sign out of that panel and sign in again.
Guest play is also available.
In **For teachers**, choose a class to browse its profiles. **Find a profile**
searches the generated aliases on the cards; **Previous** and **Next** show
20 profiles at a time in alphabetical order. Keep larger school rosters grouped
by class (up to 200 profiles per class), and keep student names in your existing
school roster rather than entering them in the arcade.
See [Private classroom profiles](README-CLASSROOM-PROFILES.md) for activation,
the allowed progress data, printable cards, and lost-card recovery. The rules
fragment must be merged into a backup of the full live rules before deployment.

For local development, run `python3 -m http.server 8000 --bind 127.0.0.1` from
the repository. This is a static site; no application installation or build
step is required. Browser tests start their own temporary servers.

The custom address **www.coda-arcade.com** is prepared for a Cloudflare Worker
that serves the arcade and its games together. See the
[Cloudflare deployment instructions](deploy/cloudflare/README.md). The existing
GitHub Pages address remains available; do not add a `CNAME` for this setup.
The app and cabinet bridges explicitly support the correctly spelled domain
and keep earlier domain sessions on their own origin. Firebase Authentication
must authorize `www.coda-arcade.com` and `coda-arcade.com`; this is independent
of the Google-account administrator allowlist. A disabled teacher sign-in
button now explains unsupported addresses or missing secure browser features.

For pixel artwork, open **Developer → Pixel editor** in the arcade, or
**Developer → Artwork** in Piano Lab or Fishing Cave. Choose a background,
existing object, placed image, or a character and facing. The same character
edits also appear in the existing **Sprites** tools and keep their animation.
The classroom background is available in the arcade editor's source list.

Use **Full screen** for detail work, then **Zoom** up to 64×. Right-drag or
hold Space and drag to pan. **Pick colour** copies an existing pixel's exact
colour, including transparency; the hex box also accepts `#RRGGBB` or
`#RRGGBBAA`. **Straight line** previews the line while you drag and saves it
when you release. Pencil, fill, eraser, restore, undo, redo, and PNG export
are available in the same editor. Escape returns from fullscreen to the console.

Pixel edits save locally and are included in the complete world-project JSON
export. Existing object placement, collision, layers, and old project exports
remain supported. Export your project to share or publish your edits; editing
in the console does not change the live site's files by itself.

In **Developer → Layers**, **Paint foreground** puts the visible artwork above
characters, including moved/imported assets and pixel edits. **Send to background**
lowers the brushed pixels. Brushes and straight lines use exact world pixels at
any zoom. For intentional depth sorting, choose **Actor depth** and set the
**Depth offset**; existing project strokes keep their original depth settings.
The **Show layers** toggle controls the inspection tint separately from the art.
