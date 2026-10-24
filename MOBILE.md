# Playing on phones and tablets

The same site adapts to a phone or tablet; no separate installation is required. Both the original arcade and `world-preview.html` support portrait and landscape screens. The original landing page includes an **Explore the connected world** link.

## Connected world

- Hold a direction on the eight-way touch pad to walk. Slide between arrows to change direction, or onto its center to stop. A second finger can press **Jump** while you keep moving.
- **Interact** talks, opens cabinets, visits shops, or enters rooms according to the nearby prompt. **Emote** performs your equipped emote.
- Hold and drag a finger on the map to steer toward it. Lift to stop immediately. This uses normal walking collision without a stored path. Pinch with two fingers to zoom; movement stays stopped until both fingers lift. The phone camera follows the player and remains usable at every map edge.
- **Menu** contains your profile, Notes, wardrobe, musicians, rooms, Hall of Fame, audio, zoom, fullscreen, and developer tools. Closing a menu or room clears its held touch inputs. Pointer cancellation, rotation, app switching, and screen hiding also release controls.
- The touch pad hides while shopping, typing, editing, reading books, or playing a cabinet game. Cabinets use their own controls. **Return to world** stays accessible above the iframe.

Large, translucent controls float over the bottom corners in both orientations. The map extends behind them and the middle remains available for finger steering. Layouts account for mobile browser bars and safe areas. A first-time touch device starts with Lite effects; an existing FX preference is preserved.

## Music rooms

Piano Lab offers **Room**, **Chopin games**, **Keyboard**, and **Recording** tabs. Selecting a challenge returns to the floor piano. Free play sounds when you walk over a key; melody and interval games require the touch **Play note / E** action while standing on the chosen key. Letter names remain optional; pitch labels show C, D, E and so on, without octave numbers. Hold and drag on the floor to steer; lifting stops walking. The shared pad controls only the active room, and the arcade avatar pauses outside it.

The classroom offers **Room** and **Study books**. Hold and drag on the room floor, or use the pad, to approach Professor Haydn and the bookshelves, then use **Talk / Read**. Books, quizzes, search, and audio examples remain available without using the virtual movement pad.

## Song Machine

The phone composer has a fixed Play/Stop/Undo/Loop dock and expandable instrument options. Tap a grid cell to place or remove a note; swipe horizontally for later bars and vertically for other pitches. **Draw notes** enables sideways duration drawing; **Tap & scroll** restores navigation. Canceled gestures never place notes. Editing retains the visible bar and pitch rather than jumping back to the grid's beginning.

Song settings contain meter, scale, bars, file import, and the existing account/save controls. Hold a track's Clear button for three seconds; releasing or canceling the touch stops the clear, and Undo restores a completed clear. Stop silences sounding and scheduled audio sources.

## Progress and implementation

Phones use the existing avatar, Notes, XP, achievements, and project storage keys. Changing orientation or using the responsive layout does not reset progress. Existing guest and account restrictions still apply.

`finger-follow.js` captures held floor gestures, cancels on lift/blur/rotation, and leaves simultaneous action fingers available. Desktop mouse clicks keep click-to-walk.

`mobile-controls.js` shares multi-touch handling between views, with reference-counted held keys and context-bound releases. The world keeps its original bitmap and collision coordinates; its camera uses the visible clipped viewport. Room modules expose `control(key, pressed)` and `releaseControls()` for touch input. Desktop keyboard, mouse, editing, and previews remain supported.

Phone checks use real Chromium touch events in 390×844 and 844×390 viewports:

```sh
node --test tests/mobile-controls.test.cjs
python3 tests/finger-follow-browser.py
python3 tests/mobile-world-browser.py
python3 tests/mobile-landing-browser.py
python3 tests/mobile-rooms-browser.py
python3 tests/song-mobile-browser.py
```

These are browser-emulated phone checks; device-specific Safari and Android behavior can also be checked on the published site.
