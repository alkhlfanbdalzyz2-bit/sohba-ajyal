// عداد زوار بسيط: كل جوال له رقم عشوائي محفوظ عنده (بدون أي معلومة شخصية)، ونسجّل مرة وحدة باليوم
const { getStore, connectLambda } = require('@netlify/blobs');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };
  let b; try { b = JSON.parse(event.body || '{}'); } catch(_){ return { statusCode: 400, body: '' }; }
  const v = String(b.v || '');
  if (!/^[a-z0-9]{12,40}$/.test(v)) return { statusCode: 400, body: '' };
  try { connectLambda(event); } catch(_){}
  const s = getStore('visits'), d = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  const pwa = b.pwa ? 1 : 0;
  await Promise.all([s.set('day/' + d + '/' + v, String(pwa)), s.set('all/' + v, d)]);
  return { statusCode: 204, body: '' };
};
