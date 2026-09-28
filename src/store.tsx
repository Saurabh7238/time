import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { Task, Settings, ScreenDay } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getAllTasks, putTask, deleteTask, getAllScreenDays, loadSettings, saveSettings, getScreenDay, putScreenDay, todayStr, uid } from '@/lib/db';
import { triggerAlarm, snoozeTask, completeTask, requestNotificationPermission, unlockAlarmAudio, stopAlarmSound } from '@/lib/alarm';
import { initTracker, updateSettings, setCurrentUrl } from '@/lib/tracker';
import { t, type Lang } from '@/lib/i18n';
import { randomQuote } from '@/lib/utils';
import { deleteSyncedReminder, disablePushNotifications, isPushConfigured, setupPushNotifications, syncTaskReminder, syncTaskReminders } from '@/lib/push';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface BlockState {
  active: boolean;
  quote: string;
}

interface Store {
  tasks: Task[];
  settings: Settings;
  screenDays: ScreenDay[];
  toasts: Toast[];
  block: BlockState;
  alarmTask: Task | null;
  lang: Lang;
  T: (key: string) => string;
  addTask: (task: Omit<Task, 'id' | 'done' | 'createdAt'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleDone: (task: Task) => Promise<void>;
  snooze: (task: Task, min: number) => Promise<void>;
  dismissAlarm: () => void;
  updateSettings: (s: Partial<Settings>) => void;
  toggleTheme: () => void;
  toggleLang: () => void;
  toggleFocus: () => void;
  dismissBlock: (action: 'five' | 'hour') => void;
  clearCompleted: () => Promise<void>;
  refreshScreen: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used within StoreProvider');
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [screenDays, setScreenDays] = useState<ScreenDay[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [block, setBlock] = useState<BlockState>({ active: false, quote: randomQuote() });
  const [alarmTask, setAlarmTask] = useState<Task | null>(null);
  const blockRef = useRef(false);
  const alarmAudioRef = useRef(false);

  const T = useCallback((key: string) => t(settings.lang, key), [settings.lang]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = uid();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Init
  useEffect(() => {
    (async () => {
      const s = loadSettings();
      setSettings(s);
      if (s.theme === 'dark') document.documentElement.classList.add('dark');
      const ts = await getAllTasks();
      setTasks(ts.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
      if (s.notificationsEnabled && isPushConfigured() && 'Notification' in window && Notification.permission === 'granted') {
        void setupPushNotifications().then(result => {
          if (result.ok) void syncTaskReminders(ts);
        });
      }
      const sd = await getAllScreenDays();
      setScreenDays(sd);
      initTracker(s, {
        onWarning80: () => addToast(T('warning80'), 'warning'),
        onBlock: () => setBlock({ active: true, quote: randomQuote() }),
      });
    })();
  }, []); // eslint-disable-line

  useEffect(() => {
    const unlock = () => {
      void unlockAlarmAudio();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  // Alarm checker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const task of tasks) {
        if (task.done) continue;
        const due = new Date(`${task.date}T${task.time}:00`).getTime();
        const effective = task.snoozedUntil ?? due;
        if (now >= effective && !alarmAudioRef.current) {
          // Check if we already fired (within 2 min window)
          if (now >= effective && now - effective < 120000) {
            alarmAudioRef.current = true;
            setAlarmTask(task);
            triggerAlarm(task, settings.lang, {
              sound: settings.soundEnabled,
              voice: settings.voiceEnabled,
              vibration: settings.vibrationEnabled,
              notifications: settings.notificationsEnabled,
            });
            setTimeout(() => { alarmAudioRef.current = false; }, 60000);
          }
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [tasks, settings]);

  // Visibility tracking
  useEffect(() => {
    const handler = () => {
      setCurrentUrl(window.location.href);
    };
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('focus', handler);
    };
  }, []);

  // Apply theme
  useEffect(() => {
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    saveSettings(settings);
    updateSettings(settings);
  }, [settings]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'done' | 'createdAt'>) => {
    const newTask: Task = { ...task, id: uid(), done: false, createdAt: Date.now() };
    await putTask(newTask);
    if (settings.notificationsEnabled) void syncTaskReminder(newTask);
    setTasks(prev => [...prev, newTask].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
    addToast(T('save') + ' ✓', 'success');
  }, [addToast, T, settings.notificationsEnabled]);

  const updateTask = useCallback(async (task: Task) => {
    await putTask(task);
    if (settings.notificationsEnabled) void syncTaskReminder(task);
    setTasks(prev => prev.map(t => t.id === task.id ? task : t).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
  }, [settings.notificationsEnabled]);

  const removeTask = useCallback(async (id: string) => {
    await deleteTask(id);
    void deleteSyncedReminder(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleDone = useCallback(async (task: Task) => {
    const updated = { ...task, done: !task.done };
    await putTask(updated);
    if (settings.notificationsEnabled) void syncTaskReminder(updated);
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
  }, [settings.notificationsEnabled]);

  const snooze = useCallback(async (task: Task, min: number) => {
    const updated = await snoozeTask(task, min);
    if (settings.notificationsEnabled) void syncTaskReminder(updated);
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    stopAlarmSound();
    setAlarmTask(null);
    addToast(`${T('snoozed')} ${min} ${T('minutes')}`, 'info');
  }, [addToast, T, settings.notificationsEnabled]);

  const dismissAlarm = useCallback(() => {
    stopAlarmSound();
    setAlarmTask(null);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as { type?: string; taskId?: string; action?: string; minutes?: number };
      if (message.type !== 'alarm-action' || !message.taskId) return;
      const task = tasks.find(item => item.id === message.taskId);
      if (!task) return;
      if (message.action === 'snooze' && message.minutes) {
        void snooze(task, message.minutes);
      } else if (message.action === 'done') {
        void toggleDone(task).then(() => {
          stopAlarmSound();
          setAlarmTask(current => current?.id === task.id ? null : current);
        });
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [tasks, snooze, toggleDone]);

  const updateSettingsFn = useCallback(async (s: Partial<Settings>) => {
    if (s.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setSettings(prev => ({ ...prev, notificationsEnabled: false }));
        addToast(T('notificationPermissionNeeded'), 'warning');
        return;
      }
    }
    setSettings(prev => ({ ...prev, ...s }));
    if (s.notificationsEnabled === false) {
      void disablePushNotifications();
    } else if (s.notificationsEnabled === true) {
      if (!isPushConfigured()) {
        addToast(T('pushBackendNotConfigured'), 'warning');
      } else {
        const result = await setupPushNotifications();
        if (result.ok) await syncTaskReminders(tasks);
        else if (result.reason) addToast(T(result.reason), 'warning');
      }
    }
  }, [addToast, T, tasks]);

  const toggleTheme = useCallback(() => {
    setSettings(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  }, []);

  const toggleLang = useCallback(() => {
    setSettings(prev => ({ ...prev, lang: prev.lang === 'en' ? 'hi' : 'en' }));
  }, []);

  const toggleFocus = useCallback(() => {
    setSettings(prev => ({ ...prev, focusMode: !prev.focusMode }));
  }, []);

  const dismissBlock = useCallback((action: 'five' | 'hour') => {
    setBlock({ active: false, quote: randomQuote() });
    blockRef.current = false;
    if (action === 'hour') {
      addToast(T('blockHour'), 'info');
    } else {
      addToast(T('fiveMore'), 'info');
    }
  }, [addToast, T]);

  const clearCompleted = useCallback(async () => {
    const completed = tasks.filter(t => t.done);
    for (const t of completed) await deleteTask(t.id);
    setTasks(prev => prev.filter(t => !t.done));
  }, [tasks]);

  const refreshScreen = useCallback(async () => {
    const sd = await getAllScreenDays();
    setScreenDays(sd);
  }, []);

  const store: Store = {
    tasks, settings, screenDays, toasts, block, alarmTask, lang: settings.lang, T,
    addTask, updateTask, removeTask, toggleDone, snooze, dismissAlarm,
    updateSettings: updateSettingsFn, toggleTheme, toggleLang, toggleFocus,
    dismissBlock, clearCompleted, refreshScreen,
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
