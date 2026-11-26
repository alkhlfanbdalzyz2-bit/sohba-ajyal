// أوقات الآيات داخل تسجيل السورة الكاملة للشيخ أحمد النفيس (mp3quran read=259) — تنجاب مرة وتنحفظ
const { getStore, connectLambda } = require('@netlify/blobs');
const READ = 259;
const J = (o, c, cache) => ({ statusCode: c || 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache ? 'public, max-age=2592000' : 'no-store', 'Netlify-CDN-Cache-Control': cache ? 'public, max-age=31536000, durable' : 'no-store' }, body: JSON.stringify(o) });
exports.handler = async (event) => {
  try { connectLambda(event); } catch(_){}
  const s = parseInt((event.queryStringParameters || {}).s, 10);
  if (!(s >= 1 && s <= 114)) return J({ err: 's' }, 400);
  const st = getStore('media'), key = 'ayt/' + READ + '/' + s;
  let t = await st.get(key, { type: 'json' });
  if (!t) {
    try {
      const r = await fetch('https://mp3quran.net/api/v3/ayat_timing?surah=' + s + '&read=' + READ, { headers: { 'User-Agent': 'sohba-ajyal' } });
      if (!r.ok) return J({ err: 'up', st: r.status }, 502);
      const d = await r.json(), L = Array.isArray(d) ? d : (d.data || d.ayat || []);
      t = L.map(a => [+a.ayah, +a.start_time, +a.end_time]).filter(a => a.every(Number.isFinite));
      if (!t.length) return J({ err: 'empty' }, 502);
      await st.setJSON(key, t);
    } catch (e) { console.log('ayt fail', s, String(e)); return J({ err: 'fetch' }, 502); }
  }
  return J({ s, read: READ, src: 'https://cdn.mp3quran.net/audio/ahmad-nufais/r1/' + String(s).padStart(3, '0') + '.mp3', t }, 200, 1);
};
