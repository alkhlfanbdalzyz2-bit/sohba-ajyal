// تقديم صور اللوحة: /m/<id>/f (كاملة) أو /m/<id>/t (مصغّرة) — كاش طويل لأن الصورة ما تتغير
// وفيديو اليوم: /m/<id>/v — مقسّم قطع، يرجع بالـ Range (206) قطعة قطعة
const { connectLambda } = require('@netlify/blobs');
const { ms, ID } = require('../lib/media');
async function video(id, event){
  const s = ms(), m = await s.get('v/' + id + '/meta', { type: 'json' });
  if (!m) return { statusCode: 404, headers: { 'Cache-Control': 'no-store' }, body: '' };
  const h = event.headers || {}, rg = String(h.range || h.Range || ''), mt = rg.match(/bytes=(\d*)-(\d*)/);
  let a = 0, z = m.size - 1;
  if (mt) { if (mt[1] === '' && mt[2] !== '') { a = Math.max(0, m.size - +mt[2]); } else { a = +mt[1] || 0; if (mt[2] !== '') z = Math.min(z, +mt[2]); } }
  if (a >= m.size || a > z) return { statusCode: 416, headers: { 'Content-Range': 'bytes */' + m.size }, body: '' };
  const ci = Math.floor(a / m.cs), cs = ci * m.cs, buf = await s.get('v/' + id + '/' + ci, { type: 'arrayBuffer' });
  if (!buf) return { statusCode: 404, headers: { 'Cache-Control': 'no-store' }, body: '' };
  z = Math.min(z, cs + buf.byteLength - 1);
  const part = Buffer.from(buf).subarray(a - cs, z - cs + 1);
  return { statusCode: 206, isBase64Encoded: true, body: part.toString('base64'),
    headers: { 'Content-Type': m.type, 'Accept-Ranges': 'bytes', 'Content-Range': 'bytes ' + a + '-' + z + '/' + m.size, 'Content-Length': String(part.length), 'Cache-Control': 'private, max-age=604800' } };
}
exports.handler = async (event) => {
  try { connectLambda(event); } catch(_){}
  const p = String((event.queryStringParameters || {}).p || '').split('/'), id = p[0], k = p[1] === 't' ? 't' : p[1] === 'v' ? 'v' : 'f';
  if (!ID.test(id)) return { statusCode: 404, body: '' };
  if (k === 'v') return video(id, event);
  const r = await ms().getWithMetadata(k + '/' + id, { type: 'arrayBuffer' });
  if (!r || !r.data) return { statusCode: 404, headers: { 'Cache-Control': 'no-store' }, body: '' };
  return { statusCode: 200, isBase64Encoded: true, body: Buffer.from(r.data).toString('base64'),
    headers: { 'Content-Type': (r.metadata && r.metadata.type) || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'Netlify-CDN-Cache-Control': 'public, max-age=31536000, immutable, durable' } };
};
