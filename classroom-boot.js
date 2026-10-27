/* Establish shared-device isolation before the arcade reads any saved player. */
(function(win){
 'use strict';
 const config=win.ARCADE_ACCOUNTS_CONFIG||{},privacy=config.mode==='classroom'||config.classroom?.privacy===true||config.classroom?.enabled===true;
 const ENTRY_KEY='codaClassroomEntryV1';
 let requestedView=null;
 try{
   const entry=new URL(win.location.href),view=entry.searchParams.get('profile');
   if(view==='student'||view==='admin'){
     entry.searchParams.delete('profile');
     win.history.replaceState(win.history.state,'',entry.pathname+entry.search+entry.hash);
     requestedView=view;
   }
 }catch{/* Opening the profile from its button remains available. */}
 const incoming=win.CodaClassroom?.consumeFragment(win.location,win.history);
 let card=incoming,scope=null,error=false,gate=null,service=null,ui=null,notice='';
 try{
   scope=win.CodaClassroomStorage.create({window:win,keys:win.CodaClassroomProfileData.SCOPED_KEYS});scope.install();
   win.CodaClassroomStorageInstance=scope;
   notice=win.sessionStorage.getItem('codaClassroomNoticeV1')||'';win.sessionStorage.removeItem('codaClassroomNoticeV1');
 }catch{error=true;}
 const initial=scope?.getState();
 // Only a reload requested by this boot may carry an unopened title action.
 // Session storage can be copied into a new tab, so bind it to this tab ID.
 try{
   const pending=JSON.parse(win.sessionStorage.getItem(ENTRY_KEY)||'null');
   win.sessionStorage.removeItem(ENTRY_KEY);
   if(!requestedView&&scope?.tabId&&pending?.version===1&&pending.tabId===scope.tabId&&['student','admin'].includes(pending.view))requestedView=pending.view;
 }catch{}
 let preparing=incoming!==null||initial?.mode==='owner'||initial?.blocked===true;
 if(preparing)win.document.documentElement.classList.add('classroom-preparing');
 const style=win.document.createElement('style');style.textContent=
   'html.classroom-preparing #worldStage,html.classroom-preparing #pianoroom,html.classroom-preparing #musicClassroom,html.classroom-preparing #rhythmFishing,html.classroom-preparing #gameoverlay,html.classroom-preparing #room{visibility:hidden!important}'+
   '#classroom-session-notice{position:fixed;inset:0;z-index:9500;background:#17243c;color:#f5fff8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:28px;text-align:center;font:22px/1.4 system-ui}'+
   '#classroom-session-notice[hidden]{display:none!important}#classroom-session-notice p{max-width:30ch;margin:0}#classroom-session-notice button{font:700 21px system-ui;min-height:52px;padding:12px 18px;border-radius:10px;border:2px solid #abe8d1;background:#285b59;color:white}';
 win.document.head.append(style);
 function hideGate(){preparing=false;win.document.documentElement.classList.remove('classroom-preparing');if(gate)gate.hidden=true;}
 function showGate(text){
   preparing=true;win.document.documentElement.classList.add('classroom-preparing');
   if(!gate){gate=win.document.createElement('section');gate.id='classroom-session-notice';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');win.document.body.append(gate);}
   gate.hidden=false;gate.replaceChildren();const heading=win.document.createElement('h2');heading.textContent='Your classroom profile';
   const message=win.document.createElement('p');message.textContent=text;
   const open=win.document.createElement('button');open.type='button';open.textContent='Open my profile';open.onclick=()=>{gate.hidden=true;ui?.open();};
   const guest=win.document.createElement('button');guest.type='button';guest.textContent='Play without a saved profile';guest.onclick=async()=>{const result=await service?.leave({discard:true,exitToTitle:false});if(result?.ok)hideGate();};
   gate.append(heading,message,open,guest);
 }
 function start(options={}){
   if(!privacy&&!preparing)return null;
   const current=card;let entryView=requestedView,identityReloading=false;card=null;requestedView=null;
   const reloadIdentity=()=>{
     identityReloading=true;
     preparing=true;
     win.document.documentElement.classList.add('classroom-preparing');
     if(entryView&&scope?.tabId)try{win.sessionStorage.setItem(ENTRY_KEY,JSON.stringify({version:1,tabId:scope.tabId,view:entryView}));}catch{}
     win.location.reload();
   };
   const returnToTitle=()=>{
     if(win.CodaDeveloperTestMode?.isEnabled?.())return false;
     try{
       identityReloading=true;preparing=true;
       win.document.documentElement.classList.add('classroom-preparing');
       win.location.replace(new URL('index.html',win.location.href).href);return true;
     }catch{identityReloading=false;return false;}
   };
   const settings=error?{...config,classroom:{...config.classroom,enabled:false}}:config;
   service=win.CodaClassroom.create({window:win,config:settings,storageScope:scope,
     onIdentityChange:event=>{
       options.beforeIdentityChange?.(event);
       if(event.exitToTitle&&returnToTitle())return;
       if(event.reloadNeeded){reloadIdentity();return;}
       hideGate();options.onState?.(service.getState());
     },
     onLock:event=>{
       options.onLock?.(event);
       if(event.exitToTitle&&returnToTitle())return;
       if(event.reloadNeeded){try{win.sessionStorage.setItem('codaClassroomNoticeV1',event.reason);}catch{}reloadIdentity();return;}
       showGate(event.reason==='workspace-lost'?'Your profile is open in another tab.':'Ask your teacher to help open your card again.');
     }
   });
   win.CodaClassroomSession=service;
   ui=win.createCodaClassroomUI({...options,service});win.CodaClassroomUIInstance=ui;
   service.subscribe(value=>options.onState?.(value));
   const openEntry=()=>{ui.open(entryView||'student');entryView=null;};
   if(preparing)showGate(current!==null?'Opening your card…':initial?.blocked?'Another arcade tab is using this browser.':'Opening your profile…');
   Promise.resolve(current!==null?service.join(current):service.resume()).then(result=>{
     if(identityReloading)return;
     const value=service.getState();
     if(value.profile&&!value.locked&&!value.waitingTakeover){hideGate();if(entryView)openEntry();return;}
     if(entryView||!result.ok||notice){if(gate)gate.hidden=true;openEntry();}
     else if(!initial?.blocked)hideGate();
   }).catch(()=>{if(identityReloading)return;if(entryView){if(gate)gate.hidden=true;openEntry();}else showGate('Ask your teacher to help open your card.');});
   return {service,ui,open:view=>ui.open(view),canPlay:()=>{const value=service.getState();return !preparing&&!value.loading&&!value.locked&&(!value.profile||service.isWritable());},getState:()=>({preparing,privacy,...service.getState()})};
 }
 // A signed-in student uses the connected world, including when a cabinet
 // opens the site's older landing page in the same tab.
 if(/\/classic-arcade\.html$/.test(win.location.pathname)&&!win.location.pathname.includes('/song-machine/')&&initial?.mode==='owner'){
   win.location.replace(new URL('world-preview.html',win.location.href).href);
 }
 win.CodaClassroomBoot=Object.freeze({start,getState:()=>({preparing,privacy,storageAvailable:!error}),hideGate});
})(window);
