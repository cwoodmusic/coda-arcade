# Learning rooms, Notes, missions, and levels

Open `world-preview.html`. Guest play works with a static web server and no credentials. The connected world keeps the uploaded project layout, collision paint, and layer edits.

Phones and tablets use the same page with touch movement, a compact menu, a following camera, and room-specific controls. See [MOBILE.md](MOBILE.md) for phone play and the touch composer.

## Rooms and people

- **Piano Lab:** approach the north doorway or use the header button. WASD/arrows walk, Space jumps. The 22 painted floor keys have individual perspective polygons. Free play sounds on entry; during a Chopin game, stand on the desired key and press **E**. The back wall shows the sounded pitch. **Show letter names on keys** is optional. Accessible piano buttons offer the same intentional note input.
- **Chopin:** press E nearby or choose a challenge below the room. Melody games include Twinkle Twinkle Little Star, Mary Had a Little Lamb, and London Bridge. Fourteen interval games ask for a starting pitch, then a minor/major second or third, perfect fourth/fifth, or octave higher or lower. Timing is flexible. Each completed challenge awards 35 Notes once, plus quest XP. Free play, recording, and listening remain available.
- **Music Classroom:** enter the east-wall doorway or use **Classroom**. Professor Haydn and three bookshelves open fifteen searchable topics, including guided **Note naming**, **Rhythm tree**, and **Time signatures** activities written for ages 10–11. Note naming uses two/three black-key groups, keyboard questions, and treble-staff questions. The rhythm tree lets students split whole through sixteenth notes, compare values, and fill a four-beat bar. The time-signature lesson teaches 4/4, 6/8, and cut time through listening, pulse tapping, questions, and three bar-building recipes. In 6/8 the six eighth notes form two groups of three; cut time has two half-note beats. Classroom examples use the self-hosted Bravura music font with correctly aligned staff notes. The guides explain the actual cabinet rules, including Music Triad's rhythm-card battles, Pitch Race's note-reading and holds, and Rhythm Room's listen/repeat patterns.
- **Rhythm Fishing:** use the floor trapdoor in the southwest corner of the main open arcade, left of the Entrance sign, or the header/menu button. Descend to the underground lake, talk to Captain Cadence, board the boat, and cast near fish shadows. Thirty species span five rarities; rarer fish have more advanced rhythms. Choose 4/4, 6/8, or cut time. Tap Space/Enter, the staff, or the large rhythm button as notes cross the gold line; correct taps raise progress, misses and extra taps lower it. Full progress catches the fish, zero lets it escape. Catches earn Notes and XP, with nine fishing achievements and a saved collection. See [RHYTHM-FISHING.md](RHYTHM-FISHING.md).
- **Pip:** the boutique attendant opens the wardrobe. **Riff**, behind the main arcade counter, sells cosmetics. Both follow their counter's transform, visibility, and opacity. Header controls remain available for keyboard and touch access.

Rooms use detailed pixel-art backgrounds, with live JavaScript characters, note displays, interactions, and lighting over the art. Escape releases room audio and returns to the arcade. Main-world movement pauses inside a room or full panel.

## Notes and wardrobe

Notes are integer units. The purse makes exact change using whole notes worth 16, half notes 8, quarter notes 4, eighth notes 2, and sixteenth notes 1. New guests receive 150 Notes. Completed cabinet rounds provide repeatable income: Triad awards 16 for a win or 4 for a completed loss; Pitch Race with correct notes awards 16 for a win or 8 otherwise; Rhythm Room awards 1–16 based on tap accuracy. Each run pays once. Quests add larger rewards, so buying cosmetics remains possible after all authored quests are complete. Purchases debit once and remain owned after reload. Previously equipped items are retained when loading older profiles.

The renderer has 158 choices across hair, outfits, hats, glasses, accessories, shoes, and emotes, including 48 accessories. Of the 123 nonempty choices in the five equipment/emote groups, 112 (91%) start behind Notes, achievements, or level rewards. Hair, skin, clothing colors, base outfits, and a small starter wardrobe remain available. Locked items can be previewed; saving explains the unlock requirement. Unlocks never equip automatically.

## Musician missions and XP

