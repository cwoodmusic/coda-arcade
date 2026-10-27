# DJ Coda's Line Dance

Walk to DJ Coda and interact. Choose **Play DJ Coda's Line Dance**, then Easy, Normal, or Hard. A four-beat count-in leads into eight bars of 4/4. Match the arrow under each note as its notehead reaches the glowing line; rests require no press. Use keyboard arrow keys or the game's touch buttons.

The camera fits the whole dance floor. The player joins a line with up to three randomly selected available NPCs. Correct presses animate directional dance steps. Wrong or missed arrows cause a short stumble, then the player gets back up; the NPCs keep dancing to the chart. Reduced motion uses smaller steps without the fall rotation.

Easy uses quarter-note steps at 80 BPM. Normal adds eighth notes at 92 BPM. Hard adds paired sixteenths, dotted notes, and syncopation at 100 BPM. All modes have written rests, bar lines, actual Bravura note glyphs, and appropriate beams. Long notes require one press at the beginning. The result shows score, accuracy, and best streak; this first version does not add a new cloud leaderboard or reward schema.

Exit with Escape or the close button. Exiting restores the borrowed actor positions, camera, and previously playing jukebox/arcade track. Backgrounding the page, changing profile, or leaving the game stops its audio and input. Those interruptions do not restart music in the background. Temporary dance state never changes the saved world layout or avatar appearance.

The pure chart/timing engine is `dance-rhythm-engine.js`. Actor staging is `dance-floor-stage.js`; notation, controls, and audio are `dance-rhythm-game.js/css`; `dance-floor-world.js` coordinates the existing world and camera.
