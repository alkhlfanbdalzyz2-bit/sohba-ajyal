// لوحة تحكم بو عمر: الاقتراحات + الإشعارات + الإحصائيات + التحكم بالموقع (كلها بدون نشر)
const { getStore, connectLambda } = require('@netlify/blobs');
const { eff } = require('../lib/remkeys');
const { store, vapid } = require('../lib/store');
const { send } = require('../lib/push');
const { broadcast } = require('../lib/broadcast');
const CH = require('../lib/chal');
const H = 'ec8ba1457c7f0046ac9afbcde66cbf4bd48ad3f102e254bcaf38f86010264a0b';
const URLOK = u => /^\.\/(\?sug=1)?(#\/[\w\/-]*)?$/.test(u);
const kd = off => new Date(Date.now() + 3 * 3600e3 - off * 864e5).toISOString().slice(0, 10);
// API فقط — الواجهة بموقع منفصل (sohba-admin.netlify.app)
const ORIG = 'https://sohba-admin.netlify.app';
const CORS = { 'Access-Control-Allow-Origin': ORIG, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Key', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
const J = (o, c) => ({ statusCode: c || 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }, CORS), body: JSON.stringify(o) });
async function logPush(ps, e){ const log = (await ps.get('admin-log', { type: 'json' })) || []; log.unshift(e); await ps.setJSON('admin-log', log.slice(0, 40)); }
async function loadAll(st, pre){ const { blobs } = await st.list({ prefix: pre });
  return (await Promise.all(blobs.map(async b => { const v = await st.get(b.key, { type: 'json' }); return v && Object.assign({ id: b.key.slice(pre.length) }, v); }))).filter(Boolean); }
