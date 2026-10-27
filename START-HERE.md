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
To rename an active teacher player, open **Classroom profile → My player →
Change nickname**, or use **For teachers → Your arcade player → Change
nickname**. Save a nickname of 1–40 characters. Only the teacher-owned nickname
metadata changes; game progress and student picture-card aliases stay intact.

When this tab already has a classroom profile, the title screen offers
**Continue profile** and **Change player**. Changing players opens the existing
profile options, where the player can save and leave the device before using a
different card or playing as a guest. The title screen does not reset progress.
Signing out, saving and leaving a classroom profile, or losing an established
login returns to the title screen. Choosing **Play as guest** still opens the
arcade normally. Developer test mode preserves the real tab's login even when
the preview is reloaded; it does not copy authentication into the test player
or require new cookies.

A saved profile opens through a brief loading screen. Profile choices live in
**Settings → Profile options**, or **Profile → Classroom profile**.
Choose **Log out** in Settings or the profile options to save progress, end the
student/teacher session, and return to the title screen. If saving cannot finish,
the game keeps your profile open and offers another try.

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

The pixel editor opens full screen. Use **Exit pixel editor** to return to the
developer console. **Select** drags a pixel rectangle; **Copy** and **Paste**
also support Ctrl/Cmd+C and Ctrl/Cmd+V. Move the paste preview, then click or
press Enter to place it; Escape cancels it. The copied pixels stay available
when switching artwork or rooms, including transparent pixels. **Eyedropper**
samples the exact pixel colour and alpha. Each paste is one undo step.
Use **Zoom** up to 64× for detail work. Right-drag or
hold Space and drag to pan. **Pick colour** copies an existing pixel's exact
colour, including transparency; the hex box also accepts `#RRGGBB` or
`#RRGGBBAA`. **Straight line** previews the line while you drag and saves it
when you release. Pencil, fill, eraser, restore, undo, redo, and PNG export
are available in the same editor. Escape returns from fullscreen to the console.

Pixel edits save locally and are included in the complete world-project JSON
export. Existing object placement, collision, layers, and old project exports
remain supported. Export your project to share or publish your edits; editing
in the console does not change the live site's files by itself.

Player progression now reaches **Level 50**. The original level rewards remain;
levels 13–50 add Notes prizes, with larger milestones at 10, 20, 30, 40 and 50.
The milestone Notes prizes are 1,000, 1,500, 2,500, 4,000 and 6,000 respectively.
Earned level prizes arrive automatically once per player and save with progress.

There are **29 musician quests**. More become available at levels 3, 5, 10, 15
and 20, including Piano Lab melodies and scales, fishing in 6/8, epic and
legendary catches, grand-staff reading and harder Music Triad matches. Accept
a quest before playing; practice fishing does not count. Return to the musician
who gave you the quest to collect its Notes and XP. Your Profile shows active
quests and a preview of the next quest tier.

Open **Settings → Arcade vibe** to choose an earned atmosphere. Level 20 unlocks
**Glowstick**, level 30 **Spooky**, level 40 **Aurora**, and level 50 **Festival**.
The atmosphere also follows you into the Piano Lab, classroom and Fishing Cave.
Your vibe choice stays on this browser, and each player's level controls which
choices are available. The existing effects and reduced-motion settings apply.
Glowsticks have bright white cores, cyan bloom and a pool of light at your feet.
Spooky temporarily dresses musicians, shopkeepers, the DJ and room teachers in
different Halloween costumes, with purple mist, cobwebs and glowing pumpkins.
Switching vibes restores their original outfits. Aurora adds soft, flowing
curtains and stars; Festival adds stronger colourful ribbons and sparkles.
Broad effects use a cached smaller canvas while characters stay sharp.
Foreground plants, sofas, moved objects and painted foreground use the same
colour grade as the background, including translucent edges. Their depth and
pixel edits remain intact; luminous glowsticks and live light effects stay bright.

To try unlockables, open **Developer → Test all unlocks** in the arcade, or the
room's Developer project tools. Test mode opens a temporary Level 50 player with
all customizations, sounds and vibes available, plus test Notes. A visible
**Exit test mode** button returns you to normal play. Test-mode player progress,
purchases and world edits stay in memory and disappear when you leave or reload;
the real player's browser data, editor files and cloud saves are not changed.
Online multiplayer is disabled in this mode. Export any test artwork or world
project you want to keep before exiting.

Chopin now offers all **12 major and 12 natural minor scales**. Each challenge
goes up to the octave and back to the starting note. Guided practice earns
35 Notes once per scale; after its reward saves, **Play scale from memory**
offers 60 Notes once per scale. Memory mode hides the next key and future
notation. The 24-key floor fits every pitch, and the last piano note rings out
as the completion dialogue opens. Panic and leaving the room still stop sound.

