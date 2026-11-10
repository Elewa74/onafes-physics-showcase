(function(){
var P=document.getElementById('as-player'),A=document.getElementById('as-audio');if(!P||!A)return;
var B=document.getElementById('as-play'),S=document.getElementById('as-seek'),R=document.getElementById('as-cliprect'),
C=document.getElementById('as-cur'),T=document.getElementById('as-txt'),D=document.getElementById('as-tr'),
L=[].slice.call(document.querySelectorAll('.as-s[data-t0]')),W=224,dur=parseFloat(P.getAttribute('data-dur'))||0;
function f(t){t=Math.max(0,Math.round(t||0));return Math.floor(t/60)+':'+('0'+t%60).slice(-2);}
function d(){return (isFinite(A.duration)&&A.duration>0)?A.duration:dur;}
function draw(){var t=A.currentTime||0,k=d()?Math.min(1,t/d()):0;R.setAttribute('x',W*(1-k));R.setAttribute('width',W*k);
 C.textContent=f(t);S.setAttribute('aria-valuenow',Math.round(t));S.setAttribute('aria-valuetext',f(t)+' من '+f(d()));
 var cur=-1;L.forEach(function(e,i){if(t>=parseFloat(e.dataset.t0)&&t<parseFloat(e.dataset.t1)+0.35)cur=i;});
 if(!P.classList.contains('playing')&&t===0)cur=-1;
 L.forEach(function(e,i){var on=i===cur;e.classList.toggle('cur',on);if(on)e.setAttribute('aria-current','true');else e.removeAttribute('aria-current');});}
function seek(t){A.currentTime=Math.max(0,Math.min(d()||0,t));draw();}
B.addEventListener('click',function(){if(A.paused){A.play().catch(()=>{});}else{A.pause();}});
A.addEventListener('play',function(){P.classList.add('playing');B.setAttribute('aria-label','إيقاف مؤقت');});
A.addEventListener('pause',function(){P.classList.remove('playing');B.setAttribute('aria-label','تشغيل الملخّص الصوتي');draw();});
A.addEventListener('ended',function(){P.classList.remove('playing');A.currentTime=0;draw();});
A.addEventListener('timeupdate',draw);A.addEventListener('loadedmetadata',draw);
S.addEventListener('click',function(e){var r=S.getBoundingClientRect();seek(d()*(r.right-e.clientX)/r.width);});
S.addEventListener('keydown',function(e){var k=e.key,t=A.currentTime;
 if(k==='ArrowLeft'){seek(t+5);}else if(k==='ArrowRight'){seek(t-5);}else if(k==='Home'){seek(0);}else if(k==='End'){seek(d());}
 else if(k===' '||k==='Enter'){B.click();}else return;e.preventDefault();});
[].forEach.call(document.querySelectorAll('.as-sp'),function(b){b.addEventListener('click',function(){
 A.playbackRate=parseFloat(b.dataset.rate);[].forEach.call(document.querySelectorAll('.as-sp'),function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});});});
function sync(){T.setAttribute('aria-expanded',D.open?'true':'false');}
T.addEventListener('click',function(){D.open=!D.open;sync();});D.addEventListener('toggle',sync);
L.forEach(function(e){e.addEventListener('click',function(){seek(parseFloat(e.dataset.t0)+0.01);A.play().catch(()=>{});});});
draw();})();