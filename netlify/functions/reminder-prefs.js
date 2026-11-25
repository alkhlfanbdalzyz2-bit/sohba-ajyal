// تفضيلات التذكيرات لكل جهاز مشترك بالإشعارات (مربوطة بعنوان الإشعارات، بدون أي اسم)
const { store, keyOf } = require('../lib/store');
const { KEYS, eff } = require('../lib/remkeys');
const J = (c, o) => ({ statusCode: c, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(o) });
exports.handler = async (event) => {
  let b = {}; if (event.httpMethod === 'POST') { try { b = JSON.parse(event.body || '{}'); } catch(_){ return J(400, {}); } }
  const ep = String(b.ep || (event.queryStringParameters || {}).e || '');
  if (!/^https:\/\//.test(ep) || ep.length > 1000) return J(400, {});
  const s = store(event), k = keyOf(ep);
  if (!(await s.get('sub/' + k))) return J(404, { err: 'nosub' });
  if (event.httpMethod === 'POST') {
    const p = {}; KEYS.forEach(x => { if (b.p && b.p[x]) p[x] = 1; });
    await s.setJSON('pref/' + k, Object.assign({ v: 2 }, p)); // v:2 = الشخص اختار بنفسه
    return J(200, { ok: true, p });
  }
  return J(200, { p: eff(await s.get('pref/' + k, { type: 'json' })) });
};
