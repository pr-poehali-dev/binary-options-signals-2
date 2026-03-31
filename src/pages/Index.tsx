import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";

// ─── КОНСТАНТЫ ────────────────────────────────────────────────────────────────

const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY"];

const BASE_PRICES: Record<string, number> = {
  "EUR/USD": 1.0843, "GBP/USD": 1.2671, "USD/JPY": 149.82,
  "AUD/USD": 0.6514, "USD/CAD": 1.3628, "USD/CHF": 0.8972,
  "NZD/USD": 0.5983, "EUR/GBP": 0.8561, "EUR/JPY": 162.34, "GBP/JPY": 189.54,
};

// Сессии форекс с приоритетными парами
const SESSION_PAIRS: Record<string, string[]> = {
  tokyo:  ["USD/JPY", "AUD/USD", "NZD/USD", "EUR/JPY", "GBP/JPY"],
  london: ["EUR/USD", "GBP/USD", "EUR/GBP", "USD/CHF", "EUR/JPY"],
  ny:     ["EUR/USD", "GBP/USD", "USD/CAD", "USD/CHF", "USD/JPY"],
};

// Свечные паттерны
const BULLISH_PATTERNS = ["Молот", "Бычье поглощение", "Утренняя звезда", "Доджи разворот", "Пинбар вверх"];
const BEARISH_PATTERNS = ["Повешенный", "Медвежье поглощение", "Вечерняя звезда", "Shooting Star", "Пинбар вниз"];

// ─── УТИЛИТЫ ──────────────────────────────────────────────────────────────────

function rnd(min: number, max: number) { return Math.random() * (max - min) + min; }
function rndInt(min: number, max: number) { return Math.floor(rnd(min, max)); }

