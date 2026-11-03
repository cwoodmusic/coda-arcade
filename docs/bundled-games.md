# Complete arcade package

The main arcade and Test Kitchen ship the cabinet games inside their repositories. Every
cabinet loads the copy from the same deployed package as its parent arcade:

| Cabinet | Package directory | Imported source revision |
| --- | --- | --- |
| Pitch Race | `games/pitch-race/` | `cwoodmusic/Pitch-Race` · `059e841479ce66f8aa909e62d05fed430d59d2da` |
| Music Triad | `games/music-triad/` | `cwoodmusic/musictriad` · `bd97bdbbacbfe58e65de31ea1a70beb23cad8fce` |
| Rhythm Room | `games/rhythm-room/` | `cwoodmusic/rhythmroom` · `1eeadea38ddbf87c6271faa22326eee89133c8ce` |
| Song Machine | `song-machine/` | Already included in the arcade |

The imports use the listed `main` revisions of each game. Original tests, tools,
credits, and licenses are included. Bundled browser fixtures use the nested
package URLs. `bundled-games.json` retains the source revisions and original
file hashes, with intentional runtime changes recorded under `packageEdits`.

Pitch Race now skips its three-letter picker for an active signed-in arcade
profile and shows the player's profile name locally. Guests retain the picker.
Existing Firebase room rules still require three uppercase initials, so the
game derives those automatically from the profile alias. Opponents continue to
see initials; no full profile alias or additional identity fields are published
to rooms. Firebase configuration, room paths, save keys, and bridge checks stay
unchanged. Pending Create/Join requests stop if the active profile changes.

`arcade-host.js` resolves cabinet URLs from the current arcade directory. On
GitHub Pages, Test Kitchen uses `/testkitchen/games/…` and the main game
uses `/coda-arcade/games/…`. Custom-domain deployments use their own app
directory, so cabinet play keeps the same origin and inherited profile storage.
The existing Cloudflare worker already forwards `/games/…` under its main app
upstream; this release does not change or deploy that worker.

## Classes, cards, saves, and multiplayer

Existing Firebase projects and rules stay in place. This change does not migrate
classes, profiles, passes, saved progress, leaderboard records, or multiplayer
rooms. Existing student card links keep their original destinations. The three
original game repositories remain available at their existing URLs.

Each arcade package has its own game **code**, while continuing to use the existing
Firebase services. Normal play with an existing profile can save real progress,
and multiplayer uses the current room databases. Automated checks use disposable
browser storage and local Firebase doubles instead of live student data.

Going forward, prepare changes in Test Kitchen, then promote the tested bundled
game folders to this production repository. A static deployment needs no build or package installation.
Keep the imported-runtime checks in sync with any intentional future game edits.

## Verification

Run `node tests/bundled-games.test.cjs` and `node tests/arcade-host.test.cjs` for
runtime integrity, assets, and app-prefix routing. Run
`CODA_BUNDLE_PREFIX=/coda-arcade/ python3 -B tests/bundled-cabinets-world-browser.py`
for the assembled main arcade. Use `CODA_BUNDLE_ORIGIN=https://www.coda-arcade.com`
and `CODA_BUNDLE_PREFIX=/` to check the custom domain, or omit both for Test Kitchen.
Additional nested-game checks are included under each game's `tests/` directory.
Run `python3 -B games/pitch-race/tests/profile-name-browser.py` for signed-in
name handling, guest controls, and profile-change cancellation.
Local-origin gameplay is supported; the existing result bridges continue to
trust their published origins, so bridge checks route those origins locally.
