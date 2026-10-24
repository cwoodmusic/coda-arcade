# Rhythm Fishing: the hidden lake

The trapdoor is in the southwest corner of the main arcade’s open room, left of the Entrance sign. Stand nearby and press **E / Interact**, or choose **Rhythm Fishing** from the header/menu. The developer console can move the hatch without changing the floor art or collision.

The enlarged stone landing at the ladder’s foot leads onto the lantern dock. Walk to the end of the pier before choosing **Board boat**; returning to the dock puts you back on the pier. To leave, walk to the foot of the rope ladder and press **E / Climb**, click the nearby ladder, or choose **Climb ladder**. The header’s Arcade button also remains available.

Captain Cadence waits on the lantern dock. His original shanty verses explain casting, rests, and the three meters. **Board boat** starts exploring; steer with WASD/arrows, desktop floor clicks, or held-finger movement. Fish shadows swim around the lake, turn away from banks, and gently avoid the boat. Hooked fish stay fixed while their rhythm challenge plays. Move within casting range and press **E / Cast rod**, or click a nearby shadow.

Pinch two fingers on the cave to zoom from 100% to 300%; the camera follows your avatar or boat. The corner’s **− / percentage / +** controls offer the same zoom. Pinching stops steering and casting until both fingers lift. Rotation, cancellation, and leaving the room release captured touches. The developer camera remains independent and can zoom further.

After a bite, listen to one bar of count-in. Notes scroll left across a one-line staff. Tap **Space**, **Enter**, the staff, or **Tap rhythm** when a notehead crosses the gold line. Tap once at the beginning of each note; rests need no tap. Correct taps raise the catch bar. Misses and extra taps lower it. Reaching 100% catches the fish; reaching zero lets it escape. Pause is available, and switching away from the page pauses the hooked fish and its audio.

A small boat, rod, line, and fish illustrate the battle above the staff. Good taps reel the fish closer; mistakes make it pull away and tighten the line. Its species, edited colors, and size follow the hooked fish. Rare, Epic, and Legendary encounters show a brief announcement at the start of the count-in. The illustration and announcement use the paused game clock and respect reduced motion; neither changes scoring.

## Meters and rarity

- **4/4:** four quarter-note beats: ONE, TWO, THREE, FOUR.
- **6/8:** six eighth-note lengths grouped in two dotted-quarter pulses: ONE-la-li, TWO-la-li.
- **Cut time / 2/2:** two half-note beats: ONE-and, TWO-and.

Eighth notes share one beam and sixteenth notes share two. Beams follow each meter’s big-beat grouping and stop at rests, beat boundaries, or bar lines; isolated short notes keep their flags.

The BPM label names the actual pulse unit. The engine keeps note lengths separate from the pulse, so six eighth notes in 6/8 do not become six quarter-note beats. Thirty species, six in each of five rarities, use 90 rhythm patterns across all three meters. Quarter, half, eighth, sixteenth, and whole-bar rests use the bundled music glyphs. A whole-bar rest fills that meter’s complete bar, including all six eighth-note lengths in 6/8. Staying quiet during a rest does not reduce progress; tapping it counts as an extra tap. Rarer catches introduce shorter notes, dots, offbeat entrances, and notes held across the main pulse. No copyrighted music recordings are used.

Common and Uncommon species live in all three meters. Some Rare and Epic species have one or two habitats; Legendary species each belong to one meter. Changing **Fishing meter** changes the wild encounter pool, and every collection card lists its allowed meters. For example, Glass Cavefish and Thunderfin Pike require 4/4, Sapphire Pike and Starlight Sturgeon require 6/8, and Amethyst Koi and Prism Koi require cut time. Existing saved catches remain in the journal.

## Tempo and changing speed