function getCurrentSession(): string {
  const h = new Date().getUTCHours();
  if (h >= 0 && h < 9) return "tokyo";
  if (h >= 7 && h < 16) return "london";
  return "ny";
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function formatDateTime(date: Date) {
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─── ГЕНЕРАЦИЯ УРОВНЕЙ ────────────────────────────────────────────────────────

function generateLevels(asset: string) {
  const base = BASE_PRICES[asset] ?? 1.0;
  const isJpy = base > 10;
  const pip = isJpy ? 0.1 : 0.001;
  const dec = isJpy ? 2 : 4;

  // Цена слегка блуждает от базы
  const price = +(base + rnd(-pip * 8, pip * 8)).toFixed(dec);

  // Уровни основаны на реальных расстояниях (пипсы)
  const s1dist = rndInt(12, 22);
  const s2dist = rndInt(18, 35);
  const r1dist = rndInt(12, 22);
  const r2dist = rndInt(18, 35);

  const s1 = +(price - pip * s1dist).toFixed(dec);
  const s2 = +(price - pip * (s1dist + s2dist)).toFixed(dec);
  const r1 = +(price + pip * r1dist).toFixed(dec);
  const r2 = +(price + pip * (r1dist + r2dist)).toFixed(dec);

  // Пивот-точка (классическая формула P = (H+L+C)/3)
  const high = +(price + pip * rndInt(5, 15)).toFixed(dec);
  const low  = +(price - pip * rndInt(5, 15)).toFixed(dec);
  const pivot = +((high + low + price) / 3).toFixed(dec);

  return { price, s1, s2, r1, r2, pivot, high, low };
}

// ─── ОПРЕДЕЛЕНИЕ ЗОНЫ ────────────────────────────────────────────────────────

type Levels = ReturnType<typeof generateLevels>;

interface ZoneResult {
  direction: "UP" | "DOWN";
  reason: string;
  confidence: number; // 0-100
  zoneType: "S2" | "S1" | "PIVOT_SUPPORT" | "MID" | "PIVOT_RESIST" | "R1" | "R2";
}

function detectZone(levels: Levels): ZoneResult {
  const { price, s1, s2, r1, r2, pivot } = levels;
  const range = r2 - s2;
  if (range <= 0) return { direction: "UP", reason: "Нейтральная зона", confidence: 70, zoneType: "MID" };

  const pct = (v: number) => Math.abs(price - v) / range;

  if (pct(s2) < 0.08) return { direction: "UP", reason: `Отскок от S2 — сильная поддержка`, confidence: 95, zoneType: "S2" };
  if (pct(s1) < 0.10) return { direction: "UP", reason: `Отскок от S1 — поддержка`, confidence: 88, zoneType: "S1" };
  if (price < pivot && pct(pivot) < 0.12) return { direction: "UP", reason: `Цена у пивота снизу`, confidence: 82, zoneType: "PIVOT_SUPPORT" };
  if (pct(r2) < 0.08) return { direction: "DOWN", reason: `Отбой от R2 — сильное сопротивление`, confidence: 95, zoneType: "R2" };
  if (pct(r1) < 0.10) return { direction: "DOWN", reason: `Отбой от R1 — сопротивление`, confidence: 88, zoneType: "R1" };
  if (price > pivot && pct(pivot) < 0.12) return { direction: "DOWN", reason: `Цена у пивота сверху`, confidence: 82, zoneType: "PIVOT_RESIST" };

  // Середина — слабый сигнал
  const mid = (s2 + r2) / 2;
  return price < mid
    ? { direction: "UP", reason: "Цена в нижней части диапазона", confidence: 74, zoneType: "MID" }
    : { direction: "DOWN", reason: "Цена в верхней части диапазона", confidence: 74, zoneType: "MID" };
}

// ─── ТЕХНИЧЕСКИЙ АНАЛИЗ ───────────────────────────────────────────────────────

interface TAResult {
  // Стохастик
  stochK: number;
  stochD: number;
  stochStatus: string;
  // RSI
  rsi: number;
  rsiStatus: string;
  // Тренд (EMA)
  trend: "UP" | "DOWN" | "FLAT";
  trendStrength: number; // 0-100
  // ATR (волатильность)
  atr: number;
  atrLabel: string;
  // Свечной паттерн
  pattern: string;
  // Кол-во подтверждений из 4
  confirmations: number;
  confirmationList: { label: string; ok: boolean }[];
}

function generateTA(direction: "UP" | "DOWN", zone: ZoneResult): TAResult {
  const isUp = direction === "UP";

  // Стохастик: перепроданность при UP, перекупленность при DOWN
  const stochK = isUp ? rndInt(4, 19) : rndInt(81, 96);
  const stochD = isUp ? rndInt(6, 22) : rndInt(78, 93);
  const stochStatus = isUp ? "Перепроданность" : "Перекупленность";

  // RSI согласован
  const rsi = isUp ? rndInt(24, 38) : rndInt(62, 76);
  const rsiStatus = isUp ? "Зона перепроданности" : "Зона перекупленности";

  // Тренд EMA
  const trend = isUp ? (Math.random() > 0.4 ? "DOWN" : "FLAT") : (Math.random() > 0.4 ? "UP" : "FLAT");
  const trendStrength = rndInt(45, 80);

  // ATR (средний истинный диапазон) — волатильность
  const atrRaw = rnd(0.0008, 0.0035);
  const atr = +atrRaw.toFixed(4);
  const atrLabel = atr < 0.001 ? "Низкая" : atr < 0.002 ? "Средняя" : "Высокая";

  // Паттерн
  const pattern = isUp
    ? BULLISH_PATTERNS[rndInt(0, BULLISH_PATTERNS.length)]
    : BEARISH_PATTERNS[rndInt(0, BEARISH_PATTERNS.length)];

  // Подтверждения
  const zoneOk = zone.confidence >= 82;
  const stochOk = true; // всегда согласован
  const rsiOk = true;   // всегда согласован
  const trendOk = (isUp && trend === "DOWN") || (!isUp && trend === "UP"); // контртренд с разворотом
  const confirmations = [zoneOk, stochOk, rsiOk, trendOk].filter(Boolean).length;

  const confirmationList = [
    { label: `Уровень S/R (${zone.zoneType})`, ok: zoneOk },
    { label: `Стохастик ${stochK}/${stochD}`, ok: stochOk },
    { label: `RSI ${rsi}`, ok: rsiOk },
    { label: `Паттерн: ${pattern}`, ok: true },
  ];

  return { stochK, stochD, stochStatus, rsi, rsiStatus, trend, trendStrength, atr, atrLabel, pattern, confirmations, confirmationList };
}

// ─── ГЕНЕРАЦИЯ СИГНАЛА ────────────────────────────────────────────────────────

function generateSignal(id: number) {
  const session = getCurrentSession();
  const priorityPairs = SESSION_PAIRS[session];
  // 70% вероятность взять пару из активной сессии
  const asset = Math.random() < 0.7
    ? priorityPairs[rndInt(0, priorityPairs.length)]
    : ASSETS[rndInt(0, ASSETS.length)];

  const tf = ["1m", "5m", "15m"][rndInt(0, 3)]; // только короткие TF для 3-мин экспирации
  const now = new Date();
  now.setSeconds(now.getSeconds() - rndInt(10, 90));

  const levels = generateLevels(asset);
  const zone = detectZone(levels);
  const direction = zone.direction;
  const ta = generateTA(direction, zone);

  // Точность = базовая + бонус от зоны + бонус от подтверждений
  const baseAcc = rndInt(74, 84);
  const zoneBonus = zone.confidence >= 95 ? 10 : zone.confidence >= 88 ? 6 : 2;
  const confirmBonus = ta.confirmations * 2;
  const accuracy = Math.min(97, baseAcc + zoneBonus + confirmBonus);

  // Качество сигнала
  const quality: "A+" | "A" | "B" = accuracy >= 92 ? "A+" : accuracy >= 85 ? "A" : "B";

  return {
    id, asset, direction, accuracy, tf,
    time: now, expiry: "3 мин",
    strength: Math.min(100, accuracy + rndInt(-3, 3)),
    levels, ta, zone,
    zoneReason: zone.reason,
    quality,
    session,
  };
}

// ─── ИСТОРИЯ ──────────────────────────────────────────────────────────────────

function generateHistory(id: number) {
  const asset = ASSETS[rndInt(0, ASSETS.length)];
  const direction: "UP" | "DOWN" = Math.random() > 0.5 ? "UP" : "DOWN";
  // Высокая точность → больше WIN
  const winRate = 0.78;
  const result = Math.random() < winRate ? "WIN" : "LOSS";
  const profit = result === "WIN" ? `+${rndInt(78, 94)}%` : `-100%`;
  const date = new Date();
  date.setMinutes(date.getMinutes() - id * 18 - rndInt(0, 15));
  const accuracy = rndInt(82, 97);
  const tf = ["1m", "5m", "15m"][rndInt(0, 3)];
  return { id, asset, direction, result, profit, date, accuracy, tf };
}

const INITIAL_SIGNALS = Array.from({ length: 9 }, (_, i) => generateSignal(i + 1));
const INITIAL_HISTORY = Array.from({ length: 30 }, (_, i) => generateHistory(i + 1));

// ─── CHART DATA ───────────────────────────────────────────────────────────────

function generateChartData() {
  const now = new Date();
  // 12 точек × 5 мин = 1 час, реалистичный тренд
  const vals: number[] = [];
  let v = rndInt(75, 82);
  for (let i = 0; i < 12; i++) {
    v = Math.max(60, Math.min(98, v + rndInt(-6, 8)));
    vals.push(v);
  }
  return vals.map((accuracy, i) => ({
    accuracy,
    label: new Date(now.getTime() - (11 - i) * 5 * 60 * 1000)
      .toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
  }));
}
const CHART_DATA = generateChartData();

// ─── TICKER ───────────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  { pair: "EUR/USD", price: "1.0843", delta: "+0.12%" },
  { pair: "GBP/USD", price: "1.2671", delta: "-0.08%" },
  { pair: "USD/JPY", price: "149.82", delta: "+0.31%" },
  { pair: "AUD/USD", price: "0.6514", delta: "-0.15%" },
  { pair: "USD/CAD", price: "1.3628", delta: "+0.07%" },
  { pair: "USD/CHF", price: "0.8972", delta: "-0.03%" },
  { pair: "NZD/USD", price: "0.5983", delta: "+0.18%" },
  { pair: "EUR/GBP", price: "0.8561", delta: "+0.05%" },
  { pair: "EUR/JPY", price: "162.34", delta: "+0.43%" },
  { pair: "GBP/JPY", price: "189.54", delta: "+0.22%" },
];

// ─── SESSION LABEL ────────────────────────────────────────────────────────────

const SESSION_LABEL: Record<string, string> = { tokyo: "Токио", london: "Лондон", ny: "Нью-Йорк" };

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТЫ
// ═══════════════════════════════════════════════════════════════════════════════

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--sx-green)] animate-pulse-dot" />
      <span className="font-mono text-[10px] text-[var(--sx-green)] tracking-widest uppercase">LIVE</span>
    </span>
  );
}

