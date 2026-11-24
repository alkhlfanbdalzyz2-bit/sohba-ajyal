const { getStore, connectLambda } = require('@netlify/blobs');
const crypto = require('crypto');
// صندوق الاقتراحات: نحفظ نص الرسالة ووقتها + بصمة رقم سري عشوائي من جوال المرسل (عشان يوصله الرد) — بدون اسم أو رقم أو IP
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };
  let b; try { b = JSON.parse(event.body || '{}'); } catch(_){ return { statusCode: 400, body: '' }; }
  if (b.hp) return { statusCode: 200, body: '{"ok":true}' };
  const m = String(b.m || '').replace(/\s+$/,'').trim();
  if (m.length < 2 || m.length > 1500) return { statusCode: 400, body: '' };
  const tok = String(b.tok || '');
  const th = /^[A-Za-z0-9_-]{16,64}$/.test(tok) ? crypto.createHash('sha256').update(tok).digest('hex') : null;
  try { connectLambda(event); } catch(_){}
  const s = getStore('suggest'), t = Date.now();
  const rec = { m, t }; if (th) rec.th = th;
  await s.setJSON('m/' + t + '-' + Math.random().toString(36).slice(2, 8), rec);
  console.log('SUG ' + JSON.stringify({ m, t }));
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '{"ok":true}' };
};
