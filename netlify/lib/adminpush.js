// إشعارات لوحة التحكم (لجهاز بو عمر فقط): تنحفظ اشتراكات اللوحة بـ adm/ منفصلة عن اشتراكات الشباب
const { store, vapid, keyOf } = require('./store');
const { send } = require('./push');
async function notifyAdmins(event, title, body, url, tag){
  const s = store(event), v = await vapid(s), { blobs } = await s.list({ prefix: 'adm/' }); let ok = 0;
  await Promise.all(blobs.map(async b => { const sub = await s.get(b.key, { type: 'json' }); if (!sub) return;
    const st = await send(sub, JSON.stringify({ title, body, url, tag: tag || 'adm' }), v, 'https://wa.me/96597946974');
    if (st === 404 || st === 410) await s.delete(b.key); else if (st >= 200 && st < 300) ok++; }));
  return ok;
}
async function addAdmin(event, sub){ const ep = String((sub && sub.endpoint) || ''); if (!/^https:\/\//.test(ep) || ep.length > 1000 || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return false;
  await store(event).setJSON('adm/' + keyOf(ep), { endpoint: ep, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } }); return true; }
async function delAdmin(event, ep){ await store(event).delete('adm/' + keyOf(String(ep || ''))); }
module.exports = { notifyAdmins, addAdmin, delAdmin };