async function data(event){
  const ps = store(event), ss = getStore('suggest'), vs = getStore('visits');
  const subs = (await ps.list({ prefix: 'sub/' })).blobs.length;
  const daily = []; let week = new Set();
  for (let i = 29; i >= 0; i--){ const k = (await vs.list({ prefix: 'day/' + kd(i) + '/' })).blobs; daily.push([kd(i), k.length]); if (i < 7) k.forEach(x => week.add(x.key.split('/')[2])); }
  const all = (await vs.list({ prefix: 'all/' })).blobs.length;
  const hours = Array(24).fill(0), from = kd(29);
  (await vs.list({ prefix: 'hr/' })).blobs.forEach(b => { const p = b.key.split('/'); if (p[2] >= from) hours[+p[1]]++; });
  const pages = {}, from7 = kd(6);
  (await vs.list({ prefix: 'pv/' })).blobs.forEach(b => { const p = b.key.split('/'); if (p[2] >= from7) pages[p[1]] = (pages[p[1]] || 0) + 1; });
  const clicks = {}; (await vs.list({ prefix: 'clk/' })).blobs.forEach(b => { const t = b.key.split('/')[1]; clicks[t] = (clicks[t] || 0) + 1; });
  const rem = {}; await Promise.all((await ps.list({ prefix: 'sub/' })).blobs.map(async b => { const p = eff(await ps.get('pref/' + b.key.slice(4), { type: 'json' })); Object.keys(p).forEach(k => rem[k] = (rem[k] || 0) + 1); }));
  const items = (await loadAll(ss, 'm/')).sort((a, b) => b.t - a.t).map(i => ({ id: i.id, m: i.m, t: i.t, r: i.r || null, rt: i.rt || null, reach: !!i.th, push: !!i.pk, et: i.et || null }));
  const trash = (await loadAll(ss, 'd/')).sort((a, b) => ((b.del && b.del.at) || 0) - ((a.del && a.del.at) || 0)).map(i => ({ id: i.id, m: i.m, t: i.t, r: i.r || null, del: i.del, h: i.h || [] }));
  const log = (await ps.get('admin-log', { type: 'json' })) || [];
  const remlog = (await ps.get('rem-log', { type: 'json' })) || [];
  const sched = (await loadAll(ps, 'sched/')).sort((a, b) => a.at - b.at);
  const cfg = (await ps.get('site-cfg', { type: 'json' })) || {};
  const chs = CH.cs(), chc = await CH.cur(chs), chst = CH.state(chc);
  const chal = { c: chc, st: chst, list: (await CH.people(chs, chc)).map(p => ({ h: p.h, n: p.n, cnt: chst.days.filter(k => p.d && p.d[k]).length, at: p.at })).sort((x, y) => y.cnt - x.cnt) };
  return { chal, stats: { today: daily[29][1], week: week.size, all, subs }, daily, hours, pages, clicks, rem, remlog, items, trash, log, sched, cfg };
}
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  const hk = (event.headers || {})['x-key'] || (event.headers || {})['X-Key'] || '';
  if (require('crypto').createHash('sha256').update(String(hk)).digest('hex') !== H) return J({ err: 'key' }, 401);
  try { connectLambda(event); } catch(_){}
  if (event.httpMethod === 'GET') return J(await data(event));
  let b; try { b = JSON.parse(event.body || '{}'); } catch(_){ return J({}, 400); }
  const ps = store(event), ss = getStore('suggest'), a = b.a;
  const sid = String(b.id || ''); const idOk = /^[0-9]+-[a-z0-9]+$/.test(sid);
  if (a === 'reply') {
    if (!idOk) return J({}, 400); const r = String(b.r || '').trim(); if (r.length > 2000) return J({}, 400);
    const rec = await ss.get('m/' + sid, { type: 'json' }); if (!rec) return J({}, 404);
    const first = !rec.r; if (r) { rec.r = r; rec.rt = Date.now(); } else { delete rec.r; delete rec.rt; }
    await ss.setJSON('m/' + sid, rec);
    let pushed = false;
    if (r && rec.pk) { const sub = await ps.get('sub/' + rec.pk, { type: 'json' });
      if (sub) { const st = await send(sub, JSON.stringify({ title: first ? '💬 وصلك رد على اقتراحك' : '💬 تحديث على الرد على اقتراحك', body: r.length > 120 ? r.slice(0, 117) + '…' : r, url: './?sug=1', tag: 'sug-' + sid }), await vapid(ps), 'https://wa.me/96597946974'); pushed = st >= 200 && st < 300; } }
    return J({ ok: true, pushed });
  }
  if (a === 'del' || a === 'restore') {
    if (!idOk) return J({}, 400); const from = a === 'del' ? 'm/' : 'd/', to = a === 'del' ? 'd/' : 'm/';
    const rec = await ss.get(from + sid, { type: 'json' }); if (!rec) return J({}, 404);
    if (a === 'del') rec.del = { by: 'admin', at: Date.now() }; else delete rec.del;
    await ss.setJSON(to + sid, rec); await ss.delete(from + sid); return J({ ok: true });
  }
  if (a === 'send' || a === 'sched') {
    const title = String(b.title || '').trim().slice(0, 80), body = String(b.body || '').trim().slice(0, 240), url = String(b.url || './');
    if (!title || !URLOK(url)) return J({}, 400);
    if (a === 'sched') { const at = +b.at; if (!(at > Date.now() + 60e3) || at > Date.now() + 60 * 864e5) return J({ err: 'time' }, 400);
      const id = at + '-' + Math.random().toString(36).slice(2, 7); await ps.setJSON('sched/' + id, { title, body, url, at }); return J({ ok: true, id }); }
    const tag = 'adm-' + Date.now();
    const r = await broadcast(ps, JSON.stringify({ title, body, url, tag }));
    await logPush(ps, { title, body, url, tag, at: Date.now(), sent: r.sent }); return J(r);
  }
  if (a === 'unsched') { if (!/^[0-9]+-[a-z0-9]+$/.test(sid)) return J({}, 400); await ps.delete('sched/' + sid); return J({ ok: true }); }
  if (a === 'chal-kick') { const h = String(b.h || ''); if (!/^[0-9a-f]{32}$/.test(h)) return J({}, 400); const chs = CH.cs(), c = await CH.cur(chs); await chs.delete('p/' + c.id + '/' + h); return J({ ok: true }); }
  if (a === 'chal-set') { const t = String(b.t || '').trim().slice(0, 40), from = String(b.from || ''), days = Math.max(1, Math.min(30, +b.days || 7));
    if (!t || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(from)) return J({ err: 'bad' }, 400);
    const chs = CH.cs(), old = await CH.cur(chs), f = from.split('-').map(Number).join('-');
    const c = { id: b.keep ? old.id : 'c' + Date.now().toString(36), t, from: f, days, act: String(b.act || '').trim().slice(0, 40) || 'أنجزتها اليوم', desc: String(b.desc || '').trim().slice(0, 160), win: b.win === 'day' ? 'day' : 'fajr' };
    await chs.setJSON('cur', c); return J({ ok: true, c }); }
  if (a === 'cfg') {
    const c = (await ps.get('site-cfg', { type: 'json' })) || {};
    if ('banner' in b) { const t = String(b.banner || '').trim().slice(0, 140); if (t) c.banner = { t, tone: b.tone === 'warn' ? 'warn' : 'info', at: Date.now() }; else delete c.banner; }
    if ('prog' in b) { const p = b.prog;
      if (p && typeof p === 'object') { const tm = x => /^\d{2}:\d{2}$/.test(x || '') ? x : undefined;
        c.prog = { date: /^\d{4}-\d{2}-\d{2}$/.test(p.date || '') ? p.date : undefined, arrive: tm(p.arrive), end: tm(p.end), place: String(p.place || '').trim().slice(0, 40) || undefined, note: String(p.note || '').trim().slice(0, 100) || undefined }; }
      else delete c.prog; }
    await ps.setJSON('site-cfg', c); return J({ ok: true, cfg: c });
  }
  return J({}, 400);
};
