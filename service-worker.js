/* service-worker.js - Baspar Repair */
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var data = { title: 'BASPAR', body: 'اعلان جدید', url: './' };
  try {
    if (event.data) {
      var parsed = event.data.json();
      data = Object.assign(data, parsed);
    }
  } catch (e) {
    try { data.body = event.data.text(); } catch (e2) {}
  }
  var opts = {
    body: data.body,
    data: { url: data.url || './' },
    tag: 'baspar-push',
    renotify: true
  };
  if (data.icon) opts.icon = data.icon;
  if (data.badge) opts.badge = data.badge;
  event.waitUntil(self.registration.showNotification(data.title, opts));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if ('focus' in client) {
          if (client.navigate) client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});