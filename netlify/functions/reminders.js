// يشتغل بروحه كل ١٠ دقايق: يرسل التذكيرات اللي اختارها كل شخص بوقتها (حسب مواقيت الصلاة بالكويت)
const { store } = require('../lib/store');
const { broadcast } = require('../lib/broadcast');
const { times, kwNow } = require('../lib/prayer');
const R = {
  sabah:    { title: '☀️ أذكار الصباح', body: 'لا تنسى أذكار الصباح، حصّن يومك 🤍', url: './#/adhkar/sabah' },
  masa:     { title: '🌙 أذكار المساء', body: 'حان وقت أذكار المساء 🤍', url: './#/adhkar/masa' },
  kahf:     { title: '📖 سورة الكهف', body: 'يوم الجمعة: لا تنسى قراءة سورة الكهف والإكثار من الصلاة على النبي ﷺ', url: './' },
  istijaba: { title: '🤍 ساعة الاستجابة', body: 'آخر ساعة من يوم الجمعة، اغتنمها بالدعاء', url: './' },
  siyam:    { title: '🌙 صيام باجر', body: 'باجر يُستحب صيامه، لا تنسى تنوي وتتسحّر 🤍', url: './' },
  witr:     { title: '🌙 الوتر والثلث الأخير', body: 'لا تفوّت صلاة الوتر، والحين الثلث الأخير من الليل وقت نزول ربنا سبحانه إلى السماء الدنيا، اغتنمه بالدعاء 🤍', url: './#/me' },
  nawm:     { title: '🛏️ أذكار النوم', body: 'قبل لا تنام، لا تنسى أذكار النوم 🤍', url: './#/adhkar/nawm' }
};
async function runSched(s){
  const { blobs } = await s.list({ prefix: 'sched/' }); const out = [];
  for (const b of blobs){ const it = await s.get(b.key, { type: 'json' }); if (!it || it.at > Date.now()) continue;
    await s.delete(b.key); const tag = 'sch-' + it.at;
    const r = await broadcast(s, JSON.stringify({ title: it.title, body: it.body, url: it.url, tag }));
    const log = (await s.get('admin-log', { type: 'json' })) || []; log.unshift({ title: it.title, body: it.body, url: it.url, tag, at: Date.now(), sent: r.sent, sched: 1 }); await s.setJSON('admin-log', log.slice(0, 40));
    out.push(r); }
  return out;
}
exports.handler = async (event) => {
  try { await runSched(store(event)); } catch(_){}
  const n = kwNow(), t = times(n.y, n.m, n.d), date = n.y + '-' + n.m + '-' + n.d;
  // dow: 0 الأحد ... 5 الجمعة
  const due = [];
  const win = (h) => n.h >= h && n.h < h + 0.5; // نافذة نص ساعة عشان لو تأخر التشغيل
  if (win(t.fajr + 0.5)) due.push('sabah');
  if (win(t.asr + 0.5)) due.push('masa');
  if (n.dow === 5 && win(9)) due.push('kahf');
  if (n.dow === 5 && win(t.maghrib - 1)) due.push('istijaba');
  if ((n.dow === 0 || n.dow === 3) && win(21)) due.push('siyam');
  if (win(22.5)) due.push('nawm');
  const lastThird = t.fajr - (t.fajr + 24 - t.maghrib) / 3; // بداية الثلث الأخير (بعد نص الليل)
  if (win(lastThird)) due.push('witr');
  if (!due.length) return { statusCode: 200, body: 'nothing' };
  const s = store(event), out = {};
  const { blobs } = await s.list({ prefix: 'pref/' });
  const prefs = {}; await Promise.all(blobs.map(async b => { prefs[b.key.slice(5)] = (await s.get(b.key, { type: 'json' })) || {}; }));
  for (const k of due) {
    const mark = 'rem-sent/' + k + '/' + date;
    if (await s.get(mark)) { out[k] = 'already'; continue; }
    await s.set(mark, '1');
    const r = R[k], payload = JSON.stringify({ title: r.title, body: r.body, url: r.url, tag: 'rem-' + k });
    out[k] = await broadcast(s, payload, async key => !!(prefs[key] && prefs[key][k]));
  }
  return { statusCode: 200, body: JSON.stringify(out) };
};
