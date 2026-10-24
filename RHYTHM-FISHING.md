# Rhythm Fishing: the hidden lake

The trapdoor is in the southwest corner of the main arcade’s open room, left of the Entrance sign. Stand nearby and press **E / Interact**, or choose **Rhythm Fishing** from the header/menu. The developer console can move the hatch without changing the floor art or collision.

The enlarged stone landing at the ladder’s foot leads onto the lantern dock. Walk to the end of the pier before choosing **Board boat**; returning to the dock puts you back on the pier. To leave, walk to the foot of the rope ladder and press **E / Climb**, click the nearby ladder, or choose **Climb ladder**. The header’s Arcade button also remains available.

Captain Cadence waits on the lantern dock. His original shanty verses explain casting, rests, and the three meters. **Board boat** starts exploring; steer with WASD/arrows, desktop floor clicks, or held-finger movement. Fish shadows swim around the lake, turn away from banks, and gently avoid the boat. Hooked fish stay fixed while their rhythm challenge plays. Move within casting range and press **E / Cast rod**, or click a nearby shadow.

After a bite, listen to one bar of count-in. Notes scroll left across a one-line staff. Tap **Space**, **Enter**, the staff, or **Tap rhythm** when a notehead crosses the gold line. Tap once at the beginning of each note; rests need no tap. Correct taps raise the catch bar. Misses and extra taps lower it. Reaching 100% catches the fish; reaching zero lets it escape. Pause is available, and switching away from the page pauses the hooked fish and its audio.

## Meters and rarity

- **4/4:** four quarter-note beats: ONE, TWO, THREE, FOUR.
- **6/8:** six eighth-note lengths grouped in two dotted-quarter pulses: ONE-la-li, TWO-la-li.
- **Cut time / 2/2:** two half-note beats: ONE-and, TWO-and.

Eighth notes share one beam and sixteenth notes share two. Beams follow each meter’s big-beat grouping and stop at rests, beat boundaries, or bar lines; isolated short notes keep their flags.

The BPM label names the actual pulse unit. The engine keeps note lengths separate from the pulse, so six eighth notes in 6/8 do not become six quarter-note beats. Thirty species, six in each of five rarities, use 45 rhythm patterns across all three meters. Rarer catches introduce shorter notes, rests, dots, offbeat entrances, and syncopation. No copyrighted music recordings are used.

## Catches and rewards

Each successful catch records the species, size, meter, result, and stable catch ID in `codaRhythmFishingV1`. Common through legendary fish award 4–80 Notes and 8–30 catch XP. Nine milestones cover the first catch, five/twenty catches, a perfect catch, rare/legendary catches, all three meters, ten species, and all thirty species. Each achievement gives 50 XP once and uses the existing bottom notifications and level rewards.

The catch journal saves before Notes or XP are awarded. Failed writes leave an explicit retry; stable catch IDs prevent duplicate payment after partial saves or reload. Escapes and canceled casts award nothing. Saved collection entries do not replay reward popups. All guest progress stays in this browser, alongside the existing Notes/XP journals.

The cave uses a generated pixel-art background with live boat, avatar, Captain, shadows, and effects. Crystals breathe with teal/violet light, lanterns cast warm reflections, water shimmers with caustics and falling-drop rings, and the boat leaves rippling wakes. **Effects: Full / Lite / Off** shares the arcade’s saved effects setting; reduced motion keeps calm static lighting and removes drifting particles and ripples. Effects never change catch timing or rewards. Bravura 1.482 supplies the actual music glyphs; its SIL Open Font License and source details are bundled under `assets/fonts/bravura`.

**Developer / F2** opens the cave’s editor while on shore or exploring. Select a fish shadow or a numbered fish in Objects to change its species, position, size, colors, or visibility; fish freeze during editing. The console also edits room artwork, collision, and foreground layers, with zoom up to 800% and drag-to-pan. Room edits save locally and are included in complete world project exports. See [DEVELOPER-CONSOLE.md](DEVELOPER-CONSOLE.md).

## Checks

```sh
node --test tests/rhythm-fishing-engine.test.cjs tests/fishing-progress.test.cjs tests/music-notation.test.cjs tests/time-signature-lesson.test.cjs tests/rhythm-beaming.test.cjs tests/fishing-cave-layout.test.cjs tests/fish-shadow-motion.test.cjs tests/fishing-cave-effects.test.cjs
python3 tests/rhythm-fishing-browser.py
python3 tests/fishing-world-browser.py
python3 tests/cave-upgrade-browser.py
python3 tests/rhythm-beaming-browser.py
python3 tests/time-signature-lesson-browser.py
python3 tests/music-notation-browser.py
```

The browser tests use actual keyboard/touch input and a controlled browser clock. They cover catches and escapes, save retries, meter pulses, font rendering, boat collision, mobile input, audio cleanup, and moving the trapdoor in the production editor.
