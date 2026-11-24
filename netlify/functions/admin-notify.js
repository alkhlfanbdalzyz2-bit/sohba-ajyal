// صفحة بو عمر الخاصة لإرسال إشعار للكل بدون نشر (ما تاكل من رصيد نتلفاي)
const { store } = require('../lib/store');
const { broadcast } = require('../lib/broadcast');
const H = 'ec8ba1457c7f0046ac9afbcde66cbf4bd48ad3f102e254bcaf38f86010264a0b';
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const LINKS = [['./','الصفحة الرئيسية'],['./#/khutah','صفحة الكورس'],['./#/khutah/halaqat','لوحة نقاط الحلقة'],['./#/khutah/points','نقاط الكورس'],['./#/khutah/challenges','تحديات الكورس'],['./#/khutah/photos','صور وفيديو الكورس'],['./#/videos/vlogs','الفلوقات'],['./#/adhkar','أذكاري'],['./#/me','صفحتي']];
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const h = require('crypto').createHash('sha256').update(String(q.k || '')).digest('hex');
  if (h !== H) return { statusCode: 404, body: 'Not found' };
  const s = store(event), hd = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (event.httpMethod === 'POST') {
    let b; try { b = JSON.parse(event.body || '{}'); } catch(_){ return { statusCode: 400, body: '' }; }
    const title = String(b.title || '').trim().slice(0, 80), body = String(b.body || '').trim().slice(0, 240), url = String(b.url || './');
    if (!title || !LINKS.some(l => l[0] === url)) return { statusCode: 400, body: '' };
    const id = 'adm-' + Date.now();
    const r = await broadcast(s, JSON.stringify({ title, body, url, tag: id }));
    const log = (await s.get('admin-log', { type: 'json' })) || [];
    log.unshift({ title, body, url, at: Date.now(), sent: r.sent }); await s.setJSON('admin-log', log.slice(0, 30));
    return { statusCode: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, hd), body: JSON.stringify(r) };
  }
  const { blobs } = await s.list({ prefix: 'sub/' });
  // إحصائيات الزوار
  const { getStore } = require('@netlify/blobs'), vs = getStore('visits');
  const kd = off => new Date(Date.now() + 3 * 3600e3 - off * 864e5).toISOString().slice(0, 10);
  let today = 0, week = new Set(), all = 0;
  try {
    today = (await vs.list({ prefix: 'day/' + kd(0) + '/' })).blobs.length;
    for (let i = 0; i < 7; i++) (await vs.list({ prefix: 'day/' + kd(i) + '/' })).blobs.forEach(x => week.add(x.key.split('/')[2]));
    all = (await vs.list({ prefix: 'all/' })).blobs.length;
  } catch(_){}
  const log = (await s.get('admin-log', { type: 'json' })) || [];
  const fmt = t => new Date(t).toLocaleString('ar-KW', { timeZone: 'Asia/Kuwait', dateStyle: 'medium', timeStyle: 'short' });
  const css = 'body{margin:0;font-family:system-ui,Tahoma,sans-serif;background:#0b1430;color:#fff;padding:18px;line-height:1.7}h1{font-size:20px;margin:0 0 4px}p.n{opacity:.7;margin:0 0 16px}' +
    'label{display:block;font-size:13px;opacity:.8;margin:12px 0 4px}input,textarea,select{display:block;width:100%;box-sizing:border-box;padding:11px 12px;border-radius:12px;border:1.5px solid #ffffff26;background:#13204a;color:#fff;font:inherit;font-size:16px}textarea{min-height:90px;resize:vertical}input:focus,textarea:focus,select:focus{outline:none;border-color:#f7941d}' +
    '.pv{margin-top:16px;padding:12px 14px;border-radius:16px;background:#ffffff12;border:1px solid #ffffff1f}.pv small{opacity:.6;font-size:12px}.pv b{display:block}' +
    '.go{display:block;width:100%;margin-top:14px;padding:13px;border:0;border-radius:14px;background:linear-gradient(135deg,#f7941d,#f26a21);color:#fff;font:inherit;font-weight:800;font-size:17px;cursor:pointer}.go.sure{background:#e5484d}.go[disabled]{opacity:.5}.st{margin-top:10px;text-align:center;font-weight:700}' +
    '.stx{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:6px 0 6px}.stx div{padding:10px 4px;border-radius:14px;background:#13204a;text-align:center}.stx b{display:block;font-size:22px;color:#f7b267}.stx small{font-size:11.5px;opacity:.75}' + 'h2{font-size:16px;margin:28px 0 10px;opacity:.85}.lg{padding:10px 12px;border-radius:12px;background:#13204a;margin-bottom:8px;font-size:14px}.lg small{display:block;opacity:.6;font-size:12px}.top{display:flex;justify-content:space-between;align-items:center}.top a{color:#f7b267;font-size:14px;text-decoration:none}';
  const js = 'var f=document.forms[0],pt=document.getElementById("pt"),pb=document.getElementById("pb"),g=document.querySelector(".go"),st=document.querySelector(".st");' +
    'function up(){pt.textContent=f.title.value||"العنوان";pb.textContent=f.body.value||"النص";}f.addEventListener("input",up);up();' +
    'g.addEventListener("click",function(){if(!f.title.value.trim()){st.textContent="اكتب العنوان";return;}if(!g.classList.contains("sure")){g.classList.add("sure");g.textContent="متأكد؟ بيوصل للكل · اضغط مرة ثانية";setTimeout(function(){g.classList.remove("sure");g.textContent="🔔 أرسل للكل";},5000);return;}' +
    'g.disabled=true;st.textContent="جاري الإرسال...";fetch(location.href,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:f.title.value,body:f.body.value,url:f.url.value})}).then(function(r){if(!r.ok)throw 0;return r.json();})' +
    '.then(function(d){st.textContent="✅ انرسل لـ "+d.sent+" جهاز";setTimeout(function(){location.reload();},2500);}).catch(function(){st.textContent="صار خطأ، جرّب مرة ثانية";g.disabled=false;g.classList.remove("sure");g.textContent="🔔 أرسل للكل";});});';
  const body = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>إرسال إشعار</title><style>' + css + '</style></head><body>' +
    '<div class="top"><h1>🔔 إرسال إشعار</h1><a href="suggest-list?k=' + esc(q.k) + '">📮 الاقتراحات</a></div><div class="stx"><div><b>' + today + '</b><small>زائر اليوم</small></div><div><b>' + week.size + '</b><small>هالأسبوع</small></div><div><b>' + all + '</b><small>من البداية</small></div><div><b>' + blobs.length + '</b><small>مفعّل الإشعارات</small></div></div><p class="n">العدد بدأ من ٢٥-١١-٢٠٢٦ · كل جوال ينحسب مرة وحدة · الإرسال ما يحتاج نشر</p>' +
    '<form onsubmit="return false"><label>العنوان</label><input name="title" maxlength="80" placeholder="مثال: 🔥 برنامجنا اليوم"><label>النص</label><textarea name="body" maxlength="240" placeholder="مثال: الحضور الساعة ٤:٤٠ م بالمركز"></textarea>' +
    '<label>لما يضغطون الإشعار يفتح</label><select name="url">' + LINKS.map(l => '<option value="' + l[0] + '">' + l[1] + '</option>').join('') + '</select></form>' +
    '<div class="pv"><small>شكل الإشعار</small><b id="pt"></b><span id="pb"></span></div><button type="button" class="go">🔔 أرسل للكل</button><div class="st"></div>' +
    (log.length ? '<h2>آخر الإشعارات</h2>' + log.map(x => '<div class="lg"><b>' + esc(x.title) + '</b> ' + esc(x.body) + '<small>' + fmt(x.at) + ' · وصل لـ ' + x.sent + '</small></div>').join('') : '') +
    '<script>' + js + '</script></body></html>';
  return { statusCode: 200, headers: Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, hd), body };
};
