// ─── КОНСТАНТЫ ────────────────────────────────────────────────────────────────

export const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY"];

export const BASE_PRICES: Record<string, number> = {
  "EUR/USD": 1.0843, "GBP/USD": 1.2671, "USD/JPY": 149.82,
  "AUD/USD": 0.6514, "USD/CAD": 1.3628, "USD/CHF": 0.8972,
  "NZD/USD": 0.5983, "EUR/GBP": 0.8561, "EUR/JPY": 162.34, "GBP/JPY": 189.54,
};

export const SESSION_PAIRS: Record<string, string[]> = {
  tokyo:  ["USD/JPY", "AUD/USD", "NZD/USD", "EUR/JPY", "GBP/JPY"],
  london: ["EUR/USD", "GBP/USD", "EUR/GBP", "USD/CHF", "EUR/JPY"],
  ny:     ["EUR/USD", "GBP/USD", "USD/CAD", "USD/CHF", "USD/JPY"],
};

export const BULLISH_PATTERNS = ["Молот", "Бычье поглощение", "Утренняя звезда", "Доджи разворот", "Пинбар вверх"];
export const BEARISH_PATTERNS = ["Повешенный", "Медвежье поглощение", "Вечерняя звезда", "Shooting Star", "Пинбар вниз"];

export const SESSION_LABEL: Record<string, string> = { tokyo: "Токио", london: "Лондон", ny: "Нью-Йорк" };

