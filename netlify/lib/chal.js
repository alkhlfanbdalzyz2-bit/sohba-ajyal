// التحدي الأسبوعي (مثل رجال الفجر): إعداد التحدي + المشاركين (بدون أي بيانات غير الاسم اللي كتبه الشخص)
const { getStore } = require('@netlify/blobs');
const { times, kwNow } = require('./prayer');
const DEF = { id: 'fajr-1', t: 'رجال الفجر', from: '2026-11-26', days: 7, act: 'صليت الفجر بوقتها', win: 'fajr', desc: '' };
const cs = () => getStore('chal');
async function cur(s){ return (await s.get('cur', { type: 'json' })) || DEF; }
const dk = (y, m, d) => y + '-' + m + '-' + d;
function dayList(c){ const [y, m, d] = c.from.split('-').map(Number), out = [];
  for (let i = 0; i < c.days; i++){ const t = new Date(Date.UTC(y, m - 1, d + i)); out.push(dk(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())); } return out; }
function state(c, ms){ const n = kwNow(ms), today = dk(n.y, n.m, n.d), L = dayList(c), idx = L.indexOf(today), t = times(n.y, n.m, n.d);
  const ts = k => { const a = k.split('-').map(Number); return Date.UTC(a[0], a[1] - 1, a[2]); }, bef = ts(today) < ts(L[0]);
  return { today, days: L, idx, win: c.win === 'day' ? 'day' : 'fajr', open: idx >= 0 && (c.win === 'day' || (n.h >= t.fajr && n.h < t.dhuhr)), before: idx < 0 && bef ? 1 : 0, ended: idx < 0 && !bef ? 1 : 0, fajr: t.fajr, dhuhr: t.dhuhr }; }
const th = tok => require('crypto').createHash('sha256').update('ch:' + tok).digest('hex').slice(0, 32);
async function people(s, c){ const { blobs } = await s.list({ prefix: 'p/' + c.id + '/' });
  return (await Promise.all(blobs.map(async b => { const v = await s.get(b.key, { type: 'json' }); return v && Object.assign({ h: b.key.split('/')[2] }, v); }))).filter(Boolean); }
module.exports = { DEF, cs, cur, dayList, state, th, people };
