// إرسال إشعار لمجموعة من المشتركين (كلهم أو اللي يطابقون شرط)
const { vapid } = require('./store');
const { send } = require('./push');
async function broadcast(s, payload, filter){
  const v = await vapid(s);
  const { blobs } = await s.list({ prefix: 'sub/' });
  let ok = 0, gone = 0, total = 0;
  for (let i = 0; i < blobs.length; i += 20){
    await Promise.all(blobs.slice(i, i + 20).map(async b => {
      if (filter && !(await filter(b.key.slice(4)))) return;
      const sub = await s.get(b.key, { type: 'json' }); if (!sub) return; total++;
      const st = await send(sub, payload, v, 'https://wa.me/96597946974');
      if (st === 404 || st === 410){ gone++; await s.delete(b.key); } else if (st >= 200 && st < 300) ok++;
    }));
  }
  return { sent: ok, removed: gone, total };
}
module.exports = { broadcast };
