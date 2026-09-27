import { useState } from 'react';
import { LayoutDashboard, ListTodo, Monitor, Settings as SettingsIcon, Plus, Moon, Sun, Globe, Shield } from 'lucide-react';
import { StoreProvider, useStore } from '@/store';
import { Dashboard } from '@/components/Dashboard';
import { TaskList } from '@/components/TaskList';
import { ScreenTimeView } from '@/components/ScreenTimeView';
import { SettingsView } from '@/components/SettingsView';
import { TaskForm } from '@/components/TaskForm';
import { AlarmOverlay } from '@/components/AlarmOverlay';
import { BlockOverlay } from '@/components/BlockOverlay';
import { Toasts } from '@/components/Toasts';

function Header() {
  const { T, settings, toggleTheme, toggleLang, toggleFocus } = useStore();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg dark:border-slate-700/60 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-900 dark:text-white">{T('appName')}</h1>
            <p className="hidden text-[10px] leading-tight text-slate-400 sm:block">{T('tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleFocus}
            className={`chip transition ${settings.focusMode ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
            <Shield size={14} /> {settings.focusMode ? T('focusModeOn') : T('focusModeOff')}
          </button>
          <button onClick={toggleLang} className="btn-ghost p-2" title={T('language')}>
            <Globe size={18} />
          </button>
          <button onClick={toggleTheme} className="btn-ghost p-2" title={T('theme')}>
            {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Nav({ view, setView }: { view: string; setView: (v: string) => void }) {
  const { T } = useStore();
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: T('dashboard') },
    { id: 'tasks', icon: ListTodo, label: T('tasks') },
    { id: 'screentime', icon: Monitor, label: T('screenTime') },
    { id: 'settings', icon: SettingsIcon, label: T('settings') },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/60 bg-white/90 backdrop-blur-lg dark:border-slate-700/60 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-1.5">
        {items.map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 transition ${view === item.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function Shell() {
  const [view, setView] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const { T } = useStore();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6">
        {view === 'dashboard' && <Dashboard onNavigate={setView} />}
        {view === 'tasks' && <TaskList />}
        {view === 'screentime' && <ScreenTimeView />}
        {view === 'settings' && <SettingsView />}
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 transition hover:bg-emerald-500 active:scale-95 sm:bottom-6"
        title={T('addTask')}
      >
        <Plus size={26} />
      </button>

      <Nav view={view} setView={setView} />
      {showForm && <TaskForm onClose={() => setShowForm(false)} />}
      <AlarmOverlay />
      <BlockOverlay />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
