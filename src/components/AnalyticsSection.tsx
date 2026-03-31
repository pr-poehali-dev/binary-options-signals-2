import { useMemo } from "react";
import Icon from "@/components/ui/icon";
import { useState } from "react";
import {
  ASSETS, CHART_DATA, HistoryItem,
  getCurrentSession, SESSION_LABEL,
  generateLevels, getCandles,
  detectTrend1M, detectPatterns, detectVolumeSpikes,
} from "@/lib/signals";
import { LiveDot } from "@/components/SignalCard";

// ─── Chart1MBlock ─────────────────────────────────────────────────────────────

function Chart1MBlock() {
  const [asset, setAsset] = useState("EUR/USD");
  const candles = useMemo(() => getCandles(asset), [asset]);
  const trend = useMemo(() => detectTrend1M(candles), [candles]);
  const patterns = useMemo(() => detectPatterns(candles), [candles]);
  const volSpikes = useMemo(() => detectVolumeSpikes(candles), [candles]);

  const cur  = candles[candles.length - 1];
  const priceChange = cur.close - candles[0].close;
  const priceChangePct = ((priceChange / candles[0].close) * 100).toFixed(3);

  const allHigh = Math.max(...candles.map(c => c.high));
  const allLow  = Math.min(...candles.map(c => c.low));
  const priceRange = allHigh - allLow || 0.0001;
  const yPct = (v: number) => 100 - ((v - allLow) / priceRange) * 100;

  const barW = 100 / candles.length;

  const atrPips = +((allHigh - allLow) / (cur.close > 10 ? 0.01 : 0.0001)).toFixed(1);

  const outSignal = trend.dir === "FLAT"
    ? { dir: "WAIT", color: "var(--sx-yellow)", label: "ОЖИДАНИЕ", desc: "Боковик — воздержаться от входа" }
    : trend.dir === "UP"
    ? { dir: "UP", color: "var(--sx-green)", label: "UP ▲", desc: `Текущее смещение: +${priceChangePct}%` }
    : { dir: "DOWN", color: "var(--sx-red)", label: "DOWN ▼", desc: `Текущее смещение: ${priceChangePct}%` };

  const isUp = trend.dir === "UP";

  return (
    <div className="rounded-lg border overflow-hidden" style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}>
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--sx-border)", background: "var(--sx-surface-2)" }}>
        <div className="flex items-center gap-2">
          <Icon name="CandlestickChart" size={13} className="text-[var(--sx-text-muted)]" />
          <span className="font-mono text-xs text-[var(--sx-text-muted)] uppercase tracking-wider">1M · 90 баров · 1.5 часа</span>
        </div>
        <LiveDot />
      </div>

      {/* Выбор актива */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1 overflow-x-auto">
        {["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "EUR/JPY"].map(a => (
          <button key={a} onClick={() => setAsset(a)}
            className="shrink-0 px-2.5 py-1 rounded text-[11px] font-mono transition-all"
            style={{
              background: asset === a ? (isUp ? "var(--sx-green-dim)" : "var(--sx-red-dim)") : "var(--sx-border)",
              color: asset === a ? (isUp ? "var(--sx-green)" : "var(--sx-red)") : "var(--sx-text-muted)",
              border: `1px solid ${asset === a ? (isUp ? "var(--sx-green)" : "var(--sx-red)") : "var(--sx-border-light)"}`,
            }}>
            {a}
          </button>
        ))}
      </div>

      {/* Текущая цена */}
      <div className="px-4 py-3 flex items-end gap-3">
        <span className="font-mono text-2xl font-bold text-[var(--sx-text)]">{cur.close}</span>
        <span className="font-mono text-sm mb-0.5" style={{ color: priceChange >= 0 ? "var(--sx-green)" : "var(--sx-red)" }}>
          {priceChange >= 0 ? "+" : ""}{priceChangePct}%
        </span>
        <span className="font-mono text-xs text-[var(--sx-text-dim)] mb-0.5 ml-auto">H: {cur.high} · L: {cur.low}</span>
      </div>

      {/* SVG ГРАФИК */}
      <div className="px-4 pb-1">
        <svg viewBox="0 0 100 60" className="w-full" style={{ height: 180 }} preserveAspectRatio="none">
          {[20, 40, 60, 80].map(y => (
            <line key={y} x1="0" y1={y * 0.6} x2="100" y2={y * 0.6}
              stroke="var(--sx-border)" strokeWidth="0.3" strokeDasharray="1,1" />
          ))}

          {candles.map((c, i) => {
            const x = (i + 0.5) * barW;
            const candleUp = c.close >= c.open;
            const color = candleUp ? "var(--sx-green)" : "var(--sx-red)";
            const yHigh  = yPct(c.high)  * 0.6;
            const yLow   = yPct(c.low)   * 0.6;
            const yOpen  = yPct(c.open)  * 0.6;
            const yClose = yPct(c.close) * 0.6;
            const bodyTop    = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(0.3, Math.abs(yClose - yOpen));
            const isSpike = volSpikes.includes(i);
            return (
              <g key={i}>
                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={isSpike ? "0.6" : "0.3"} strokeOpacity={isSpike ? 1 : 0.7} />
                <rect x={x - barW * 0.35} y={bodyTop} width={barW * 0.7} height={bodyHeight}
                  fill={color} fillOpacity={isSpike ? 1 : 0.85} />
                {isSpike && <circle cx={x} cy={yHigh - 1} r="0.8" fill="var(--sx-yellow)" fillOpacity="0.9" />}
              </g>
            );
          })}

          {/* EMA21 */}
          <polyline
            points={candles.map((c, i) => `${(i + 0.5) * barW},${(yPct(c.ema21) * 0.6).toFixed(2)}`).join(" ")}
            fill="none" stroke="var(--sx-blue)" strokeWidth="0.5" strokeOpacity="0.7" />

          {/* EMA9 */}
          <polyline
            points={candles.map((c, i) => `${(i + 0.5) * barW},${(yPct(c.ema9) * 0.6).toFixed(2)}`).join(" ")}
            fill="none" stroke="var(--sx-yellow)" strokeWidth="0.5" strokeOpacity="0.9" />

          <line x1="0" y1={yPct(cur.close) * 0.6} x2="100" y2={yPct(cur.close) * 0.6}
            stroke={priceChange >= 0 ? "var(--sx-green)" : "var(--sx-red)"} strokeWidth="0.4" strokeDasharray="2,1" strokeOpacity="0.9" />
        </svg>

        {/* Временная ось */}
        <div className="flex justify-between mt-1 mb-2">
          {[0, 22, 44, 66, 89].map(i => (
            <span key={i} className="font-mono text-[9px] text-[var(--sx-text-dim)]">{candles[i]?.time}</span>
          ))}
        </div>

        {/* Легенда */}
        <div className="flex items-center gap-4 pb-3">
          {[
            { c: "var(--sx-yellow)", l: "EMA 9" },
            { c: "var(--sx-blue)",   l: "EMA 21" },
            { c: "var(--sx-yellow)", l: "▪ всплеск объёма", dot: true },
          ].map(({ c, l, dot }) => (
            <div key={l} className="flex items-center gap-1.5">
              {dot ? <span className="w-2 h-2 rounded-full" style={{ background: c }} /> : <span className="w-4 border-t" style={{ borderColor: c, borderWidth: "1.5px" }} />}
              <span className="font-mono text-[9px] text-[var(--sx-text-dim)]">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Объём */}
      <div className="px-4 pb-3">
        <div className="text-[9px] font-mono text-[var(--sx-text-dim)] mb-1 uppercase tracking-wider">Объём (90 баров)</div>
        <div className="flex items-end gap-px h-8">
          {candles.map((c, i) => {
            const isSpike = volSpikes.includes(i);
            return (
              <div key={i} className="flex-1 rounded-sm"
                style={{ height: `${c.volume}%`, background: isSpike ? "var(--sx-yellow)" : (c.close >= c.open ? "var(--sx-green)" : "var(--sx-red)"), opacity: isSpike ? 0.9 : 0.45 }} />
            );
          })}
        </div>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-4 divide-x border-t" style={{ borderColor: "var(--sx-border)", background: "var(--sx-surface-2)" }}>
        {[
          { label: "ATR пипс", value: atrPips },
          { label: "Паттернов", value: patterns.length },
          { label: "Всплесков V", value: volSpikes.length },
          { label: "EMA кросс", value: cur.ema9 > cur.ema21 ? "↑" : "↓" },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center py-3" style={{ borderColor: "var(--sx-border)" }}>
            <span className="font-mono text-sm font-bold text-[var(--sx-text)]">{value}</span>
            <span className="font-mono text-[9px] text-[var(--sx-text-dim)] uppercase tracking-wide mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* Тренд и паттерны */}
      <div className="px-4 py-4 space-y-4 border-t" style={{ borderColor: "var(--sx-border)" }}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-[var(--sx-text-muted)] uppercase tracking-wider">Тренд 1M</span>
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 rounded-full" style={{ background: "var(--sx-border)" }}>
                <div className="h-1.5 rounded-full" style={{ width: `${trend.strength}%`, background: trend.dir === "UP" ? "var(--sx-green)" : trend.dir === "DOWN" ? "var(--sx-red)" : "var(--sx-yellow)" }} />
              </div>
              <span className="font-mono text-[10px] tabular-nums" style={{ color: trend.dir === "UP" ? "var(--sx-green)" : trend.dir === "DOWN" ? "var(--sx-red)" : "var(--sx-yellow)" }}>
                {trend.strength}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded text-[11px] font-mono"
            style={{ background: trend.dir === "UP" ? "var(--sx-green-dim)" : trend.dir === "DOWN" ? "var(--sx-red-dim)" : "rgba(255,200,0,0.08)", color: trend.dir === "UP" ? "var(--sx-green)" : trend.dir === "DOWN" ? "var(--sx-red)" : "var(--sx-yellow)" }}>
            <Icon name={trend.dir === "UP" ? "TrendingUp" : trend.dir === "DOWN" ? "TrendingDown" : "Minus"} size={12} />
            {trend.desc}
          </div>
        </div>

        {patterns.length > 0 && (
          <div>
            <div className="font-mono text-[10px] text-[var(--sx-text-muted)] uppercase tracking-wider mb-2">Свечные паттерны</div>
            <div className="space-y-1.5">
              {patterns.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{
                    background: p.dir === "UP" ? "var(--sx-green-dim)" : "var(--sx-red-dim)",
                    color: p.dir === "UP" ? "var(--sx-green)" : "var(--sx-red)",
                  }}>
                    {p.dir === "UP" ? "▲" : "▼"}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--sx-text)]">{p.name}</span>
                  <span className="font-mono text-[10px] text-[var(--sx-text-dim)] ml-auto">бар {p.bar}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Итоговый сигнал */}
        <div className="rounded-lg p-3 border" style={{
          background: outSignal.dir === "UP" ? "var(--sx-green-dim)" : outSignal.dir === "DOWN" ? "var(--sx-red-dim)" : "rgba(255,200,0,0.06)",
          borderColor: outSignal.color,
        }}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[var(--sx-text-muted)] uppercase tracking-wider">Вывод по 1M</span>
            <span className="font-mono text-sm font-bold" style={{ color: outSignal.color }}>{outSignal.label}</span>
          </div>
          <div className="font-mono text-[11px] mt-1.5" style={{ color: outSignal.color }}>
            {outSignal.desc} · ATR {atrPips} пипс · {volSpikes.length} всплеск(ов) объёма
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AnalyticsSection ─────────────────────────────────────────────────────────

export default function AnalyticsSection({ history }: { history: HistoryItem[] }) {
  const wins = history.filter(h => h.result === "WIN").length;
  const total = history.length;
  const winRate = Math.round((wins / total) * 100);
  const avgAccuracy = Math.round(history.reduce((s, h) => s + h.accuracy, 0) / total);
  const chartAvg = Math.round(CHART_DATA.reduce((s, d) => s + d.accuracy, 0) / CHART_DATA.length);

  const assetStats = useMemo(() => ASSETS.map(asset => {
    const group = history.filter(h => h.asset === asset);
    const w = group.filter(h => h.result === "WIN").length;
    return { asset, rate: group.length ? Math.round((w / group.length) * 100) : 0, count: group.length };
  }).sort((a, b) => b.rate - a.rate), [history]);

  let maxStreak = 0, curStreak = 0;
  for (const h of history) {
    if (h.result === "WIN") { curStreak++; maxStreak = Math.max(maxStreak, curStreak); }
    else curStreak = 0;
  }

  return (
    <div className="space-y-4">
      {/* 1M График за 1.5 часа */}
      <Chart1MBlock />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "WIN Rate", value: `${winRate}%`, delta: "+3.2%", up: true, icon: "TrendingUp" },
          { label: "Средняя точность", value: `${avgAccuracy}%`, delta: "+1.8%", up: true, icon: "Target" },
          { label: "Серия WIN", value: `${maxStreak}`, delta: "подряд", up: true, icon: "Zap" },
          { label: "Активных пар", value: "10", delta: SESSION_LABEL[getCurrentSession()], up: true, icon: "Globe" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-lg border p-4 animate-fade-in"
            style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)", animationDelay: `${i * 60}ms`, animationFillMode: "both", opacity: 0 }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Icon name={stat.icon} size={11} className="text-[var(--sx-text-muted)]" />
              <span className="text-[10px] font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="font-mono text-2xl font-bold text-[var(--sx-text)]">{stat.value}</div>
            <div className="font-mono text-[11px] mt-1" style={{ color: stat.up ? "var(--sx-green)" : "var(--sx-red)" }}>
              {stat.delta}
            </div>
          </div>
        ))}
      </div>

      {/* График точности (1 час) */}
      <div className="rounded-lg border p-4" style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Точность сигналов — последний час</span>
          <span className="font-mono text-xs" style={{ color: chartAvg >= 85 ? "var(--sx-green)" : "var(--sx-yellow)" }}>{chartAvg}% avg</span>
        </div>
        <div className="font-mono text-[10px] text-[var(--sx-text-dim)] mb-3">
          {CHART_DATA[0].label} — {CHART_DATA[CHART_DATA.length - 1].label} · шаг 5 мин
        </div>

        <div className="flex items-end gap-0.5 h-28 mb-2 relative">
          {CHART_DATA.map((d, i) => (
            <div key={i} className="flex-1 h-full flex flex-col justify-end group relative">
              <div
                className="w-full rounded-sm animate-chart-grow"
                style={{
                  height: `${d.accuracy}%`,
                  background: d.accuracy >= 88 ? "var(--sx-green)" : d.accuracy >= 78 ? "var(--sx-blue)" : "var(--sx-red)",
                  opacity: 0.8,
                  animationDelay: `${i * 25}ms`,
                  animationFillMode: "both",
                  transformOrigin: "bottom",
                }}
              />
              <div
                className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 z-10 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap"
                style={{ background: "var(--sx-surface-2)", border: "1px solid var(--sx-border-light)", color: "var(--sx-text)" }}
              >
                {d.label} · {d.accuracy}%
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {CHART_DATA.filter((_, i) => i % 3 === 0 || i === 11).map((d, i) => (
            <span key={i} className="font-mono text-[9px] text-[var(--sx-text-dim)]">{d.label}</span>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: "var(--sx-border)" }}>
          {[{ c: "var(--sx-green)", l: "≥88%" }, { c: "var(--sx-blue)", l: "78–87%" }, { c: "var(--sx-red)", l: "<78%" }].map(({ c, l }) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: c }} />
              <span className="font-mono text-[9px] text-[var(--sx-text-dim)]">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* WIN Rate по активам */}
      <div className="rounded-lg border p-4" style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}>
        <div className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider mb-4">WIN Rate по парам</div>
        <div className="space-y-2.5">
          {assetStats.map(({ asset, rate, count }) => (
            <div key={asset} className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-[var(--sx-text)] w-16 shrink-0">{asset}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--sx-border)" }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${rate}%`, background: rate >= 80 ? "var(--sx-green)" : rate >= 70 ? "var(--sx-blue)" : "var(--sx-yellow)" }}
                />
              </div>
              <span className="font-mono text-[11px] w-8 text-right shrink-0" style={{
                color: rate >= 80 ? "var(--sx-green)" : rate >= 70 ? "var(--sx-blue)" : "var(--sx-yellow)"
              }}>{rate}%</span>
              <span className="font-mono text-[10px] text-[var(--sx-text-dim)] w-10 shrink-0">{count} сиг</span>
            </div>
          ))}
        </div>
      </div>

      {/* Уровни S/R по парам */}
      <div className="rounded-lg border p-4" style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Ключевые уровни S/R</span>
          <LiveDot />
        </div>
        <div className="space-y-4">
          {ASSETS.slice(0, 6).map(asset => {
            const lv = generateLevels(asset);
            const range = lv.r2 - lv.s2 || 1;
            const pricePct = Math.min(94, Math.max(6, ((lv.price - lv.s2) / range) * 100));
            const pivotPct = Math.min(94, Math.max(6, ((lv.pivot - lv.s2) / range) * 100));
            return (
              <div key={asset}>
                <div className="flex justify-between mb-1.5">
                  <span className="font-mono text-[11px] text-[var(--sx-text)]">{asset}</span>
                  <span className="font-mono text-[11px] tabular-nums text-[var(--sx-text-muted)]">{lv.price}</span>
                </div>
                <div className="relative h-6 rounded" style={{ background: "var(--sx-surface-2)" }}>
                  <div className="absolute top-0 left-0 h-full rounded-l" style={{ width: "25%", background: "var(--sx-green-dim)" }} />
                  <div className="absolute top-0 right-0 h-full rounded-r" style={{ width: "25%", background: "var(--sx-red-dim)" }} />
                  <div className="absolute top-0 bottom-0 w-px" style={{ left: `${pivotPct}%`, background: "var(--sx-yellow)", opacity: 0.7 }} />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 z-10"
                    style={{ left: `${pricePct}%`, background: "var(--sx-bg)", borderColor: "var(--sx-text)" }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-mono text-[9px]" style={{ color: "var(--sx-green)", opacity: 0.7 }}>S2 {lv.s2}</span>
                  <span className="font-mono text-[9px]" style={{ color: "var(--sx-green)" }}>S1 {lv.s1}</span>
                  <span className="font-mono text-[9px]" style={{ color: "var(--sx-yellow)" }}>PP {lv.pivot}</span>
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
