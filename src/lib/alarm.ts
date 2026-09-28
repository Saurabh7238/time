import type { Task } from '@/types';
import { putTask } from '@/lib/db';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

let audioCtx: AudioContext | null = null;
let alarmInterval: number | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}

export function playAlarm(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    // Three beeps
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0, now + i * 0.4);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.4 + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.4 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.4);
      osc.stop(now + i * 0.4 + 0.35);
    }
  } catch { /* ignore */ }
}

export async function unlockAlarmAudio(): Promise<void> {
  try {
    await getCtx().resume();
  } catch { /* ignore */ }
}

export function startAlarmSound(): void {
  stopAlarmSound();
  playAlarm();
  alarmInterval = window.setInterval(playAlarm, 1800);
}

export function stopAlarmSound(): void {
  if (alarmInterval !== null) {
    window.clearInterval(alarmInterval);
    alarmInterval = null;
  }
  try {
    if ('vibrate' in navigator) navigator.vibrate(0);
  } catch { /* ignore */ }
}

export function vibrate(): void {
  try {
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 400]);
  } catch { /* ignore */ }
}

export function speak(text: string, enabled: boolean): void {
  if (!enabled || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export async function notify(
  title: string,
  body: string,
  taskId: string,
  actions: { title: string; action: string }[] = [],
  vibration: boolean,
): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      const opts: Record<string, unknown> = {
        body,
        icon: '/icon-192.svg',
        badge: '/icon-192.svg',
        tag: `focusguard-alarm-${taskId}`,
        requireInteraction: true,
        silent: false,
        vibrate: vibration ? [250, 150, 250, 150, 500] : [],
        data: { taskId },
      };
      if (actions.length) {
        opts.actions = actions.map(a => ({ title: a.title, action: a.action }));
      }
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, opts as NotificationOptions);
      } else {
        new Notification(title, opts as NotificationOptions);
      }
    } catch { /* ignore */ }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}

export async function triggerAlarm(task: Task, lang: Lang, opts: {
  sound: boolean; voice: boolean; vibration: boolean; notifications: boolean;
}): Promise<void> {
  if (opts.sound) startAlarmSound();
  if (opts.vibration) vibrate();
  if (opts.voice) speak(`${t(lang, 'taskReminder')}: ${task.title}`, true);
  if (opts.notifications) {
    await notify(
      t(lang, 'taskReminder'),
      task.title,
      task.id,
      [
        { title: t(lang, 'snooze') + ' 5', action: 'snooze-5' },
        { title: t(lang, 'done'), action: 'done' },
      ],
      opts.vibration,
    );
  }
}

export async function snoozeTask(task: Task, minutes: number): Promise<Task> {
  const updated = { ...task, snoozedUntil: Date.now() + minutes * 60000 };
  await putTask(updated);
  return updated;
}

export async function completeTask(task: Task): Promise<Task> {
  const updated: Task = { ...task, done: true };
  await putTask(updated);
  return updated;
}
