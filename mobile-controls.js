/* Shared, multi-touch controls. Each finger releases the context it pressed. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root){root.CodaMobileControls=api;root.createCodaMobileControls=api.createCodaMobileControls;}})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function createHoldRouter(getContext){
  const pointers=new Map(),counts=new Map();
  function release(id){const entry=pointers.get(id);if(!entry)return;pointers.delete(id);for(const key of entry.keys){const token=entry.context.id+'\0'+key,n=(counts.get(token)||1)-1;if(n>0)counts.set(token,n);else{counts.delete(token);entry.context.key(key,false);}}}
  function hold(id,keys){
   const context=getContext(),next=Array.from(new Set(keys)),old=pointers.get(id);
   if(!context?.enabled||typeof context.key!=='function'){release(id);return false;}
   if(old?.context.id===context.id&&JSON.stringify(old.keys)===JSON.stringify(next))return true;
   release(id);pointers.set(id,{context,keys:next});
   for(const key of next){const token=context.id+'\0'+key,n=counts.get(token)||0;counts.set(token,n+1);if(!n)context.key(key,true);}return true;
  }
  function releaseAll(){const contexts=new Map();for(const entry of pointers.values())contexts.set(entry.context.id,entry.context);for(const id of Array.from(pointers.keys()))release(id);for(const context of contexts.values())context.release?.();}
  return {hold,release,releaseAll,snapshot:()=>Array.from(pointers.entries(),([id,value])=>({id,context:value.context.id,keys:[...value.keys]}))};
 }
 function createCodaMobileControls(api={}){
  const host=api.host||document.body.appendChild(document.createElement('div')),doc=host.ownerDocument,win=doc.defaultView;
  host.classList.add('coda-touch-controls');host.setAttribute('role','group');host.setAttribute('aria-label','Touch game controls');
  const router=createHoldRouter(api.getContext),listeners=[],timers=new Set();let mobile=null,contextId=null,destroyed=false;
  const element=(tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const dpad=element('div','coda-dpad');dpad.setAttribute('role','group');dpad.setAttribute('aria-label','Movement directions');
  const actions=element('div','coda-touch-actions'),buttons=new Map();
  function button(label,symbol,keys,action){
   const node=element('button','coda-touch-button'+(action?' coda-touch-'+action:''));node.type='button';node.setAttribute('aria-label',action==='emote'?'Perform emote':label);node.dataset.touchKeys=JSON.stringify(keys);if(keys.length===1)node.dataset.key=keys[0];if(action)node.dataset.action=action;
   const icon=element('span','coda-touch-symbol',symbol);icon.setAttribute('aria-hidden','true');
   const angle={'Move up':0,'Move up right':45,'Move right':90,'Move down right':135,'Move down':180,'Move down left':225,'Move left':270,'Move up left':315}[label];
   if(angle!==undefined)icon.innerHTML='<svg viewBox="0 0 32 32" width="25" height="25" focusable="false"><path d="M16 26V6M7 15L16 6L25 15" transform="rotate('+angle+' 16 16)" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
   if(action==='jump')icon.innerHTML='<svg viewBox="0 0 32 32" width="25" height="25" focusable="false"><path d="M6 27H26M16 22V5M8 13L16 5L24 13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
   if(action==='emote')icon.innerHTML='<svg viewBox="0 0 32 32" width="23" height="23" focusable="false"><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M10 20Q16 27 22 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="21" cy="12" r="1.5" fill="currentColor"/></svg>';
   node.append(icon,element('span','coda-touch-label',label));buttons.set(action||label,node);return node;
  }
  for(const [label,symbol,keys]of [['Move up left','↖',['w','a']],['Move up','↑',['w']],['Move up right','↗',['w','d']],['Move left','←',['a']],['center','✦',[]],['Move right','→',['d']],['Move down left','↙',['s','a']],['Move down','↓',['s']],['Move down right','↘',['s','d']]]){
   if(!keys.length){const center=element('span','coda-dpad-center',symbol);center.setAttribute('aria-hidden','true');dpad.append(center);}else dpad.append(button(label,symbol,keys));
  }
  const interact=button('Interact','E',['e'],'interact'),jump=button('Jump','↟',[' '],'jump'),emote=button('Emote','♫',['q'],'emote');actions.append(jump,interact,emote);host.append(dpad,actions);
  const listen=(target,name,callback,options)=>{target.addEventListener(name,callback,options);listeners.push(()=>target.removeEventListener(name,callback,options));};
  const find=target=>{const node=target?.closest?.('[data-touch-keys]');return node&&host.contains(node)&&!node.disabled&&!node.hidden?node:null;};
  function releaseAll(){router.releaseAll();for(const node of buttons.values())node.classList.remove('is-held');}
  function refresh(){
   if(destroyed)return;const next=!!(win.matchMedia?.('(pointer: coarse)').matches||win.innerWidth<=760),context=api.getContext?.()||{};
   if(next!==mobile){releaseAll();mobile=next;api.onMobileChange?.(mobile);}
   if(contextId!==context.id||!context.enabled||!mobile)releaseAll();contextId=context.id;
   host.hidden=!mobile||!context.enabled;jump.hidden=context.canJump===false;emote.hidden=context.canEmote===false;
   const label=context.interactLabel||'Interact';if(interact.querySelector('.coda-touch-label').textContent!==label)interact.querySelector('.coda-touch-label').textContent=label;
   interact.title=label+' (E)';
   const held=new Set(router.snapshot().flatMap(entry=>entry.keys));for(const node of buttons.values())node.classList.toggle('is-held',JSON.parse(node.dataset.touchKeys).every(key=>held.has(key)));
  }
  listen(host,'pointerdown',event=>{
   const node=find(event.target);if(!node||event.button!==0)return;event.preventDefault();refresh();if(host.hidden)return;
   router.hold(event.pointerId,JSON.parse(node.dataset.touchKeys));try{node.setPointerCapture(event.pointerId);}catch{}refresh();
  });
  listen(host,'pointermove',event=>{
   if(!router.snapshot().some(entry=>entry.id===event.pointerId))return;event.preventDefault();
   const target=doc.elementFromPoint(event.clientX,event.clientY),node=find(target),entry=router.snapshot().find(item=>item.id===event.pointerId);
   if(node&&node.closest('.coda-dpad'))router.hold(event.pointerId,JSON.parse(node.dataset.touchKeys));
   else if(target?.closest?.('.coda-dpad-center'))router.hold(event.pointerId,[]);
   else if(entry?.keys.some(key=>['w','a','s','d'].includes(key)))router.release(event.pointerId);
   refresh();
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])listen(host,name,event=>{router.release(event.pointerId);refresh();});
  // Native keyboard/screen-reader activation produces a click without pointerdown.
  listen(host,'click',event=>{if(event.detail!==0)return;const node=find(event.target);if(!node)return;refresh();if(host.hidden)return;const id='keyboard-'+Date.now();router.hold(id,JSON.parse(node.dataset.touchKeys));const timer=win.setTimeout(()=>{timers.delete(timer);router.release(id);refresh();},120);timers.add(timer);});
  listen(host,'contextmenu',event=>event.preventDefault());listen(win,'blur',releaseAll);listen(win,'resize',()=>{releaseAll();refresh();});listen(win,'orientationchange',releaseAll);
  listen(doc,'visibilitychange',()=>{if(doc.hidden)releaseAll();});
  const interval=win.setInterval(refresh,120);refresh();
  return {refresh,releaseAll,isMobile:()=>mobile,snapshot:()=>({mobile,visible:!host.hidden,context:contextId,held:router.snapshot()}),destroy(){if(destroyed)return;destroyed=true;win.clearInterval(interval);for(const timer of timers)win.clearTimeout(timer);releaseAll();listeners.forEach(stop=>stop());host.remove();}};
 }
 return {createHoldRouter,createCodaMobileControls};
});
