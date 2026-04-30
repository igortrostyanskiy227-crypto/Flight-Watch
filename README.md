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

## Improvement Backlog

Source: `Предложения замечания по разработанному UI (Дизайн Игоря).pdf` and the Flight Watch 2027 Figma task.

### P0

- Show an interrupting modal or equivalent high-priority surface when a flight receives `Бедствие` or `Потеря связи`. The modal must include the key flight/event data and an explicit "read/acknowledged" action.
- Add read/unread state for every event and alarm. The events list, flight detail events, and alarm modal must show whether the current user has read the item.
- Add event/alarm detail view for long messages such as weather restrictions and aeronautical restrictions. Opening an event should center the map on its spatial coordinates when available and visually highlight the affected flight/area.
- Replace the current simplified flight status model with operational statuses required by the design: `PLN`, `DLA`, `ENR`, `ARR/APR`, `ALT`, and `CNL`; keep ALERT/WARNING as event categories rather than only generic severity.

### P1

- Expand flight list filtering. Required filters: period by `STD`, flight status, aircraft type, `DEP`, `DEST`, `ALTN`, `ETOPS/ERA`, `TKOFF ALTN`, flights with `ALERT`, and flights with `WARNING`.
- Add saved filter templates for dispatchers, including create, select, update, and reset flows.
- Make the period filter configurable for any custom date/time range. The period filter should be the primary filter in the UI.
- Rework the filter layout so aircraft/board selection is not a lone special-case filter unless product requirements confirm it.
- Add flight list sorting with default order plus ascending/descending modes.
- Add controls to show or hide aircraft icons on the map for all flights in the currently filtered list.
- Add separate indicators in each flight card for map visibility, unread flight chat messages, ALERT presence, WARNING presence, and the operational status chip.

### P2

- Add a flight information header with actions that open modal sections: main flight information, aircraft information, flight plan, OFP, time marks, aircraft technical/documents, and flight chat.
- Build the flight chat/messenger workflow: flight chat entry point, unread indicator, chat list, tabs for all/private/flights/archive, search, message list, composer, read/unread delivery states.
- Add a dedicated warnings list with read/unread state, ALERT/WARNING category, and warning scopes: weather route restriction, aeronautical route restriction, weather DEP/DEST/ALTN restriction, and aeronautical DEP/DEST/ALTN restriction.
- Add map layer controls for aviation overlays and operational layers.
- Add altitude and speed charts for the selected flight, with plan-vs-fact comparison.
- Add navigation to an aerodromes monitoring section with meteorological information, aeronautical restrictions, and related alarms.
- Replace or clarify the current `Pilot controls` block; the PDF marks its purpose as unclear.
