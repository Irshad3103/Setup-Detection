export type SetupFamily = "Major breakout" | "Continuation" | "Pullback" | "Late-stage";
export type Pattern = "LONG_BASE" | "CUP_HANDLE" | "VCP" | "FLAT_BASE" | "ASCENDING_TRIANGLE" | "BULL_FLAG" | "HIGH_TIGHT_FLAG" | "PENNANT" | "TIGHT_CONSOLIDATION" | "THREE_WEEKS_TIGHT" | "EMA9_PULLBACK" | "EMA21_PULLBACK" | "DMA50_PULLBACK" | "BREAKOUT_RETEST" | "LATE_STAGE_BASE" | "WIDE_VOLATILE_CONSOLIDATION" | "FAILED_BREAKOUT" | "CLIMAX_RUN" | "NO_PATTERN";
export type SignalStatus = "PRE_BREAKOUT" | "BREAKOUT" | "CONFIRMED_BREAKOUT" | "FAILED_BREAKOUT" | "FALSE_BREAKOUT" | "NO_BREAKOUT";
export type StockSource = { symbol: string; name: string; sector: string };
export type Candle = { date: string; open: number; high: number; low: number; close: number; volume: number; sma20?: number | undefined; sma50?: number | undefined; sma100?: number | undefined; sma200?: number | undefined; ema9?: number | undefined; ema21?: number | undefined; ema50?: number | undefined; ema200?: number | undefined; atr?: number | undefined; atrPct?: number | undefined; avgVolume20?: number | undefined; avgVolume50?: number | undefined; relativeVolume?: number | undefined };
export type BreakoutEvent = { date: string; index: number; breakoutPrice: number; resistance: number; breakoutPercent: number; volumeRatio: number; rsRank: number; score: number; result: "STRONG" | "SUCCESSFUL" | "WEAK" | "FAILED" | "FALSE"; return5D: number; return10D: number; return20D: number; return60D: number; maxGain: number; maxDrawdown: number };
export type ScoreBreakdown = { trend: number; relativeStrength: number; volume: number; baseQuality: number; volatility: number; resistance: number; marketContext: number };
export type DetectedSetup = { pattern: Pattern; label: string; family: SetupFamily; confidence: number; evidence: string[] };
export type StockAnalysis = { symbol: string; companyName: string; sector: string; pattern: Pattern; setup: DetectedSetup; setups: DetectedSetup[]; candles: Candle[]; price: number; change: number; resistanceLow: number; resistanceHigh: number; resistanceStrength: number; resistanceTests: number; distanceToResistance: number; rsRank: number; relativeVolume: number; atrPct: number; baseDuration: number; baseDepth: number; vcpScore: number; contractions: number[]; status: SignalStatus; score: number; scoreBreakdown: ScoreBreakdown; events: BreakoutEvent[]; successRate: number; avg20D: number; avgDrawdown: number; reasons: string[] };

export const patternLabels: Record<Pattern, string> = { LONG_BASE: "Long base", CUP_HANDLE: "Cup & Handle", VCP: "VCP", FLAT_BASE: "Flat base", ASCENDING_TRIANGLE: "Ascending triangle", BULL_FLAG: "Bull flag", HIGH_TIGHT_FLAG: "High-tight flag", PENNANT: "Pennant", TIGHT_CONSOLIDATION: "Tight consolidation", THREE_WEEKS_TIGHT: "3-weeks-tight", EMA9_PULLBACK: "9 EMA pullback", EMA21_PULLBACK: "21 EMA pullback", DMA50_PULLBACK: "50 DMA pullback", BREAKOUT_RETEST: "Breakout retest", LATE_STAGE_BASE: "2nd/3rd-stage base", WIDE_VOLATILE_CONSOLIDATION: "Wide/volatile consolidation", FAILED_BREAKOUT: "Failed breakout", CLIMAX_RUN: "Climax run", NO_PATTERN: "No pattern" };
const round = (n: number, d = 2) => Number(n.toFixed(d));
const pct = (a: number, b: number) => b ? (a / b - 1) * 100 : 0;
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const maxHigh = (c: Candle[]) => Math.max(...c.map(x => x.high));
const minLow = (c: Candle[]) => Math.min(...c.map(x => x.low));
const depth = (c: Candle[]) => Math.abs(pct(minLow(c), maxHigh(c)));