export const TICKER_ITEMS = [
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

// ─── УТИЛИТЫ ──────────────────────────────────────────────────────────────────

export function rnd(min: number, max: number) { return Math.random() * (max - min) + min; }
export function rndInt(min: number, max: number) { return Math.floor(rnd(min, max)); }

export function getCurrentSession(): string {
  const h = new Date().getUTCHours();
  if (h >= 0 && h < 9) return "tokyo";
  if (h >= 7 && h < 16) return "london";
  return "ny";
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
export function formatDateTime(date: Date) {
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─── ТИПЫ ─────────────────────────────────────────────────────────────────────

export type Levels = {
  price: number; s1: number; s2: number; r1: number; r2: number;
  pivot: number; high: number; low: number;
};

export interface ZoneResult {
  direction: "UP" | "DOWN";
  reason: string;
  confidence: number;
  zoneType: "S2" | "S1" | "PIVOT_SUPPORT" | "MID" | "PIVOT_RESIST" | "R1" | "R2";
}

export interface TAResult {
  stochK: number;
  stochD: number;
  stochStatus: string;
  rsi: number;
  rsiStatus: string;
  trend: "UP" | "DOWN" | "FLAT";
  trendStrength: number;
  atr: number;
  atrLabel: string;
  pattern: string;
  confirmations: number;
  confirmationList: { label: string; ok: boolean }[];
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema9: number;
  ema21: number;
}

export interface PatternHit { bar: number; name: string; dir: "UP" | "DOWN" }

// ─── ГЕНЕРАЦИЯ УРОВНЕЙ ────────────────────────────────────────────────────────

export function generateLevels(asset: string): Levels {
  const base = BASE_PRICES[asset] ?? 1.0;
  const isJpy = base > 10;
  const pip = isJpy ? 0.1 : 0.001;
  const dec = isJpy ? 2 : 4;

  const price = +(base + rnd(-pip * 8, pip * 8)).toFixed(dec);

  const s1dist = rndInt(12, 22);
  const s2dist = rndInt(18, 35);
  const r1dist = rndInt(12, 22);
  const r2dist = rndInt(18, 35);

  const s1 = +(price - pip * s1dist).toFixed(dec);
  const s2 = +(price - pip * (s1dist + s2dist)).toFixed(dec);
  const r1 = +(price + pip * r1dist).toFixed(dec);
  const r2 = +(price + pip * (r1dist + r2dist)).toFixed(dec);

  const high = +(price + pip * rndInt(5, 15)).toFixed(dec);
  const low  = +(price - pip * rndInt(5, 15)).toFixed(dec);
  const pivot = +((high + low + price) / 3).toFixed(dec);

  return { price, s1, s2, r1, r2, pivot, high, low };
}

// ─── ОПРЕДЕЛЕНИЕ ЗОНЫ ────────────────────────────────────────────────────────

export function detectZone(levels: Levels): ZoneResult {
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

  const mid = (s2 + r2) / 2;
  return price < mid
    ? { direction: "UP", reason: "Цена в нижней части диапазона", confidence: 74, zoneType: "MID" }
    : { direction: "DOWN", reason: "Цена в верхней части диапазона", confidence: 74, zoneType: "MID" };
}

// ─── ТЕХНИЧЕСКИЙ АНАЛИЗ ───────────────────────────────────────────────────────

export function generateTA(direction: "UP" | "DOWN", zone: ZoneResult): TAResult {
  const isUp = direction === "UP";

  const stochK = isUp ? rndInt(4, 19) : rndInt(81, 96);
  const stochD = isUp ? rndInt(6, 22) : rndInt(78, 93);
  const stochStatus = isUp ? "Перепроданность" : "Перекупленность";

  const rsi = isUp ? rndInt(24, 38) : rndInt(62, 76);
  const rsiStatus = isUp ? "Зона перепроданности" : "Зона перекупленности";

  const trend = isUp ? (Math.random() > 0.4 ? "DOWN" : "FLAT") : (Math.random() > 0.4 ? "UP" : "FLAT");
  const trendStrength = rndInt(45, 80);

  const atrRaw = rnd(0.0008, 0.0035);
  const atr = +atrRaw.toFixed(4);
  const atrLabel = atr < 0.001 ? "Низкая" : atr < 0.002 ? "Средняя" : "Высокая";

  const pattern = isUp
    ? BULLISH_PATTERNS[rndInt(0, BULLISH_PATTERNS.length)]
    : BEARISH_PATTERNS[rndInt(0, BEARISH_PATTERNS.length)];

  const zoneOk = zone.confidence >= 82;
  const stochOk = true;
  const rsiOk = true;
  const trendOk = (isUp && trend === "DOWN") || (!isUp && trend === "UP");
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

export function generateSignal(id: number) {
  const session = getCurrentSession();
  const priorityPairs = SESSION_PAIRS[session];
  const asset = Math.random() < 0.7
    ? priorityPairs[rndInt(0, priorityPairs.length)]
    : ASSETS[rndInt(0, ASSETS.length)];

  const tf = ["1m", "5m", "15m"][rndInt(0, 3)];
  const now = new Date();
  now.setSeconds(now.getSeconds() - rndInt(10, 90));

  const levels = generateLevels(asset);
  const zone = detectZone(levels);
  const direction = zone.direction;
  const ta = generateTA(direction, zone);

  const baseAcc = rndInt(74, 84);
  const zoneBonus = zone.confidence >= 95 ? 10 : zone.confidence >= 88 ? 6 : 2;
  const confirmBonus = ta.confirmations * 2;
  const accuracy = Math.min(97, baseAcc + zoneBonus + confirmBonus);

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

export type Signal = ReturnType<typeof generateSignal>;

// ─── ИСТОРИЯ ──────────────────────────────────────────────────────────────────

export function generateHistory(id: number) {
  const asset = ASSETS[rndInt(0, ASSETS.length)];
  const direction: "UP" | "DOWN" = Math.random() > 0.5 ? "UP" : "DOWN";
  const winRate = 0.78;
  const result = Math.random() < winRate ? "WIN" : "LOSS";
  const profit = result === "WIN" ? `+${rndInt(78, 94)}%` : `-100%`;
  const date = new Date();
  date.setMinutes(date.getMinutes() - id * 18 - rndInt(0, 15));
  const accuracy = rndInt(82, 97);
  const tf = ["1m", "5m", "15m"][rndInt(0, 3)];
  return { id, asset, direction, result, profit, date, accuracy, tf };
}

export type HistoryItem = ReturnType<typeof generateHistory>;

// ─── CHART DATA (точность сигналов, 5-мин шаг) ───────────────────────────────

export function generateChartData() {
  const now = new Date();
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

// ─── 1M СВЕЧИ ────────────────────────────────────────────────────────────────

export function buildEMA(prices: number[], period: number): number[] {
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

export function generate1MCandles(asset: string): Candle[] {
  const base = BASE_PRICES[asset] ?? 1.0;
  const isJpy = base > 10;
  const pip = isJpy ? 0.01 : 0.0001;
  const dec = isJpy ? 3 : 5;
  const now = new Date();

  const n = 90;
  const closes: number[] = [];
  let price = base;
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

export function detectTrend1M(candles: Candle[]): { dir: "UP" | "DOWN" | "FLAT"; strength: number; desc: string } {
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

export function detectPatterns(candles: Candle[]): PatternHit[] {
  const hits: PatternHit[] = [];
  for (let i = 2; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low || 0.0001;
    if (c.close > c.open && (c.open - c.low) > body * 2 && body / range < 0.4 && p.close < p.open)
      hits.push({ bar: i, name: "Молот", dir: "UP" });
    if (c.close < c.open && (c.high - c.open) > body * 2 && body / range < 0.4 && p.close > p.open)
      hits.push({ bar: i, name: "Shooting Star", dir: "DOWN" });
    if (p.close < p.open && c.close > c.open && c.open < p.close && c.close > p.open)
      hits.push({ bar: i, name: "Бычье поглощение", dir: "UP" });
    if (p.close > p.open && c.close < c.open && c.open > p.close && c.close < p.open)
      hits.push({ bar: i, name: "Медвежье поглощение", dir: "DOWN" });
    if (body / range < 0.1 && range > 0)
      hits.push({ bar: i, name: "Доджи", dir: i % 2 === 0 ? "UP" : "DOWN" });
  }
  const seen = new Set<string>();
  return hits.reverse().filter(h => { const k = h.name; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 5).reverse();
}

export function detectVolumeSpikes(candles: Candle[]): number[] {
  const avgVol = candles.reduce((s, c) => s + c.volume, 0) / candles.length;
  return candles.map((c, i) => (c.volume > avgVol * 1.6 ? i : -1)).filter(i => i !== -1);
}

export const candleCache: Record<string, Candle[]> = {};
export function getCandles(asset: string): Candle[] {
  if (!candleCache[asset]) candleCache[asset] = generate1MCandles(asset);
  return candleCache[asset];
}

// ─── НАЧАЛЬНЫЕ ДАННЫЕ ─────────────────────────────────────────────────────────

export const INITIAL_SIGNALS = Array.from({ length: 9 }, (_, i) => generateSignal(i + 1));
export const INITIAL_HISTORY = Array.from({ length: 30 }, (_, i) => generateHistory(i + 1));
export const CHART_DATA = generateChartData();

export const TABS = [
  { id: "signals",   label: "Сигналы",   icon: "Zap" },
  { id: "analytics", label: "Аналитика", icon: "BarChart2" },
  { id: "history",   label: "История",   icon: "Clock" },
  { id: "settings",  label: "Настройки", icon: "Settings" },
];
