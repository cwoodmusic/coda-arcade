# The Coda Arcade — Google account setup

Google sign-in is enabled for cwoodmusic.github.io. The owner has reported publishing the merged profile rules; live sign-in and access isolation still need testing.

1. Create a GitHub repository called `arcade-de-musique`. Upload the website files from this package to its root. In Settings → Pages, publish from the main branch / root. The expected address is https://cwoodmusic.github.io/arcade-de-musique/ . Keep `.nojekyll` with the files.
2. In Firebase project `pitch-race`, enable Authentication → Sign-in method → Google. In Authentication → Settings → Authorized domains, add `cwoodmusic.github.io` (hostname only).
3. Open Realtime Database → Rules. Export or copy the CURRENT full rules before changing them. Send those rules for review. `arcadeProfiles.rules-fragment.json` is a branch to MERGE under the existing `rules` object, not a full replacement. Preserve existing game rules. If an ancestor has a broad `.read` or `.write` grant, this fragment CANNOT revoke that access; narrow those existing grants first while preserving game functionality.
4. Account code is already enabled in this package. Confirm the merged arcadeProfiles rules are published before testing.
5. Open the GitHub Pages arcade, click Guest player → Continue with Google. Create an avatar; wait for Player saved. Sign in on another browser/device and confirm it loads. Test that a different account cannot read or write the first account's `arcadeProfiles/UID` in Firebase Rules Playground.

Guest play remains browser-local. Existing games continue using their live URLs and current databases. Google identity is not displayed in the arcade. Cloud records contain avatar choices and exploration counters, not Google names or email addresses. An existing cloud profile takes precedence over the current guest avatar at sign-in. New profiles import the current guest avatar. Signing out restores the pre-login guest profile.

This does not implement game-result reporting, verified competitive achievements, or a shared Hall of Fame. Exploration counters are client-written cosmetic progress; they must not be treated as trusted scores. Profile saves use last successful write across devices. No claim of tested live sign-in is made until the Console and real-account tests above pass.

The private Sites preview keeps browser-local guest play; Google sign-in is enabled only on the GitHub Pages hostname.
