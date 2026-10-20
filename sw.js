// ============================================
// BASPAR PLASTICS - Service Worker
// برای دریافت Push Notification
// ============================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(self.clients.claim());
});

// دریافت Push
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'BASPAR PLASTICS',
    body: 'اعلان جدید',
    tagNo: '',
    type: 'update',
    priority: 'normal',
    url: '/'
  };
  
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (err) {
    console.error('[SW] Parse error:', err);
  }
  
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tagNo || 'baspar-notif',
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      url: data.url || '/',
      tagNo: data.tagNo,
      type: data.type
    },
    vibrate: data.priority === 'urgent' ? [200, 100, 200, 100, 200] : [100, 50, 100],
    actions: [
      { action: 'open', title: 'مشاهده' },
      { action: 'close', title: 'بستن' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// کلیک روی نوتیفیکیشن
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();
  
  if (event.action === 'close') return;
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // اگر تب باز است، فوکوس کن
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // وگرنه تب جدید باز کن
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// بستن نوتیفیکیشن
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});