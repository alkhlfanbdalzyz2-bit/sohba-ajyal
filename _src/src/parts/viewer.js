/* ===================== العارض الاحترافي =====================
   - السحب للتنقل يشتغل فقط بإصبع وحدة والصورة مو مكبّرة، وبعد ما يتأكد إن الحركة أفقية.
   - أي لمسة بإصبعين = تكبير فقط طول اللمسة، وما يتحول أبداً لتنقل.
   - وهي مكبّرة: السحب يحرك الصورة فقط، والتنقل ما يصير إلا بعد ما ترجع لحجمها.
   - سحب للأسفل يسكّر، ضغطتين تكبّر عند مكان الإصبع، ضغطة وحدة تخفي الأزرار. */
var VW = { i:0, list:[], open:false, hist:false }, VZ = { s:1, x:0, y:0, quiet:0 };
var GV = (function(){
  var vw, track, top, strip, zl, W = 0, H = 0, slides = {}, P = {}, g = null, lastTap = null, tapTimer = 0, anim = false;
  function $(s){ return vw.querySelector(s); }
  function n(){ return VW.list.length; }
  function curZ(){ return slides[0] && slides[0].querySelector('.gv-zm'); }
  function curImg(){ return slides[0] && slides[0].querySelector('img.hi'); }
  function isVid(k){ var m = VW.list[VW.i + (k||0)]; return m && m.type === 'video'; }
  function setT(el, x, y, s, t){ el.style.transition = t ? 'transform '+t+'s cubic-bezier(.2,.8,.2,1)' : 'none'; el.style.transform = 'translate3d('+x+'px,'+y+'px,0)'+(s!=null ? ' scale('+s+')' : ''); }
  /* حدود التحريك وهي مكبّرة */
  function bounds(s){
    var im = curImg(); if (!im || !im.naturalWidth) return { x:0, y:0 };
    var r = Math.min(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * r * s, h = im.naturalHeight * r * s;
    return { x:Math.max(0, (w - W) / 2), y:Math.max(0, (h - H) / 2) };
  }
  function clamp(rubber){
    var b = bounds(VZ.s);
    function c(v, m){ if (v > m) return rubber ? m + (v - m) / 3 : m; if (v < -m) return rubber ? -m + (v + m) / 3 : -m; return v; }
    VZ.x = c(VZ.x, b.x); VZ.y = c(VZ.y, b.y);
  }
  function applyZ(t){ var z = curZ(); if (!z) return; setT(z, VZ.x, VZ.y, VZ.s, t); vw.classList.toggle('zoomed', VZ.s > 1.02); }
  var zlT = 0;
  function zoomLabel(){ zl.textContent = Math.round(VZ.s * 100) + '%'; zl.classList.add('on'); clearTimeout(zlT); zlT = setTimeout(function(){ zl.classList.remove('on'); }, 700); }
  function resetZ(t){ VZ.s = 1; VZ.x = 0; VZ.y = 0; applyZ(t); }
  function zoomAt(s, px, py, t){ /* px,py نسبة لمنتصف الشاشة */
    var k = s / VZ.s; VZ.x = px - (px - VZ.x) * k; VZ.y = py - (py - VZ.y) * k; VZ.s = s; clamp(false); applyZ(t); zoomLabel();
  }
  /* بناء الشرائح */
  function slideHTML(m){
    if (m.type === 'video') return '<div class="gv-zm"><img class="lo" src="'+(m.poster||'')+'" alt=""><button type="button" class="gv-play" data-vplay aria-label="تشغيل">'+I.play+'</button></div>';
    return '<div class="gv-zm"><img class="lo" src="'+(m.th||m.src)+'" alt=""><img class="hi" src="'+m.src+'" alt="" draggable="false"></div>';
  }
  function build(){
    track.innerHTML = ''; slides = {};
    [-1,0,1].forEach(function(k){
      var m = VW.list[VW.i + k]; if (!m) return;
      var el = document.createElement('div'); el.className = 'gv-sl'; el.innerHTML = slideHTML(m);
      el.style.transform = 'translate3d('+(-k*100)+'%,0,0)';  /* RTL: التالي على اليسار */
      var hi = el.querySelector('img.hi'); if (hi){ if (hi.complete && hi.naturalWidth) hi.classList.add('ok'); else hi.onload = function(){ hi.classList.add('ok'); }; }
      track.appendChild(el); slides[k] = el;
    });
    setT(track, 0, 0, null, 0); VZ.s = 1; VZ.x = 0; VZ.y = 0; vw.classList.remove('zoomed');
    $('.gv-cnt').textContent = n() > 1 ? (VW.i + 1) + ' / ' + n() : '';
    $('.gv-prev').disabled = VW.i <= 0; $('.gv-next').disabled = VW.i >= n() - 1;
    var bs = strip.children; for (var j = 0; j < bs.length; j++) bs[j].classList.toggle('cur', j === VW.i);
    var c = bs[VW.i]; if (c){ var sl = strip.scrollLeft, r = c.getBoundingClientRect(), sr = strip.getBoundingClientRect(); strip.scrollTo({ left: sl + (r.left + r.width/2) - (sr.left + sr.width/2), behavior: anim ? 'smooth' : 'auto' }); }
    var nx = VW.list[VW.i + 2]; if (nx && nx.type === 'img'){ var pre = new Image(); pre.src = nx.src; }
  }
  function buildStrip(){
    strip.innerHTML = n() > 1 ? VW.list.map(function(m, i){ return '<button type="button" data-vjump="'+i+'" aria-label="'+(i+1)+'"><img src="'+(m.type==='video' ? (m.poster||'') : (m.th||m.src))+'" alt="" loading="lazy">'+(m.type==='video' ? '<i>'+I.play+'</i>' : '')+'</button>'; }).join('') : '';
    strip.style.display = n() > 1 ? '' : 'none';
  }
  function stopVideo(){ var v = track.querySelector('video'); if (v){ v.pause(); } }
  function go(d){
    var to = VW.i + d; if (to < 0 || to >= n() || anim) { setT(track, 0, 0, null, .35); return; }
    stopVideo(); anim = true;
    setT(track, d * W, 0, null, .32);
    setTimeout(function(){ VW.i = to; build(); anim = false; }, 320);
  }
  function jump(i){ if (i === VW.i) return; stopVideo(); VW.i = i; build(); }
  function playVideo(){
    var m = VW.list[VW.i], z = curZ(); if (!m || m.type !== 'video' || !z) return;
    z.innerHTML = '<video src="'+m.src+'" '+(m.poster ? 'poster="'+m.poster+'" ' : '')+'controls playsinline autoplay preload="auto"></video>';
  }
  function chrome(){ vw.classList.toggle('bare'); }
  /* ===== اللمس ===== */
  function pts(){ var a = []; for (var k in P) a.push(P[k]); return a; }
  function mid(a){ return { x:(a[0].x + a[1].x)/2 - W/2, y:(a[0].y + a[1].y)/2 - H/2 }; }
  function dist(a){ return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
  function down(ev){
    if (ev.target.closest('.gv-top,.gv-strip,.gv-nav,[data-vplay]')) return;
    if (ev.target.tagName === 'VIDEO'){ var r = ev.target.getBoundingClientRect(); if (ev.clientY > r.bottom - 90) return; }
    if (anim) return;
    P[ev.pointerId] = { x:ev.clientX, y:ev.clientY };
    try { vw.setPointerCapture(ev.pointerId); } catch(_){}
    var a = pts();
    if (a.length === 1){
      g = { mode:'none', pinched:false, x0:ev.clientX, y0:ev.clientY, t0:performance.now(), bx:VZ.x, by:VZ.y, lx:ev.clientX, lt:performance.now(), vx:0, vy:0 };
    } else if (a.length === 2 && g && !isVid()){
      if (g.mode === 'swipe') setT(track, 0, 0, null, .25);
      if (g.mode === 'close'){ setT(slides[0], 0, 0, null, .25); $('.gv-bg').style.opacity = ''; }
      g.mode = 'pinch'; g.pinched = true; g.d0 = dist(a); g.s0 = VZ.s; g.m0 = mid(a); g.px = VZ.x; g.py = VZ.y;
    }
  }
  function move(ev){
    if (!g || !P[ev.pointerId]) return;
    P[ev.pointerId] = { x:ev.clientX, y:ev.clientY };
    var a = pts(), now = performance.now();
    if (g.mode === 'pinch' && a.length >= 2){
      var m = mid(a), s = g.s0 * dist(a) / g.d0;
      s = s < 1 ? 1 - (1 - s) / 2.5 : (s > 5 ? 5 + (s - 5) / 4 : s);
      VZ.s = s; VZ.x = m.x - (g.m0.x - g.px) * (s / g.s0); VZ.y = m.y - (g.m0.y - g.py) * (s / g.s0);
      applyZ(0); zoomLabel(); return;
    }
    if (a.length !== 1) return;
    var dx = ev.clientX - g.x0, dy = ev.clientY - g.y0, dt = now - g.lt;
    if (dt > 0){ g.vx = (ev.clientX - g.lx) / dt; g.vy = (ev.clientY - (g.ly||g.y0)) / dt; } g.lx = ev.clientX; g.ly = ev.clientY; g.lt = now;
    if (g.mode === 'none'){
      if (Math.hypot(dx, dy) < 10) return;
      if (VZ.s > 1.02 || g.pinched) { g.mode = 'pan'; g.x0 = ev.clientX; g.y0 = ev.clientY; g.bx = VZ.x; g.by = VZ.y; return; }
      g.mode = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'swipe' : (dy > 0 ? 'close' : 'none');
      if (g.mode === 'none') return;
      g.x0 = ev.clientX - (dx > 0 ? 10 : -10) * (g.mode === 'swipe' ? 1 : 0); g.y0 = g.mode === 'close' ? ev.clientY - 10 : g.y0;
      dx = ev.clientX - g.x0; dy = ev.clientY - g.y0;
    }
    if (g.mode === 'pan'){ VZ.x = g.bx + dx; VZ.y = g.by + dy; clamp(true); applyZ(0); }
    else if (g.mode === 'swipe'){
      var edge = (dx > 0 && VW.i >= n() - 1) || (dx < 0 && VW.i <= 0);
      setT(track, edge ? dx / 3.5 : dx, 0, null, 0);
    }
    else if (g.mode === 'close'){
      var yy = Math.max(0, dy), k = Math.min(1, yy / (H * .6));
      setT(slides[0], dx * .4, yy, 1 - k * .25, 0); $('.gv-bg').style.opacity = 1 - k * .9;
      vw.classList.add('bare');
    }
  }
  function up(ev){
    if (!P[ev.pointerId]) return;
    delete P[ev.pointerId];
    var a = pts(); if (!g) return;
    if (a.length === 1){ /* رفع إصبع من الاثنين: يكمل تحريك فقط */
      g.mode = VZ.s > 1.02 ? 'pan' : 'hold'; g.x0 = a[0].x; g.y0 = a[0].y; g.bx = VZ.x; g.by = VZ.y; return;
    }
    if (a.length) return;
    var now = performance.now(), dx = ev.clientX - g.x0, dy = ev.clientY - g.y0, mode = g.mode, quick = now - g.t0 < 280;
    if (mode !== 'none') VZ.quiet = Date.now() + 400;
    if (g.pinched || mode === 'pan' || mode === 'hold'){
      if (VZ.s < 1.02){ resetZ(.3); } else { if (VZ.s > 5) VZ.s = 5; clamp(false); applyZ(.3); }
    } else if (mode === 'swipe'){
      if ((dx > W * .2 || (g.vx > .45 && dx > 30)) && VW.i < n() - 1) go(1);
      else if ((dx < -W * .2 || (g.vx < -.45 && dx < -30)) && VW.i > 0) go(-1);
      else setT(track, 0, 0, null, .3);
    } else if (mode === 'close'){
      if (dy > 130 || g.vy > .7) close();
      else { setT(slides[0], 0, 0, 1, .3); $('.gv-bg').style.opacity = ''; vw.classList.remove('bare'); }
    } else if (mode === 'none' && quick && !g.pinched){
      var px = ev.clientX - W/2, py = ev.clientY - H/2;
      if (lastTap && now - lastTap.t < 300 && Math.hypot(ev.clientX - lastTap.x, ev.clientY - lastTap.y) < 40){
        clearTimeout(tapTimer); lastTap = null;
        if (!isVid()){ if (VZ.s > 1.02) { resetZ(.3); } else zoomAt(2.6, px, py, .3); }
      } else {
        lastTap = { t:now, x:ev.clientX, y:ev.clientY };
        if (ev.target.tagName !== 'VIDEO') tapTimer = setTimeout(function(){ lastTap = null; chrome(); }, 300);
      }
    }
    g = null;
  }
  function wheel(ev){
    if (isVid()) return; ev.preventDefault();
    var s = Math.max(1, Math.min(5, VZ.s * Math.exp(-ev.deltaY * (ev.ctrlKey ? .01 : .0025))));
    if (s < 1.02){ resetZ(.15); return; } zoomAt(s, ev.clientX - W/2, ev.clientY - H/2, 0);
  }
  function size(){ W = vw.clientWidth; H = vw.clientHeight; }
  function init(){
    vw = document.getElementById('vw'); track = $('.gv-track'); top = $('.gv-top'); strip = $('.gv-strip'); zl = $('.gv-zl');
    vw.addEventListener('pointerdown', down); vw.addEventListener('pointermove', move);
    vw.addEventListener('pointerup', up); vw.addEventListener('pointercancel', up);
    vw.addEventListener('wheel', wheel, { passive:false });
    vw.addEventListener('click', function(ev){
      var b = ev.target.closest('[data-vjump]'); if (b){ jump(+b.getAttribute('data-vjump')); return; }
      if (ev.target.closest('[data-vplay]')){ playVideo(); return; }
    });
    window.addEventListener('resize', function(){ if (VW.open){ size(); resetZ(0); } });
  }
  function open(list, i){
    VW.list = list; VW.i = i; VW.open = true; vw.hidden = false; vw.classList.remove('bare','on'); size();
    buildStrip(); build();
    requestAnimationFrame(function(){ vw.classList.add('on'); anim = true; build(); anim = false; });
    document.documentElement.classList.add('noscroll');
    if (history.pushState){ history.pushState({ vw:1 }, ''); VW.hist = true; }
  }
  function close(fromPop){
    if (!VW.open) return; VW.open = false; stopVideo();
    vw.classList.remove('on','zoomed'); document.documentElement.classList.remove('noscroll');
    setTimeout(function(){ vw.hidden = true; track.innerHTML = ''; $('.gv-bg').style.opacity = ''; }, 280);
    if (!fromPop && VW.hist){ VW.hist = false; history.back(); } else VW.hist = false;
  }
  return { init:init, open:open, close:close, go:go, zoomBy:function(f){ if (isVid()) return; var s = Math.max(1, Math.min(5, VZ.s * f)); if (s < 1.02) resetZ(.25); else zoomAt(s, 0, 0, .25); } };
})();
function vwOpenList(list, i){ GV.open(list, i); }
function vwClose(){ GV.close(); }
function vwStep(d){ GV.go(d); }
function saveFile(src, fn, b){
  if (b) b.classList.add('busy');
  fetch(src).then(function(r){ return r.blob(); }).then(function(blob){
    if (b) b.classList.remove('busy');
    try { var f = new File([blob], fn, { type:blob.type || 'image/jpeg' }); if (navigator.canShare && navigator.canShare({ files:[f] })){ navigator.share({ files:[f] }).catch(function(){}); return; } } catch(_){}
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fn; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }).catch(function(){ if (b) b.classList.remove('busy'); window.open(src, '_blank'); });
}
function vwDownload(){ var m = VW.list[VW.i]; saveFile(m.src, 'صحبة-أجيال-'+(VW.i+1)+'.'+(m.type==='video'?'mp4':'jpg'), document.querySelector('#vw .gv-dl')); }
GV.init();
/* منع تكبير الصفحة بالغلط (iOS) */
['gesturestart','gesturechange'].forEach(function(t){ document.addEventListener(t, function(ev){ ev.preventDefault(); }, { passive:false }); });