Each species has a tempo profile. Common and Uncommon fish keep a steady Andante (walking pace). Rare fish use 108–132 quarter notes per minute, Epic fish use 132–160, and Legendary fish use Presto at 168–192. Some difficult fish stay fast; others use **accelerando** (gradually getting faster) or **ritardando** (gradually getting slower). The first bar stays steady, then the change unfolds over three bars and settles at its target speed.

The tempo display names the current speed with Andante, Moderato, Allegro, Vivace, or Presto and explains the change in plain language. These markings use quarter-note BPM. The metronome follows the selected meter’s actual pulse: quarter notes in 4/4, dotted quarters in 6/8, and half notes in cut time. A change of tempo does not change the time signature.

Note onsets, rests, bar lines, scrolling, and metronome clicks use the same tempo map. Longer notes and rests keep their musical lengths through a speed change. Dense fast notes have separate timing windows, so one tap cannot collect neighboring notes. Pausing or switching away freezes the musical clock and speed change; resuming does not replay a beat that already sounded. Catch rewards still depend on the fish species.

## Catches and rewards

Each successful catch records the species, size, meter, result, and stable catch ID in `codaRhythmFishingV1`. Common through legendary fish award 4–80 Notes and 8–35 catch XP. Nine milestones cover the first catch, five/twenty catches, a perfect catch, rare/legendary catches, all three meters, ten species, and all thirty species. Each achievement gives 50 XP once and uses the existing bottom notifications and level rewards.

The catch journal saves before Notes or XP are awarded. Failed writes leave an explicit retry; stable catch IDs prevent duplicate payment after partial saves or reload. Escapes and canceled casts award nothing. Saved collection entries do not replay reward popups. All guest progress stays in this browser, alongside the existing Notes/XP journals.

The cave uses a generated pixel-art background with live boat, avatar, Captain, shadows, and effects. Crystals breathe with teal/violet light, lanterns cast warm reflections, water shimmers with caustics and falling-drop rings, and the boat leaves rippling wakes. **Effects: Full / Lite / Off** shares the arcade’s saved effects setting; reduced motion keeps calm static lighting and removes drifting particles and ripples. Effects never change catch timing or rewards. Bravura 1.482 supplies the actual music glyphs; its SIL Open Font License and source details are bundled under `assets/fonts/bravura`.

**Developer / F2** opens the cave’s editor while on shore or exploring. Select a fish shadow or a numbered fish in Objects to change its species, position, size, colors, or visibility; fish freeze during editing. The console also edits room artwork, collision, and foreground layers, with zoom up to 800% and drag-to-pan. Room edits save locally and are included in complete world project exports. See [DEVELOPER-CONSOLE.md](DEVELOPER-CONSOLE.md).

The developer list includes all species and their meter requirements. A placed fish that belongs to another meter is visible while editing and waits to appear in gameplay until its allowed meter is selected. Switching meters preserves those authored fish and their customization.

## Checks

```sh
node --test tests/rhythm-fishing-engine.test.cjs tests/fishing-progress.test.cjs tests/music-notation.test.cjs tests/time-signature-lesson.test.cjs tests/rhythm-beaming.test.cjs tests/fishing-cave-layout.test.cjs tests/fish-shadow-motion.test.cjs tests/fishing-cave-effects.test.cjs
python3 tests/rhythm-fishing-browser.py
python3 tests/fishing-world-browser.py
python3 tests/cave-upgrade-browser.py
python3 tests/rhythm-beaming-browser.py
python3 tests/fishing-upgrade-browser.py
python3 tests/fishing-tempo-browser.py
python3 tests/cave-camera-browser.py
python3 tests/fishing-battle-browser.py
node --test tests/cave-camera.test.cjs tests/fishing-battle.test.cjs tests/fishing-tempo.test.cjs
python3 tests/time-signature-lesson-browser.py
python3 tests/music-notation-browser.py
```

The browser tests use actual keyboard/touch input and a controlled browser clock. They cover catches and escapes, save retries, meter pulses, font rendering, boat collision, mobile input, audio cleanup, and moving the trapdoor in the production editor.
