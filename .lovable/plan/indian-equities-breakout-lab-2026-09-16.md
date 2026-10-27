# Indian Equities Breakout Lab

## Goal
Build a complete in-browser breakout research workstation using deterministic synthetic OHLCV data, transparent technical rules, and interactive visual validation. No external market-data connection is required in this version.

## Build scope

### 1. Synthetic market and analysis engine
- Generate 100 Indian-equity-style stocks with 320 trading sessions each, varied sectors, seeded repeatable data, and distinct structures including VCP, flat base, cup-and-handle, trends, consolidations, strong/weak breakouts, and failed/false breakouts.
- Keep generation, indicators, resistance, setup detection, breakout classification, historical validation, and scoring in separate modules so a live NSE/Zerodha adapter can replace only the data source later.
- Calculate SMA 20/50/100/200, EMA 21/50/200, ATR 14 and ATR%, average volume 20/50, relative volume, 52-week range, ROC, relative strength, and universe-relative RS Rank.
- Detect resistance zones from clustered swing highs, repeated tests, range highs, consolidation highs, and prior breakout levels.
- Derive current statuses from price history only: pre-breakout, breakout, confirmed, failed, false, or no setup. Detect VCP characteristics and expose every score component.
- Scan history for events and calculate 5/10/20/60-session returns, maximum gain, maximum drawdown, and outcome labels from subsequent movement.

### 2. Dashboard and stock inspection
- Build a professional market-terminal interface with a restrained light palette, compact typography, green/amber/red/gray signal semantics, and a chart-first hierarchy.
- Add top KPIs, status and sector filters, search, sortable breakout watchlist, and a stock universe view.
- Clicking a stock opens the primary inspection view with a price chart, volume, EMA overlays, resistance zone, 52-week high, historical success/failure markers, and the current watch marker.
- Add time-range controls, overlay toggles, hover details, zoom controls, and clickable historical markers with full post-breakout statistics.
- Show current setup facts, breakout score breakdown, resistance evidence, VCP contractions, and plain-language reasons beside the chart.

### 3. Comparison and validation
- Add a comparison workspace for up to five stocks covering score, RS rank, resistance distance, relative volume, base quality, VCP score, success rate, average 20-day return, and drawdown.
- Add a backtest workspace with controls for score, RS rank, volume ratio, breakout percentage, trend, and base duration.
- Recalculate results from the detected historical-event dataset and show counts, win/failure rates, average forward returns, gains, drawdown, and frequency.
- Clearly label results as synthetic historical/technical analysis rather than predictions.

### 4. Quality and verification
- Add route-specific metadata and accessible labels.
- Verify the main dashboard and interactions at desktop and mobile widths, including stock selection, chart toggles, comparison, and backtest controls.
- Ensure the app works fully offline with generated data and has no remaining placeholder screen.

## Technical details
- TanStack Start + React 19 + TypeScript + Tailwind CSS v4.
- Recharts for the interactive price/volume visualization.
- Seeded generation and memoized analysis run client-side; no database or login is needed.
- Keep data-provider types stable for future live-market integration.