In the classroom, ask Haydn for **Major & minor keys**. Eight short interactive
steps use listening examples and note ladders, followed by a five-question quiz.
Passing the saved quiz completes the lesson and awards its 50 XP once. Existing
profiles retain their earlier lesson progress.

Music Triad's **Advanced** selection also applies to **VS CLASSMATE** and
**TOURNAMENT**. Choose rules before creating a room; joining players inherit
the host's selection. Four-character game codes and five-character tournament
codes remain in use. Advanced tournaments support 2–4 players, and every match
keeps the 4×4 board and Advanced rules. Tied boards redeal until a winner.

In **Developer → Layers**, **Paint foreground** puts the visible artwork above
characters, including moved/imported assets and pixel edits. **Send to background**
lowers the brushed pixels. Brushes and straight lines use exact world pixels at
any zoom. For intentional depth sorting, choose **Actor depth** and set the
**Depth offset**; existing project strokes keep their original depth settings.
The **Show layers** toggle controls the inspection tint separately from the art.


Talk to **Professor Haydn** in the classroom to find eight hands-on lessons,
including **Dynamics: loud & soft** and **Tempo: fast & slow**. Each new lesson
uses short listen-and-try steps and ends with a five-question quiz. Passing
awards 50 XP once per lesson.

Haydn’s **Final Exam** draws from 100 questions for each of those eight topics
(800 questions total). Choose 24, 40, or 80 questions; 40 is the default and
includes five from each topic. Questions and choices are shuffled. There is no
timer. Review or change answers before finishing; 80% passes. The result shows
each topic’s score and links back to its lesson. A first pass earns 200 XP once.
The current attempt and best result save with a classroom profile. Retakes
select fresh questions and keep the previous best.

For teaching edits, press **F2 → Lessons & exams** in the arcade, Piano Lab,
or Fishing Cave. The editor opens full screen with **Exit editor** at the top.
Choose Final exam questions, Lesson quiz questions, or Lesson instructions,
then a topic. Search and select an item to edit. Questions support 2–6 answers;
select the correct one, then **Save question**. Add, duplicate, delete, undo,
redo, and restore-default controls are included. Lesson activities keep their
interactive format while their words, expected answers, and pictures can change.

Turn on **Use an editable music staff** to place notes, rests, treble/bass clefs,
bar lines, and repeat signs. Choose durations, dots, and accidentals; click to
place symbols, drag notes vertically, or use the arrow keys. Grand staff is
available, and long scores scroll while keeping symbols readable.

Saved content edits apply to developer preview in this browser. **Export
content JSON** makes a separate teaching-content backup; import it on another
device, or provide it for publication as `education-content.json` to make it the
shared classroom default. These files are separate from world-layout exports.
Student profiles use published content and cannot apply a device's private
developer draft. Edited assessments keep separate browser-only attempts;
passing still earns the existing one-time lesson/exam XP without replacing
the original saved results. Clearing site data removes local drafts and attempts.

**Rhythm Room → Tap Practice** now offers 4/4, 2/2 (cut time), and 6/8.
The counting guide highlights `1 & 2 &` or `1 e & a` in time with the audio,
including rests. Auto selects the subdivision for the generated rhythm; in 6/8
it uses `1 la li 2 la li`. The metronome and tempo follow the selected meter's
main beat. Counting can be changed or hidden without stopping the loop.

**Song Machine** has a shared **Volume** slider for Simple and Advanced modes.
It controls playback and note previews and remembers the device setting.
Edits automatically save a working draft in this browser, including sounds,
notes, drum rows, tempo and song settings. Reopening the cabinet restores it.
Watch the browser-save message; if storage is unavailable, export a JSON copy
before leaving. Drafts are browser-only and cleared when changing classroom
players; JSON export and the existing song library remain available for portable
copies. Clearing site data removes browser drafts.

Music Triad’s **Advanced Tutorial** now offers 20 short lessons with actual
playable cards, a lesson picker, replay, and an exit at every step. The
**Cheat Sheet** covers values, card meters, all six special cards and worked
examples. Its Simple/Advanced guide switch does not change the game’s rules.
Meter multipliers are explicitly game powers rather than general music rules.


Walk to the **Hall of Fame** and choose **Achievements** to browse all 42 goals.
Earned and locked achievements appear together, with requirements, rewards,
and progress where the game tracks it. Filter by topic or choose Earned/Locked.
The **Records** tab still shows game scores. Viewing achievements never claims
rewards or changes saved progress.

In Song Machine, the button beside the title says **Switch to Simple mode**
when Advanced is open, and **Switch to Advanced mode** when Simple is open.
Switching keeps the composition, browser draft, Undo history and volume.

Musicians give the player room while walking and step aside during idle
routines. Walking into an NPC no longer traps it in place. Conversations and
explicitly placed characters keep their intended positions, and routes continue
to respect the edited collision map.
