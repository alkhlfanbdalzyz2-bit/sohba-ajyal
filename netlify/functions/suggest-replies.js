const { getStore, connectLambda } = require('@netlify/blobs');
const crypto = require('crypto');
// يرجّع ردود بو عمر على اقتراحات صاحب الرقم السري فقط
exports.handler = async (event) => {
  const tok = String((event.queryStringParameters || {}).t || '');
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(tok)) return { statusCode: 400, body: '[]' };
  const th = crypto.createHash('sha256').update(tok).digest('hex');
  try { connectLambda(event); } catch(_){}
  const s = getStore('suggest'), { blobs } = await s.list({ prefix: 'm/' });
  const all = (await Promise.all(blobs.map(b => s.get(b.key, { type: 'json' })))).filter(Boolean);
  const mine = all.filter(i => i.th === th).sort((a, b) => b.t - a.t).map(i => ({ m: i.m, t: i.t, r: i.r || null, rt: i.rt || null }));
  return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(mine) };
};