function QualityBadge({ q }: { q: "A+" | "A" | "B" }) {
  const cfg = {
    "A+": { bg: "var(--sx-green-dim)", color: "var(--sx-green)", border: "var(--sx-green)" },
    "A":  { bg: "var(--sx-blue-dim)",  color: "var(--sx-blue)",  border: "var(--sx-blue)" },
    "B":  { bg: "var(--sx-border)",    color: "var(--sx-text-muted)", border: "var(--sx-border-light)" },
  }[q];
  return (
    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border" style={cfg}>
      {q}
    </span>
  );
}

function ConfirmationDots({ count, total = 4 }: { count: number; total?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: i < count ? "var(--sx-green)" : "var(--sx-border-light)" }}
        />
      ))}
    </div>
  );
}

function StochBar({ k, d, isUp }: { k: number; d: number; isUp: boolean }) {
  const kColor = k < 20 ? "var(--sx-green)" : k > 80 ? "var(--sx-red)" : "var(--sx-blue)";
  const dColor = d < 20 ? "var(--sx-green)" : d > 80 ? "var(--sx-red)" : "var(--sx-text-muted)";
  return (
    <div className="space-y-2">
      {[{ label: "%K", val: k, color: kColor, size: "w-2.5 h-2.5" }, { label: "%D", val: d, color: dColor, size: "w-2 h-2" }].map(({ label, val, color, size }) => (
        <div key={label}>
          <div className="flex justify-between mb-1">
            <span className="font-mono text-[10px] text-[var(--sx-text-muted)]">{label}</span>
            <span className="font-mono text-[10px] tabular-nums" style={{ color }}>{val}</span>
          </div>
          <div className="relative h-2 rounded-full" style={{ background: "var(--sx-border)" }}>
            <div className="absolute top-0 left-0 h-full rounded-l-full opacity-30" style={{ width: "20%", background: "var(--sx-green)" }} />
            <div className="absolute top-0 right-0 h-full rounded-r-full opacity-30" style={{ width: "20%", background: "var(--sx-red)" }} />
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 ${size}`}
              style={{ left: `${val}%`, background: "var(--sx-bg)", borderColor: color }}
            />
          </div>
        </div>
      ))}
      <div className="flex justify-between text-[9px] font-mono">
        <span style={{ color: "var(--sx-green)" }}>0 — перепроданность</span>
        <span style={{ color: "var(--sx-red)" }}>100 — перекупленность</span>
      </div>
      {/* Сигнал пересечения */}
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono"
        style={{
          background: isUp ? "var(--sx-green-dim)" : "var(--sx-red-dim)",
          color: isUp ? "var(--sx-green)" : "var(--sx-red)",
        }}
      >
        <Icon name={isUp ? "ArrowUpRight" : "ArrowDownRight"} size={11} />
        {isUp ? `%K (${k}) пересёк %D (${d}) снизу — сигнал покупки` : `%K (${k}) пересёк %D (${d}) сверху — сигнал продажи`}
      </div>
    </div>
  );
}

function LevelsChart({ levels, isUp }: { levels: Levels; isUp: boolean }) {
  const { price, s1, s2, r1, r2, pivot } = levels;
  const max = r2, min = s2;
  const range = max - min || 1;
  const pct = (v: number) => ((v - min) / range) * 100;

  const rows = [
    { label: "R2", val: r2, color: "var(--sx-red)", op: "0.6" },
    { label: "R1", val: r1, color: "var(--sx-red)", op: "1" },
    { label: "PP", val: pivot, color: "var(--sx-yellow)", op: "1" },
    { label: "S1", val: s1, color: "var(--sx-green)", op: "1" },
    { label: "S2", val: s2, color: "var(--sx-green)", op: "0.6" },
  ];

  return (
    <div>
      {/* Вертикальная шкала */}
      <div className="relative h-28 mb-3">
        <div className="absolute left-8 right-0 top-0 bottom-0">
          {/* Фоновые полосы */}
          <div className="absolute inset-0 rounded" style={{ background: "var(--sx-surface-2)" }} />

          {rows.map(({ label, val, color, op }) => {
            const pos = 100 - pct(val);
            return (
              <div key={label} className="absolute left-0 right-0 flex items-center" style={{ top: `${pos}%` }}>
                <div className="flex-1 border-t border-dashed" style={{ borderColor: color, opacity: parseFloat(op) * 0.5 }} />
              </div>
            );
          })}

          {/* Текущая цена */}
          <div
            className="absolute left-0 right-0 flex items-center gap-1 z-10"
            style={{ top: `${100 - pct(price)}%`, transform: "translateY(-50%)" }}
          >
            <div className="flex-1 border-t-2" style={{ borderColor: "var(--sx-text)" }} />
            <span className="font-mono text-[9px] px-1 py-0.5 rounded tabular-nums"
              style={{ background: isUp ? "var(--sx-green)" : "var(--sx-red)", color: "#000", fontSize: "9px" }}>
              {price}
            </span>
          </div>
        </div>

        {/* Лейблы слева */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between">
          {rows.map(({ label, color, op }) => (
            <span key={label} className="font-mono text-[9px] w-7" style={{ color, opacity: parseFloat(op) }}>{label}</span>
          ))}
        </div>
      </div>

      {/* Числа */}
      <div className="grid grid-cols-5 gap-1 text-center">
        {rows.map(({ label, val, color, op }) => (
          <div key={label}>
            <div className="font-mono text-[9px]" style={{ color, opacity: parseFloat(op) }}>{label}</div>
            <div className="font-mono text-[9px] tabular-nums text-[var(--sx-text-muted)]">{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── КАРТОЧКА СИГНАЛА ────────────────────────────────────────────────────────

type Signal = ReturnType<typeof generateSignal>;

function SignalCard({ signal, index }: { signal: Signal; index: number }) {
  const isUp = signal.direction === "UP";
  const [expanded, setExpanded] = useState(false);
  const { levels, ta, zone } = signal;

  return (
    <div
      className="animate-fade-in rounded-lg border flex flex-col transition-all"
      style={{
        background: "var(--sx-surface)",
        borderColor: expanded ? (isUp ? "var(--sx-green)" : "var(--sx-red)") : "var(--sx-border)",
        animationDelay: `${index * 50}ms`,
        animationFillMode: "both",
        opacity: 0,
        borderWidth: expanded ? "1px" : "1px",
      }}
    >
      <div className="p-4 flex flex-col gap-3">

        {/* Шапка */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-[var(--sx-text)]">{signal.asset}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--sx-border)", color: "var(--sx-text-muted)" }}>
              {signal.tf}
            </span>
            <QualityBadge q={signal.quality} />
          </div>
          <span className={`text-xs px-2.5 py-1 rounded font-mono font-bold flex items-center gap-1 ${isUp ? "signal-badge-up" : "signal-badge-down"}`}>
            {isUp ? "▲" : "▼"} {signal.direction}
          </span>
        </div>

        {/* Причина + подтверждения */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono flex-1 mr-2"
            style={{ background: isUp ? "var(--sx-green-dim)" : "var(--sx-red-dim)", color: isUp ? "var(--sx-green)" : "var(--sx-red)" }}
          >
            <Icon name={isUp ? "TrendingUp" : "TrendingDown"} size={10} />
            <span className="truncate">{signal.zoneReason}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <ConfirmationDots count={ta.confirmations} />
            <span className="font-mono text-[9px] text-[var(--sx-text-dim)]">{ta.confirmations}/4 факт.</span>
          </div>
        </div>

        {/* Точность + паттерн */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] text-[var(--sx-text-muted)] mb-1">Точность</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full" style={{ background: "var(--sx-border)" }}>
                <div className="h-1.5 rounded-full" style={{ width: `${signal.accuracy}%`, background: isUp ? "var(--sx-green)" : "var(--sx-red)" }} />
              </div>
              <span className="font-mono text-sm font-bold" style={{ color: isUp ? "var(--sx-green)" : "var(--sx-red)" }}>
                {signal.accuracy}%
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] text-[var(--sx-text-muted)] mb-1">Паттерн</div>
            <div className="font-mono text-[10px] text-[var(--sx-text)]">{ta.pattern}</div>
          </div>
        </div>

        {/* Нижняя строка */}
        <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--sx-border)" }}>
          <div className="flex items-center gap-1 text-[var(--sx-text-muted)]">
            <Icon name="Clock" size={11} />
            <span className="font-mono text-[11px]">{formatTime(signal.time)}</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--sx-text-muted)]">
            <Icon name="Globe" size={11} />
            <span className="font-mono text-[11px]">{SESSION_LABEL[signal.session]}</span>
          </div>
          <span className="font-mono text-[11px] text-[var(--sx-text-muted)]">Экс.: {signal.expiry}</span>
          <div className="flex items-center gap-1 text-[var(--sx-text-muted)]">
            <Icon name="Activity" size={11} />
            <span className="font-mono text-[11px]">ATR {ta.atrLabel}</span>
          </div>
        </div>
      </div>

      {/* Кнопка раскрытия */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center justify-center gap-1.5 py-2 border-t text-[10px] font-mono transition-colors hover:bg-[var(--sx-surface-2)]"
        style={{ borderColor: "var(--sx-border)", color: expanded ? (isUp ? "var(--sx-green)" : "var(--sx-red)") : "var(--sx-text-dim)" }}
      >
        <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={11} />
        {expanded ? "Скрыть анализ" : "Уровни и стохастик"}
      </button>

      {/* Раскрытая секция */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">

          {/* Уровни S/R */}
          <div className="pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Уровни S/R + Пивот</span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                background: zone.confidence >= 90 ? "var(--sx-green-dim)" : "var(--sx-blue-dim)",
                color: zone.confidence >= 90 ? "var(--sx-green)" : "var(--sx-blue)",
              }}>
                Зона {zone.confidence}%
              </span>
            </div>
            <LevelsChart levels={levels} isUp={isUp} />
          </div>

          {/* Стохастик */}
          <div className="border-t pt-4" style={{ borderColor: "var(--sx-border)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Стохастик (14, 3, 3)</span>
              <span className="font-mono text-[9px] text-[var(--sx-text-dim)]">{ta.stochStatus}</span>
            </div>
            <StochBar k={ta.stochK} d={ta.stochD} isUp={isUp} />
          </div>

          {/* Все подтверждения */}
          <div className="border-t pt-4" style={{ borderColor: "var(--sx-border)" }}>
            <div className="text-[10px] font-mono text-[var(--sx-text-muted)] uppercase tracking-wider mb-2">
              Подтверждения ({ta.confirmations}/4)
            </div>
            <div className="space-y-1.5">
              {ta.confirmationList.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0" style={{
                    background: c.ok ? "var(--sx-green-dim)" : "var(--sx-red-dim)"
                  }}>
                    <Icon name={c.ok ? "Check" : "X"} size={8} style={{ color: c.ok ? "var(--sx-green)" : "var(--sx-red)" }} />
                  </span>
                  <span className="font-mono text-[10px] text-[var(--sx-text-muted)]">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 1M CHART ANALYSIS ────────────────────────────────────────────────────────

interface Candle {
  time: string;       // HH:MM
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;     // условные единицы 0–100
  ema9: number;
  ema21: number;
}

function buildEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = prices[0];
  for (const p of prices) {
    const ema = p * k + prev * (1 - k);
    result.push(+ema.toFixed(5));
    prev = ema;
  }
  return result;
}

function generate1MCandles(asset: string): Candle[] {
  const base = BASE_PRICES[asset] ?? 1.0;
  const isJpy = base > 10;
  const pip = isJpy ? 0.01 : 0.0001;
  const dec = isJpy ? 3 : 5;
  const now = new Date();

  // Генерируем реалистичный ценовой ряд с трендом + шумом
  const n = 90;
  const closes: number[] = [];
  let price = base;
  // Выбираем слабый тренд случайным образом
  const drift = (Math.random() - 0.48) * pip * 0.5;
  for (let i = 0; i < n; i++) {
    price = +(price + drift + (Math.random() - 0.5) * pip * 3).toFixed(dec);
    closes.push(price);
  }

  const ema9vals  = buildEMA(closes, 9);
  const ema21vals = buildEMA(closes, 21);

  return closes.map((c, i) => {
    const prev = i === 0 ? c : closes[i - 1];
    const range = pip * rnd(1, 8);
    const isUp = c >= prev;
    const open  = +(prev + (Math.random() - 0.5) * pip).toFixed(dec);
    const high  = +(Math.max(open, c) + range * Math.random()).toFixed(dec);
    const low   = +(Math.min(open, c) - range * Math.random()).toFixed(dec);
    const volume = Math.round(rnd(20, 100));
    const t = new Date(now.getTime() - (n - 1 - i) * 60 * 1000);
    return {
      time: t.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      open, high, low, close: c,
      volume,
      ema9:  ema9vals[i],
      ema21: ema21vals[i],
    };
  });
}

function detectTrend1M(candles: Candle[]): { dir: "UP" | "DOWN" | "FLAT"; strength: number; desc: string } {
  const last = candles.slice(-20);
  const first10 = last.slice(0, 10);
  const last10  = last.slice(10);
  const avg1 = first10.reduce((s, c) => s + c.close, 0) / 10;
  const avg2 = last10.reduce((s, c) => s + c.close, 0) / 10;
  const delta = avg2 - avg1;
  const pct = Math.abs(delta / avg1) * 100;
  const cur = candles[candles.length - 1];
  const emaUp = cur.ema9 > cur.ema21;
  if (pct < 0.005) return { dir: "FLAT", strength: 40, desc: "Боковик — цена консолидируется" };
  if (delta > 0) return { dir: "UP", strength: Math.min(95, Math.round(50 + pct * 5000)), desc: emaUp ? "Восходящий тренд, EMA9 выше EMA21" : "Восходящее движение, EMA пересекаются" };
  return { dir: "DOWN", strength: Math.min(95, Math.round(50 + pct * 5000)), desc: !emaUp ? "Нисходящий тренд, EMA9 ниже EMA21" : "Нисходящее движение, EMA пересекаются" };
}

interface PatternHit { bar: number; name: string; dir: "UP" | "DOWN" }

function detectPatterns(candles: Candle[]): PatternHit[] {
  const hits: PatternHit[] = [];
  for (let i = 2; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1], pp = candles[i - 2];
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low || 0.0001;
    // Молот (нижняя тень длинная, тело маленькое, снизу)
    if (c.close > c.open && (c.open - c.low) > body * 2 && body / range < 0.4 && p.close < p.open)
      hits.push({ bar: i, name: "Молот", dir: "UP" });
    // Shooting star (верхняя тень длинная)
    if (c.close < c.open && (c.high - c.open) > body * 2 && body / range < 0.4 && p.close > p.open)
      hits.push({ bar: i, name: "Shooting Star", dir: "DOWN" });
    // Бычье поглощение
    if (p.close < p.open && c.close > c.open && c.open < p.close && c.close > p.open)
      hits.push({ bar: i, name: "Бычье поглощение", dir: "UP" });
    // Медвежье поглощение
    if (p.close > p.open && c.close < c.open && c.open > p.close && c.close < p.open)
      hits.push({ bar: i, name: "Медвежье поглощение", dir: "DOWN" });
    // Доджи
    if (body / range < 0.1 && range > 0)
      hits.push({ bar: i, name: "Доджи", dir: i % 2 === 0 ? "UP" : "DOWN" });
  }
  // Вернуть последние 5 уникальных
  const seen = new Set<string>();
  return hits.reverse().filter(h => { const k = h.name; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 5).reverse();
}

function detectVolumeSpikes(candles: Candle[]): number[] {
  const avgVol = candles.reduce((s, c) => s + c.volume, 0) / candles.length;
  return candles.map((c, i) => (c.volume > avgVol * 1.6 ? i : -1)).filter(i => i !== -1);
}

// Кэш свечей по активу (пересоздаётся при смене)
const candleCache: Record<string, Candle[]> = {};
function getCandles(asset: string): Candle[] {
  if (!candleCache[asset]) candleCache[asset] = generate1MCandles(asset);
  return candleCache[asset];
}

function Chart1MBlock() {
  const [asset, setAsset] = useState("EUR/USD");
  const candles = useMemo(() => getCandles(asset), [asset]);
  const trend = useMemo(() => detectTrend1M(candles), [candles]);
  const patterns = useMemo(() => detectPatterns(candles), [candles]);
  const volSpikes = useMemo(() => detectVolumeSpikes(candles), [candles]);

  const cur  = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const priceChange = cur.close - candles[0].close;
  const priceChangePct = ((priceChange / candles[0].close) * 100).toFixed(3);

  // Диапазон для нормализации графика
  const allHigh = Math.max(...candles.map(c => c.high));
  const allLow  = Math.min(...candles.map(c => c.low));
  const priceRange = allHigh - allLow || 0.0001;
  const yPct = (v: number) => 100 - ((v - allLow) / priceRange) * 100;

  // Ширина одного бара в % (для SVG)
  const barW = 100 / candles.length;

  // Строим SVG points для EMA
  const ema9Line  = candles.map((c, i) => `${(i + 0.5) * barW},${yPct(c.ema9).toFixed(2)}`).join(" ");
  const ema21Line = candles.map((c, i) => `${(i + 0.5) * barW},${yPct(c.ema21).toFixed(2)}`).join(" ");

  // Волатильность: std(close)
  const mean = candles.reduce((s, c) => s + c.close, 0) / candles.length;
  const stdDev = Math.sqrt(candles.reduce((s, c) => s + (c.close - mean) ** 2, 0) / candles.length);
  const atrPips = +((allHigh - allLow) / (cur.close > 10 ? 0.01 : 0.0001)).toFixed(1);

  // Сигнал на выходе
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

      {/* SVG ГРАФИК (свечи + EMA) */}
      <div className="px-4 pb-1">
        <svg viewBox="0 0 100 60" className="w-full" style={{ height: 180 }} preserveAspectRatio="none">
          {/* Сетка */}
          {[20, 40, 60, 80].map(y => (
            <line key={y} x1="0" y1={y * 0.6} x2="100" y2={y * 0.6}
              stroke="var(--sx-border)" strokeWidth="0.3" strokeDasharray="1,1" />
          ))}

          {/* Свечи */}
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
                {/* Фитиль */}
                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={isSpike ? "0.6" : "0.3"} strokeOpacity={isSpike ? 1 : 0.7} />
                {/* Тело */}
                <rect x={x - barW * 0.35} y={bodyTop} width={barW * 0.7} height={bodyHeight}
                  fill={color} fillOpacity={isSpike ? 1 : 0.85} />
                {/* Маркер всплеска объёма */}
                {isSpike && <circle cx={x} cy={yHigh - 1} r="0.8" fill="var(--sx-yellow)" fillOpacity="0.9" />}
              </g>
            );
          })}

          {/* EMA21 */}
          <polyline points={ema21Line.replace(/,(\d)/g, (_, n) => `,${(+n * 0.6)}`).split(" ").map((pt, i) => {
            const [px, py] = pt.split(",").map(Number);
            return `${px},${(yPct(candles[i]?.ema21 ?? 0) * 0.6).toFixed(2)}`;
          }).join(" ")}
            fill="none" stroke="var(--sx-blue)" strokeWidth="0.5" strokeOpacity="0.7" />

          {/* EMA9 */}
          <polyline points={candles.map((c, i) => `${(i + 0.5) * barW},${(yPct(c.ema9) * 0.6).toFixed(2)}`).join(" ")}
            fill="none" stroke="var(--sx-yellow)" strokeWidth="0.5" strokeOpacity="0.9" />

          {/* Текущая цена — горизонтальная линия */}
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

      {/* Объём (мини-бары) */}
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

      {/* Итоговые метрики */}
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
        {/* Тренд */}
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

        {/* Паттерны */}
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

// ─── АНАЛИТИКА ────────────────────────────────────────────────────────────────

function AnalyticsSection({ history }: { history: ReturnType<typeof generateHistory>[] }) {
  const wins = history.filter(h => h.result === "WIN").length;
  const total = history.length;
  const winRate = Math.round((wins / total) * 100);
  const avgAccuracy = Math.round(history.reduce((s, h) => s + h.accuracy, 0) / total);
  const chartAvg = Math.round(CHART_DATA.reduce((s, d) => s + d.accuracy, 0) / CHART_DATA.length);

  // Win rate по активам
  const assetStats = useMemo(() => ASSETS.map(asset => {
    const group = history.filter(h => h.asset === asset);
    const w = group.filter(h => h.result === "WIN").length;
    return { asset, rate: group.length ? Math.round((w / group.length) * 100) : 0, count: group.length };
  }).sort((a, b) => b.rate - a.rate), [history]);

  // Серии WIN
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

        {/* Линия тренда поверх баров */}
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
                  {/* Зоны */}
                  <div className="absolute top-0 left-0 h-full rounded-l" style={{ width: "25%", background: "var(--sx-green-dim)" }} />
                  <div className="absolute top-0 right-0 h-full rounded-r" style={{ width: "25%", background: "var(--sx-red-dim)" }} />
                  {/* Пивот */}
                  <div className="absolute top-0 bottom-0 w-px" style={{ left: `${pivotPct}%`, background: "var(--sx-yellow)", opacity: 0.7 }} />
                  {/* Цена */}
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

// ─── ИСТОРИЯ ─────────────────────────────────────────────────────────────────

function HistorySection({ history }: { history: ReturnType<typeof generateHistory>[] }) {
  const wins = history.filter(h => h.result === "WIN").length;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {[
          { label: "WIN", val: wins, color: "var(--sx-green)" },
          { label: "LOSS", val: history.length - wins, color: "var(--sx-red)" },
          { label: "Точность", val: `${Math.round(wins / history.length * 100)}%`, color: "var(--sx-text)" },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex-1 rounded-lg border p-3 flex flex-col items-center" style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}>
            <span className="font-mono text-2xl font-bold" style={{ color }}>{val}</span>
            <span className="font-mono text-[10px] text-[var(--sx-text-muted)] uppercase tracking-wider mt-1">{label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}>
        <div className="grid grid-cols-5 px-4 py-2 border-b text-[10px] font-mono uppercase tracking-wider text-[var(--sx-text-muted)]"
          style={{ borderColor: "var(--sx-border)", background: "var(--sx-surface-2)" }}>
          <span>Актив</span><span>TF</span><span>Напр.</span><span>Время</span><span className="text-right">Итог</span>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--sx-border)" }}>
          {history.map((h, i) => (
            <div
              key={h.id}
              className="grid grid-cols-5 px-4 py-2.5 items-center animate-fade-in hover:bg-[var(--sx-surface-2)] transition-colors"
              style={{ animationDelay: `${i * 20}ms`, animationFillMode: "both", opacity: 0 }}
            >
              <span className="font-mono text-[11px] text-[var(--sx-text)]">{h.asset}</span>
              <span className="font-mono text-[10px] text-[var(--sx-text-muted)]">{h.tf}</span>
              <span className="font-mono text-[11px]" style={{ color: h.direction === "UP" ? "var(--sx-green)" : "var(--sx-red)" }}>
                {h.direction === "UP" ? "▲" : "▼"}
              </span>
              <span className="font-mono text-[10px] text-[var(--sx-text-muted)]">{formatDateTime(h.date)}</span>
              <span className="font-mono text-[11px] text-right font-semibold" style={{ color: h.result === "WIN" ? "var(--sx-green)" : "var(--sx-red)" }}>
                {h.profit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── НАСТРОЙКИ ───────────────────────────────────────────────────────────────

function SettingsSection() {
  const [notif, setNotif] = useState({ push: true, email: false, sound: true });
  const [minAcc, setMinAcc] = useState(82);
  const [selectedPairs, setSelectedPairs] = useState<string[]>([]);
  const [selectedTf, setSelectedTf] = useState(["1m", "5m", "15m"]);

  const togglePair = (p: string) => setSelectedPairs(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleTf = (t: string) => setSelectedTf(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-4" style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}>
        <div className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Уведомления</div>
        {[
          { key: "push", label: "Push-уведомления", desc: "В браузере и на телефоне" },
          { key: "email", label: "Email-уведомления", desc: "На почту при новом сигнале" },
          { key: "sound", label: "Звуковой сигнал", desc: "Звук при получении сигнала" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--sx-text)]">{item.label}</div>
              <div className="text-[11px] font-mono text-[var(--sx-text-muted)]">{item.desc}</div>
            </div>
            <button
              onClick={() => setNotif(n => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
              className="relative w-10 h-5 rounded-full transition-colors"
              style={{ background: notif[item.key as keyof typeof notif] ? "var(--sx-green)" : "var(--sx-border-light)" }}
            >
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: notif[item.key as keyof typeof notif] ? "calc(100% - 18px)" : "2px" }} />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-4 space-y-4" style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}>
        <div className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Фильтры</div>
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-[var(--sx-text)]">Мин. точность</span>
            <span className="font-mono text-sm" style={{ color: "var(--sx-green)" }}>{minAcc}%</span>
          </div>
          <input type="range" min={70} max={95} value={minAcc} onChange={e => setMinAcc(+e.target.value)}
            className="w-full cursor-pointer" style={{ accentColor: "var(--sx-green)" }} />
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[10px] text-[var(--sx-text-dim)]">70%</span>
            <span className="font-mono text-[10px] text-[var(--sx-text-dim)]">95%</span>
          </div>
        </div>
        <div>
          <div className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider mb-2">Валютные пары</div>
          <div className="flex flex-wrap gap-2">
            {ASSETS.map(pair => {
              const active = selectedPairs.includes(pair);
              return (
                <button key={pair} onClick={() => togglePair(pair)}
                  className="px-2.5 py-1 rounded text-[11px] font-mono transition-all"
                  style={{ background: active ? "var(--sx-green-dim)" : "var(--sx-border)", color: active ? "var(--sx-green)" : "var(--sx-text-muted)", border: `1px solid ${active ? "var(--sx-green)" : "var(--sx-border-light)"}` }}>
                  {pair}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider mb-2">Таймфреймы</div>
          <div className="flex gap-2">
            {["1m", "5m", "15m"].map(tf => {
              const active = selectedTf.includes(tf);
              return (
                <button key={tf} onClick={() => toggleTf(tf)}
                  className="px-3 py-1 rounded text-[11px] font-mono transition-all"
                  style={{ background: active ? "var(--sx-blue-dim)" : "var(--sx-border)", color: active ? "var(--sx-blue)" : "var(--sx-text-muted)", border: `1px solid ${active ? "var(--sx-blue)" : "var(--sx-border-light)"}` }}>
                  {tf}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3" style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}>
        <div className="text-xs font-mono text-[var(--sx-text-muted)] uppercase tracking-wider">Email для уведомлений</div>
        <div className="flex gap-2">
          <input type="email" placeholder="your@email.com"
            className="flex-1 px-3 py-2 rounded text-sm font-mono outline-none"
            style={{ background: "var(--sx-surface-2)", border: "1px solid var(--sx-border-light)", color: "var(--sx-text)" }} />
          <button className="px-4 py-2 rounded text-sm font-mono font-medium hover:opacity-90 transition-all"
            style={{ background: "var(--sx-green)", color: "#000" }}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: "signals",   label: "Сигналы",   icon: "Zap" },
  { id: "analytics", label: "Аналитика", icon: "BarChart2" },
  { id: "history",   label: "История",   icon: "Clock" },
  { id: "settings",  label: "Настройки", icon: "Settings" },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState("signals");
  const [signals, setSignals] = useState<Signal[]>(INITIAL_SIGNALS);
  const [history] = useState(INITIAL_HISTORY);
  const [time, setTime] = useState(new Date());
  const [pulse, setPulse] = useState(false);
  const [activePairs, setActivePairs] = useState<string[]>([]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setSignals(prev => {
        const s = generateSignal(Date.now());
        setPulse(true);
        setTimeout(() => setPulse(false), 800);
        return [s, ...prev.slice(0, 11)];
      });
    }, 9000);
    return () => clearInterval(t);
  }, []);

  const togglePair = (pair: string) =>
    setActivePairs(prev => prev.includes(pair) ? prev.filter(p => p !== pair) : [...prev, pair]);

  const filtered = activePairs.length === 0 ? signals : signals.filter(s => activePairs.includes(s.asset));

  const aPlus = signals.filter(s => s.quality === "A+").length;
  const session = getCurrentSession();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--sx-bg)" }}>

      {/* Хедер */}
      <header className="border-b px-4 flex items-center justify-between sticky top-0 z-50"
        style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)", backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-3 py-3">
          <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: "var(--sx-green)", color: "#000" }}>
            <Icon name="Zap" size={14} />
          </div>
          <span className="font-mono font-bold text-sm tracking-wide text-[var(--sx-text)]">SignalX</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--sx-border)", color: "var(--sx-text-muted)" }}>
            {SESSION_LABEL[session]}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <LiveDot />
          <span className="font-mono text-xs tabular-nums text-[var(--sx-text-muted)]">{time.toLocaleTimeString("ru-RU")}</span>
          <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--sx-border)] transition-colors"
            style={{ color: "var(--sx-text-muted)" }}>
            <Icon name="Bell" size={15} />
          </button>
        </div>
      </header>

      {/* Тикер */}
      <div className="border-b overflow-hidden" style={{ background: "var(--sx-surface-2)", borderColor: "var(--sx-border)" }}>
        <div className="flex animate-ticker whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-5 py-1.5 shrink-0">
              <span className="font-mono text-[11px] text-[var(--sx-text-muted)]">{item.pair}</span>
              <span className="font-mono text-[11px] text-[var(--sx-text)]">{item.price}</span>
              <span className="font-mono text-[10px]" style={{ color: item.delta.startsWith("+") ? "var(--sx-green)" : "var(--sx-red)" }}>{item.delta}</span>
              <span className="text-[var(--sx-text-dim)] mx-2">·</span>
            </div>
          ))}
        </div>
      </div>

      {/* Контент */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5">

        {/* Заголовок секции */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-mono text-lg font-bold text-[var(--sx-text)]">
              {TABS.find(t => t.id === activeTab)?.label}
            </h1>
            {activeTab === "signals" && (
              <div className="font-mono text-[11px] text-[var(--sx-text-muted)] mt-0.5">
                Всего: <span style={{ color: "var(--sx-text)" }}>{filtered.length}</span>
                {" · "}A+: <span style={{ color: "var(--sx-green)" }}>{aPlus}</span>
                {activePairs.length > 0 && <span style={{ color: "var(--sx-text-dim)" }}> · фильтр: {activePairs.length} пар</span>}
              </div>
            )}
          </div>
          {activeTab === "signals" && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono transition-all ${pulse ? "scale-110" : ""}`}
              style={{ background: "var(--sx-green-dim)", color: "var(--sx-green)", border: "1px solid var(--sx-green)", transition: "transform 0.2s" }}
            >
              <Icon name="Radio" size={11} />
              LIVE
            </div>
          )}
        </div>

        {/* Фильтр по парам (только на вкладке Сигналы) */}
        {activeTab === "signals" && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            <button onClick={() => setActivePairs([])}
              className="shrink-0 px-3 py-1 rounded text-[11px] font-mono transition-all"
              style={{ background: activePairs.length === 0 ? "var(--sx-green-dim)" : "var(--sx-border)", color: activePairs.length === 0 ? "var(--sx-green)" : "var(--sx-text-muted)", border: `1px solid ${activePairs.length === 0 ? "var(--sx-green)" : "var(--sx-border-light)"}` }}>
              Все
            </button>
            {ASSETS.map(pair => {
              const active = activePairs.includes(pair);
              return (
                <button key={pair} onClick={() => togglePair(pair)}
                  className="shrink-0 px-3 py-1 rounded text-[11px] font-mono transition-all"
                  style={{ background: active ? "var(--sx-green-dim)" : "var(--sx-border)", color: active ? "var(--sx-green)" : "var(--sx-text-muted)", border: `1px solid ${active ? "var(--sx-green)" : "var(--sx-border-light)"}` }}>
                  {pair}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "signals" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.length > 0 ? filtered.map((s, i) => (
              <SignalCard key={s.id} signal={s} index={i} />
            )) : (
              <div className="col-span-2 py-16 flex flex-col items-center gap-2 rounded-lg border"
                style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}>
                <Icon name="Search" size={24} className="text-[var(--sx-text-dim)]" />
                <span className="font-mono text-sm text-[var(--sx-text-muted)]">Нет сигналов по выбранным парам</span>
                <button onClick={() => setActivePairs([])} className="font-mono text-[11px] mt-1" style={{ color: "var(--sx-green)" }}>
                  Сбросить фильтр
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && <AnalyticsSection history={history} />}
        {activeTab === "history" && <HistorySection history={history} />}
        {activeTab === "settings" && <SettingsSection />}
      </main>

      {/* Нижняя навигация */}
      <nav className="border-t sticky bottom-0 z-50" style={{ background: "var(--sx-surface)", borderColor: "var(--sx-border)" }}>
        <div className="flex max-w-2xl mx-auto">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative"
                style={{ color: active ? "var(--sx-green)" : "var(--sx-text-muted)" }}>
                <div className="relative">
                  <Icon name={tab.icon} fallback="Circle" size={18} />
                  {tab.id === "signals" && pulse && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse-dot" style={{ background: "var(--sx-green)" }} />
                  )}
                </div>
                <span className="font-mono text-[10px] tracking-wide">{tab.label}</span>
                {active && <span className="absolute bottom-0 h-0.5 w-8 rounded-full" style={{ background: "var(--sx-green)" }} />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}