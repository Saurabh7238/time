# Closed-app Android alarms

Closed-app reminders use Web Push from Supabase. The browser cannot wake a closed app on its own. A Supabase project and VAPID key pair are required before this feature can send push notifications.

## Configure Supabase

1. Create a Supabase project. In Authentication settings, enable **Anonymous sign-ins**.
2. Copy `.env.example` to `.env.local` and fill in the project URL, the public anon/publishable key, and the VAPID public key. These `VITE_` values are public; never put a service-role or VAPID private key in `.env.local`.
3. Install the Supabase CLI, log in, and link the project:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

4. Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Put the public key in `.env.local`. Set the private key and a contact URL/email only as server secrets:

   ```powershell
   npx supabase secrets set VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY VAPID_SUBJECT=mailto:YOUR_EMAIL PUSH_CRON_SECRET=YOUR_RANDOM_SECRET
   ```

   Use the same `PUSH_CRON_SECRET` value in the SQL Vault setup below.

5. Deploy the sender function:

   ```powershell
   npx supabase functions deploy send-due-alarms
   ```

6. In the Supabase SQL Editor, store the three values used by the database cron job in Vault. Get the service-role key from the Supabase project API settings. Do not put that key in the app or commit it.

   ```sql
   select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'focusguard_project_url');
   select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'focusguard_service_role_key');
   select vault.create_secret('YOUR_RANDOM_SECRET', 'focusguard_cron_secret');
   ```

   The migration schedules the sender every minute. Confirm `focusguard-send-due-reminders` appears in Supabase Cron after applying the migration.

7. Build and deploy the site over HTTPS, open it on Android Chrome, add it to the Home screen, allow notifications, then turn notifications on in FocusGuard. Keep Android notifications enabled for Chrome/FocusGuard and allow background data/battery use for reliable delivery.

## Delivery notes

The cron checks once per minute, so delivery is not an exact-to-the-second alarm. Android battery saver, Do Not Disturb, network availability, and notification settings can delay or silence it. The push service can wake the installed PWA service worker while the app is closed; the browser cannot guarantee an alarm if notification permission is revoked or the device is offline.
