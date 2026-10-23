/* Firebase Cloud Messaging service worker.
 * Keep the Firebase SDK versions in sync with the web pages. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('./js/Firebase.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp(self.FPP_FIREBASE_CONFIG);
var messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  var data = payload && payload.data ? payload.data : {};
  if (!data.title) return;
  var icon = new URL('img/logo-dark.png', self.registration.scope).href;
  return self.registration.showNotification(data.title, {
    body: data.body || '',
    icon: icon,
    badge: icon,
    tag: data.notificationId || undefined,
    renotify: false,
    data: { link: data.link || 'ko/Main.html#home' }
  });
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var link = event.notification.data && event.notification.data.link || 'ko/Main.html#home';
  var target = new URL(link, self.registration.scope);
  if (target.origin !== self.location.origin) return;

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
    var existing = clients.find(function (client) {
      var clientUrl = new URL(client.url);
      var appScopePath = new URL(self.registration.scope).pathname;
      return clientUrl.origin === target.origin && clientUrl.pathname.startsWith(appScopePath);
    });
    if (existing) {
      return existing.navigate(target.href).then(function (client) { return (client || existing).focus(); });
    }
    return self.clients.openWindow(target.href);
  }));
});
