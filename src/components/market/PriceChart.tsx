
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Customized,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, Maximize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BreakoutEvent, StockAnalysis } from "@/lib/market";


const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema21?: number;
  ema50?: number;
  ema200?: number;
};

type CandleLayerProps = {
  data?: Candle[];
  xAxisMap?: Record<string, any>;
  yAxisMap?: Record<string, any>;
  offset?: { top: number; left: number; width: number; height: number };
};

// Draw OHLC candles using Recharts' actual axis scales.
function CandleLayer({
  data = [],
  xAxisMap = {},
  yAxisMap = {},
  offset,
}: CandleLayerProps) {
  const xAxis = Object.values(xAxisMap)[0];
  const priceAxis = Object.values(yAxisMap).find(
    (axis: any) => axis?.yAxisId === "price"
  ) ?? Object.values(yAxisMap)[0];

  const xScale = (xAxis as any)?.scale;
  const yScale = (priceAxis as any)?.scale;

  if (!xScale || !yScale || !offset) return null;

  const bandwidth =
    typeof xScale.bandwidth === "function"
      ? xScale.bandwidth()
      : offset.width / Math.max(data.length, 1);

  const candleWidth = Math.max(2, Math.min(12, bandwidth * 0.65));

  return (
    <g className="candlestick-layer">
      {data.map((candle, index) => {
        const x = xScale(candle.date);
        if (x == null) return null;

        const centerX = x + bandwidth / 2;
        const highY = yScale(candle.high);
        const lowY = yScale(candle.low);
        const openY = yScale(candle.open);
        const closeY = yScale(candle.close);

        const bullish = candle.close >= candle.open;
        const color = bullish ? "#16a34a" : "#dc2626";
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(openY - closeY));

        return (
          <g key={`${candle.date}-${index}`}>
            {/* High-low wick */}
            <line
              x1={centerX}
              x2={centerX}
              y1={highY}
              y2={lowY}
              stroke={color}
              strokeWidth={1.2}
            />

            {/* Open-close body */}
            <rect
              x={centerX - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={color}
              stroke={color}
              strokeWidth={1}
            />
          </g>
        );
      })}
    </g>
  );
}

