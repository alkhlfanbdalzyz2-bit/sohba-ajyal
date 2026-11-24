const { store, keyOf } = require('../lib/store');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };
  let sub; try { sub = JSON.parse(event.body || '{}'); } catch(_){ return { statusCode: 400, body: '' }; }
  if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth || sub.endpoint.length > 1000) return { statusCode: 400, body: '' };
  const s = store(event), k = 'sub/' + keyOf(sub.endpoint);
  if (sub.remove) await s.delete(k);
  else await s.setJSON(k, { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh).slice(0, 200), auth: String(sub.keys.auth).slice(0, 100) }, t: Date.now() });
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '{"ok":true}' };
};
