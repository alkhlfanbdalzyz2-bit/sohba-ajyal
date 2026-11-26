// يشتغل بروحه كل ١٠ دقايق: يرسل التذكيرات اللي اختارها كل شخص بوقتها (حسب مواقيت الصلاة بالكويت)
const { store } = require('../lib/store');
const { broadcast } = require('../lib/broadcast');
const RK = require('../lib/remkeys');
const { times, kwNow } = require('../lib/prayer');
const R = {
  fajr:     { title: '🌅 سنة الفجر', body: 'أذّن الفجر، لا تفوّت ركعتي السنة؛ قال ﷺ: «ركعتا الفجر خيرٌ من الدنيا وما فيها» 🤍', url: './#/me' },
  duha:     { title: '🌤️ صلاة الضحى', body: 'ركعتين من الضحى تجزي عن صدقة كل مفاصل جسمك 🤍 لا تفوّتها', url: './#/me' },
  sabah:    { title: '☀️ أذكار الصباح', body: 'لا تنسى أذكار الصباح، حصّن يومك 🤍', url: './#/adhkar/sabah' },
  masa:     { title: '🌙 أذكار المساء', body: 'حان وقت أذكار المساء 🤍', url: './#/adhkar/masa' },
  kahf:     { title: '📖 سورة الكهف', body: 'يوم الجمعة: لا تنسى قراءة سورة الكهف والإكثار من الصلاة على النبي ﷺ', url: './' },
  istijaba: { title: '🤍 ساعة الاستجابة', body: 'آخر ساعة من يوم الجمعة، اغتنمها بالدعاء', url: './' },
  siyam:    { title: '🌙 صيام باجر', body: 'باجر يُستحب صيامه، لا تنسى تنوي وتتسحّر 🤍', url: './' },
  witr:     { title: '🌙 الوتر والثلث الأخير', body: 'لا تفوّت صلاة الوتر، والحين الثلث الأخير من الليل وقت نزول ربنا سبحانه إلى السماء الدنيا، اغتنمه بالدعاء 🤍', url: './#/me' },
  salawat:  { title: '🤍 صلِّ على النبي ﷺ', body: 'قال ﷺ: «من صلّى عليّ صلاةً واحدة صلّى الله عليه بها عشرًا»', url: './' },
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
  if (win(t.fajr)) due.push('fajr');
  if (win(t.fajr + 0.5)) due.push('sabah');
  if (win((t.sunrise + t.dhuhr) / 2)) due.push('duha');
  if (win(t.asr + 0.5)) due.push('masa');
  if (n.dow === 5 && win(9)) due.push('kahf');
  if (n.dow === 5 && win(t.maghrib - 1)) due.push('istijaba');
  if ((n.dow === 0 || n.dow === 3) && win(21)) due.push('siyam');
  if (win(22.5)) due.push('nawm');
  const sh = Math.floor(n.h); if (sh % 2 === 0 && sh >= 8 && sh <= 22 && n.h < sh + 0.5) due.push('salawat'); // كل ساعتين ٨ص–١٠م (ولا شي من ١١م لين ٦ص)
  const lastThird = t.fajr - (t.fajr + 24 - t.maghrib) / 3; // بداية الثلث الأخير (بعد نص الليل)
  if (win(lastThird)) due.push('witr');
  const chDue = win(t.fajr + 40/60); // تحدي رجال الفجر: بعد الأذان بـ٤٠ دقيقة للمشاركين اللي ما سجّلوا يومهم
  if (!due.length && !chDue) return { statusCode: 200, body: 'nothing' };
  const s = store(event), out = {};
  const { blobs } = await s.list({ prefix: 'pref/' });
  const prefs = {}; await Promise.all(blobs.map(async b => { prefs[b.key.slice(5)] = (await s.get(b.key, { type: 'json' })) || {}; }));
  for (const k of due) {
    const mark = 'rem-sent/' + k + '/' + date + (k === 'salawat' ? '/' + sh : '');
    if (await s.get(mark)) { out[k] = 'already'; continue; }
    await s.set(mark, '1');
    const r = R[k], payload = JSON.stringify({ title: r.title, body: r.body, url: r.url, tag: 'rem-' + k });
    out[k] = await broadcast(s, payload, async key => RK.on(prefs[key], k)); // الافتراضي: كله مفعّل
    try { const lg = (await s.get('rem-log', { type: 'json' })) || []; lg.unshift({ k, at: Date.now(), sent: (out[k] && out[k].sent) || 0 }); await s.setJSON('rem-log', lg.slice(0, 40)); } catch(_){}
  }
  if (chDue) { try { out.chal = await chalFajr(s, date); } catch(e){ out.chal = 'err'; } }
  return { statusCode: 200, body: JSON.stringify(out) };
};
async function chalFajr(s, date){
  const CH = require('../lib/chal'), cs = CH.cs(), c = await CH.cur(cs), st = CH.state(c);
  if (st.idx < 0) return 'no-chal';
  const mark = 'rem-sent/chfajr/' + date; if (await s.get(mark)) return 'already'; await s.set(mark, '1');
  const P = await CH.people(cs, c), want = new Set(P.filter(p => p.pk && !CH.has(p, st.today)).map(p => p.pk));
  if (!want.size) return 'none';
  const payload = JSON.stringify({ title: '🌅 يا رجال الفجر', body: 'صليت الفجر؟ لا تنسى تحط صح بالتحدي 💪 وحافظ عليها', url: './#/challenge', tag: 'chfajr-' + date });
  const r = await broadcast(s, payload, async key => want.has(key));
  try { const lg = (await s.get('rem-log', { type: 'json' })) || []; lg.unshift({ k: 'chfajr', at: Date.now(), sent: (r && r.sent) || 0 }); await s.setJSON('rem-log', lg.slice(0, 40)); } catch(_){}
  return r;
}
