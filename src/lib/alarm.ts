import type { Task } from '@/types';
import { putTask } from '@/lib/db';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

let audioCtx: AudioContext | null = null;

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
  lang: Lang,
  actions: { title: string; action: string }[] = [],
): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      const opts: Record<string, unknown> = {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'focusguard-alarm',
        requireInteraction: true,
      };
      if (actions.length && 'actions' in Notification.prototype) {
        opts.actions = actions.map(a => ({ title: a.title, action: a.action }));
      }
      new Notification(title, opts as NotificationOptions);
    } catch { /* ignore */ }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

export async function triggerAlarm(task: Task, lang: Lang, opts: {
  sound: boolean; voice: boolean; vibration: boolean; notifications: boolean;
}): Promise<void> {
  if (opts.sound) playAlarm();
  if (opts.vibration) vibrate();
  if (opts.voice) speak(`${t(lang, 'taskReminder')}: ${task.title}`, true);
  if (opts.notifications) {
    await notify(
      t(lang, 'taskReminder'),
      task.title,
      lang,
      [
        { title: t(lang, 'snooze') + ' 5', action: 'snooze-5' },
        { title: t(lang, 'done'), action: 'done' },
      ],
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
