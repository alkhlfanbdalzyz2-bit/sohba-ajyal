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
  const J = o => ({ statusCode: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, hd), body: JSON.stringify(o) });
  if (event.httpMethod === 'POST') {
    let b; try { b = JSON.parse(event.body || '{}'); } catch(_){ return { statusCode: 400, body: '' }; }
    const id = String(b.id || ''), a = b.a || 'reply';
    if (!/^[0-9]+-[a-z0-9]+$/.test(id)) return { statusCode: 400, body: '' };
    // حذف: ينقل للمحذوفات (يختفي من عندي ومن عند صاحبه، بس يضل مخزن)
    if (a === 'del') {
      const rec = await s.get('m/' + id, { type: 'json' }); if (!rec) return { statusCode: 404, body: '' };
      rec.del = { by: 'admin', at: Date.now() }; await s.setJSON('d/' + id, rec); await s.delete('m/' + id);
      return J({ ok: true });
    }
    if (a === 'restore') {
      const rec = await s.get('d/' + id, { type: 'json' }); if (!rec) return { statusCode: 404, body: '' };
      delete rec.del; await s.setJSON('m/' + id, rec); await s.delete('d/' + id);
      return J({ ok: true });
    }
    // رد (نص فاضي = شيل الرد)
    const r = String(b.r || '').trim(); if (r.length > 2000) return { statusCode: 400, body: '' };
    const rec = await s.get('m/' + id, { type: 'json' }); if (!rec) return { statusCode: 404, body: '' };
    const first = !rec.r;
    if (r) { rec.r = r; rec.rt = Date.now(); } else { delete rec.r; delete rec.rt; }
    await s.setJSON('m/' + id, rec);
    // إشعار خاص لصاحب الاقتراح بس (إذا مفعّل الإشعارات)
    let pushed = false;
    if (r && rec.pk) {
      const { store, vapid } = require('../lib/store'), { send } = require('../lib/push');
      const ps = store(event), sub = await ps.get('sub/' + rec.pk, { type: 'json' });
      if (sub) {
        const payload = JSON.stringify({ title: first ? '💬 وصلك رد على اقتراحك' : '💬 تحديث على الرد على اقتراحك', body: r.length > 120 ? r.slice(0, 117) + '…' : r, url: './?sug=1', tag: 'sug-' + id });
        const st = await send(sub, payload, await vapid(ps), 'https://wa.me/96597946974');
        pushed = st >= 200 && st < 300;
      }
    }
    return J({ ok: true, pushed });
  }
  const load = async pre => { const { blobs } = await s.list({ prefix: pre });
    return (await Promise.all(blobs.map(async x => { const v = await s.get(x.key, { type: 'json' }); return v && Object.assign({ id: x.key.slice(2) }, v); }))).filter(Boolean); };
  const items = (await load('m/')).sort((a, c) => c.t - a.t);
  const trash = (await load('d/')).sort((a, c) => (c.del && c.del.at || 0) - (a.del && a.del.at || 0));
  if (q.f === 'json') return J({ items: items.map(i => ({ id: i.id, m: i.m, t: i.t, r: i.r || null, rt: i.rt || null })), trash: trash.map(i => ({ id: i.id, m: i.m, t: i.t, r: i.r || null, del: i.del })) });
  const fmt = t => new Date(t).toLocaleString('ar-KW', { timeZone: 'Asia/Kuwait', dateStyle: 'medium', timeStyle: 'short' });
  const done = items.filter(i => i.r).length;
  const card = i => '<div class="c' + (i.r ? ' ok' : '') + '" data-id="' + esc(i.id) + '">' +
    '<div class="hd"><span class="tg' + (i.r ? ' ok">✅ تم الرد' : '">بانتظار الرد') + '</span>' + (i.th ? '' : '<span class="tg old">ما يوصل له الرد</span>') + (i.pk ? '<span class="tg ok">🔔 يوصله إشعار</span>' : '') + (i.et ? '<span class="tg old">✏️ معدّل</span>' : '') + '</div>' +
    '<div class="m">' + esc(i.m) + '</div><small>' + fmt(i.t) + '</small>' +
    '<textarea placeholder="اكتب ردك هني…">' + esc(i.r || '') + '</textarea>' +
    '<div class="row"><button type="button" class="sv">' + (i.r ? 'تعديل الرد' : 'أرسل الرد') + '</button><span class="st"></span><button type="button" class="dl">🗑️ حذف</button></div></div>';
  const tcard = i => '<div class="c tr" data-id="' + esc(i.id) + '"><div class="hd"><span class="tg old">' + (i.del && i.del.by === 'user' ? 'حذفه صاحبه' : 'حذفته أنت') + ' · ' + (i.del ? fmt(i.del.at) : '') + '</span></div>' +
    '<div class="m">' + esc(i.m) + '</div>' + (i.r ? '<div class="rp"><b>ردك:</b> ' + esc(i.r) + '</div>' : '') + '<small>' + fmt(i.t) + '</small>' +
    ((i.h && i.h.length) ? '<details><summary>النسخ القديمة قبل التعديل (' + i.h.length + ')</summary>' + i.h.map(x => '<div class="old">' + esc(x.m) + '</div>').join('') + '</details>' : '') +
    '<div class="row"><button type="button" class="rs">↩️ استرجاع</button><span class="st"></span></div></div>';
  const css = 'body{margin:0;font-family:system-ui,Tahoma,sans-serif;background:#0b1430;color:#fff;padding:18px}h1{font-size:20px;margin:0 0 4px}p.n{opacity:.7;margin:0 0 16px}' +
    '.c{background:#13204a;border:1px solid #f7941d55;border-radius:16px;padding:14px;margin-bottom:14px;line-height:1.8}.c.ok{border-color:#3ecf8e88}.c.tr{background:#ffffff0a;border-color:#ffffff22;opacity:.85}' +
    '.hd{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:6px}.tg{font-size:12px;line-height:1.7;font-weight:700;padding:2px 10px;border-radius:99px;background:#f7941d22;color:#f7b267}.tg.ok{background:#3ecf8e22;color:#5fe0a5}.tg.old{background:#ffffff14;color:#aab}' +
    '.m{white-space:pre-wrap}.c small{display:block;opacity:.6;margin-top:4px;font-size:12px}.rp{margin-top:6px;font-size:14px;opacity:.85;white-space:pre-wrap}.old{margin-top:6px;padding:8px 10px;border-radius:10px;background:#ffffff0d;font-size:14px;white-space:pre-wrap}summary{cursor:pointer;font-size:13px;opacity:.75;margin-top:8px}' +
    'textarea{display:block;width:100%;box-sizing:border-box;min-height:84px;margin-top:10px;padding:10px 12px;border-radius:12px;border:1.5px solid #ffffff26;background:#0b1430;color:#fff;font:inherit;font-size:16px;line-height:1.7;resize:vertical}textarea:focus{outline:none;border-color:#f7941d}' +
    '.row{display:flex;align-items:center;gap:10px;margin-top:8px}.st{font-size:13px;opacity:.8;flex:1}.sv,.rs{border:0;border-radius:12px;padding:10px 18px;background:linear-gradient(135deg,#f7941d,#f26a21);color:#fff;font:inherit;font-weight:800;cursor:pointer}.dl{border:1px solid #ff6b6b66;border-radius:12px;padding:9px 14px;background:transparent;color:#ff8a8a;font:inherit;font-weight:700;cursor:pointer}.dl.sure{background:#e5484d;color:#fff;border-color:#e5484d}button[disabled]{opacity:.5}' +
    'h2{font-size:17px;margin:26px 0 10px;opacity:.85}';
  const js = 'function post(o){return fetch(location.href,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)}).then(function(r){if(!r.ok)throw 0;return r.json();});}' +
    'document.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var c=b.closest(".c"),st=c.querySelector(".st"),id=c.dataset.id;' +
    'if(b.classList.contains("dl")){if(!b.classList.contains("sure")){b.classList.add("sure");b.textContent="متأكد؟ اضغط مرة ثانية";setTimeout(function(){b.classList.remove("sure");b.textContent="🗑️ حذف";},4000);return;}b.disabled=true;post({id:id,a:"del"}).then(function(){location.reload();}).catch(function(){st.textContent="صار خطأ";b.disabled=false;});return;}' +
    'if(b.classList.contains("rs")){b.disabled=true;post({id:id,a:"restore"}).then(function(){location.reload();}).catch(function(){st.textContent="صار خطأ";b.disabled=false;});return;}' +
    'if(!b.classList.contains("sv"))return;var ta=c.querySelector("textarea");b.disabled=true;st.textContent="...";' +
    'post({id:id,r:ta.value}).then(function(d){var has=ta.value.trim().length>0;c.classList.toggle("ok",has);var tg=c.querySelector(".tg");tg.className="tg"+(has?" ok":"");tg.textContent=has?"✅ تم الرد":"بانتظار الرد";b.textContent=has?"تعديل الرد":"أرسل الرد";' +
    'st.textContent=has?(d&&d.pushed?"انحفظ ✅ ووصله إشعار 🔔":"انحفظ ✅ (بيشوفه لما يفتح ✉️)"):"انشال الرد";}).catch(function(){st.textContent="صار خطأ، جرّب مرة ثانية";}).finally(function(){b.disabled=false;});});';
  const body = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>صندوق الاقتراحات</title><style>' + css + '</style></head><body><div style="display:flex;justify-content:space-between;align-items:center"><h1>📮 صندوق الاقتراحات</h1><a style="color:#f7b267;font-size:14px;text-decoration:none" href="admin-notify?k=' + esc(q.k) + '">🔔 إرسال إشعار</a></div><p class="n">' + items.length + ' رسالة · تم الرد على ' + done + '</p>' +
    (items.map(card).join('') || '<p>ما فيه رسائل للحين</p>') +
    (trash.length ? '<details><summary style="font-size:16px;opacity:.9">🗑️ المحذوفات (' + trash.length + ')</summary><div style="margin-top:12px">' + trash.map(tcard).join('') + '</div></details>' : '') +
    '<script>' + js + '</script></body></html>';
  return { statusCode: 200, headers: Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, hd), body };
};