function movingAverage(values: number[], period: number) { return values.map((_, i) => i + 1 < period ? undefined : mean(values.slice(i - period + 1, i + 1))); }
function ema(values: number[], period: number) { const k = 2 / (period + 1); let current = values[0] ?? 0; return values.map((v, i) => current = i === 0 ? v : v * k + current * (1 - k)); }
function trueRanges(c: Candle[]) { return c.map((x, i) => { const previous = c[i - 1]; return previous ? Math.max(x.high - x.low, Math.abs(x.high - previous.close), Math.abs(x.low - previous.close)) : x.high - x.low; }); }

export function addIndicators(candles: Candle[]) {
  const closes = candles.map(c => c.close), volumes = candles.map(c => c.volume), tr = trueRanges(candles);
  const series = { sma20: movingAverage(closes, 20), sma50: movingAverage(closes, 50), sma100: movingAverage(closes, 100), sma200: movingAverage(closes, 200), ema9: ema(closes, 9), ema21: ema(closes, 21), ema50: ema(closes, 50), ema200: ema(closes, 200), atr: movingAverage(tr, 14), avgVolume20: movingAverage(volumes, 20), avgVolume50: movingAverage(volumes, 50) };
  return candles.map((c, i) => { const atr = series.atr[i], avgVolume20 = series.avgVolume20[i]; return { ...c, sma20: series.sma20[i], sma50: series.sma50[i], sma100: series.sma100[i], sma200: series.sma200[i], ema9: series.ema9[i], ema21: series.ema21[i], ema50: series.ema50[i], ema200: series.ema200[i], atr, atrPct: atr ? atr / c.close * 100 : undefined, avgVolume20, avgVolume50: series.avgVolume50[i], relativeVolume: avgVolume20 ? c.volume / avgVolume20 : undefined }; });
}

function resistanceAt(candles: Candle[], end: number, lookback = 55) {
  const sample = candles.slice(Math.max(0, end - lookback), end); const swingHighs = sample.filter((c, i) => { const before = sample[i - 1], after = sample[i + 1]; return Boolean(before && after && c.high >= before.high && c.high >= after.high); }).map(c => c.high);
  const candidates = swingHighs.length >= 2 ? swingHighs : sample.map(c => c.high); const sorted = [...candidates].sort((a, b) => b - a); const anchor = sorted[Math.min(2, sorted.length - 1)] ?? sample.at(-1)?.high ?? 0;
  const cluster = candidates.filter(v => Math.abs(v / anchor - 1) <= .018); const center = mean(cluster) || anchor;
  return { low: center * .991, high: center * 1.009, tests: cluster.length, strength: Math.min(98, 42 + cluster.length * 9) };
}
function forward(c: Candle[], i: number, n: number) { const future = c[i + n], current = c[i]; return future && current ? pct(future.close, current.close) : 0; }
function scanEvents(c: Candle[], rsRank: number): BreakoutEvent[] {
  const events: BreakoutEvent[] = [];
  for (let i = 70; i < c.length - 5; i++) { const r = resistanceAt(c, i, 45), x = c[i], prev = c[i - 1]; if (!x || !prev) continue; const breakPct = pct(x.close, r.high), vr = x.relativeVolume ?? 1; const crossed = x.close > r.high && prev.close <= r.high * 1.015, intradayFalse = x.high > r.high && x.close < r.low; if (!crossed && !intradayFalse) continue; const lastEvent = events.at(-1); if (lastEvent && i - lastEvent.index < 18) continue; const future = c.slice(i + 1, Math.min(c.length, i + 61)), maxGain = Math.max(0, ...future.map(y => pct(y.high, x.close))), maxDrawdown = Math.min(0, ...future.map(y => pct(y.low, x.close))), failed = intradayFalse || future.slice(0, 5).some(y => y.close < r.low), score = Math.round(Math.min(100, 48 + Math.max(0, vr - 1) * 16 + Math.min(18, breakPct * 4) + rsRank * .16)), result = intradayFalse ? "FALSE" : failed ? "FAILED" : maxGain >= 15 ? "STRONG" : maxGain >= 6 ? "SUCCESSFUL" : "WEAK"; events.push({ date: x.date, index: i, breakoutPrice: x.close, resistance: r.high, breakoutPercent: round(breakPct), volumeRatio: round(vr), rsRank, score, result, return5D: round(forward(c, i, 5)), return10D: round(forward(c, i, 10)), return20D: round(forward(c, i, 20)), return60D: round(forward(c, i, 60)), maxGain: round(maxGain), maxDrawdown: round(maxDrawdown) }); }
  return events;
}

