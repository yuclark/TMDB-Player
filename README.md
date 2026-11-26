# KINO — Standalone TMDB Player Web App

A standalone, private cinema web application forked from [TomasTNunes/TMDB-Player](https://github.com/TomasTNunes/TMDB-Player) and rebuilt with **React + TypeScript + Vite** on **Cloudflare Workers + Static Assets + D1**.

## Features

- **Editorial Browse & Discovery:** Full-bleed trending showcase, Now Playing, Popular Movies/Series, Top Rated Cinema, and genre/sort filtering.
- **Instant Search:** Keyboard-accessible command search (`/` or `⌘K`) plus full results page.
- **Rich Detail Pages:** Posters, backdrops, trailers, cast strip, season/episode picker with stills, and similar titles.
- **Theater Player:** 16:9 cinema view with all 6 switchable streaming servers (`Rakan`, `Bard`, `Xayah`, `Ekko`, `Naafiri`, `Ryze`), Previous/Next episode controls, slide-over episode drawer, and Wikidata-powered Rate & Review links (IMDb, Letterboxd, Rotten Tomatoes, Serializd, Metacritic, Trakt, TMDB).
- **Shared Watchlist & Continue Watching:** Synced across devices via **Cloudflare D1**, including a **Pick for Tonight** randomizer.
- **Private Access:** Optional server-side passcode gate (`APP_PASSCODE` Worker secret with HMAC-signed `HttpOnly` cookie) or Cloudflare Access.
- **Server-Side TMDB Proxy:** Keeps your TMDB API token out of browser bundles and caches TMDB responses at Cloudflare's edge.

## Development

1. Copy your TMDB v3 Read Access Token into `.dev.vars` (gitignored):
   ```env
   TMDB_TOKEN=your_tmdb_read_access_token
   # Optional: protect the app with a shared passcode
   APP_PASSCODE=your_shared_passcode
   ```
2. Install dependencies and start the Vite + Cloudflare Workers dev server:
   ```bash
   npm install
   npm run dev
   ```

## Deployment (Cloudflare Workers)

1. Set your Worker secrets:
   ```bash
   npx wrangler secret put TMDB_TOKEN
   npx wrangler secret put APP_PASSCODE   # optional, recommended for private access
   ```
2. Build and deploy:
   ```bash
   npm run deploy
   ```

## License

MIT License — see [LICENSE](./LICENSE). Original browser extension and player concept by Tomás Trindade Nunes.
