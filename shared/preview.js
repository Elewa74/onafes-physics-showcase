(() => {
  const manifest=window.ONAFES_MANIFEST, list=document.getElementById('asset-list'), viewer=document.getElementById('viewer');
  let selected=manifest.assets.some(a=>a.id===location.hash.slice(1))?location.hash.slice(1):'card-01',filter='all';
  const labels={card:'بطاقة تعليمية',activity:'تجربة تفاعلية',media:'مشغّل وسائط'};
  const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>';
  const embed=new OnafesEmbed({container:viewer,manifest,baseUrl:new URL('./',location.href).href,onEvent:e=>{
    if(e.type==='opened'){selected=e.assetId;sync();}
    if(e.type==='close'){viewer.hidden=true;document.getElementById('closed-state').hidden=false;}
    if(e.type==='lesson-request'){const s=document.getElementById('preview-status');s.textContent='طلب فتح درس: '+e.detail.title+' — يستقبله التطبيق عند الدمج.';s.hidden=false;setTimeout(()=>s.hidden=true,6000);}
  }});
  function render(){
    const q=document.getElementById('search').value.trim();const assets=manifest.assets.filter(a=>(filter==='all'||a.kind===filter)&&a.title.includes(q));
    list.replaceChildren();
    for(const a of assets){const b=document.createElement('button');b.className='asset-row';b.dataset.id=a.id;b.innerHTML=icon;const label=document.createElement('span');label.textContent=a.title;const sub=document.createElement('small');sub.textContent=labels[a.kind]+(a.durationSeconds?' · '+Math.floor(a.durationSeconds/60)+':'+String(Math.round(a.durationSeconds%60)).padStart(2,'0'):'');label.appendChild(sub);b.appendChild(label);b.setAttribute('aria-current',String(a.id===selected));b.onclick=()=>open(a.id);list.appendChild(b);}
    document.getElementById('count').textContent=assets.length+' وسيلة';document.getElementById('empty').hidden=assets.length>0;
  }
  function sync(){const a=manifest.assets.find(a=>a.id===selected);document.getElementById('current-title').textContent=a.title;document.getElementById('file-link').href=a.path;document.getElementById('current-path').textContent=a.path;history.replaceState(null,'','#'+a.id);render();}
  function open(id){viewer.hidden=false;document.getElementById('closed-state').hidden=true;embed.open(id);}
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});
  document.getElementById('search').oninput=render;
  document.querySelectorAll('[data-width]').forEach(b=>b.onclick=()=>{viewer.style.width=b.dataset.width==='100%'?'100%':b.dataset.width+'px';document.querySelectorAll('[data-width]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
  document.getElementById('reopen').onclick=()=>open(selected);
  window.addEventListener('pagehide',()=>embed.pause());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)embed.pause();});
  if(location.protocol==='file:'){
    // file:// has an opaque origin: use direct navigation, not wildcard postMessage.
    const s=document.getElementById('preview-status');s.textContent='للمعاينة الكاملة والرجوع بين الوسائل، شغّل START_PREVIEW.cmd. يمكنك أيضًا فتح أي ملف منفصلًا.';s.hidden=false;
  }
  open(selected);window.previewEmbed=embed;
})();
