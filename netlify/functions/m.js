// تقديم صور اللوحة: /m/<id>/f (كاملة) أو /m/<id>/t (مصغّرة) — كاش طويل لأن الصورة ما تتغير
const { connectLambda } = require('@netlify/blobs');
const { ms, ID } = require('../lib/media');
exports.handler = async (event) => {
  try { connectLambda(event); } catch(_){}
  const p = String((event.queryStringParameters || {}).p || '').split('/'), id = p[0], k = p[1] === 't' ? 't' : 'f';
  if (!ID.test(id)) return { statusCode: 404, body: '' };
  const r = await ms().getWithMetadata(k + '/' + id, { type: 'arrayBuffer' });
  if (!r || !r.data) return { statusCode: 404, headers: { 'Cache-Control': 'no-store' }, body: '' };
  return { statusCode: 200, isBase64Encoded: true, body: Buffer.from(r.data).toString('base64'),
    headers: { 'Content-Type': (r.metadata && r.metadata.type) || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'Netlify-CDN-Cache-Control': 'public, max-age=31536000, immutable, durable' } };
};
