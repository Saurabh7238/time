import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Task } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
let client: SupabaseClient | null = null;

export function isPushConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && vapidPublicKey);
}

function getClient(): SupabaseClient | null {
  if (!isPushConfigured()) return null;
  if (!client) client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

async function getUserId(supabase: SupabaseClient): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (session?.user.id) return session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error('Anonymous sign-in returned no user');
  return data.user.id;
}

function decodeVapidKey(key: string): Uint8Array {
  const padded = key + '='.repeat((4 - key.length % 4) % 4);
  const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}

export async function setupPushNotifications(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushConfigured()) return { ok: false, reason: 'pushBackendNotConfigured' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'pushNotSupported' };
  }
  if (Notification.permission !== 'granted') {
    return { ok: false, reason: 'notificationPermissionNeeded' };
  }

  try {
    const supabase = getClient();
    if (!supabase) return { ok: false, reason: 'pushBackendNotConfigured' };
    const userId = await getUserId(supabase);
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription()
      ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(vapidPublicKey!) as BufferSource,
      });
    const serialized = subscription.toJSON();
    if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
      return { ok: false, reason: 'pushSetupFailed' };
    }

    const { error } = await supabase.from('focusguard_push_subscriptions').upsert({
      endpoint: serialized.endpoint,
      user_id: userId,
      p256dh: serialized.keys.p256dh,
      auth: serialized.keys.auth,
    }, { onConflict: 'endpoint' });
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    console.error('Unable to set up push notifications', error);
    return { ok: false, reason: 'pushSetupFailed' };
  }
}

function toReminder(task: Task, userId: string) {
  const dueAt = task.snoozedUntil ?? new Date(`${task.date}T${task.time}:00`).getTime();
  return {
    user_id: userId,
    id: task.id,
    title: task.title,
    fire_at: new Date(dueAt).toISOString(),
    done: task.done,
  };
}

export async function syncTaskReminders(tasks: Task[]): Promise<void> {
  const supabase = getClient();
  if (!supabase || !tasks.length) return;
  try {
    const userId = await getUserId(supabase);
    const { error } = await supabase
      .from('focusguard_reminders')
      .upsert(tasks.map(task => toReminder(task, userId)), { onConflict: 'user_id,id' });
    if (error) throw error;
  } catch (error) {
    console.error('Unable to sync reminders', error);
  }
}

export async function syncTaskReminder(task: Task): Promise<void> {
  await syncTaskReminders([task]);
}

export async function deleteSyncedReminder(taskId: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  try {
    const userId = await getUserId(supabase);
    const { error } = await supabase
      .from('focusguard_reminders')
      .delete()
      .eq('user_id', userId)
      .eq('id', taskId);
    if (error) throw error;
  } catch (error) {
    console.error('Unable to remove synced reminder', error);
  }
}

export async function disablePushNotifications(): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  try {
    const userId = await getUserId(supabase);
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await supabase
        .from('focusguard_push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
      await subscription.unsubscribe();
    }
    await supabase
      .from('focusguard_reminders')
      .delete()
      .eq('user_id', userId);
  } catch (error) {
    console.error('Unable to disable push notifications', error);
  }
}
