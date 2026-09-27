import type { Task, ScreenDay, Settings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

const DB_NAME = 'focusguard';
const DB_VERSION = 1;
const STORE_TASKS = 'tasks';
const STORE_SCREEN = 'screen';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TASKS)) {
        db.createObjectStore(STORE_TASKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SCREEN)) {
        db.createObjectStore(STORE_SCREEN, { keyPath: 'date' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(db => new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

export async function getAllTasks(): Promise<Task[]> {
  return tx(STORE_TASKS, 'readonly', s => s.getAll() as IDBRequest<Task[]>).catch(() => []);
}
export async function putTask(task: Task): Promise<void> {
  await tx(STORE_TASKS, 'readwrite', s => s.put(task));
}
export async function deleteTask(id: string): Promise<void> {
  await tx(STORE_TASKS, 'readwrite', s => s.delete(id));
}

export async function getScreenDay(date: string): Promise<ScreenDay | undefined> {
  return tx(STORE_SCREEN, 'readonly', s => s.get(date) as IDBRequest<ScreenDay | undefined>).catch(() => undefined);
}
export async function putScreenDay(day: ScreenDay): Promise<void> {
  await tx(STORE_SCREEN, 'readwrite', s => s.put(day));
}
export async function getAllScreenDays(): Promise<ScreenDay[]> {
  return tx(STORE_SCREEN, 'readonly', s => s.getAll() as IDBRequest<ScreenDay[]>).catch(() => []);
}

// Settings in localStorage
const SETTINGS_KEY = 'focusguard:settings';
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}
export function saveSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// Misc helpers
export const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const uid = (): string => Math.random().toString(36).slice(2) + Date.now().toString(36);
