import type { Settings, ScreenDay } from '@/types';
import { getScreenDay, putScreenDay, todayStr } from '@/lib/db';
import { getDomain, isDistracting } from '@/lib/utils';

let trackingInterval: number | null = null;
let lastTick = Date.now();
let currentUrl = '';
let currentSettings: Settings | null = null;
let onWarning80: (() => void) | null = null;
let onBlock: (() => void) | null = null;
let warnedToday = false;

export function initTracker(settings: Settings, callbacks: {
  onWarning80: () => void;
  onBlock: () => void;
}): void {
  currentSettings = settings;
  onWarning80 = callbacks.onWarning80;
  onBlock = callbacks.onBlock;
  warnedToday = false;
  startTracking();
}

export function updateSettings(settings: Settings): void {
  currentSettings = settings;
}

export function setCurrentUrl(url: string): void {
  currentUrl = url;
}

export function startTracking(): void {
  if (trackingInterval) return;
  lastTick = Date.now();
  trackingInterval = window.setInterval(async () => {
    const now = Date.now();
    const elapsed = now - lastTick;
    lastTick = now;
    if (!currentSettings) return;

    const domain = getDomain(currentUrl || window.location.href);
    const distracting = isDistracting(domain, currentSettings.distractingSites);
    const date = todayStr();
    const day = (await getScreenDay(date)) ?? { date, productive: 0, wasted: 0, perSite: {} };

    if (distracting) {
      day.wasted += elapsed;
      day.perSite[domain] = (day.perSite[domain] ?? 0) + elapsed;
    } else {
      day.productive += elapsed;
    }
    await putScreenDay(day);

    // Check limits
    const limitMs = currentSettings.dailyLimitMin * 60000;
    if (currentSettings.focusMode && distracting) {
      onBlock?.();
      return;
    }
    if (distracting && limitMs > 0) {
      if (day.wasted >= limitMs) {
        onBlock?.();
      } else if (day.wasted >= limitMs * 0.8 && !warnedToday) {
        warnedToday = true;
        onWarning80?.();
      }
    }
  }, 5000);
}

export function stopTracking(): void {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
}
