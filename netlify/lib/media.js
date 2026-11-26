// صور اللوحة: الملفات بـ store «media» (f/ كاملة، t/ مصغّرة) + فهرس واحد idx فيه الألبومات الجديدة وترتيب الصور
const { getStore } = require('@netlify/blobs');
const ms = () => getStore('media');
async function idx(s){ const x = (await s.get('idx', { type: 'json' })) || {}; x.albums = x.albums || []; x.items = x.items || {}; x.trash = x.trash || []; return x; }
const ALB = /^[a-z0-9-]{2,40}$/, ID = /^[a-z0-9]{6,24}$/;
const toBuf = b64 => { const s = String(b64 || '').replace(/^data:[^,]*,/, ''); return /^[A-Za-z0-9+/=]+$/.test(s) ? Buffer.from(s, 'base64') : null; };
const isImg = b => b && b.length > 100 && ((b[0] === 0xFF && b[1] === 0xD8) || (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') || (b[0] === 0x89 && b[1] === 0x50));
const mime = b => b[0] === 0xFF ? 'image/jpeg' : b[0] === 0x89 ? 'image/png' : 'image/webp';
const ab = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
async function act(a, b){
  const s = ms(), x = await idx(s), save = () => s.setJSON('idx', x);
  if (a === 'm-up'){
    const alb = String(b.alb || ''); if (!ALB.test(alb)) return [400, { err: 'alb' }];
    const f = toBuf(b.full), t = toBuf(b.th); if (!isImg(f) || !isImg(t) || f.length > 4.2e6 || t.length > 6e5) return [400, { err: 'img' }];
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await s.set('f/' + id, ab(f), { metadata: { type: mime(f) } }); await s.set('t/' + id, ab(t), { metadata: { type: mime(t) } });
    const at = Math.max(0, Math.min(+b.at || Date.now(), Date.now() + 864e5));
    const L = x.items[alb] || (x.items[alb] = []); L.push({ id, at, up: Date.now(), w: +b.w || 0, h: +b.h || 0 }); L.sort((p, q) => p.at - q.at);
    await save(); return [200, { ok: true, id }];
  }
  if (a === 'm-del'){ const alb = String(b.alb || ''), id = String(b.id || ''), L = x.items[alb] || [], i = L.findIndex(o => o.id === id); if (i < 0) return [404, {}];
    x.trash.unshift(Object.assign({ alb, del: Date.now() }, L.splice(i, 1)[0])); x.trash = x.trash.slice(0, 200); await save(); return [200, { ok: true }]; }
  if (a === 'm-restore'){ const id = String(b.id || ''), i = x.trash.findIndex(o => o.id === id); if (i < 0) return [404, {}];
    const o = x.trash.splice(i, 1)[0], alb = o.alb; delete o.alb; delete o.del; const L = x.items[alb] || (x.items[alb] = []); L.push(o); L.sort((p, q) => p.at - q.at); await save(); return [200, { ok: true }]; }
  if (a === 'm-mv'){ const L = x.items[String(b.alb || '')] || [], i = L.findIndex(o => o.id === String(b.id || '')), j = i + (b.dir > 0 ? 1 : -1); if (i < 0 || j < 0 || j >= L.length) return [400, {}];
    const ta = L[i].at; L[i].at = L[j].at; L[j].at = ta; [L[i], L[j]] = [L[j], L[i]]; await save(); return [200, { ok: true }]; }
  if (a === 'alb-new'){ const t = String(b.t || '').trim().slice(0, 40); if (!t) return [400, {}];
    const al = { id: 'a' + Date.now().toString(36), t, s: String(b.s || '').trim().slice(0, 60), at: Date.now() }; x.albums.push(al); await save(); return [200, { ok: true, id: al.id }]; }
  if (a === 'alb-edit'){ const al = x.albums.find(o => o.id === String(b.id || '')); if (!al) return [404, {}]; al.t = String(b.t || al.t).trim().slice(0, 40) || al.t; al.s = String(b.s == null ? al.s : b.s).trim().slice(0, 60); await save(); return [200, { ok: true }]; }
  if (a === 'alb-del'){ const id = String(b.id || ''), i = x.albums.findIndex(o => o.id === id); if (i < 0) return [404, {}];
    (x.items[id] || []).forEach(o => x.trash.unshift(Object.assign({ alb: id, del: Date.now() }, o))); delete x.items[id]; x.albums.splice(i, 1); await save(); return [200, { ok: true }]; }
  return null;
}
async function pub(){ const x = await idx(ms()); const items = {}; Object.keys(x.items).forEach(k => { if (x.items[k].length) items[k] = x.items[k].map(o => [o.id, o.at, o.w, o.h]); }); return { albums: x.albums, items }; }
const VCS = 3 * 1024 * 1024, VMAXN = 25; // فيديو: قطع ٣ ميجا، أقصى ٧٥ ميجا
module.exports = { ms, idx, act, pub, ID, toBuf, isImg, ab, VCS, VMAXN };