function detectSetups(c: Candle[], events: BreakoutEvent[]): DetectedSetup[] {
  const latest = c.at(-1); if (!latest) return [];
  const w10 = c.slice(-10), w15 = c.slice(-15), w20 = c.slice(-20), w30 = c.slice(-30), w45 = c.slice(-45), w60 = c.slice(-60), w120 = c.slice(-120);
  const add: DetectedSetup[] = [], candidate = (pattern: Pattern, family: SetupFamily, confidence: number, evidence: string[]) => { if (confidence >= 58) add.push({ pattern, label: patternLabels[pattern], family, confidence: Math.min(99, Math.round(confidence)), evidence }); };
  const near = (value: number | undefined, tolerance: number) => value ? Math.abs(pct(latest.close, value)) <= tolerance : false;
  const trend = latest.close > (latest.ema50 ?? Infinity) && (latest.ema50 ?? 0) > (latest.ema200 ?? Infinity);
  const longBaseDepth = depth(w120), flatDepth = depth(w30), d45 = depth(w45), d10 = depth(w10), r = resistanceAt(c, c.length, 55), closeToHigh = pct(latest.close, maxHigh(w60)) > -5;
  candidate("LONG_BASE", "Major breakout", (w120.length === 120 ? 35 : 0) + (longBaseDepth < 28 ? 30 : 0) + (closeToHigh ? 25 : 0) + (trend ? 10 : 0), [`120-day depth ${round(longBaseDepth, 1)}%`, "Price near the base ceiling"]);
  const cupLowIndex = w120.findIndex(x => x.low === minLow(w120)), left = w120.slice(0, 30), handle = w120.slice(-20);
  candidate("CUP_HANDLE", "Major breakout", (cupLowIndex > 25 && cupLowIndex < 90 ? 38 : 0) + (left.length && Math.abs(pct(maxHigh(left), maxHigh(handle))) < 8 ? 28 : 0) + (depth(handle) < 13 ? 24 : 0) + (closeToHigh ? 10 : 0), ["Rounded recovery across the base", `Handle depth ${round(depth(handle), 1)}%`]);
  const thirds = [w60.slice(0, 20), w60.slice(20, 40), w60.slice(40)].map(depth), [firstThird = 0, secondThird = 0, thirdThird = 0] = thirds, contracting = firstThird > secondThird && secondThird > thirdThird;
  candidate("VCP", "Major breakout", (contracting ? 55 : 0) + ((latest.relativeVolume ?? 1) < .9 ? 20 : 0) + (closeToHigh ? 20 : 0), [`Contractions ${thirds.map(x => round(x, 1)).join(" → ")}%`, "Volume contraction assessed"]);
  candidate("FLAT_BASE", "Major breakout", (flatDepth < 12 ? 48 : 0) + (w30.length === 30 ? 15 : 0) + (closeToHigh ? 25 : 0) + (trend ? 12 : 0), [`30-day depth ${round(flatDepth, 1)}%`, "Price near resistance"]);
  const highVariation = Math.abs(pct(Math.max(...w45.slice(0, 22).map(x => x.high)), Math.max(...w45.slice(22).map(x => x.high)))), risingLows = minLow(w45.slice(-20)) > minLow(w45.slice(0, 20));
  candidate("ASCENDING_TRIANGLE", "Major breakout", (highVariation < 3 ? 42 : 0) + (risingLows ? 38 : 0) + (closeToHigh ? 15 : 0), ["Repeated highs form a horizontal ceiling", "Recent lows are rising"]);
  const run20 = w30[9] ? pct(w30[19]?.close ?? latest.close, w30[9].close) : 0;
  candidate("BULL_FLAG", "Continuation", (run20 > 10 ? 45 : 0) + (d10 < 10 ? 35 : 0) + (latest.close > (latest.ema21 ?? Infinity) ? 15 : 0), [`Prior advance ${round(run20, 1)}%`, `Flag depth ${round(d10, 1)}%`]);
  const run40 = w60[19] ? pct(w60[39]?.close ?? latest.close, w60[19].close) : 0;
  candidate("HIGH_TIGHT_FLAG", "Continuation", (run40 > 45 ? 60 : 0) + (depth(w15) < 18 ? 30 : 0), [`Eight-week advance ${round(run40, 1)}%`, `Three-week depth ${round(depth(w15), 1)}%`]);
  candidate("PENNANT", "Continuation", (depth(w20.slice(0, 10)) > d10 ? 48 : 0) + (d10 < 9 ? 28 : 0) + (run20 > 8 ? 20 : 0), ["Range is narrowing after an advance", `Recent range ${round(d10, 1)}%`]);
  candidate("TIGHT_CONSOLIDATION", "Continuation", (d10 < 5 ? 68 : 0) + (trend ? 20 : 0), [`10-day range ${round(d10, 1)}%`, "Trend alignment checked"]);
  const weekly = [c.at(-1)?.close, c.at(-6)?.close, c.at(-11)?.close].filter((v): v is number => typeof v === "number");
  candidate("THREE_WEEKS_TIGHT", "Continuation", (weekly.length === 3 && depth(w15) < 6 ? 68 : 0) + (Math.max(...weekly) / Math.min(...weekly) < 1.025 ? 22 : 0), [`Three-week range ${round(depth(w15), 1)}%`, "Weekly closes cluster tightly"]);
  candidate("EMA9_PULLBACK", "Pullback", (near(latest.ema9, 2) ? 58 : 0) + (trend ? 25 : 0) + (latest.close >= latest.open ? 10 : 0), ["Price is testing the 9 EMA", "Primary trend remains constructive"]);
  candidate("EMA21_PULLBACK", "Pullback", (near(latest.ema21, 2.5) ? 58 : 0) + (trend ? 25 : 0) + (latest.close >= latest.open ? 10 : 0), ["Price is testing the 21 EMA", "Primary trend remains constructive"]);
  candidate("DMA50_PULLBACK", "Pullback", (near(latest.sma50, 3) ? 58 : 0) + (latest.close > (latest.sma200 ?? Infinity) ? 25 : 0) + (latest.close >= latest.open ? 10 : 0), ["Price is testing the 50 DMA", "Long-term trend remains constructive"]);
  const recentBreak = events.filter(e => e.index >= c.length - 35 && !["FAILED", "FALSE"].includes(e.result)).at(-1);
  candidate("BREAKOUT_RETEST", "Pullback", (recentBreak && Math.abs(pct(latest.close, recentBreak.resistance)) < 3 ? 72 : 0) + (latest.close >= latest.open ? 15 : 0), ["Price has returned to a recent breakout level", "Retest support is being assessed"]);
  candidate("LATE_STAGE_BASE", "Late-stage", (events.length >= 2 ? 45 : 0) + (closeToHigh ? 20 : 0) + (d45 < 22 ? 20 : 0), [`${events.length} earlier breakout attempts`, "Mature base near prior highs"]);
  candidate("WIDE_VOLATILE_CONSOLIDATION", "Late-stage", (d45 > 25 ? 48 : 0) + ((latest.atrPct ?? 0) > 4 ? 32 : 0), [`45-day depth ${round(d45, 1)}%`, `ATR ${round(latest.atrPct ?? 0, 1)}%`]);
  const latestEvent = events.at(-1);
  candidate("FAILED_BREAKOUT", "Late-stage", (latestEvent && latestEvent.index >= c.length - 20 && ["FAILED", "FALSE"].includes(latestEvent.result) ? 82 : 0), ["Recent breakout returned below resistance", "Failure risk is elevated"]);
  const climb20 = w20[0] ? pct(latest.close, w20[0].close) : 0;
  candidate("CLIMAX_RUN", "Late-stage", (climb20 > 25 ? 52 : 0) + ((latest.relativeVolume ?? 1) > 1.8 ? 28 : 0) + ((latest.atrPct ?? 0) > 4 ? 15 : 0), [`20-day advance ${round(climb20, 1)}%`, "Volume and volatility expansion assessed"]);
  return add.sort((a, b) => b.confidence - a.confidence);
}

