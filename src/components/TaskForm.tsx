import { useState } from 'react';
import { X, Calendar, Clock, Flag, Repeat, Plus } from 'lucide-react';
import { useStore } from '@/store';
import type { Task, Priority, Repeat as RepeatType } from '@/types';
import { todayStr } from '@/lib/db';

interface Props {
  onClose: () => void;
  editTask?: Task | null;
}

export function TaskForm({ onClose, editTask }: Props) {
  const { addTask, updateTask, T } = useStore();
  const [title, setTitle] = useState(editTask?.title ?? '');
  const [description, setDescription] = useState(editTask?.description ?? '');
  const [date, setDate] = useState(editTask?.date ?? todayStr());
  const [time, setTime] = useState(editTask?.time ?? '09:00');
  const [priority, setPriority] = useState<Priority>(editTask?.priority ?? 'medium');
  const [repeat, setRepeat] = useState<RepeatType>(editTask?.repeat ?? 'none');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (editTask) {
      await updateTask({ ...editTask, title, description, date, time, priority, repeat });
    } else {
      await addTask({ title, description, date, time, priority, repeat });
    }
    onClose();
  };

  const priorityColors: Record<Priority, string> = {
    low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="card w-full max-w-lg rounded-t-2xl p-6 animate-fade-in sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editTask ? T('tasks') : T('addTask')}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{T('title')}</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={T('title')} autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{T('description')}</label>
            <textarea className="input min-h-[72px] resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder={T('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"><Calendar size={12} /> {T('date')}</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"><Clock size={12} /> {T('time')}</label>
              <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"><Flag size={12} /> {T('priority')}</label>
              <div className="flex gap-1.5">
                {(['low', 'medium', 'high'] as Priority[]).map(p => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`chip flex-1 justify-center transition ${priority === p ? priorityColors[p] + ' ring-2 ring-offset-1 dark:ring-offset-slate-800' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                    {T(p)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"><Repeat size={12} /> {T('repeat')}</label>
              <select className="input" value={repeat} onChange={e => setRepeat(e.target.value as RepeatType)}>
                <option value="none">{T('none')}</option>
                <option value="daily">{T('daily')}</option>
                <option value="weekly">{T('weekly')}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1"><Plus size={18} /> {T('save')}</button>
            <button type="button" onClick={onClose} className="btn-ghost">{T('cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
