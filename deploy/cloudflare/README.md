# Coda Arcade at www.coda-arcade.com

This Worker serves the existing GitHub Pages files at **https://www.coda-arcade.com/**.
The arcade and its three cabinet games share one browser origin, so classroom
profiles, game progress, and achievements keep their existing storage guards.
GitHub remains the source of the game files; pushing game updates still updates
the upstream sites.

Keep the GitHub Pages custom-domain setting empty and do not add a repository
`CNAME` file. The Worker fetches those existing GitHub Pages URLs. Changing them
to redirect back to this domain would create a loop. The original GitHub arcade
and existing Profile Pass links remain available.

## Deploy through the Cloudflare dashboard

1. Open **Workers & Pages** in the Cloudflare account that owns `coda-arcade.com`.
   Create a Worker named `coda-arcade-site`.
2. Choose **Edit code**, replace the sample with the complete contents of
   [worker.mjs](worker.mjs), and deploy it as an ES module.
3. Open the Worker's **Settings → Domains & Routes → Add → Custom Domain**.
   Enter **www.coda-arcade.com** and complete the setup. Cloudflare creates the
   domain's routing/DNS and manages its TLS certificate. If an existing `www`
   record conflicts, review that record before replacing it.
4. Once Cloudflare reports the domain and certificate active, open
   **https://www.coda-arcade.com/** and check the games and teacher sign-in.
   Firebase Authentication is already configured to authorize this exact hostname; existing authorized domains are preserved.

Do not point `www` directly at GitHub Pages for this setup: its requests must
reach this Worker. The apex `coda-arcade.com` is optional; a separate Cloudflare
redirect rule can send it to `https://www.coda-arcade.com/`. Preserve paths and
query strings if you configure that redirect.

## Deploy with Wrangler instead

After logging into the correct Cloudflare account with Wrangler, run from this
directory:

```sh
npx wrangler deploy
```

The provided [wrangler.jsonc](wrangler.jsonc) binds only `www.coda-arcade.com`.
Deployment requires access to that Cloudflare account and zone; no account
credentials or API tokens are included here. The static game itself still needs
no dependency installation or build step.

## Routing and privacy

| Public path | Fixed upstream |
| --- | --- |
| `/` and main arcade assets | `https://cwoodmusic.github.io/coda-arcade/` |
| `/Pitch-Race/…` | `https://cwoodmusic.github.io/Pitch-Race/…` |
| `/musictriad/…` | `https://cwoodmusic.github.io/musictriad/…` |
| `/rhythmroom/…` | `https://cwoodmusic.github.io/rhythmroom/…` |

Only GET and HEAD are proxied. Query strings, ranges, conditional requests, and
content/cache headers are preserved. Upstream redirects are rewritten only for
these four projects. Encoded path separators and ambiguous traversal encodings
are rejected. Browser cookies, authorization, and other private request headers
are not forwarded, and upstream cookies are not returned to the browser.
Firebase authentication and database requests go directly from the game SDKs to
Firebase; the Worker does not proxy them. Cloudflare and GitHub still receive
normal service/network metadata.

The app must explicitly trust this hostname, load cabinet URLs under this same
origin, and allow its exact origin in the three game-result bridges. Those app
changes are separate from deploying the Worker. A DNS-only main-site migration
with games left on another origin would lose the captured classroom storage
guard, so validate the complete deployment together.

Sign-in and browser storage are origin-specific. A teacher signs in once on the
new address. Students can enter their existing card code in the new site's
profile form; their cloud profiles and Notes stay in the same Firebase project.
An existing QR/pass link continues to open the original site, and newly created
pass links use the address where they are created. Do not rotate passes just to
change the website address: rotation revokes the existing cards.

Guest saves and browser-only artwork/song drafts do not automatically move
between the old and new addresses. Keep the original address available for
those local saves and exports. Opening the same saved profile at both addresses
uses the normal one-device lease and takeover flow.

## Offline checks

From the repository root:

```sh
node --test tests/cloudflare-worker.test.cjs
```

These tests stub upstream responses. They do not deploy Cloudflare resources,
change DNS or Firebase settings, or contact live services.
