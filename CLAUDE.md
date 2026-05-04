# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Self-improvement protocol

После любой моей коррекции ты обязан предложить лаконичное правило и дописать его в этот CLAUDE.md в подходящую секцию.
Формат правила: одно императивное предложение, без обоснования и без примеров, если случай не двусмысленный.
Перед добавлением правила выполни поиск по этому файлу.
Если уже есть правило, покрывающее этот случай, не дублируй, а уточни существующее.

- Держи общий объём CLAUDE.md в пределах 2500 токенов. При превышении объедини пересекающиеся правила и удали устаревшие.
- После фикса бага записывай правило про класс корневой причины, а не про конкретный симптом.

## Commands

```bash
npm run dev      # dev server on 0.0.0.0 (Vite)
npm run build    # tsc -b && vite build → dist/
npm run preview  # serve dist/ locally
```

No test runner is configured. Type-check only: `npx tsc --noEmit`.

## Architecture

**Single-page dispatcher dashboard** — React 18 + TypeScript + Vite. No backend; all data is a static mock.

### Data flow

```
src/data/mockFlights.ts          ← static Flight[] + MOCK_NOW constant
      ↓
App.tsx enrichFlights()          ← attaches operationalStatus, tracker.state, statusEvidence
      ↓
domain/events.ts calculateAllEvents()  ← derives FlightEvent[] from Flight[] + MOCK_NOW
      ↓
App.tsx state (useMemo)          ← filteredFlights, eventsByFlight, visibleEvents
      ↓
FlightList / MapView / DetailPanel / AlertsPanel
```

`MOCK_NOW` is a fixed `Date` — the app is frozen in time by design. All age/delay logic (signal staleness, ETA deviation) computes relative to it.

### Domain layer (`src/domain/`)

- **`events.ts`** — pure functions that compute `FlightEvent[]` from a flight's tracker state, route, and thresholds (`SIGNAL_WARNING_MINUTES=5`, `SIGNAL_CRITICAL_MINUTES=10`, `DEVIATION_WARNING_NM=8`). The only place alarm business logic lives.
- **`flightUtils.ts`** — `getCurrentPoint` (last route point), `haversineNm`, `minutesBetween`, formatting helpers.
- **`labels.ts`** — display label maps for every enum/union type (Russian UI strings).

### Key type relationships (`src/types.ts`)

- `Flight.status: FlightStatus` — legacy (`airborne`, `landed`, `scheduled`, `alert`) plus operational codes (`PLN`, `DLA`, `ENR`, `ARR`, `APR`, `ALT`, `CNL`).
- `Flight.operationalStatus: OperationalFlightStatus` — always the operational code; derived in `enrichFlights()` via `deriveOperationalStatus()` when not set explicitly.
- `FlightEvent.category: EventCategory` — `INFO | WARNING | ALERT`, derived from `severity` (`info→INFO`, `warning→WARNING`, `critical→ALERT`).

### UI layout

Three-column `monitor-layout` (CSS Grid): **FlightList** (left) | **MapView + AlertsPanel overlay** (center) | **DetailPanel** (right). `TopBar` spans full width above.

`AlertsPanel` is absolutely positioned over the map (bottom-right floating panel). `MapView` uses `react-leaflet`.

### Styling

Dark-only theme. Design tokens live in `:root` in `src/styles.css` as CSS custom properties (`--bg`, `--panel`, `--critical`, etc.). Tailwind is configured to use those tokens via `tailwind.config.js`. shadcn/ui components in `src/components/ui/` use the standard shadcn CSS variable names (`--background`, `--primary`, etc.) which are aliased to the project tokens in `styles.css`.

Use Tailwind utilities and `var(--token)` references in `className`; avoid inline style objects.

### Adding new alarm rules

Add a new branch in `calculateFlightEvents()` in `domain/events.ts` using `makeEvent()`. The `category` field is auto-derived from `severity` — do not set it manually on computed events. Manual events are attached directly to `Flight.manualEvents` in the mock data.
