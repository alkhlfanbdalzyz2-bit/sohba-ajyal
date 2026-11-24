/* صحبة أجيال — يخلي الموقع يفتح بسرعة وبدون إنترنت */
var C = 'sohba-202611250126';
var CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './apple-touch-icon.png', './assets/ajyal.webp', './assets/shield.webp', './assets/sohba-d.webp', './assets/sohba-l.webp', './assets/hero.webp', './assets/shapes.png', './assets/khutah.webp', './assets/cv-dir3.webp', './assets/cv-group.webp', './assets/cv-khutah.webp', './assets/cv-awards.webp', './assets/cv-khutah-ph.webp', './assets/cv-designs.webp', './assets/cv-rattil.webp', './assets/cv-basira.webp'];
self.addEventListener('install', function(e){ e.waitUntil(caches.open(C).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== C; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch', function(e){
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url); if (u.origin !== location.origin) return;
  if (r.mode === 'navigate'){ e.respondWith(fetch(r).then(function(res){ var cp = res.clone(); caches.open(C).then(function(c){ c.put('./index.html', cp); }); return res; }).catch(function(){ return caches.match('./index.html'); })); return; }
  if (/\.(mp4|m3u8|ts)$/.test(u.pathname) || u.pathname.indexOf('/.netlify/') === 0) return;
  e.respondWith(caches.match(r).then(function(hit){ return hit || fetch(r).then(function(res){ if (res.ok && /\/(assets|gal)\//.test(u.pathname)){ var cp = res.clone(); caches.open(C).then(function(c){ c.put(r, cp); }); } return res; }); }));
});
/* الإشعارات */
self.addEventListener('push', function(e){
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch(_){ d = { title: 'صحبة أجيال', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'صحبة أجيال', { body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || 'sohba', data: { url: d.url || './' }, dir: 'rtl', lang: 'ar' }));
});
self.addEventListener('notificationclick', function(e){
  e.notification.close(); var url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cs){
    for (var i = 0; i < cs.length; i++){ if ('focus' in cs[i]){ if (cs[i].navigate) cs[i].navigate(url); return cs[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
