/* ===================== مشغل الفلوقات والدروس =====================
   الفيديو الطويل مقطّع (HLS) بجودتين، يبدأ بسرعة ويختار الجودة حسب النت.
   آيفون يشغّله مباشرة، والباقي عن طريق hls.js. */
var VP = { open:false, hist:false, hls:null }, HLSJS = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js', _hlsP = null;
function loadHls(){
  if (window.Hls) return Promise.resolve(window.Hls);
  if (!_hlsP) _hlsP = new Promise(function(res, rej){ var s = document.createElement('script'); s.src = HLSJS; s.onload = function(){ window.Hls ? res(window.Hls) : rej(); }; s.onerror = function(){ _hlsP = null; rej(); }; document.head.appendChild(s); });
  return _hlsP;
}
function fmtT(s){ s = Math.max(0, Math.floor(s)); var m = Math.floor(s/60), x = s%60; return m+':'+(x<10?'0':'')+x; }
function vpOpen(id, i){
  var x = VIDEOS[id].items[i], d = document.getElementById('vp'), st = d.querySelector('.vp-stage'), info = d.querySelector('.vp-info'), k = 'vt:'+id+':'+i, pos = store(k) || 0;
  d.querySelector('.vp-tt').textContent = VIDEOS[id].t;
  info.innerHTML = '<h2>'+e(x.t)+'</h2><div class="vp-meta">'+(x.date ? '<span>'+e(x.date)+'</span>' : '')+(x.d ? '<span class="o">'+e(x.d)+' دقيقة</span>' : '')+'</div>'+
    '<div class="vp-acts"><button type="button" class="pri" data-vpfs>'+'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>شاشة كاملة</button>'+
    '<button type="button" data-vptv hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8"/></svg>على التلفزيون</button></div>';
  if (x.yt){
    st.innerHTML = '<iframe style="position:absolute;inset:0;width:100%;height:100%;border:0" src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(x.yt)+'?autoplay=1&rel=0&playsinline=1" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen title="'+e(x.t)+'"></iframe>';
    info.querySelector('[data-vpfs]').hidden = true;
  } else {
    st.innerHTML = '<video '+(x.poster ? 'poster="'+x.poster+'" ' : '')+'controls playsinline preload="metadata" x-webkit-airplay="allow"></video>';
    var v = st.querySelector('video'), src = x.hls || x.src;
    var resume = function(){ if (pos > 5 && v.duration && pos < v.duration - 10) v.currentTime = pos; };
    v.addEventListener('loadedmetadata', function(){ resume(); x.dur = v.duration; }, { once:true });
    var last = 0; v.addEventListener('timeupdate', function(){ if (Math.abs(v.currentTime - last) >= 3){ last = v.currentTime; store(k, v.currentTime); } });
    v.addEventListener('ended', function(){ store(k, 0); });
    var play = function(){ var p = v.play(); if (p && p.catch) p.catch(function(){}); };
    if (x.hls && !v.canPlayType('application/vnd.apple.mpegurl')){
      loadHls().then(function(Hls){
        if (!VP.open) return;
        if (!Hls.isSupported()){ v.src = x.src || x.hls; play(); return; }
        VP.hls = new Hls({ capLevelToPlayerSize:true, startPosition: pos > 5 ? pos : -1 });
        VP.hls.loadSource(x.hls); VP.hls.attachMedia(v);
        VP.hls.on(Hls.Events.MANIFEST_PARSED, play);
        VP.hls.on(Hls.Events.ERROR, function(_, dt){ if (dt && dt.fatal){ if (dt.type === 'networkError') VP.hls.startLoad(); else if (dt.type === 'mediaError') VP.hls.recoverMediaError(); } });
      }).catch(function(){ st.insertAdjacentHTML('beforeend', '<div class="vp-msg">تعذّر تشغيل الفيديو — تأكد من الإنترنت وجرب مرة ثانية</div>'); });
    } else { v.src = src; play(); }
    var tv = info.querySelector('[data-vptv]');
    if (v.webkitShowPlaybackTargetPicker || (v.remote && v.remote.prompt)) tv.hidden = false;
    if (pos > 5) info.querySelector('.vp-meta').insertAdjacentHTML('beforeend', '<span class="o">يكمل من '+fmtT(pos)+'</span>');
  }
  VP.open = true; d.hidden = false; d.scrollTop = 0; document.documentElement.classList.add('noscroll');
  if (history.pushState){ history.pushState({ vp:1 }, ''); VP.hist = true; }
}
function vpClose(fromPop){
  if (!VP.open) return; VP.open = false;
  var d = document.getElementById('vp'), v = d.querySelector('video'); if (v) v.pause();
  if (VP.hls){ VP.hls.destroy(); VP.hls = null; }
  d.hidden = true; d.querySelector('.vp-stage').innerHTML = ''; document.documentElement.classList.remove('noscroll');
  if (!fromPop && VP.hist){ VP.hist = false; history.back(); } else VP.hist = false;
  if (curRoute && curRoute.indexOf('videos/') === 0) routeNow();
}
function vpFull(){
  var d = document.getElementById('vp'), v = d.querySelector('video'), st = d.querySelector('.vp-stage'); if (!v) return;
  if (v.webkitEnterFullscreen && !document.fullscreenEnabled){ v.webkitEnterFullscreen(); return; }
  var el = st.requestFullscreen ? st : v;
  var p = el.requestFullscreen ? el.requestFullscreen() : (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : (v.webkitEnterFullscreen && v.webkitEnterFullscreen()));
  if (p && p.then) p.then(function(){ try { screen.orientation.lock('landscape').catch(function(){}); } catch(_){} }).catch(function(){ if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); });
}
function vpTV(){
  var v = document.querySelector('#vp video'); if (!v) return;
  if (v.webkitShowPlaybackTargetPicker) v.webkitShowPlaybackTargetPicker();
  else if (v.remote && v.remote.prompt) v.remote.prompt().catch(function(){});
}
window.addEventListener('popstate', function(){
  if (VW.open) GV.close(true);
  if (VP.open) vpClose(true);
});
