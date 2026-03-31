import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

// --- Mock Data ---
const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY"];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// Базовые цены для генерации уровней
const BASE_PRICES: Record<string, number> = {
  "EUR/USD": 1.0843, "GBP/USD": 1.2671, "USD/JPY": 149.82,
  "AUD/USD": 0.6514, "USD/CAD": 1.3628, "USD/CHF": 0.8972,
  "NZD/USD": 0.5983, "EUR/GBP": 0.8561, "EUR/JPY": 162.34, "GBP/JPY": 189.54,
};

function generateLevels(asset: string) {
  const base = BASE_PRICES[asset] ?? 1.0;
  const pip = base > 10 ? 0.1 : 0.001;
  const price = +(base + randomBetween(-pip * 5, pip * 5)).toFixed(base > 10 ? 2 : 4);
  const s1 = +(price - pip * Math.floor(randomBetween(8, 18))).toFixed(base > 10 ? 2 : 4);
  const s2 = +(s1 - pip * Math.floor(randomBetween(8, 18))).toFixed(base > 10 ? 2 : 4);
  const r1 = +(price + pip * Math.floor(randomBetween(8, 18))).toFixed(base > 10 ? 2 : 4);
  const r2 = +(r1 + pip * Math.floor(randomBetween(8, 18))).toFixed(base > 10 ? 2 : 4);
  return { price, s1, s2, r1, r2 };
}

// Зоны близости к уровню (% от диапазона S2-R2)
const ZONE_THRESHOLD = 0.12;

type Levels = ReturnType<typeof generateLevels>;

function detectZone(levels: Levels): { direction: "UP" | "DOWN"; reason: string; bonus: number } {
  const { price, s1, s2, r1, r2 } = levels;
  const range = r2 - s2;
  if (range <= 0) return { direction: "UP", reason: "Нейтральная зона", bonus: 0 };

  const distS1 = Math.abs(price - s1) / range;
  const distS2 = Math.abs(price - s2) / range;
  const distR1 = Math.abs(price - r1) / range;
  const distR2 = Math.abs(price - r2) / range;

  // Отскок от поддержки → UP
  if (distS1 < ZONE_THRESHOLD) return { direction: "UP", reason: `Отскок от S1 (${s1})`, bonus: 8 };
  if (distS2 < ZONE_THRESHOLD) return { direction: "UP", reason: `Отскок от S2 (${s2})`, bonus: 12 };
  // Отскок от сопротивления → DOWN
  if (distR1 < ZONE_THRESHOLD) return { direction: "DOWN", reason: `Отбой от R1 (${r1})`, bonus: 8 };
  if (distR2 < ZONE_THRESHOLD) return { direction: "DOWN", reason: `Отбой от R2 (${r2})`, bonus: 12 };

  // Цена в нижней половине → склонность UP, в верхней → DOWN
  const mid = (s2 + r2) / 2;
  if (price < mid) return { direction: "UP", reason: "Цена ниже середины диапазона", bonus: 3 };
  return { direction: "DOWN", reason: "Цена выше середины диапазона", bonus: 3 };
}

function generateTA(direction: "UP" | "DOWN") {
  // RSI согласован с направлением
  const rsi = direction === "UP"
    ? Math.floor(randomBetween(28, 52))   // перепроданность → сигнал UP
    : Math.floor(randomBetween(52, 76));  // перекупленность → сигнал DOWN
  const macdVal = direction === "UP"
    ? +(randomBetween(0.0001, 0.0015)).toFixed(4)
    : +(randomBetween(-0.0015, -0.0001)).toFixed(4);
  const macdSignal = direction === "UP" ? "BUY" : "SELL";
  // EMA согласовано
  const ema9 = direction === "UP" ? 1.0005 : 0.9995;
  const ema21 = direction === "UP" ? 0.9998 : 1.0002;
  const emaCross = ema9 > ema21 ? "BUY" : "SELL";
  // Боллинджер: UP → цена у нижней полосы, DOWN → у верхней
  const bbPos = direction === "UP"
    ? Math.floor(randomBetween(5, 30))
    : Math.floor(randomBetween(70, 95));
  return { rsi, macdVal, macdSignal, emaCross, bbPos };
}

