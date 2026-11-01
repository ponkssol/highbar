# highbar extension (Chrome MV3)

Launch a coin on highbar from any tweet on x.com with a local launch wallet.

## Build

```
pnpm install
pnpm --filter ./apps/extension build   # dist/ is the unpacked extension
pnpm --filter ./apps/extension test
pnpm --filter ./apps/extension typecheck
```

Load it in Chrome from chrome://extensions with Developer mode on, then Load unpacked and pick `apps/extension/dist`.

## How it fits together

- `src/background` is the service worker. It holds the encrypted wallet, signs, and is the only part that talks to the API and RPC.
- `src/content` runs on x.com. It adds the Launch button to each tweet and the quick drawer in a closed shadow root. It never sees keys and cannot unlock, export or claim.
  The drawer shows every image it finds in the tweet on one scrolling row (all photos, video and GIF posters, quoted post media, link card images and the profile picture, plus Upload) and an editable X link field filled with the tweet URL. The X link takes an x.com or twitter.com link or an @handle, the same forms the API accepts, and the background checks it again before it goes into the metadata.
- `src/ui` has the side panel (Portfolio, Wallet, History, Fees, Settings) and the unlock popup, built with React and highbar's Tailwind theme. The toolbar icon opens the side panel, which holds setup, the wallet and all settings. The popup only unlocks and opens when the drawer needs an unlock.
- Logo: the v5 gold pillar from apps/web/public/icons/hb-v5-512.png. `src/lib/icons.ts` has it traced to an inline SVG (tweet button and drawer header), `src/static/icons` has the 16, 32, 48 and 128 toolbar icons resized from the 512 source with rounded corners, and `src/static/brand/logo.png` is the v5 mark with the wordmark for the panel and popup headers. On the X Default (light) theme the button uses a deeper gold so the mark stays legible.
- The tweet button sits in X's action row before bookmark and share: a 26px pill with a 16px mark and the 13px label in X's own font and gray, centered on the row like reply, repost and like, with a 34px click area that never makes the row taller. Narrow rows get the logo in a small pill, the tightest ones the bare logo, so the share icon never gets pushed out.
- `src/lib` holds the pure parts with unit tests: vault crypto, seed derivation, tweet parsing and the pre-sign checks.

## Wallet security

- The secret is encrypted with AES-GCM-256 under a PBKDF2-SHA256 key (600,000 rounds, random salt and IV) and stored in `chrome.storage.local`.
- The unlocked key lives in the worker memory and in `chrome.storage.session` (trusted contexts only). It is wiped on lock, on auto-lock and when the computer goes idle or locks.
- Before signing a launch the worker checks that the fee payer is this wallet and that the mint ends in `high`. After the API co-signs it checks the message bytes are unchanged.
- Use a dedicated launch wallet with only the SOL you plan to launch with.

## Settings

- API base, default `https://api-production-810c.up.railway.app`. Uses `GET /config` for the network and site URL.
- RPC: by default the API's allowlisted `POST /rpc` proxy. An own RPC endpoint can be set in the side panel and is stored only in the browser.
