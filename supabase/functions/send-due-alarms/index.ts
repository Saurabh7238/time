import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const headers = { 'Content-Type': 'application/json' };

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const cronSecret = Deno.env.get('PUSH_CRON_SECRET');
  if (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return new Response('Push secrets are not configured', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const { data: reminders, error: claimError } = await supabase
    .rpc('claim_due_focusguard_reminders', { batch_size: 100 });
  if (claimError) {
    console.error('Unable to claim reminders', claimError.message);
    return Response.json({ error: 'Unable to claim reminders' }, { status: 500, headers });
  }

  if (!reminders?.length) {
    return Response.json({ sent: 0 }, { headers });
  }

  const userIds = [...new Set(reminders.map((reminder) => reminder.user_id))];
  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('focusguard_push_subscriptions')
    .select('endpoint, user_id, p256dh, auth')
    .in('user_id', userIds);
  if (subscriptionError) {
    console.error('Unable to load push subscriptions', subscriptionError.message);
    return new Response('Unable to load push subscriptions', { status: 500 });
  }

  const byUser = new Map<string, typeof subscriptions>();
  for (const subscription of subscriptions ?? []) {
    const existing = byUser.get(subscription.user_id) ?? [];
    existing.push(subscription);
    byUser.set(subscription.user_id, existing);
  }

  let sent = 0;
  for (const reminder of reminders) {
    const targets = byUser.get(reminder.user_id) ?? [];
    let delivered = false;
    for (const subscription of targets) {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify({
            title: 'FocusGuard',
            options: {
              body: reminder.title,
              icon: '/icon-192.svg',
              badge: '/icon-192.svg',
              tag: `focusguard-alarm-${reminder.task_id}`,
              requireInteraction: true,
              vibrate: [250, 150, 250, 150, 500],
              data: { taskId: reminder.task_id },
              actions: [
                { title: 'Snooze 5 min', action: 'snooze-5' },
                { title: 'Done', action: 'done' },
              ],
            },
          }),
        );
        delivered = true;
        sent++;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from('focusguard_push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint);
        } else {
          console.error('Push delivery failed', statusCode ?? 'unknown status');
        }
      }
    }

    if (!delivered) {
      await supabase
        .from('focusguard_reminders')
        .update({ delivered_at: null })
        .eq('user_id', reminder.user_id)
        .eq('id', reminder.task_id);
    }
  }

  return Response.json({ sent }, { headers });
});