function generateSignal(id: number) {
  const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  const timeframes = ["1m", "5m", "15m", "30m", "1h"];
  const tf = timeframes[Math.floor(Math.random() * timeframes.length)];
  const now = new Date();
  now.setMinutes(now.getMinutes() - Math.floor(Math.random() * 30));
  const expiry = "3 мин";

  // Уровни определяют направление
  const levels = generateLevels(asset);
  const zone = detectZone(levels);
  const direction = zone.direction;

  // Точность и сила усиливаются при близости к S/R
  const baseAccuracy = Math.floor(randomBetween(80, 90));
  const accuracy = Math.min(98, baseAccuracy + zone.bonus);
  const baseStrength = Math.floor(randomBetween(78, 90));
  const strength = Math.min(100, baseStrength + zone.bonus);

  const ta = generateTA(direction);
  return { id, asset, direction, accuracy, tf, time: now, expiry, strength, levels, ta, zoneReason: zone.reason };
}

function generateHistory(id: number) {
  const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  const direction = Math.random() > 0.5 ? "UP" : "DOWN";
  const result = Math.random() > 0.35 ? "WIN" : "LOSS";
  const profit = result === "WIN" ? `+${Math.floor(randomBetween(75, 95))}%` : `-100%`;
  const date = new Date();
  date.setHours(date.getHours() - id * 2 - Math.floor(Math.random() * 2));
  return { id, asset, direction, result, profit, date };
}

const INITIAL_SIGNALS = Array.from({ length: 8 }, (_, i) => generateSignal(i + 1));
const HISTORY = Array.from({ length: 20 }, (_, i) => generateHistory(i + 1));

const ANALYTICS = [
  { label: "Точность сигналов", value: "83%", delta: "+2.4%", up: true },
  { label: "Сигналов сегодня", value: "47", delta: "+12", up: true },
  { label: "WIN Rate (7д)", value: "78%", delta: "-1.2%", up: false },
  { label: "Активных пар", value: "10", delta: "", up: true },
];

// Chart: последний 1 час, точка каждые 5 минут (12 баров)
function generateChartData() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const t = new Date(now.getTime() - (11 - i) * 5 * 60 * 1000);
    const accuracy = Math.floor(randomBetween(78, 98));
    return {
      accuracy,
      label: t.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };
  });
}
const CHART_DATA = generateChartData();

// Ticker
const TICKER_ITEMS = [
  { pair: "EUR/USD", price: "1.08432", delta: "+0.12%" },
  { pair: "GBP/USD", price: "1.26710", delta: "-0.08%" },
  { pair: "USD/JPY", price: "149.820", delta: "+0.31%" },
  { pair: "AUD/USD", price: "0.65140", delta: "-0.15%" },
  { pair: "USD/CAD", price: "1.36280", delta: "+0.07%" },
  { pair: "USD/CHF", price: "0.89720", delta: "-0.03%" },
  { pair: "NZD/USD", price: "0.59830", delta: "+0.18%" },
  { pair: "EUR/GBP", price: "0.85610", delta: "+0.05%" },
  { pair: "EUR/JPY", price: "162.340", delta: "+0.43%" },
  { pair: "GBP/JPY", price: "189.540", delta: "+0.22%" },
];

function formatTime(date: Date) {
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function formatDateTime(date: Date) {
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// --- Components ---

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--sx-green)] animate-pulse-dot" />
      <span className="font-mono text-[10px] text-[var(--sx-green)] tracking-widest uppercase">LIVE</span>
    </span>
  );
}


