// تتبع بسيط بدون أي معلومة شخصية: زيارة يومية لكل جوال (رقم عشوائي)، الصفحات، الساعات، ضغطات الإشعارات
const { getStore, connectLambda } = require('@netlify/blobs');
const kw = () => new Date(Date.now() + 3 * 3600e3);
const rnd = () => Math.random().toString(36).slice(2, 10);
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };
  let b; try { b = JSON.parse(event.body || '{}'); } catch(_){ return { statusCode: 400, body: '' }; }
  try { connectLambda(event); } catch(_){}
  const s = getStore('visits'), t = kw(), d = t.toISOString().slice(0, 10), h = t.getUTCHours();
  if (b.c) { // ضغطة على إشعار
    const tag = String(b.c).replace(/[^\w؀-ۿ-]/g, '').slice(0, 60); if (!tag) return { statusCode: 400, body: '' };
    await s.set('clk/' + tag + '/' + rnd(), d); return { statusCode: 204, body: '' };
  }
  const v = String(b.v || ''); if (!/^[a-z0-9]{12,40}$/.test(v)) return { statusCode: 400, body: '' };
  if (b.p) { // زيارة صفحة (مرة لكل قسم باليوم)
    const p = String(b.p).replace(/[^a-z-]/g, '').slice(0, 20); if (!p) return { statusCode: 400, body: '' };
    await s.set('pv/' + p + '/' + d + '/' + v, '1'); return { statusCode: 204, body: '' };
  }
  await Promise.all([s.set('day/' + d + '/' + v, b.pwa ? '1' : '0'), s.set('all/' + v, d), s.set('hr/' + String(h).padStart(2, '0') + '/' + d + '/' + v, '1')]);
  return { statusCode: 204, body: '' };
};
