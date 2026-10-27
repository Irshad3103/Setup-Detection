import { useMemo, useState } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Eye, Maximize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BreakoutEvent, StockAnalysis } from "@/lib/market";

const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function PriceChart({ stock, onEvent }: { stock: StockAnalysis; onEvent: (event: BreakoutEvent) => void }) {
  const [range, setRange] = useState(180); const [layers, setLayers] = useState({ ema21: true, ema50: true, ema200: false, volume: true, resistance: true, events: true });
  const data = useMemo(() => stock.candles.slice(-range).map(c => ({ ...c, wick: [c.low, c.high], body: [Math.min(c.open, c.close), Math.max(c.open, c.close)] })), [stock, range]);
  const minIndex = stock.candles.length - data.length; const visibleEvents = stock.events.filter(e => e.index >= minIndex);
  const toggle = (key: keyof typeof layers) => setLayers(s => ({ ...s, [key]: !s[key] }));
  return <section className="chart-panel" aria-label={`${stock.symbol} price chart`}>
    <div className="chart-toolbar">
      <div className="flex items-center gap-1"><Button size="icon" variant="ghost" title="Zoom in" onClick={() => setRange(r => Math.max(60, r - 40))}><Plus size={15} /></Button><Button size="icon" variant="ghost" title="Zoom out" onClick={() => setRange(r => Math.min(320, r + 40))}><Minus size={15} /></Button><Button size="icon" variant="ghost" title="Reset view" onClick={() => setRange(180)}><Maximize2 size={15} /></Button></div>
      <div className="flex flex-wrap items-center gap-1">{([90, 180, 320] as const).map(v => <Button key={v} size="sm" variant={range === v ? "active" : "ghost"} onClick={() => setRange(v)}>{v === 90 ? "3M" : v === 180 ? "6M" : "All"}</Button>)}</div>
      <div className="ml-auto flex flex-wrap items-center gap-1">{Object.entries(layers).map(([key, active]) => <Button key={key} size="sm" variant={active ? "active" : "ghost"} onClick={() => toggle(key as keyof typeof layers)}>{key.replace("ema", "EMA ")}</Button>)}</div>
    </div>
    <div className="h-[460px] w-full">
      <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 16, right: 14, bottom: 4, left: 4 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={v => String(v).slice(5)} minTickGap={40} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="price" domain={["auto", "auto"]} orientation="right" tickFormatter={v => `₹${Number(v).toFixed(0)}`} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={62} />
        <YAxis yAxisId="volume" domain={[0, (dataMax: number) => dataMax * 4]} hide />
        <Tooltip content={({ active, payload, label }) => active && payload?.[0] ? <div className="chart-tip"><b>{label}</b><span>Close {money(Number(payload.find(p => p.dataKey === "close")?.value ?? 0))}</span><span>Volume {Number(payload.find(p => p.dataKey === "volume")?.value ?? 0).toLocaleString("en-IN")}</span></div> : null} />
        {layers.resistance && <ReferenceArea yAxisId="price" y1={stock.resistanceLow} y2={stock.resistanceHigh} fill="var(--signal-watch)" fillOpacity={.1} strokeOpacity={0} />}
        {layers.resistance && <ReferenceLine yAxisId="price" y={stock.resistanceHigh} stroke="var(--signal-watch)" strokeDasharray="5 4" label={{ value: `Trigger ${money(stock.resistanceHigh)}`, fill: "var(--signal-watch)", fontSize: 11, position: "insideTopLeft" }} />}
        {layers.volume && <Bar yAxisId="volume" dataKey="volume" fill="var(--chart-volume)" opacity={.35} />}
        <Area yAxisId="price" type="monotone" dataKey="close" fill="var(--chart-area)" fillOpacity={.14} stroke="var(--chart-price)" strokeWidth={2} isAnimationActive={false} />
        {layers.ema21 && <Line yAxisId="price" type="monotone" dataKey="ema21" stroke="var(--chart-ema21)" dot={false} strokeWidth={1.2} isAnimationActive={false} />}
        {layers.ema50 && <Line yAxisId="price" type="monotone" dataKey="ema50" stroke="var(--chart-ema50)" dot={false} strokeWidth={1.2} isAnimationActive={false} />}
        {layers.ema200 && <Line yAxisId="price" type="monotone" dataKey="ema200" stroke="var(--chart-ema200)" dot={false} strokeWidth={1.2} isAnimationActive={false} />}
        {layers.events && visibleEvents.map(e => <ReferenceDot key={e.date} yAxisId="price" x={e.date} y={e.breakoutPrice} r={5} fill={e.result === "FAILED" || e.result === "FALSE" ? "var(--signal-failed)" : "var(--signal-positive)"} stroke="var(--background)" strokeWidth={2} onClick={() => onEvent(e)} className="cursor-pointer" />)}
        {layers.events && stock.status === "PRE_BREAKOUT" && data.at(-1)?.date && <ReferenceDot yAxisId="price" x={data.at(-1)?.date ?? ""} y={stock.price} r={7} fill="var(--signal-watch)" stroke="var(--background)" strokeWidth={3} />}
      </ComposedChart></ResponsiveContainer>
    </div>
    <div className="chart-legend"><span><i className="dot-price" /> Price</span><span><i className="dot-ema21" /> EMA 21</span><span><i className="dot-ema50" /> EMA 50</span><span><i className="dot-positive" /> Historical breakout</span><span><i className="dot-failed" /> Failed</span>{stock.status === "PRE_BREAKOUT" && <span><Eye size={13} /> Current watch</span>}</div>
  </section>;
}