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
  const payload = JSON.stringify({ title: n.title, body: n.body || '', url: n.url || '/', tag: String(n.id) });
  const r = await require('../lib/broadcast').broadcast(s, payload);
  return { statusCode: 200, body: JSON.stringify(r) };
};
