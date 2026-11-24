const { getStore, connectLambda } = require('@netlify/blobs');
const crypto = require('crypto');
// صاحب الاقتراح (برقمه السري): يشوف ردود بو عمر على اقتراحاته، ويعدّل أو يحذف اقتراحه
// الحذف ما يمسح نهائياً: ينقل الاقتراح للمحذوفات (d/) عشان يضل مخزن
const J = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  let b = {}; if (event.httpMethod === 'POST') { try { b = JSON.parse(event.body || '{}'); } catch(_){ return J(400, {}); } }
  const tok = String(b.t || q.t || '');
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(tok)) return J(400, []);
  const th = crypto.createHash('sha256').update(tok).digest('hex');
  try { connectLambda(event); } catch(_){}
  const s = getStore('suggest');
  if (event.httpMethod === 'POST') {
    const id = String(b.id || '');
    if (!/^[0-9]+-[a-z0-9]+$/.test(id)) return J(400, {});
    const key = 'm/' + id, rec = await s.get(key, { type: 'json' });
    if (!rec || rec.th !== th) return J(404, {});
    if (b.a === 'edit') {
      const m = String(b.m || '').trim();
      if (m.length < 2 || m.length > 1500) return J(400, {});
      if (rec.r) return J(409, { err: 'replied' });
      if (m !== rec.m) { (rec.h = rec.h || []).push({ m: rec.m, at: Date.now() }); rec.m = m; rec.et = Date.now(); await s.setJSON(key, rec); }
      return J(200, { ok: true });
    }
    if (b.a === 'del') {
      rec.del = { by: 'user', at: Date.now() };
      await s.setJSON('d/' + id, rec); await s.delete(key);
      return J(200, { ok: true });
    }
    return J(400, {});
  }
  const { blobs } = await s.list({ prefix: 'm/' });
  const all = (await Promise.all(blobs.map(async x => { const v = await s.get(x.key, { type: 'json' }); return v && Object.assign({ _k: x.key }, v); }))).filter(Boolean);
  // ربط اشتراك الإشعارات الحالي باقتراحاته (عشان يوصله إشعار الرد له هو بس)
  const ep = String(q.e || '');
  if (/^https:\/\//.test(ep) && ep.length < 1000) {
    const pk = require('../lib/store').keyOf(ep);
    await Promise.all(all.filter(i => i.th === th && i.pk !== pk).map(i => { const r = Object.assign({}, i); delete r._k; r.pk = pk; return s.setJSON(i._k, r); }));
  }
  const mine = all.filter(i => i.th === th).sort((a, c) => c.t - a.t).map(i => ({ id: i._k.slice(2), m: i.m, t: i.t, r: i.r || null, rt: i.rt || null }));
  return J(200, mine);
};
