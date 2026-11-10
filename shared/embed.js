/* No framework required. A manifest and a container are supplied by the host. */
(() => {
  'use strict';
  class OnafesEmbed {
    constructor({container,manifest,baseUrl,onEvent=()=>{}}){
      if(!container||!manifest?.assets)throw new Error('container and manifest are required');
      this.container=container;this.manifest=manifest;this.base=new URL(baseUrl,location.href);this.onEvent=onEvent;
      this.receive=e=>{
        if(!this.frame||e.source!==this.frame.contentWindow||e.origin!==this.origin)return;
        const d=e.data;if(!d||d.namespace!=='onafes'||d.version!==1||d.assetId!==this.id)return;
        if(d.type==='close')this.close();
        if(d.type==='navigate'&&this.manifest.assets.some(a=>a.id===d.detail?.targetId))this.open(d.detail.targetId);
        this.onEvent(d);
      };
      window.addEventListener('message',this.receive);
    }
    open(id){
      const asset=this.manifest.assets.find(a=>a.id===id);if(!asset)throw new Error('Unknown asset: '+id);
      this.close();const url=new URL(asset.path,this.base);
      if(!['http:','https:','file:'].includes(url.protocol))throw new Error('Unsupported protocol');
      if(url.origin!==this.base.origin||!url.pathname.startsWith(this.base.pathname))throw new Error('Asset escapes package root');
      this.id=id;this.origin=url.origin;
      if(location.protocol!=='file:')url.searchParams.set('parentOrigin',location.origin);
      const frame=document.createElement('iframe');frame.title=asset.title;frame.src=url.href;
      // Trusted package content. This frame is not a sandbox for untrusted HTML.
      frame.setAttribute('allow','fullscreen');
      frame.style.cssText='width:100%;height:100%;border:0;display:block;background:#efedf5';
      this.frame=frame;this.container.replaceChildren(frame);this.onEvent({type:'opened',assetId:id,detail:asset});
    }
    pause(){this.send('pause');}
    send(type,detail={}){if(this.frame&&this.origin!=='null')this.frame.contentWindow.postMessage({namespace:'onafes',version:1,type,assetId:this.id,detail},this.origin);}
    close(){if(this.frame){this.pause();this.frame.src='about:blank';this.frame.remove();this.frame=null;}this.id=null;}
    destroy(){this.close();window.removeEventListener('message',this.receive);}
  }
  window.OnafesEmbed=OnafesEmbed;
})();
