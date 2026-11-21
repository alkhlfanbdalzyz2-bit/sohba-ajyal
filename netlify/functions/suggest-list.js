const { getStore, connectLambda } = require('@netlify/blobs');
const H = 'ec8ba1457c7f0046ac9afbcde66cbf4bd48ad3f102e254bcaf38f86010264a0b';
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const h = require('crypto').createHash('sha256').update(String(q.k || '')).digest('hex');
  if (h !== H) return { statusCode: 404, body: 'Not found' };
  try { connectLambda(event); } catch(_){}
  const s = getStore('suggest'), { blobs } = await s.list({ prefix: 'm/' });
  const items = (await Promise.all(blobs.map(b => s.get(b.key, { type: 'json' })))).filter(Boolean).sort((a, b) => b.t - a.t);
  const hd = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (q.f === 'json') return { statusCode: 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, hd), body: JSON.stringify(items) };
  const fmt = t => new Date(t).toLocaleString('ar-KW', { timeZone: 'Asia/Kuwait', dateStyle: 'medium', timeStyle: 'short' });
  const body = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>صندوق الاقتراحات</title><style>body{margin:0;font-family:system-ui,Tahoma,sans-serif;background:#0b1430;color:#fff;padding:18px}h1{font-size:20px;margin:0 0 4px}p.n{opacity:.7;margin:0 0 16px}.c{background:#13204a;border:1px solid #f7941d55;border-radius:16px;padding:14px;margin-bottom:12px;white-space:pre-wrap;line-height:1.8}.c small{display:block;opacity:.6;margin-top:6px;font-size:12px}</style></head><body><h1>📮 صندوق الاقتراحات</h1><p class="n">' + items.length + ' رسالة</p>' + (items.map(i => '<div class="c">' + esc(i.m) + '<small>' + fmt(i.t) + '</small></div>').join('') || '<p>ما فيه رسائل للحين</p>') + '</body></html>';
  return { statusCode: 200, headers: Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, hd), body };
};
