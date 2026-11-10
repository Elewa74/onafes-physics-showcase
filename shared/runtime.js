(() => {
  'use strict';
  const id=document.body.dataset.assetId;
  const query=new URLSearchParams(location.search);
  let parentOrigin=null;
  try { const u=new URL(query.get('parentOrigin')||document.referrer); if(['https:','http:'].includes(u.protocol))parentOrigin=u.origin; } catch {}
  const embedded=window.parent!==window;
  const media=()=>[...document.querySelectorAll('video,audio')];
  const pause=()=>media().forEach(m=>m.pause());
  function emit(type,detail={}) {
    const message={namespace:'onafes',version:1,type,assetId:id,detail};
    if(embedded&&parentOrigin)window.parent.postMessage(message,parentOrigin);
    // Optional native bridge: structured JSON only, no executable strings.
    if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(message));
    if(window.webkit?.messageHandlers?.onafes)window.webkit.messageHandlers.onafes.postMessage(message);
    window.dispatchEvent(new CustomEvent('onafes:'+type,{detail:message}));
  }
  function notice(text){const e=document.getElementById('onafes-status');e.textContent=text;e.hidden=false;clearTimeout(e._timer);e._timer=setTimeout(()=>e.hidden=true,7000);}
  function close(){pause();emit('close');if(!embedded&&!window.ReactNativeWebView&&!window.webkit?.messageHandlers?.onafes)location.href='../index.html';}
  document.querySelectorAll('[data-onafes-close]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();close();}));
  document.querySelectorAll('[data-onafes-open]').forEach(a=>a.addEventListener('click',e=>{if(embedded||window.ReactNativeWebView||window.webkit?.messageHandlers?.onafes){e.preventDefault();pause();emit('navigate',{targetId:a.dataset.onafesOpen});}}));
  document.querySelectorAll('[data-onafes-lesson]').forEach(b=>b.addEventListener('click',()=>{
    emit('lesson-request',{lessonKey:b.dataset.onafesLesson,title:b.dataset.lessonTitle});
    notice('هذا الزر يفتح درس «'+b.dataset.lessonTitle+'» داخل التطبيق. محتوى الدرس الكامل غير مرفق بعينة الوسائل.');
  }));
  // Expand the enclosing disclosures before scrolling to a deep anchor.
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{
    const target=document.getElementById(a.getAttribute('href').slice(1));
    for(let p=target;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
  }));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  window.addEventListener('pagehide',pause);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('message',e=>{
    if(!parentOrigin||e.source!==window.parent||e.origin!==parentOrigin)return;
    const d=e.data;if(!d||d.namespace!=='onafes'||d.version!==1||d.assetId!==id)return;
    if(d.type==='pause')pause();
    if(d.type==='close')close();
    if(d.type==='seek'&&Number.isFinite(d.detail?.seconds))media().forEach(m=>{if(Number.isFinite(m.duration))m.currentTime=Math.max(0,Math.min(m.duration,d.detail.seconds));});
  });
  document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>{
    media().forEach(m=>m.playbackRate=Number(b.dataset.speed));
    document.querySelectorAll('[data-speed]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  }));
  const seekRows=[...document.querySelectorAll('[data-seek]')];
  seekRows.forEach(row=>{
    const seek=()=>{const m=media()[0];if(!m)return;m.currentTime=Number(row.dataset.seek);m.play().catch(()=>notice('اضغط تشغيل لبدء الصوت.'));};
    row.addEventListener('click',seek);row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();seek();}});
  });
  media().forEach(m=>{
    m.addEventListener('play',()=>{media().filter(x=>x!==m).forEach(x=>x.pause());emit('media-play');});
    m.addEventListener('pause',()=>emit('media-pause'));
    m.addEventListener('ended',()=>emit('media-ended'));
    m.addEventListener('error',()=>{notice('تعذّر تحميل الوسائط. أعد فتح الوسيلة أو راجع ملفات الحزمة.');emit('error',{code:'MEDIA_LOAD_FAILED'});});
    m.addEventListener('timeupdate',()=>seekRows.forEach(r=>r.setAttribute('aria-current',String(m.currentTime>=Number(r.dataset.seek)&&m.currentTime<Number(r.dataset.end)))));
  });
  window.OnafesAsset=Object.freeze({pause,close,id});
  emit('ready',{title:document.title});
})();
