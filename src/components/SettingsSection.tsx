import { useState } from "react";
import { ASSETS } from "@/lib/signals";

export default function SettingsSection() {
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
