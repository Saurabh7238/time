import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { formatDuration } from '@/lib/utils';
import type { ScreenDay } from '@/types';

// Simple SVG donut chart — no external dependency
function Donut({ productive, wasted, lang }: { productive: number; wasted: number; lang: 'en' | 'hi' }) {
  const total = productive + wasted || 1;
  const prodPct = (productive / total) * 100;
  const wastePct = (wasted / total) * 100;
  const circumference = 2 * Math.PI * 70;
  const prodDash = (prodPct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
        <circle cx="90" cy="90" r="70" fill="none" strokeWidth="20" className="stroke-rose-200 dark:stroke-rose-900/40" />
        <circle cx="90" cy="90" r="70" fill="none" strokeWidth="20"
          className="stroke-emerald-500 transition-all duration-700"
          strokeDasharray={`${prodDash} ${circumference}`}
          strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(prodPct)}%</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{lang === 'hi' ? 'उत्पादक' : 'Productive'}</div>
      </div>
    </div>
  );
}

// Simple bar chart for weekly history
function WeekBars({ days, lang }: { days: ScreenDay[]; lang: 'en' | 'hi' }) {
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return days.find(s => s.date === ds) ?? { date: ds, productive: 0, wasted: 0, perSite: {} };
  });
  const max = Math.max(...last7.map(d => d.productive + d.wasted), 1);
  const dayLabels = lang === 'hi' ? ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex h-40 items-end justify-between gap-2">
      {last7.map((d, i) => {
        const prodH = (d.productive / max) * 100;
        const wasteH = (d.wasted / max) * 100;
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-full w-full flex-col justify-end gap-0.5">
              <div className="w-full rounded-t bg-rose-400 transition-all duration-500 dark:bg-rose-500/70" style={{ height: `${wasteH}%` }} title={`${lang === 'hi' ? 'बर्बाद' : 'Wasted'}: ${formatDuration(d.wasted, lang)}`} />
              <div className="w-full rounded-b bg-emerald-500 transition-all duration-500 dark:bg-emerald-500/80" style={{ height: `${prodH}%` }} title={`${lang === 'hi' ? 'उत्पादक' : 'Productive'}: ${formatDuration(d.productive, lang)}`} />
            </div>
            <span className="text-[10px] font-medium text-slate-400">{dayLabels[new Date(d.date).getDay()]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ScreenTimeView() {
  const { screenDays, settings, T, lang, refreshScreen, updateSettings } = useStore();
  const [newSite, setNewSite] = useState('');
  const tick = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => { tick.current++; refreshScreen(); }, 10000);
    return () => clearInterval(interval);
  }, [refreshScreen]);

  const today = screenDays.find(d => d.date === new Date().toISOString().slice(0, 10)) ?? { date: '', productive: 0, wasted: 0, perSite: {} };
  const limitMs = settings.dailyLimitMin * 60000;
  const wastedPct = limitMs > 0 ? Math.min((today.wasted / limitMs) * 100, 100) : 0;
  const overLimit = today.wasted > limitMs;

  const handleAddSite = () => {
    let s = newSite.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (!s || settings.distractingSites.includes(s)) { setNewSite(''); return; }
    updateSettings({ distractingSites: [...settings.distractingSites, s] });
    setNewSite('');
  };

  const removeSite = (site: string) => {
    updateSettings({ distractingSites: settings.distractingSites.filter(s => s !== site) });
  };

  return (
    <div className="space-y-6">
      {/* Today summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card flex flex-col items-center gap-4 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{T('today')}</h3>
          <Donut productive={today.productive} wasted={today.wasted} lang={lang} />
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">{T('productive')}: <b>{formatDuration(today.productive, lang)}</b></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="text-slate-600 dark:text-slate-300">{T('wasted')}: <b>{formatDuration(today.wasted, lang)}</b></span>
            </div>
          </div>
        </div>

        {/* Limit progress */}
        <div className="card flex flex-col gap-4 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{T('dailyLimit')}</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${overLimit ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{formatDuration(today.wasted, lang)}</span>
            <span className="text-sm text-slate-400">{T('ofLimit')} {settings.dailyLimitMin}{T('minutesShort')}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div className={`h-full rounded-full transition-all duration-500 ${overLimit ? 'bg-rose-500' : wastedPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${wastedPct}%` }} />
          </div>
          {overLimit && <p className="text-sm font-medium text-rose-500">{T('overLimit')}</p>}
          <div className="mt-auto">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{T('dailyLimit')}</label>
            <input type="range" min="15" max="240" step="15" value={settings.dailyLimitMin} onChange={e => updateSettings({ dailyLimitMin: parseInt(e.target.value) })} className="w-full accent-emerald-500" />
            <div className="flex justify-between text-xs text-slate-400"><span>15{T('minutesShort')}</span><span>{settings.dailyLimitMin}{T('minutesShort')}</span><span>240{T('minutesShort')}</span></div>
          </div>
        </div>

        {/* Per-site breakdown */}
        <div className="card flex flex-col gap-3 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{T('distractingSites')}</h3>
          <div className="space-y-2">
            {Object.entries(today.perSite).sort((a, b) => b[1] - a[1]).map(([site, ms]) => (
              <div key={site} className="flex items-center justify-between text-sm">
                <span className="truncate text-slate-600 dark:text-slate-300">{site}</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatDuration(ms, lang)}</span>
              </div>
            ))}
            {Object.keys(today.perSite).length === 0 && <p className="text-xs text-slate-400">—</p>}
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{T('weeklySummary')}</h3>
        <WeekBars days={screenDays} lang={lang} />
      </div>

      {/* Distracting sites management */}
      <div className="card p-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{T('distractingSites')}</h3>
        <div className="flex flex-wrap gap-2">
          {settings.distractingSites.map(site => (
            <span key={site} className="chip bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
              {site}
              <button onClick={() => removeSite(site)} className="ml-1 text-rose-400 hover:text-rose-600">✕</button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="input flex-1" placeholder={T('addSite')} value={newSite} onChange={e => setNewSite(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSite(); } }} />
          <button onClick={handleAddSite} className="btn-primary">{T('addSite')}</button>
        </div>
      </div>
    </div>
  );
}