Talk to a musician and choose **Any missions for me?**, or open a mission from **Meet musicians**. Accept before starting a fresh cabinet game. Nine authored missions use completed results, including Music Triad wins/captures/comebacks, Pitch Race runs/streaks, and Rhythm Room perfect rounds or 20/50 consecutive notes. Consecutive-hit tracking resets on misses and extra taps. Finishing a mission marks it ready to collect and opens a bottom notification. Return within talking distance of its musician and choose **Collect reward** to receive its Notes and 100 quest XP once. Remote mission panels and the profile show progress but cannot pay rewards. Collection can be retried after a browser write failure without duplicate payment. Earned achievements also show bottom notifications; loading old progress does not replay them.

Talk to a nearby musician and choose **Ask me a music question · Earn Notes** for trivia. Each of the nine visitors has five questions: 45 in total, covering pitch, rhythm, steady beat, dynamics, timbre, tempo, articulation, melody, harmony, and musical form. Correct answers award 4 Notes the first time that question is solved. Wrong answers offer a hint and another try; completed questions can be practiced without another payment. Trivia rewards stay in the existing Notes journal and do not award XP.

XP comes from completed cabinet games, earned achievements, musician quests, Chopin challenges, and played original Song Machine compositions. Buying items or spending Notes awards no XP. Twelve levels unlock cosmetics and eight additional Song Machine sounds. **Profile** shows your live character, level, exact XP remaining, the actual next cosmetic and sound rewards, active missions, and classroom progress. Its **See all level prizes** button opens all thresholds and rewards. Gaining a level opens a bottom popup with the newly unlocked character looks and Song Machine sounds, plus a shortcut to your profile. Level changes from Song Machine inside its cabinet also announce in the world; loading an existing saved level stays quiet. Each new classroom tutorial completion earns a once-only 50 XP achievement; reviews award no extra XP. Imported songs retain their instrument sounds even when the listener has not unlocked those sounds for new selections.

Game messages check the active iframe, expected origin, game ID, and per-session token. On the published shared origin, live hooks additionally observe actual Rhythm Room hit ordering. These are client-reported progress records, not a server anti-cheat system. Local development cannot establish the public games' parent-origin handshake; unit and integration fixtures cover the bridge without changing those games' allowlists.

## Hall of Fame and dance floor

**Hall of Fame** or E near its wall opens number-one records. Pitch Race's existing public Classic leaderboard is read without credentials. Completed cabinet results also maintain per-mode browser records for Pitch Race, Music Triad, and Rhythm Room. The latter two have no existing shared leaderboard, so their records are explicitly labeled **Best in this browser**. Piano Lab shows completed challenge mastery; Song Machine remains a composition studio.

The dance floor has 78 measured quadrilateral tiles. Grounded footsteps illuminate the actual cell, preserving its grout, and departed tiles fade. Disco pins ignore walking collision; room boundaries still contain their projections. FX Off retains basic footstep interaction while disabling decorative lighting.

## Storage and art

New local keys: `codaNotesWalletV1`, `codaMusicianMissionsV1`, `codaPlayerProgressV1`, `codaHallOfFameV1`, `codaPianoTakeV1`, `codaClassroomLessonsV1`, and `codaRhythmFishingV1`. Existing avatar, NPC costume, and editor data keep their current keys. Currency, quests, levels, and records currently remain in this browser; existing avatar cloud sync is unchanged.

The four pictured plants, including pots and shadows, were rebuilt in both world and foreground art. `scripts/build-plant-repairs.cjs` stitches the generated repair plate into the approved crop, rephases the floor grid, and retains the fifth plant outside the screenshot. It pins the already character-cleaned input revision for deterministic rebuilding. Legacy passage-plant project entries remain valid but render transparently, preventing old local layouts from repainting the permanently removed plant.

Relevant checks:

```sh
node --test tests/*.test.cjs
python3 tests/learning-world-browser.py
python3 tests/fishing-world-browser.py
python3 tests/rhythm-fishing-browser.py
python3 tests/time-signature-lesson-browser.py
python3 tests/music-notation-browser.py
python3 tests/student-world-browser.py
python3 tests/music-rewards-world-browser.py
python3 tests/musician-trivia-browser.py
python3 tests/classroom-tutorials-browser.py
python3 tests/player-profile-browser.py
python3 tests/reward-notifications-browser.py
python3 tests/piano-lab-browser.py
python3 tests/music-classroom-browser.py
python3 tests/song-progression-browser.py
python3 tests/clean-world-art.py
```
