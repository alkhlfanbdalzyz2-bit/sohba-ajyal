const { getStore, connectLambda } = require('@netlify/blobs');
const crypto = require('crypto');
// يرجّع ردود بو عمر على اقتراحات صاحب الرقم السري فقط
exports.handler = async (event) => {
  const tok = String((event.queryStringParameters || {}).t || '');
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(tok)) return { statusCode: 400, body: '[]' };
  const th = crypto.createHash('sha256').update(tok).digest('hex');
  try { connectLambda(event); } catch(_){}
  const s = getStore('suggest'), { blobs } = await s.list({ prefix: 'm/' });
  const all = (await Promise.all(blobs.map(async b => { const v = await s.get(b.key, { type: 'json' }); return v && Object.assign({ _k: b.key }, v); }))).filter(Boolean);
  // ربط اشتراك الإشعارات الحالي باقتراحاته (عشان يوصله إشعار الرد له هو بس)
  const ep = String((event.queryStringParameters || {}).e || '');
  if (/^https:\/\//.test(ep) && ep.length < 1000) {
    const pk = require('../lib/store').keyOf(ep);
    await Promise.all(all.filter(i => i.th === th && i.pk !== pk).map(i => { const r = Object.assign({}, i); delete r._k; r.pk = pk; return s.setJSON(i._k, r); }));
  }
  const mine = all.filter(i => i.th === th).sort((a, b) => b.t - a.t).map(i => ({ m: i.m, t: i.t, r: i.r || null, rt: i.rt || null }));
  return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(mine) };
};
