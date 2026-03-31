import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import SignalCard from "@/components/SignalCard";
import { LiveDot } from "@/components/SignalCard";
import AnalyticsSection from "@/components/AnalyticsSection";
import HistorySection from "@/components/HistorySection";
import SettingsSection from "@/components/SettingsSection";
import {
  ASSETS, TICKER_ITEMS, SESSION_LABEL, TABS,
  INITIAL_SIGNALS, INITIAL_HISTORY,
  Signal, getCurrentSession, generateSignal,
} from "@/lib/signals";

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

        {/* Фильтр по парам */}
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
