# KINO — Standalone TMDB Player Web App

A standalone cinema web application forked from [TomasTNunes/TMDB-Player](https://github.com/TomasTNunes/TMDB-Player) and rebuilt with **React + TypeScript + Vite** on **Cloudflare Workers + Static Assets**.

## Features

- **Editorial Browse & Discovery:** Full-bleed trending showcase, Now Playing, Popular Movies/Series, Top Rated Cinema, and genre/sort filtering.
- **Zero-Login Recommendation Algorithm:** Learns locally in each browser (`localStorage`) from what you watch, save, inspect, like, and dismiss—combining TMDB collaborative recommendations with genre-affinity discovery to power **Recommended for You** and **Because you liked...** rails with zero accounts required.
- **Instant Search:** Keyboard-accessible command search (`/` or `⌘K`) plus full filterable search page.
- **Rich Detail Pages:** Posters, backdrops, trailers, cast strip, season/episode picker with stills, **Like** taste booster, and similar titles.
- **Theater Player:** 16:9 cinema view with all 6 switchable streaming servers (`Rakan`, `Bard`, `Xayah`, `Ekko`, `Naafiri`, `Ryze`), Previous/Next episode controls, slide-over episode drawer, and Wikidata-powered Rate & Review links (IMDb, Letterboxd, Rotten Tomatoes, Serializd, Metacritic, Trakt, TMDB).
- **Per-Device Watchlist & Continue Watching:** Private per-browser Watchlist, Continue Watching, and **Pick for Tonight** randomizer (no login or database required).
- **Server-Side TMDB Proxy:** Keeps your TMDB API token out of browser bundles and caches TMDB responses at Cloudflare's edge.
- **Optional Private Passcode:** Set `APP_PASSCODE` as a Worker secret to gate access with an HMAC-signed `HttpOnly` cookie (or omit it for instant access).

## Development

1. Add your TMDB v3 Read Access Token to `.dev.vars` (gitignored):
   ```env
   TMDB_TOKEN=your_tmdb_read_access_token
   # Optional: protect the site with a passcode
   APP_PASSCODE=your_passcode
   ```
2. Install dependencies and start the Vite + Cloudflare Workers dev server:
   ```bash
   npm install
   npm run dev
   ```

## Deployment (Cloudflare Workers)

1. Set your Worker secret:
   ```bash
   npx wrangler secret put TMDB_TOKEN
   npx wrangler secret put APP_PASSCODE   # optional
   ```
2. Build and deploy:
   ```bash
   npm run deploy
   ```

## License

MIT License — see [LICENSE](./LICENSE). Original browser extension and player concept by Tomás Trindade Nunes.
