// يشتغل تلقائياً بعد كل نشر: إذا تغيّر notify.json يرسل إشعار لكل المشتركين مرة وحدة
const https = require('https');
const { store, vapid } = require('../lib/store');
const { send } = require('../lib/push');
const getJSON = url => new Promise(res => https.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch(_){ res(null); } }); }).on('error', () => res(null)));
exports.handler = async (event) => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const n = await getJSON(base + '/notify.json?t=' + Date.now());
  if (!n || !n.id || !n.title) return { statusCode: 200, body: 'no notify' };
  const s = store(event);
  const last = await s.get('last-id');
  if (last === String(n.id)) return { statusCode: 200, body: 'already sent' };
  await s.set('last-id', String(n.id));
  const v = await vapid(s);
  const payload = JSON.stringify({ title: n.title, body: n.body || '', url: n.url || '/', tag: String(n.id) });
  const { blobs } = await s.list({ prefix: 'sub/' });
  let ok = 0, gone = 0;
  for (let i = 0; i < blobs.length; i += 20){
    await Promise.all(blobs.slice(i, i + 20).map(async b => {
      const sub = await s.get(b.key, { type: 'json' }); if (!sub) return;
      const st = await send(sub, payload, v, 'https://wa.me/96597946974');
      if (st === 404 || st === 410){ gone++; await s.delete(b.key); } else if (st >= 200 && st < 300) ok++;
    }));
  }
  return { statusCode: 200, body: JSON.stringify({ sent: ok, removed: gone, total: blobs.length }) };
};
