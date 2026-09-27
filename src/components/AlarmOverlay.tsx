import { Clock, X, Check } from 'lucide-react';
import { useStore } from '@/store';

export function AlarmOverlay() {
  const { alarmTask, T, lang, snooze, dismissAlarm, toggleDone } = useStore();
  if (!alarmTask) return null;

  const priorityColor = alarmTask.priority === 'high' ? 'text-rose-500' : alarmTask.priority === 'medium' ? 'text-amber-500' : 'text-emerald-500';

  const handleDone = async () => {
    await toggleDone(alarmTask);
    dismissAlarm();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="card mx-4 w-full max-w-md animate-fade-in p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 animate-pulse-ring items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
          <Clock size={32} className="text-emerald-500" />
        </div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{T('taskReminder')}</p>
        <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{alarmTask.title}</h2>
        {alarmTask.description && <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{alarmTask.description}</p>}
        <div className="mb-6 flex items-center justify-center gap-3 text-sm text-slate-400">
          <span className={priorityColor}>● {T(alarmTask.priority)}</span>
          <span>·</span>
          <span>{alarmTask.date}</span>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 15].map(m => (
              <button key={m} onClick={() => snooze(alarmTask, m)}
                className="btn-ghost border border-slate-200 dark:border-slate-600">
                {T('snooze')} {m}{T('minutes')}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={handleDone} className="btn-primary flex-1">
              <Check size={18} /> {T('done')}
            </button>
            <button onClick={dismissAlarm} className="btn-ghost p-2"><X size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
