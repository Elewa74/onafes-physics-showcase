document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>{
  document.getElementById('viewer').hidden=false;
  document.getElementById('closed-state').hidden=true;
  window.previewEmbed.open(button.dataset.open);
  document.getElementById('workspace').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}));
