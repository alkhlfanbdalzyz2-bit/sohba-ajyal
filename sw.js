// لوحة التحكم: إشعارات الاقتراحات الجديدة فقط (بدون كاش)
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch(_){ d = { title: 'لوحة التحكم', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'لوحة التحكم', { body: d.body || '', icon: 'icon.png', badge: 'icon.png', tag: d.tag || 'adm', data: { url: d.url || './?s=sug' }, dir: 'rtl', lang: 'ar' }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const u = new URL((e.notification.data && e.notification.data.url) || './?s=sug', self.location.href).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(L => { for (const c of L){ if ('focus' in c){ c.navigate && c.navigate(u).catch(()=>{}); return c.focus(); } } return self.clients.openWindow(u); }));
});
