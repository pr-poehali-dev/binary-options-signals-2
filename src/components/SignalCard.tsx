import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Signal, Levels, ZoneResult, formatTime } from "@/lib/signals";

// ─── LiveDot ──────────────────────────────────────────────────────────────────

export function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--sx-green)] animate-pulse-dot" />
      <span className="font-mono text-[10px] text-[var(--sx-green)] tracking-widest uppercase">LIVE</span>
    </span>
  );
}

// ─── QualityBadge ─────────────────────────────────────────────────────────────

export function QualityBadge({ q }: { q: "A+" | "A" | "B" }) {
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

// ─── ConfirmationDots ─────────────────────────────────────────────────────────

export function ConfirmationDots({ count, total = 4 }: { count: number; total?: number }) {
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

// ─── StochBar ─────────────────────────────────────────────────────────────────

export function StochBar({ k, d, isUp }: { k: number; d: number; isUp: boolean }) {
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

// ─── LevelsChart ──────────────────────────────────────────────────────────────

export function LevelsChart({ levels, isUp }: { levels: Levels; isUp: boolean }) {
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
      <div className="relative h-28 mb-3">
        <div className="absolute left-8 right-0 top-0 bottom-0">
          <div className="absolute inset-0 rounded" style={{ background: "var(--sx-surface-2)" }} />

          {rows.map(({ label, val, color, op }) => {
            const pos = 100 - pct(val);
            return (
              <div key={label} className="absolute left-0 right-0 flex items-center" style={{ top: `${pos}%` }}>
                <div className="flex-1 border-t border-dashed" style={{ borderColor: color, opacity: parseFloat(op) * 0.5 }} />
              </div>
            );
          })}

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

        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between">
          {rows.map(({ label, color, op }) => (
            <span key={label} className="font-mono text-[9px] w-7" style={{ color, opacity: parseFloat(op) }}>{label}</span>
          ))}
        </div>
      </div>

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

// ─── SignalCard ───────────────────────────────────────────────────────────────

const SESSION_LABEL: Record<string, string> = { tokyo: "Токио", london: "Лондон", ny: "Нью-Йорк" };

export default function SignalCard({ signal, index }: { signal: Signal; index: number }) {
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
