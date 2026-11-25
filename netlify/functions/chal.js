// التحدي الأسبوعي للشباب: عرض الترتيب + الانضمام + تسجيل اليوم
const { connectLambda } = require('@netlify/blobs');
const { cs, cur, state, th, people } = require('../lib/chal');
const { keyOf } = require('../lib/store');
const J = (o, c) => ({ statusCode: c || 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(o) });
const TOK = /^[A-Za-z0-9]{16,64}$/;
const norm = n => String(n || '').replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
exports.handler = async (event) => {
  try { connectLambda(event); } catch(_){}
  const s = cs(), c = await cur(s), st = state(c);
  const view = async (tok) => { const P = await people(s, c), me = tok && TOK.test(tok) ? th(tok) : '';
    const list = P.map(p => ({ n: p.n, d: st.days.filter(k => p.d && p.d[k]), me: p.h === me ? 1 : 0 }));
    const mine = list.find(x => x.me) || null;
    return { c: { t: c.t, from: c.from, days: c.days, act: c.act, desc: c.desc, id: c.id, win: c.win === 'day' ? 'day' : 'fajr' }, st, list: list.map(x => ({ n: x.n, d: x.d, me: x.me })), joined: mine ? 1 : 0 }; };
  if (event.httpMethod === 'GET') return J(await view((event.queryStringParameters || {}).t));
  if (event.httpMethod !== 'POST') return J({}, 405);
  let b; try { b = JSON.parse(event.body || '{}'); } catch(_){ return J({}, 400); }
  const tok = String(b.t || ''); if (!TOK.test(tok)) return J({ err: 'tok' }, 400);
  const key = 'p/' + c.id + '/' + th(tok), rec = await s.get(key, { type: 'json' });
  if (b.a === 'join') {
    if (st.ended) return J({ err: 'ended' }, 400);
    const n = String(b.n || '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
    if (n.length < 2) return J({ err: 'name' }, 400);
    const P = await people(s, c); if (P.some(p => norm(p.n) === norm(n) && key !== 'p/' + c.id + '/' + p.h)) return J({ err: 'taken' }, 409);
    const ep = String(b.ep || ''), pk = /^https:\/\//.test(ep) && ep.length <= 1000 ? keyOf(ep) : (rec && rec.pk) || '';
    await s.setJSON(key, { n, d: (rec && rec.d) || {}, at: (rec && rec.at) || Date.now(), pk });
    return J(await view(tok));
  }
  if (!rec) return J({ err: 'nojoin' }, 404);
  if (b.a === 'tick') {
    if (!st.open) return J({ err: 'closed' }, 400);
    rec.d = rec.d || {}; if (b.on === false) delete rec.d[st.today]; else rec.d[st.today] = Date.now();
    await s.setJSON(key, rec); return J(await view(tok));
  }
  if (b.a === 'link') { const ep = String(b.ep || ''); if (!/^https:\/\//.test(ep) || ep.length > 1000) return J({}, 400); const pk = keyOf(ep); if (rec.pk !== pk) { rec.pk = pk; await s.setJSON(key, rec); } return J({ ok: true }); }
  if (b.a === 'leave') { await s.delete(key); return J(await view(tok)); }
  return J({}, 400);
};
