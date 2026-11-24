const { getStore, connectLambda } = require('@netlify/blobs');
const H = 'ec8ba1457c7f0046ac9afbcde66cbf4bd48ad3f102e254bcaf38f86010264a0b';
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const h = require('crypto').createHash('sha256').update(String(q.k || '')).digest('hex');
  if (h !== H) return { statusCode: 404, body: 'Not found' };
  try { connectLambda(event); } catch(_){}
  const s = getStore('suggest');
  const hd = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  // حفظ رد بو عمر (نص فاضي = حذف الرد)
  if (event.httpMethod === 'POST') {
    let b; try { b = JSON.parse(event.body || '{}'); } catch(_){ return { statusCode: 400, body: '' }; }
    const id = String(b.id || ''), r = String(b.r || '').trim();
    if (!/^m\/[0-9]+-[a-z0-9]+$/.test(id) || r.length > 2000) return { statusCode: 400, body: '' };
    const rec = await s.get(id, { type: 'json' }); if (!rec) return { statusCode: 404, body: '' };
    if (r) { rec.r = r; rec.rt = Date.now(); } else { delete rec.r; delete rec.rt; }
    await s.setJSON(id, rec);
    return { statusCode: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, hd), body: '{"ok":true}' };
  }
  const { blobs } = await s.list({ prefix: 'm/' });
  const items = (await Promise.all(blobs.map(async b => { const v = await s.get(b.key, { type: 'json' }); return v && Object.assign({ id: b.key }, v); }))).filter(Boolean).sort((a, b) => b.t - a.t);
  if (q.f === 'json') return { statusCode: 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, hd), body: JSON.stringify(items.map(i => ({ id: i.id, m: i.m, t: i.t, r: i.r || null, rt: i.rt || null, reach: !!i.th }))) };
  const fmt = t => new Date(t).toLocaleString('ar-KW', { timeZone: 'Asia/Kuwait', dateStyle: 'medium', timeStyle: 'short' });
  const done = items.filter(i => i.r).length;
  const card = i => '<div class="c' + (i.r ? ' ok' : '') + '" data-id="' + esc(i.id) + '">' +
    '<div class="hd"><span class="tg' + (i.r ? ' ok">✅ تم الرد' : '">بانتظار الرد') + '</span>' + (i.th ? '' : '<span class="tg old">ما يوصل له الرد</span>') + '</div>' +
    '<div class="m">' + esc(i.m) + '</div><small>' + fmt(i.t) + '</small>' +
    '<textarea placeholder="اكتب ردك هني…">' + esc(i.r || '') + '</textarea>' +
    '<div class="row"><button type="button" class="sv">' + (i.r ? 'تعديل الرد' : 'أرسل الرد') + '</button><span class="st"></span></div></div>';
  const css = 'body{margin:0;font-family:system-ui,Tahoma,sans-serif;background:#0b1430;color:#fff;padding:18px}h1{font-size:20px;margin:0 0 4px}p.n{opacity:.7;margin:0 0 16px}' +
    '.c{background:#13204a;border:1px solid #f7941d55;border-radius:16px;padding:14px;margin-bottom:14px;line-height:1.8}.c.ok{border-color:#3ecf8e88}' +
    '.hd{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}.tg{font-size:12px;font-weight:700;padding:2px 10px;border-radius:99px;background:#f7941d22;color:#f7b267}.tg.ok{background:#3ecf8e22;color:#5fe0a5}.tg.old{background:#ffffff14;color:#aab}' +
    '.m{white-space:pre-wrap}.c small{display:block;opacity:.6;margin-top:4px;font-size:12px}' +
    'textarea{display:block;width:100%;box-sizing:border-box;min-height:84px;margin-top:10px;padding:10px 12px;border-radius:12px;border:1.5px solid #ffffff26;background:#0b1430;color:#fff;font:inherit;font-size:16px;line-height:1.7;resize:vertical}textarea:focus{outline:none;border-color:#f7941d}' +
    '.row{display:flex;align-items:center;gap:10px;margin-top:8px}.sv{border:0;border-radius:12px;padding:10px 18px;background:linear-gradient(135deg,#f7941d,#f26a21);color:#fff;font:inherit;font-weight:800;cursor:pointer}.sv[disabled]{opacity:.5}.st{font-size:13px;opacity:.8}';
  const js = 'document.addEventListener("click",function(e){var b=e.target.closest(".sv");if(!b)return;var c=b.closest(".c"),ta=c.querySelector("textarea"),st=c.querySelector(".st");b.disabled=true;st.textContent="...";' +
    'fetch(location.href,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:c.dataset.id,r:ta.value})}).then(function(r){if(!r.ok)throw 0;var has=ta.value.trim().length>0;c.classList.toggle("ok",has);var tg=c.querySelector(".tg");tg.className="tg"+(has?" ok":"");tg.textContent=has?"✅ تم الرد":"بانتظار الرد";b.textContent=has?"تعديل الرد":"أرسل الرد";st.textContent=has?"انحفظ ✅":"انشال الرد";})' +
    '.catch(function(){st.textContent="صار خطأ، جرّب مرة ثانية";}).finally(function(){b.disabled=false;});});';
  const body = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>صندوق الاقتراحات</title><style>' + css + '</style></head><body><h1>📮 صندوق الاقتراحات</h1><p class="n">' + items.length + ' رسالة · تم الرد على ' + done + '</p>' +
    (items.map(card).join('') || '<p>ما فيه رسائل للحين</p>') + '<script>' + js + '</script></body></html>';
  return { statusCode: 200, headers: Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, hd), body };
};
