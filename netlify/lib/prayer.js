// مواقيت الصلاة لمدينة الكويت (طريقة وزارة الأوقاف الكويتية: الفجر ١٨° والعشاء ١٧٫٥° والعصر شافعي)
const LAT = 29.3759, LNG = 47.9774, TZ = 3;
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
function sun(jd){
  const D = jd - 2451545.0, g = (357.529 + 0.98560028 * D) % 360, q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(rad(g)) + 0.020 * Math.sin(rad(2 * g))) % 360, e = 23.439 - 0.00000036 * D;
  const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
  const eqt = q / 15 - ((RA % 24) + 24) % 24;
  return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: ((eqt + 12) % 24 + 24) % 24 - 12 };
}
function times(y, m, d){
  const jd = Date.UTC(y, m - 1, d) / 86400000 + 2440587.5;
  const noonT = jd + 0.5 - LNG / 360, s0 = sun(noonT);
  const dhuhr = 12 + TZ - LNG / 15 - s0.eqt;
  const ha = (angle, t) => { const s = sun(jd + t / 24 - TZ / 24 - 0.0); return deg(Math.acos((-Math.sin(rad(angle)) - Math.sin(rad(s.decl)) * Math.sin(rad(LAT))) / (Math.cos(rad(s.decl)) * Math.cos(rad(LAT))))) / 15; };
  const asrA = t => { const s = sun(jd + t / 24 - TZ / 24); const a = -deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(LAT - s.decl)))))); return ha(a, t); };
  const fajr = dhuhr - ha(18, 5), sunrise = dhuhr - ha(0.833, 6), asr = dhuhr + asrA(15.5), maghrib = dhuhr + ha(0.833, 18), isha = dhuhr + ha(17.5, 19.5);
  return { fajr, sunrise, dhuhr, asr, maghrib, isha };
}
// الوقت الحالي بتوقيت الكويت كساعات عشرية + التاريخ
function kwNow(ms){ const t = new Date((ms || Date.now()) + TZ * 3600000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay(), h: t.getUTCHours() + t.getUTCMinutes() / 60 + t.getUTCSeconds() / 3600 }; }
const hm = h => { const x = Math.round(h * 60); return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };
module.exports = { times, kwNow, hm };
