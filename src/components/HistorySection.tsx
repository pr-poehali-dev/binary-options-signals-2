import { HistoryItem, formatDateTime } from "@/lib/signals";

export default function HistorySection({ history }: { history: HistoryItem[] }) {
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