function analyze(source: StockSource, candles: Candle[], rsRank: number): StockAnalysis {
  const latest = candles.at(-1), previous = candles.at(-2); if (!latest || !previous) throw new Error("Insufficient candle history"); const r = resistanceAt(candles, candles.length, 60), recent = candles.slice(-45), top = maxHigh(recent), bottom = minLow(recent), baseDepth = Math.abs(pct(bottom, top)), earlyAtr = mean(recent.slice(0, 15).map(c => c.atrPct ?? 0)), lateAtr = mean(recent.slice(-15).map(c => c.atrPct ?? 0)), volatilityContracting = lateAtr < earlyAtr * .9, distance = pct(r.high, latest.close), trend = latest.close > (latest.ema50 ?? Infinity) && (latest.ema50 ?? 0) > (latest.ema200 ?? Infinity), volumeDry = latest.volume < (latest.avgVolume20 ?? latest.volume) * .9, relVol = latest.relativeVolume ?? 1;
  const scoreBreakdown: ScoreBreakdown = { trend: trend ? 20 : latest.close > (latest.ema50 ?? Infinity) ? 11 : 4, relativeStrength: Math.round(rsRank / 5), volume: Math.round(Math.min(20, relVol * 9 + (volumeDry ? 3 : 0))), baseQuality: Math.round(Math.max(3, 15 - baseDepth * .45)), volatility: volatilityContracting ? 10 : 5, resistance: Math.min(10, 4 + r.tests), marketContext: 4 }, score = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0); let status: SignalStatus = "NO_BREAKOUT";
  if (latest.high > r.high && latest.close < r.low) status = "FALSE_BREAKOUT"; else if (latest.close > r.high && previous.close <= r.high) status = relVol >= 1.35 && score >= 70 ? "CONFIRMED_BREAKOUT" : "BREAKOUT"; else if (distance >= 0 && distance <= 4 && score >= 57) status = "PRE_BREAKOUT";
  const events = scanEvents(candles, rsRank), setups = detectSetups(candles, events), setup = setups[0] ?? { pattern: "NO_PATTERN" as Pattern, label: "No pattern", family: "Major breakout" as SetupFamily, confidence: 0, evidence: ["No requested setup currently meets its rule threshold"] }, successes = events.filter(e => ["STRONG", "SUCCESSFUL"].includes(e.result)), contractions = [baseDepth, baseDepth * .68, baseDepth * .43, baseDepth * .25].map(x => round(x, 1));
  if (setup.pattern === "FAILED_BREAKOUT") status = "FAILED_BREAKOUT";
  return { symbol: source.symbol.replace(/\.NS$/, ""), companyName: source.name, sector: source.sector, pattern: setup.pattern, setup, setups, candles, price: latest.close, change: round(pct(latest.close, previous.close)), resistanceLow: round(r.low), resistanceHigh: round(r.high), resistanceStrength: r.strength, resistanceTests: r.tests, distanceToResistance: round(distance), rsRank, relativeVolume: round(relVol), atrPct: round(latest.atrPct ?? 0), baseDuration: 45, baseDepth: round(baseDepth), vcpScore: setups.find(s => s.pattern === "VCP")?.confidence ?? 0, contractions, status, score, scoreBreakdown, events, successRate: events.length ? round(successes.length / events.length * 100) : 0, avg20D: events.length ? round(mean(events.map(e => e.return20D))) : 0, avgDrawdown: events.length ? round(mean(events.map(e => e.maxDrawdown))) : 0, reasons: setup.evidence };
}

export function analyzeMarketUniverse(raw: Array<StockSource & { candles: Candle[] }>) {
  const prepared = raw.map(stock => ({ ...stock, candles: addIndicators(stock.candles), performance: stock.candles.length > 60 ? pct(stock.candles.at(-1)?.close ?? 0, stock.candles.at(-61)?.close ?? 0) : 0 })); const ranked = [...prepared].sort((a, b) => a.performance - b.performance), ranks = new Map(ranked.map((stock, i) => [stock.symbol, Math.round((i + 1) / ranked.length * 99)])); return prepared.map(stock => analyze(stock, stock.candles, ranks.get(stock.symbol) ?? 50)).sort((a, b) => b.score - a.score);
}