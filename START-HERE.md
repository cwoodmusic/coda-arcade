# Start at the Coda Arcade

`index.html` is the title screen. **Play as guest** opens the connected world;
**Open my profile** opens the student's picture-card screen, and **For teachers**
opens the teacher tools. The classroom buttons never start Google sign-in
automatically. Student profiles use private cards; Google sign-in is for staff.

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