export function PriceChart({
  stock,
  onEvent,
}: {
  stock: StockAnalysis;
  onEvent: (event: BreakoutEvent) => void;
}) {
  const [range, setRange] = useState(180);

  const [layers, setLayers] = useState({
    ema21: true,
    ema50: true,
    ema200: false,
    volume: true,
    resistance: true,
    events: true,
  });

  const data = useMemo(
    () => stock.candles.slice(-range),
    [stock.candles, range]
  );

  const minIndex = stock.candles.length - data.length;

  const visibleEvents = stock.events.filter(
    (event) => event.index >= minIndex
  );

  const toggle = (key: keyof typeof layers) =>
    setLayers((current) => ({
      ...current,
      [key]: !current[key],
    }));

  return (
    <section
      className="chart-panel"
      aria-label={`${stock.symbol} candlestick chart`}
    >
      <div className="chart-toolbar">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="Zoom in"
            onClick={() => setRange((r) => Math.max(60, r - 40))}
          >
            <Plus size={15} />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            title="Zoom out"
            onClick={() => setRange((r) => Math.min(320, r + 40))}
          >
            <Minus size={15} />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            title="Reset view"
            onClick={() => setRange(180)}
          >
            <Maximize2 size={15} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {([90, 180, 320] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={range === value ? "active" : "ghost"}
              onClick={() => setRange(value)}
            >
              {value === 90 ? "3M" : value === 180 ? "6M" : "All"}
            </Button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          {Object.entries(layers).map(([key, active]) => (
            <Button
              key={key}
              size="sm"
              variant={active ? "active" : "ghost"}
              onClick={() => toggle(key as keyof typeof layers)}
            >
              {key.replace("ema", "EMA ")}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-[460px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 14, bottom: 4, left: 4 }}
          >
            <CartesianGrid
              stroke="var(--chart-grid)"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tickFormatter={(value) => String(value).slice(5)}
              minTickGap={40}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              yAxisId="price"
              domain={[
                (min: number) => Math.min(min, ...data.map(c => c.low)),
                (max: number) => Math.max(max, ...data.map(c => c.high)),
              ]}
              orientation="right"
              tickFormatter={(value) => `₹${Number(value).toFixed(0)}`}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={62}
            />

            <YAxis
              yAxisId="volume"
              domain={[0, (max: number) => max * 4]}
              hide
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                const candle = payload.find(
                  (item) => item.dataKey === "volume"
                )?.payload as Candle | undefined;

                if (!candle) return null;

                return (
                  <div className="chart-tip">
                    <b>{String(label)}</b>
                    <span>Open: {money(candle.open)}</span>
                    <span>High: {money(candle.high)}</span>
                    <span>Low: {money(candle.low)}</span>
                    <span>Close: {money(candle.close)}</span>
                    <span>
                      Volume: {candle.volume.toLocaleString("en-IN")}
                    </span>
                  </div>
                );
              }}
            />

            {layers.resistance && (
              <ReferenceArea
                yAxisId="price"
                y1={stock.resistanceLow}
                y2={stock.resistanceHigh}
                fill="var(--signal-watch)"
                fillOpacity={0.1}
                strokeOpacity={0}
              />
            )}

            {layers.resistance && (
              <ReferenceLine
                yAxisId="price"
                y={stock.resistanceHigh}
                stroke="var(--signal-watch)"
                strokeDasharray="5 4"
                label={{
                  value: `Trigger ${money(stock.resistanceHigh)}`,
                  fill: "var(--signal-watch)",
                  fontSize: 11,
                  position: "insideTopLeft",
                }}
              />
            )}

            {layers.volume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="var(--chart-volume)"
                opacity={0.25}
                isAnimationActive={false}
              />
            )}

            {/* Replaces the normal price Area with real OHLC candles. */}
            <Customized
              component={CandleLayer as any}
            />

            {layers.ema21 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ema21"
                stroke="var(--chart-ema21)"
                dot={false}
                strokeWidth={1.2}
                isAnimationActive={false}
              />
            )}

            {layers.ema50 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ema50"
                stroke="var(--chart-ema50)"
                dot={false}
                strokeWidth={1.2}
                isAnimationActive={false}
              />
            )}

            {layers.ema200 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ema200"
                stroke="var(--chart-ema200)"
                dot={false}
                strokeWidth={1.2}
                isAnimationActive={false}
              />
            )}

            {layers.events &&
              visibleEvents.map((event) => (
                <ReferenceDot
                  key={event.date}
                  yAxisId="price"
                  x={event.date}
                  y={event.breakoutPrice}
                  r={5}
                  fill={
                    event.result === "FAILED" ||
                    event.result === "FALSE"
                      ? "var(--signal-failed)"
                      : "var(--signal-positive)"
                  }
                  stroke="var(--background)"
                  strokeWidth={2}
                  onClick={() => onEvent(event)}
                  className="cursor-pointer"
                />
              ))}

            {layers.events && stock.status === "PRE_BREAKOUT" && (
              <ReferenceDot
                yAxisId="price"
                x={data.at(-1)?.date ?? ""}
                y={stock.price}
                r={7}
                fill="var(--signal-watch)"
                stroke="var(--background)"
                strokeWidth={3}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-legend">
        <span><i className="dot-price" /> Candlesticks</span>
        <span><i className="dot-ema21" /> EMA 21</span>
        <span><i className="dot-ema50" /> EMA 50</span>
        <span><i className="dot-positive" /> Historical breakout</span>
        <span><i className="dot-failed" /> Failed</span>
        {stock.status === "PRE_BREAKOUT" && (
          <span><Eye size={13} /> Current watch</span>
        )}
      </div>
    </section>
  );
}
