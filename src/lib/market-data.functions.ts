import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import stockCsv from "@/data/nse-stocks.csv?raw";
import type { Candle, StockSource } from "./market";

type YahooResponse = { chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ open?: Array<number | null>; high?: Array<number | null>; low?: Array<number | null>; close?: Array<number | null>; volume?: Array<number | null> }> } }> } };

const rows: StockSource[] = stockCsv.trim().split("\n").slice(1).map(line => {
  const [symbol = "", name = "", sector = ""] = line.trim().split(",");
  return { symbol, name, sector };
}).filter(row => row.symbol);

async function fetchHistory(source: StockSource) {
  const ticker = source.symbol.includes(".") ? source.symbol : `${source.symbol}.NS`;
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=2y&interval=1d&events=div%2Csplits`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`${source.symbol}: Yahoo Finance returned ${response.status}`);
  const payload = await response.json() as YahooResponse;
  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  if (!result?.timestamp || !quote) throw new Error(`${source.symbol}: no daily history`);
  const candles: Candle[] = result.timestamp.flatMap((time, index) => {
    const open = quote.open?.[index], high = quote.high?.[index], low = quote.low?.[index], close = quote.close?.[index], volume = quote.volume?.[index];
    if (open == null || high == null || low == null || close == null || volume == null) return [];
    return [{ date: new Date(time * 1000).toISOString().slice(0, 10), open, high, low, close, volume }];
  });
  if (candles.length < 220) throw new Error(`${source.symbol}: insufficient daily history`);
  return { ...source, symbol: ticker, candles };
}

export const fetchMarketUniverse = createServerFn({ method: "GET" }).handler(async () => {
  const results = await Promise.allSettled(rows.map(fetchHistory));
  const stocks = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
  if (!stocks.length) throw new Error("Yahoo Finance data is temporarily unavailable");
  return { stocks, requested: rows.length, source: "Yahoo Finance" };
});

export const fetchFreeMarketData = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ symbol: z.string().trim().min(1).max(20).regex(/^[A-Z0-9.&-]+$/) }).parse(input))
  .handler(async ({ data }) => fetchHistory({ symbol: data.symbol, name: data.symbol, sector: "Unclassified" }));