function SignalCard({ signal, index }: { signal: ReturnType<typeof generateSignal>; index: number }) {
  const isUp = signal.direction === "UP";
  const [expanded, setExpanded] = useState(false);
  const { levels, ta, zoneReason } = signal;

  return (
    <div
      className="animate-fade-in rounded-lg border flex flex-col transition-all"
      style={{
        background: "var(--sx-surface)",
        borderColor: expanded ? "var(--sx-border-light)" : "var(--sx-border)",
        animationDelay: `${index * 60}ms`,
        animationFillMode: "both",
        opacity: 0,
      }}
    >
      {/* Main content */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-sm text-[var(--sx-text)]">{signal.asset}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium"
              style={{ background: "var(--sx-border)", color: "var(--sx-text-muted)" }}
            >
              {signal.tf}
            </span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded font-mono font-semibold flex items-center gap-1 ${isUp ? "signal-badge-up" : "signal-badge-down"}`}
          >
            {isUp ? "▲" : "▼"} {signal.direction}
          </span>
        </div>

        {/* Zone reason */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono"
          style={{
            background: isUp ? "var(--sx-green-dim)" : "var(--sx-red-dim)",
            color: isUp ? "var(--sx-green)" : "var(--sx-red)",
          }}
        >
          <Icon name={isUp ? "TrendingUp" : "TrendingDown"} size={10} />
          {zoneReason}
        </div>

        {/* Strength bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Сила сигнала</span>
            <span className="text-[10px] font-mono" style={{ color: isUp ? "var(--sx-green)" : "var(--sx-red)" }}>
              {signal.strength}%
            </span>
          </div>
          <div className="h-1 rounded-full" style={{ background: "var(--sx-border)" }}>
            <div
              className="h-1 rounded-full transition-all"
              style={{ width: `${signal.strength}%`, background: isUp ? "var(--sx-green)" : "var(--sx-red)" }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--sx-border)" }}>
          <div className="flex items-center gap-1 text-[var(--sx-text-muted)]">
            <Icon name="Clock" size={11} />
            <span className="font-mono text-[11px]">{formatTime(signal.time)}</span>
          </div>
          <span className="font-mono text-[11px] text-[var(--sx-text-muted)]">Экспирация: {signal.expiry}</span>
          <div className="flex items-center gap-1">
            <Icon name="Target" size={11} className="text-[var(--sx-text-muted)]" />
            <span className="font-mono text-[11px]" style={{ color: "var(--sx-green)" }}>
              {signal.accuracy}%
            </span>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-center gap-1 py-1.5 border-t text-[10px] font-mono transition-colors hover:bg-[var(--sx-surface-2)]"
        style={{ borderColor: "var(--sx-border)", color: "var(--sx-text-dim)" }}
      >
        <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={11} />
        {expanded ? "Скрыть анализ" : "Технический анализ"}
      </button>

      {/* Expanded: TA + Levels */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 animate-fade-in border-t" style={{ borderColor: "var(--sx-border)" }}>

          {/* Levels */}
          <div className="pt-3">
            <div className="text-[10px] font-mono text-[var(--sx-text-muted)] uppercase tracking-wider mb-2">Уровни S/R</div>
            <div className="relative">
              {/* Визуальная шкала уровней */}
              <div className="flex flex-col gap-1">
                {[
                  { label: "R2", val: levels.r2, color: "var(--sx-red)" },
                  { label: "R1", val: levels.r1, color: "var(--sx-red)", opacity: "0.7" },
                  { label: "Цена", val: levels.price, color: "var(--sx-text)", isCurrent: true },
                  { label: "S1", val: levels.s1, color: "var(--sx-green)", opacity: "0.7" },
                  { label: "S2", val: levels.s2, color: "var(--sx-green)" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] w-7 text-right" style={{ color: l.color, opacity: l.opacity ?? 1 }}>
                      {l.label}
                    </span>
                    <div className="flex-1 flex items-center gap-1">
                      <div
                        className="h-px flex-1"
                        style={{
                          background: l.isCurrent ? "var(--sx-text-muted)" : l.color,
                          opacity: l.isCurrent ? 1 : 0.5,
                          height: l.isCurrent ? "2px" : "1px",
                        }}
                      />
                    </div>
                    <span
                      className="font-mono text-[10px] tabular-nums"
                      style={{ color: l.isCurrent ? "var(--sx-text)" : l.color, opacity: l.opacity ?? 1, fontWeight: l.isCurrent ? 600 : 400 }}
                    >
                      {l.val}
                    </span>
                    {l.isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--sx-text-muted)" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Technical indicators */}
          <div className="border-t pt-3" style={{ borderColor: "var(--sx-border)" }}>
            <div className="text-[10px] font-mono text-[var(--sx-text-muted)] uppercase tracking-wider mb-2">Индикаторы</div>
            <div className="grid grid-cols-2 gap-2">

              {/* RSI */}
              <div className="rounded p-2 flex items-center justify-between" style={{ background: "var(--sx-surface-2)" }}>
                <div>
                  <div className="font-mono text-[10px] text-[var(--sx-text-muted)]">RSI (14)</div>
                  <div className="font-mono text-sm font-semibold tabular-nums" style={{
                    color: ta.rsi >= 70 ? "var(--sx-red)" : ta.rsi <= 30 ? "var(--sx-green)" : "var(--sx-blue)"
                  }}>
                    {ta.rsi}
                  </div>
                </div>
                <div className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                  background: ta.rsi >= 70 ? "var(--sx-red-dim)" : ta.rsi <= 30 ? "var(--sx-green-dim)" : "var(--sx-blue-dim)",
                  color: ta.rsi >= 70 ? "var(--sx-red)" : ta.rsi <= 30 ? "var(--sx-green)" : "var(--sx-blue)",
                }}>
                  {ta.rsi >= 70 ? "Перекуп." : ta.rsi <= 30 ? "Перепрод." : "Нейтрал"}
                </div>
              </div>

              {/* MACD */}
              <div className="rounded p-2 flex items-center justify-between" style={{ background: "var(--sx-surface-2)" }}>
                <div>
                  <div className="font-mono text-[10px] text-[var(--sx-text-muted)]">MACD</div>
                  <div className="font-mono text-sm font-semibold tabular-nums" style={{
                    color: ta.macdSignal === "BUY" ? "var(--sx-green)" : "var(--sx-red)"
                  }}>
                    {ta.macdVal > 0 ? "+" : ""}{ta.macdVal}
                  </div>
                </div>
                <div className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                  background: ta.macdSignal === "BUY" ? "var(--sx-green-dim)" : "var(--sx-red-dim)",
                  color: ta.macdSignal === "BUY" ? "var(--sx-green)" : "var(--sx-red)",
                }}>
                  {ta.macdSignal}
                </div>
              </div>

              {/* EMA Cross */}
              <div className="rounded p-2 flex items-center justify-between" style={{ background: "var(--sx-surface-2)" }}>
                <div>
                  <div className="font-mono text-[10px] text-[var(--sx-text-muted)]">EMA 9/21</div>
                  <div className="font-mono text-[10px] text-[var(--sx-text-muted)]">Пересечение</div>
                </div>
                <div className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                  background: ta.emaCross === "BUY" ? "var(--sx-green-dim)" : "var(--sx-red-dim)",
                  color: ta.emaCross === "BUY" ? "var(--sx-green)" : "var(--sx-red)",
                }}>
                  {ta.emaCross}
                </div>
              </div>

              {/* Bollinger */}
              <div className="rounded p-2" style={{ background: "var(--sx-surface-2)" }}>
                <div className="font-mono text-[10px] text-[var(--sx-text-muted)] mb-1">Боллинджер</div>
                <div className="relative h-2 rounded-full" style={{ background: "var(--sx-border)" }}>
                  <div
                    className="absolute top-0 h-2 w-2 rounded-full -translate-x-1/2 transition-all"
                    style={{ left: `${ta.bbPos}%`, background: ta.bbPos > 75 ? "var(--sx-red)" : ta.bbPos < 25 ? "var(--sx-green)" : "var(--sx-blue)" }}
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="font-mono text-[9px] text-[var(--sx-text-dim)]">нижн.</span>
                  <span className="font-mono text-[9px] text-[var(--sx-text-dim)]">верхн.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsSection() {
  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {ANALYTICS.map((a, i) => (
          <div
            key={a.label}
            className="rounded-lg border p-4 animate-fade-in"
            style={{
              background: "var(--sx-surface)",
              borderColor: "var(--sx-border)",
              animationDelay: `${i * 60}ms`,
              animationFillMode: "both",
              opacity: 0,
            }}
          >
            <div className="text-[11px] font-mono text-[var(--sx-text-muted)] uppercase tracking-wider mb-2">{a.label}</div>
            <div className="font-mono text-2xl font-semibold text-[var(--sx-text)]">{a.value}</div>
            {a.delta && (
              <div
                className="font-mono text-[11px] mt-1"
                style={{ color: a.up ? "var(--sx-green)" : "var(--sx-red)" }}
              >
                {a.delta} за 24ч
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart — последние 2 часа */}
      <div
        className="rounded-lg border p-4"
        style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Точность за последний час</span>
          <span className="font-mono text-xs" style={{ color: "var(--sx-green)" }}>
            {Math.round(CHART_DATA.reduce((s, d) => s + d.accuracy, 0) / CHART_DATA.length)}% avg
          </span>
        </div>
        <div className="font-mono text-[10px] text-[var(--sx-text-dim)] mb-4">
          {CHART_DATA[0].label} — {CHART_DATA[CHART_DATA.length - 1].label} · шаг 5 мин
        </div>

        {/* Bars */}
        <div className="flex items-end gap-0.5 h-28 mb-2">
          {CHART_DATA.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end group relative">
              <div
                className="w-full rounded-sm animate-chart-grow transition-opacity"
                style={{
                  height: `${d.accuracy}%`,
                  background: d.accuracy >= 82 ? "var(--sx-green)" : d.accuracy >= 70 ? "var(--sx-blue)" : "var(--sx-red)",
                  opacity: 0.85,
                  animationDelay: `${i * 25}ms`,
                  animationFillMode: "both",
                  transformOrigin: "bottom",
                }}
              />
              {/* Tooltip on hover */}
              <div
                className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none z-10 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap transition-opacity"
                style={{ background: "var(--sx-surface-2)", border: "1px solid var(--sx-border-light)", color: "var(--sx-text)" }}
              >
                {d.label}<br />{d.accuracy}%
              </div>
            </div>
          ))}
        </div>

        {/* Time axis — показываем каждую 6-ю метку */}
        <div className="flex justify-between">
          {CHART_DATA.filter((_, i) => i % 6 === 0 || i === CHART_DATA.length - 1).map((d, i) => (
            <span key={i} className="font-mono text-[9px] text-[var(--sx-text-dim)]">{d.label}</span>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: "var(--sx-border)" }}>
          {[
            { color: "var(--sx-green)", label: "≥82% — сильный" },
            { color: "var(--sx-blue)", label: "70–81% — средний" },
            { color: "var(--sx-red)", label: "<70% — слабый" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: l.color }} />
              <span className="font-mono text-[9px] text-[var(--sx-text-dim)]">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Win/Loss by asset */}
      <div
        className="rounded-lg border p-4"
        style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}
      >
        <div className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider mb-4">Win Rate по активам</div>
        <div className="space-y-3">
          {ASSETS.slice(0, 5).map((asset) => {
            const rate = Math.floor(randomBetween(65, 93));
            return (
              <div key={asset} className="flex items-center gap-3">
                <span className="font-mono text-xs text-[var(--sx-text-muted)] w-16">{asset}</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--sx-border)" }}>
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${rate}%`,
                      background: rate >= 80 ? "var(--sx-green)" : rate >= 70 ? "var(--sx-blue)" : "var(--sx-yellow)",
                    }}
                  />
                </div>
                <span className="font-mono text-xs w-8 text-right" style={{ color: "var(--sx-text-muted)" }}>
                  {rate}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Support & Resistance levels по парам */}
      <div
        className="rounded-lg border p-4"
        style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Уровни поддержки / сопротивления</span>
          <span className="font-mono text-[10px] text-[var(--sx-text-dim)]">обновлено сейчас</span>
        </div>
        <div className="space-y-4">
          {ASSETS.slice(0, 6).map((asset) => {
            const lv = generateLevels(asset);
            const range = lv.r2 - lv.s2;
            const pricePct = range > 0 ? ((lv.price - lv.s2) / range) * 100 : 50;
            return (
              <div key={asset}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs text-[var(--sx-text)]">{asset}</span>
                  <span className="font-mono text-xs tabular-nums text-[var(--sx-text-muted)]">{lv.price}</span>
                </div>
                {/* Шкала S2 — S1 — Price — R1 — R2 */}
                <div className="relative h-5">
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    <div className="w-full h-px" style={{ background: "var(--sx-border-light)" }} />
                  </div>
                  {/* S2 */}
                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "0%" }}>
                    <div className="w-px h-full" style={{ background: "var(--sx-green)", opacity: 0.5 }} />
                  </div>
                  {/* S1 */}
                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "25%" }}>
                    <div className="w-px h-full" style={{ background: "var(--sx-green)", opacity: 0.8 }} />
                  </div>
                  {/* R1 */}
                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "75%" }}>
                    <div className="w-px h-full" style={{ background: "var(--sx-red)", opacity: 0.8 }} />
                  </div>
                  {/* R2 */}
                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "100%" }}>
                    <div className="w-px h-full" style={{ background: "var(--sx-red)", opacity: 0.5 }} />
                  </div>
                  {/* Текущая цена — dot */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 animate-pulse-dot"
                    style={{
                      left: `${Math.min(95, Math.max(5, pricePct))}%`,
                      background: "var(--sx-bg)",
                      borderColor: "var(--sx-text)",
                    }}
                  />
                </div>
                {/* Labels */}
                <div className="flex justify-between mt-1">
                  <span className="font-mono text-[9px]" style={{ color: "var(--sx-green)", opacity: 0.7 }}>S2 {lv.s2}</span>
                  <span className="font-mono text-[9px]" style={{ color: "var(--sx-green)" }}>S1 {lv.s1}</span>
                  <span className="font-mono text-[9px]" style={{ color: "var(--sx-red)" }}>R1 {lv.r1}</span>
                  <span className="font-mono text-[9px]" style={{ color: "var(--sx-red)", opacity: 0.7 }}>R2 {lv.r2}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HistorySection() {
  const wins = HISTORY.filter((h) => h.result === "WIN").length;
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-3">
        <div
          className="flex-1 rounded-lg border p-3 flex flex-col items-center"
          style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}
        >
          <span className="font-mono text-2xl font-semibold" style={{ color: "var(--sx-green)" }}>
            {wins}
          </span>
          <span className="font-mono text-[10px] text-[var(--sx-text-muted)] uppercase tracking-wider mt-1">WIN</span>
        </div>
        <div
          className="flex-1 rounded-lg border p-3 flex flex-col items-center"
          style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}
        >
          <span className="font-mono text-2xl font-semibold" style={{ color: "var(--sx-red)" }}>
            {HISTORY.length - wins}
          </span>
          <span className="font-mono text-[10px] text-[var(--sx-text-muted)] uppercase tracking-wider mt-1">LOSS</span>
        </div>
        <div
          className="flex-1 rounded-lg border p-3 flex flex-col items-center"
          style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}
        >
          <span className="font-mono text-2xl font-semibold text-[var(--sx-text)]">
            {Math.round((wins / HISTORY.length) * 100)}%
          </span>
          <span className="font-mono text-[10px] text-[var(--sx-text-muted)] uppercase tracking-wider mt-1">Точность</span>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}
      >
        <div
          className="grid grid-cols-4 px-4 py-2 border-b text-[10px] font-mono uppercase tracking-wider text-[var(--sx-text-muted)]"
          style={{ borderColor: "var(--sx-border)", background: "var(--sx-surface-2)" }}
        >
          <span>Актив</span>
          <span>Направление</span>
          <span>Время</span>
          <span className="text-right">Результат</span>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--sx-border)" }}>
          {HISTORY.map((h, i) => (
            <div
              key={h.id}
              className="grid grid-cols-4 px-4 py-2.5 items-center animate-fade-in hover:bg-[var(--sx-surface-2)] transition-colors"
              style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both", opacity: 0 }}
            >
              <span className="font-mono text-xs text-[var(--sx-text)]">{h.asset}</span>
              <span
                className="font-mono text-xs"
                style={{ color: h.direction === "UP" ? "var(--sx-green)" : "var(--sx-red)" }}
              >
                {h.direction === "UP" ? "▲" : "▼"} {h.direction}
              </span>
              <span className="font-mono text-[11px] text-[var(--sx-text-muted)]">{formatDateTime(h.date)}</span>
              <span
                className="font-mono text-xs text-right font-semibold"
                style={{ color: h.result === "WIN" ? "var(--sx-green)" : "var(--sx-red)" }}
              >
                {h.profit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsSection() {
  const [notifications, setNotifications] = useState({ push: true, email: false, sound: true });
  const [filters, setFilters] = useState({ minAccuracy: 75, assets: ["EUR/USD", "BTC/USD"], timeframes: ["5m", "15m"] });

  return (
    <div className="space-y-4">
      {/* Notifications */}
      <div
        className="rounded-lg border p-4 space-y-4"
        style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}
      >
        <div className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Уведомления</div>
        {[
          { key: "push", label: "Push-уведомления", desc: "В браузере и мобильном" },
          { key: "email", label: "Email-уведомления", desc: "На почту при новом сигнале" },
          { key: "sound", label: "Звуковой сигнал", desc: "Звук при получении сигнала" },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--sx-text)]">{item.label}</div>
              <div className="text-[11px] font-mono text-[var(--sx-text-muted)]">{item.desc}</div>
            </div>
            <button
              onClick={() => setNotifications((n) => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
              className="relative w-10 h-5 rounded-full transition-colors"
              style={{
                background: notifications[item.key as keyof typeof notifications] ? "var(--sx-green)" : "var(--sx-border-light)",
              }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{
                  left: notifications[item.key as keyof typeof notifications] ? "calc(100% - 18px)" : "2px",
                }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="rounded-lg border p-4 space-y-4"
        style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}
      >
        <div className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Фильтры сигналов</div>
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-[var(--sx-text)]">Мин. точность</span>
            <span className="font-mono text-sm" style={{ color: "var(--sx-green)" }}>
              {filters.minAccuracy}%
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={95}
            value={filters.minAccuracy}
            onChange={(e) => setFilters((f) => ({ ...f, minAccuracy: +e.target.value }))}
            className="w-full accent-[var(--sx-green)] cursor-pointer"
            style={{ accentColor: "var(--sx-green)" }}
          />
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[10px] text-[var(--sx-text-dim)]">50%</span>
            <span className="font-mono text-[10px] text-[var(--sx-text-dim)]">95%</span>
          </div>
        </div>

        {/* Assets */}
        <div>
          <div className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider mb-2">Активы</div>
          <div className="flex flex-wrap gap-2">
            {ASSETS.map((asset) => {
              const active = filters.assets.includes(asset);
              return (
                <button
                  key={asset}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      assets: active ? f.assets.filter((a) => a !== asset) : [...f.assets, asset],
                    }))
                  }
                  className="px-2.5 py-1 rounded text-[11px] font-mono transition-all"
                  style={{
                    background: active ? "var(--sx-green-dim)" : "var(--sx-border)",
                    color: active ? "var(--sx-green)" : "var(--sx-text-muted)",
                    border: `1px solid ${active ? "var(--sx-green)" : "var(--sx-border-light)"}`,
                  }}
                >
                  {asset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeframes */}
        <div>
          <div className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider mb-2">Таймфреймы</div>
          <div className="flex gap-2">
            {["1m", "5m", "15m", "30m", "1h"].map((tf) => {
              const active = filters.timeframes.includes(tf);
              return (
                <button
                  key={tf}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      timeframes: active ? f.timeframes.filter((t) => t !== tf) : [...f.timeframes, tf],
                    }))
                  }
                  className="px-3 py-1 rounded text-[11px] font-mono transition-all"
                  style={{
                    background: active ? "var(--sx-blue-dim)" : "var(--sx-border)",
                    color: active ? "var(--sx-blue)" : "var(--sx-text-muted)",
                    border: `1px solid ${active ? "var(--sx-blue)" : "var(--sx-border-light)"}`,
                  }}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Email input */}
      <div
        className="rounded-lg border p-4 space-y-3"
        style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}
      >
        <div className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Email для уведомлений</div>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="your@email.com"
            className="flex-1 px-3 py-2 rounded text-sm font-mono outline-none transition-all"
            style={{
              background: "var(--sx-surface-2)",
              border: "1px solid var(--sx-border-light)",
              color: "var(--sx-text)",
            }}
          />
          <button
            className="px-4 py-2 rounded text-sm font-mono font-medium transition-all hover:opacity-90"
            style={{ background: "var(--sx-green)", color: "#000" }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main ---
const TABS = [
  { id: "signals", label: "Сигналы", icon: "Zap" },
  { id: "analytics", label: "Аналитика", icon: "BarChart2" },
  { id: "history", label: "История", icon: "Clock" },
  { id: "settings", label: "Настройки", icon: "Settings" },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState("signals");
  const [signals, setSignals] = useState(INITIAL_SIGNALS);
  const [time, setTime] = useState(new Date());
  const [newSignalPulse, setNewSignalPulse] = useState(false);
  const [activePairs, setActivePairs] = useState<string[]>([]);

  const togglePair = (pair: string) => {
    setActivePairs((prev) =>
      prev.includes(pair) ? prev.filter((p) => p !== pair) : [...prev, pair]
    );
  };

  const filteredSignals = activePairs.length === 0
    ? signals
    : signals.filter((s) => activePairs.includes(s.asset));

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSignals((prev) => {
        const newSig = generateSignal(Date.now());
        setNewSignalPulse(true);
        setTimeout(() => setNewSignalPulse(false), 800);
        return [newSig, ...prev.slice(0, 11)];
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--sx-bg)" }}>
      {/* Header */}
      <header
        className="border-b px-4 py-0 flex items-center justify-between sticky top-0 z-50"
        style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-3 py-3">
          <div
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: "var(--sx-green)", color: "#000" }}
          >
            <Icon name="Zap" size={14} />
          </div>
          <span className="font-mono font-semibold text-sm tracking-wide text-[var(--sx-text)]">SignalX</span>
        </div>

        <div className="flex items-center gap-4">
          <LiveDot />
          <div className="font-mono text-xs tabular-nums text-[var(--sx-text-muted)]">
            {time.toLocaleTimeString("ru-RU")}
          </div>
          <button
            className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-[var(--sx-border)]"
            style={{ color: "var(--sx-text-muted)" }}
          >
            <Icon name="Bell" size={15} />
          </button>
        </div>
      </header>

      {/* Ticker */}
      <div
        className="border-b overflow-hidden relative"
        style={{ background: "var(--sx-surface-2)", borderColor: "var(--sx-border)" }}
      >
        <div className="flex animate-ticker whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-5 py-1.5 shrink-0">
              <span className="font-mono text-[11px] text-[var(--sx-text-muted)]">{item.pair}</span>
              <span className="font-mono text-[11px] text-[var(--sx-text)]">{item.price}</span>
              <span
                className="font-mono text-[10px]"
                style={{ color: item.delta.startsWith("+") ? "var(--sx-green)" : "var(--sx-red)" }}
              >
                {item.delta}
              </span>
              <span className="text-[var(--sx-text-dim)] mx-2">·</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-mono text-lg font-semibold text-[var(--sx-text)]">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
            {activeTab === "signals" && (
              <div className="font-mono text-[11px] text-[var(--sx-text-muted)] mt-0.5">
                Активных сигналов: <span style={{ color: "var(--sx-green)" }}>{filteredSignals.length}</span>
                {activePairs.length > 0 && (
                  <span className="ml-1" style={{ color: "var(--sx-text-dim)" }}>
                    · фильтр: {activePairs.length} пар
                  </span>
                )}
              </div>
            )}
          </div>
          {activeTab === "signals" && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono transition-all ${newSignalPulse ? "scale-105" : ""}`}
              style={{
                background: "var(--sx-green-dim)",
                color: "var(--sx-green)",
                border: "1px solid var(--sx-green)",
                transition: "transform 0.2s",
              }}
            >
              <Icon name="TrendingUp" size={12} />
              +{signals.length} новых
            </div>
          )}
        </div>

        {/* Filter bar */}
        {activeTab === "signals" && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActivePairs([])}
              className="shrink-0 px-3 py-1 rounded text-[11px] font-mono transition-all"
              style={{
                background: activePairs.length === 0 ? "var(--sx-green-dim)" : "var(--sx-border)",
                color: activePairs.length === 0 ? "var(--sx-green)" : "var(--sx-text-muted)",
                border: `1px solid ${activePairs.length === 0 ? "var(--sx-green)" : "var(--sx-border-light)"}`,
              }}
            >
              Все
            </button>
            {ASSETS.map((pair) => {
              const active = activePairs.includes(pair);
              return (
                <button
                  key={pair}
                  onClick={() => togglePair(pair)}
                  className="shrink-0 px-3 py-1 rounded text-[11px] font-mono transition-all"
                  style={{
                    background: active ? "var(--sx-green-dim)" : "var(--sx-border)",
                    color: active ? "var(--sx-green)" : "var(--sx-text-muted)",
                    border: `1px solid ${active ? "var(--sx-green)" : "var(--sx-border-light)"}`,
                  }}
                >
                  {pair}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {activeTab === "signals" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredSignals.length > 0 ? (
              filteredSignals.map((s, i) => (
                <SignalCard key={s.id} signal={s} index={i} />
              ))
            ) : (
              <div
                className="col-span-2 py-16 flex flex-col items-center gap-2 rounded-lg border"
                style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}
              >
                <Icon name="Search" size={24} className="text-[var(--sx-text-dim)]" />
                <span className="font-mono text-sm text-[var(--sx-text-muted)]">Нет сигналов по выбранным парам</span>
                <button
                  onClick={() => setActivePairs([])}
                  className="font-mono text-[11px] mt-1"
                  style={{ color: "var(--sx-green)" }}
                >
                  Сбросить фильтр
                </button>
              </div>
            )}
          </div>
        )}
        {activeTab === "analytics" && <AnalyticsSection />}
        {activeTab === "history" && <HistorySection />}
        {activeTab === "settings" && <SettingsSection />}
      </main>

      {/* Bottom navigation */}
      <nav
        className="border-t sticky bottom-0 z-50"
        style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}
      >
        <div className="flex max-w-2xl mx-auto">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center py-3 gap-1 transition-colors"
                style={{ color: active ? "var(--sx-green)" : "var(--sx-text-muted)" }}
              >
                <div className="relative">
                  <Icon name={tab.icon} fallback="Circle" size={18} />
                  {tab.id === "signals" && newSignalPulse && (
                    <span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse-dot"
                      style={{ background: "var(--sx-green)" }}
                    />
                  )}
                </div>
                <span className="font-mono text-[10px] tracking-wide">{tab.label}</span>
                {active && (
                  <span
                    className="absolute bottom-0 h-0.5 w-8 rounded-full"
                    style={{ background: "var(--sx-green)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}