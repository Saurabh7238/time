const CACHE_NAME = 'focusguard-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch { /* ignore invalid payload */ }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'FocusGuard', payload.options || {})
  );
});

function updateTaskFromNotification(taskId, action, minutes) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('focusguard', 1);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('tasks')) {
        db.close();
        resolve();
        return;
      }
      const transaction = db.transaction('tasks', 'readwrite');
      const store = transaction.objectStore('tasks');
      const getTask = store.get(taskId);
      getTask.onsuccess = () => {
        const task = getTask.result;
        if (!task) return;
        if (action === 'done') task.done = true;
        if (action === 'snooze' && minutes) task.snoozedUntil = Date.now() + minutes * 60000;
        store.put(task);
      };
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    };
    request.onerror = () => reject(request.error);
  });
}

// Handle notification actions in background
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const { taskId } = event.notification.data || {};
  event.notification.close();

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (action && taskId) {
      const isSnooze = action.startsWith('snooze-');
      const minutes = isSnooze ? parseInt(action.split('-')[1], 10) : undefined;
      const message = {
        type: 'alarm-action',
        taskId,
        action: isSnooze ? 'snooze' : action,
        minutes,
      };
      await updateTaskFromNotification(taskId, message.action, minutes).catch(() => {});
      clients.forEach((client) => client.postMessage(message));
    }
    if (clients[0]) await clients[0].focus();
    else await self.clients.openWindow('/');
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
