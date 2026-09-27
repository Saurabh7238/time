import { useState } from 'react';
import { Check, Trash2, Bell, Search, Calendar } from 'lucide-react';
import { useStore } from '@/store';
import type { Task } from '@/types';
import { formatTime, formatDuration } from '@/lib/utils';

const priorityDot: Record<string, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-rose-500',
};

function TaskItem({ task }: { task: Task }) {
  const { toggleDone, removeTask, T, lang } = useStore();
  const overdue = !task.done && new Date(`${task.date}T${task.time}:00`).getTime() < Date.now();
  return (
    <div className={`card group flex items-start gap-3 p-4 transition hover:shadow-md ${task.done ? 'opacity-60' : ''}`}>
      <button
        onClick={() => toggleDone(task)}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${task.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500 dark:border-slate-600'}`}
      >
        {task.done && <Check size={12} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot[task.priority]}`} />
          <h3 className={`truncate text-sm font-semibold text-slate-900 dark:text-white ${task.done ? 'line-through' : ''}`}>{task.title}</h3>
          {task.repeat !== 'none' && <span className="chip bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">{task.repeat === 'daily' ? '↻' : '📅'}</span>}
        </div>
        {task.description && <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{task.description}</p>}
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-rose-500' : ''}`}>
            <Bell size={11} /> {formatTime(task.time, lang)}
          </span>
          <span className="inline-flex items-center gap-1"><Calendar size={11} /> {task.date}</span>
          {task.snoozedUntil && task.snoozedUntil > Date.now() && (
            <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {T('snoozed')} {formatDuration(task.snoozedUntil - Date.now(), lang)}
            </span>
          )}
        </div>
      </div>
      <button onClick={() => removeTask(task.id)} className="btn-ghost p-1.5 opacity-0 transition group-hover:opacity-100">
        <Trash2 size={16} className="text-rose-500" />
      </button>
    </div>
  );
}

export function TaskList() {
  const { tasks, T } = useStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [search, setSearch] = useState('');

  const filtered = tasks.filter(t => {
    if (filter === 'pending' && t.done) return false;
    if (filter === 'completed' && !t.done) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder={T('search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'pending', 'completed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`chip transition ${filter === f ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
              {T(f)}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
            <Check size={28} className="text-emerald-500" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{T('noTasks')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(task => <TaskItem key={task.id} task={task} />)}
        </div>
      )}
    </div>
  );
}
