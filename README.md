# Flight Watch MVP

React + TypeScript + Vite prototype for dispatcher-style aircraft monitoring.

## Deploy

This project is a static Vite app and can be deployed for free on Vercel, Netlify,
Cloudflare Pages, or GitHub Pages.

GitHub Pages is configured through `.github/workflows/pages.yml`. Every push to
`main` builds the app and publishes `dist`.

Expected GitHub Pages URL:

```text
https://igortrostyanskiy227-crypto.github.io/Flight-Watch/
```

Recommended Vercel settings:

- Framework preset: `Vite`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

## Run

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## What is included

- Mock dataset with commercial flights and private flights.
- Synchronized filters for the flight list and Leaflet map.
- Aircraft markers with heading, selected marker highlight, and selected route track.
- Dispatcher detail panel with actual parameters, plan/fact comparison, and history timeline.
- Computed alarm rules for tracker signal age, SOS, stationary position, unconfirmed landing, and plan deviation.
- Floating events panel plus event indicators in cards and detail view.
- Small separated `Pilot controls` prototype block.
