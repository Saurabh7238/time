import { Bell, Check, Clock, TrendingUp, Calendar, Target } from 'lucide-react';
import { useStore } from '@/store';
import { formatTime, formatDuration } from '@/lib/utils';
import { todayStr } from '@/lib/db';

export function Dashboard({ onNavigate }: { onNavigate: (v: string) => void }) {
  const { tasks, screenDays, settings, T, lang } = useStore();
  const today = todayStr();
  const todayTasks = tasks.filter(t => t.date === today);
  const pendingToday = todayTasks.filter(t => !t.done);
  const completedToday = todayTasks.filter(t => t.done);
  const upcoming = tasks.filter(t => !t.done && new Date(`${t.date}T${t.time}:00`).getTime() > Date.now()).slice(0, 5);

  const todayScreen = screenDays.find(d => d.date === today) ?? { productive: 0, wasted: 0, perSite: {} };
  const totalToday = todayScreen.productive + todayScreen.wasted || 1;
  const score = Math.round((todayScreen.productive / totalToday) * 100);

  // Weekly time saved (limit - wasted, min 0)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return screenDays.find(s => s.date === ds);
  });
  const weekWasted = last7.reduce((a, d) => a + (d?.wasted ?? 0), 0);
  const weekLimit = settings.dailyLimitMin * 7 * 60000;
  const timeSaved = Math.max(0, weekLimit - weekWasted);

  const stats = [
    { icon: Target, label: T('todayTasks'), value: `${completedToday.length}/${todayTasks.length}`, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { icon: Bell, label: T('upcomingAlarms'), value: upcoming.length, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    { icon: TrendingUp, label: T('productivityScore'), value: `${score}%`, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { icon: Clock, label: T('timeSaved'), value: formatDuration(timeSaved, lang), color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/30' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="card flex items-center gap-3 p-4 transition hover:shadow-md">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.bg}`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's tasks */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Calendar size={16} className="text-emerald-500" /> {T('todayTasks')}</h3>
            <button onClick={() => onNavigate('tasks')} className="text-xs font-medium text-emerald-600 hover:underline">{T('all')} →</button>
          </div>
          <div className="space-y-2">
            {pendingToday.length === 0 && completedToday.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">{T('noTasks')}</p>
            ) : (
              [...pendingToday, ...completedToday].slice(0, 6).map(task => (
                <div key={task.id} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${task.priority === 'high' ? 'bg-rose-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span className={`flex-1 truncate text-sm ${task.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</span>
                  <span className="text-xs text-slate-400">{formatTime(task.time, lang)}</span>
                  {task.done && <Check size={14} className="text-emerald-500" />}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming alarms */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Bell size={16} className="text-amber-500" /> {T('upcomingAlarms')}</h3>
            <button onClick={() => onNavigate('tasks')} className="text-xs font-medium text-emerald-600 hover:underline">{T('all')} →</button>
          </div>
          <div className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">{T('noAlarms')}</p>
            ) : (
              upcoming.map(task => (
                <div key={task.id} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                    <Bell size={15} className="text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{task.title}</p>
                    <p className="text-xs text-slate-400">{task.date} · {formatTime(task.time, lang)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Weekly mini report */}
      <div className="card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><TrendingUp size={16} className="text-blue-500" /> {T('weeklyReport')}</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{T('productiveTime')}</p>
            <p className="mt-1 text-xl font-bold text-emerald-500">{formatDuration(last7.reduce((a, d) => a + (d?.productive ?? 0), 0), lang)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{T('wastedTime')}</p>
            <p className="mt-1 text-xl font-bold text-rose-500">{formatDuration(weekWasted, lang)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{T('timeSaved')}</p>
            <p className="mt-1 text-xl font-bold text-violet-500">{formatDuration(timeSaved, lang)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
