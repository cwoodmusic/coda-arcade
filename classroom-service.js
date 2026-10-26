/* Private classroom profiles: anonymous student devices, generated card passes,
 * trusted school administrators, and one writing device per profile. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CodaClassroom=api;})(typeof window==='undefined'?null:window,function(root){
 'use strict';
 const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',NS='classroomV1';
 const ACTIVE_KEY='codaClassroomActiveV1',BACKUP_KEY='codaClassroomGuestBackupV1',PENDING_KEY='codaClassroomPendingV1',ADMIN_KEY='codaClassroomAdminTabV1';
 const COLORS=['Amber','Blue','Coral','Gold','Green','Lilac','Mint','Pink','Red','Silver','Teal','Violet'];
 const ANIMALS=['Cat','Fox','Frog','Owl','Otter','Penguin','Rabbit','Turtle'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((o,k)=>(o[k]=v[k],o),{}):v);
 const fail=code=>({ok:false,code});
 function encode(bytes){let bits=0,value=0,result='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){result+=ALPHABET[(value>>>(bits-5))&31];bits-=5;}}if(bits)result+=ALPHABET[(value<<(5-bits))&31];return result;}
 function passCode(value){
   if(typeof value!=='string'||value.length>2048)return null;
   let text=value.trim();
   if(/^https?:\/\//i.test(text)){try{const url=new URL(text);text=new URLSearchParams(url.hash.slice(1)).get('classroom-pass')||'';}catch{return null;}}
   text=text.replace(/^CODA[-\s]*/i,'').replace(/[\s-]/g,'').toUpperCase();
   return text.length===26&&[...text].every(c=>ALPHABET.includes(c))&&ALPHABET.indexOf(text.at(-1))%4===0?text:null;
 }
 const formatPass=code=>'CODA-'+code.match(/.{1,4}/g).join('-');
 async function hashPass(code,crypto){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('coda-classroom-pass:v1:'+code));return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');}
 function consumeFragment(location,history){
   if(!location?.hash||!new URLSearchParams(location.hash.slice(1)).has('classroom-pass'))return null;
   const value=new URLSearchParams(location.hash.slice(1)).get('classroom-pass');
   try{history.replaceState(history.state,'',location.pathname+location.search);}catch{}
   return value||'';
 }
 async function firebaseSDK(){const modules=await Promise.all([
   import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js')
 ]);return Object.assign({},...modules);}
 function create(options={}){
   const win=options.window||root,config=options.config||win?.ARCADE_ACCOUNTS_CONFIG||{};
   const location=options.location||win?.location,crypto=options.crypto||win?.crypto||globalThis.crypto;
   const dataApi=options.dataApi||win?.CodaClassroomProfileData;
   const storageScope=options.storageScope||win?.CodaClassroomStorageInstance;
   const native=options.storage||storageScope?.nativeStorage||win?.localStorage;
   const session=options.sessionStorage||win?.sessionStorage;
   const now=options.clock||Date.now,namespace=config.classroom?.namespace||NS;
   const local=['localhost','127.0.0.1','[::1]'].includes(location?.hostname);
   const supported=location?.hostname==='cwoodmusic.github.io'||local||!!options.sdkLoader;
   const configured=!!(supported&&config.firebase?.projectId&&dataApi&&crypto?.getRandomValues&&crypto?.subtle&&namespace===NS);
   const enabled=configured&&config.classroom?.enabled===true;
   const listeners=new Set(),subscriptions=[];
   let sdk,db,auth,adminDb,adminAuth,connecting,studentUid=null,adminUid=null,adminAuthorized=false,adminRoleStop=null;
   let active=null,leaseOwned=false,loaded=false,baseRevision=0,lastSaved='',pending=false,saving=false;
   let loading=false,locked=false,waitingTakeover=false,code='',status='',destroyed=false,generation=0,inFlightSave=null,transitioning=false;
   let offset=0,lastActivity=now(),flushTimer=null,leaseTimer=null,idleTimer=null,queuedPass=null;
   const pendingJobs=new Set();
   const state=()=>({configured,enabled,ready:!!sdk,loading,locked,waitingTakeover,pending,
     profile:active?{classId:active.classId,classLabel:active.classLabel||'Classroom',profileId:active.profileId,alias:active.alias,picture:active.picture}:null,
     admin:{signedIn:!!adminUid,authorized:adminAuthorized,uid:adminUid||null},
     role:adminAuthorized?'admin':active?'student':'guest',readOnly:!!active&&!isWritable(),status,code});
   function notify(){const value=state();for(const listener of listeners)try{listener(clone(value));}catch{}return value;}
   function message(value,nextCode=''){status=value;code=nextCode;notify();}
   const path=suffix=>namespace+'/'+suffix;
   const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{6,80}$/.test(id);
   const profilePath=p=>path('classes/'+p.classId+'/profiles/'+p.profileId);
   function random(size){const bytes=new Uint8Array(size);crypto.getRandomValues(bytes);return bytes;}
   function id(prefix){return prefix+'_'+encode(random(12)).toLowerCase();}
   function ownsWorkspace(){return !storageScope||storageScope.owns();}
   function maySave(){return !destroyed&&!locked&&!waitingTakeover&&!!active&&loaded&&leaseOwned&&ownsWorkspace();}
   function isWritable(){return !loading&&!transitioning&&maySave();}
   function guardedStorage(){return storageScope?storageScope.guardedStorage():native;}
   function stopSubscriptions(){for(const stop of subscriptions.splice(0))try{stop();}catch{}}
   async function connect(){
     if(!configured)return fail('not-configured');if(connecting)return connecting;if(sdk)return {ok:true};
     connecting=(async()=>{try{
       const api=await (options.sdkLoader||firebaseSDK)();if(destroyed)return fail('closed');sdk=api;
       const app=api.getApps().find(a=>a.name==='coda-classroom')||api.initializeApp(config.firebase,'coda-classroom');
       const staff=api.getApps().find(a=>a.name==='coda-classroom-admin')||api.initializeApp(config.firebase,'coda-classroom-admin');
       auth=api.getAuth(app);db=api.getDatabase(app);adminAuth=api.getAuth(staff);adminDb=api.getDatabase(staff);
       const emulators=config.classroom?.emulators;
       if(emulators&&(local||options.sdkLoader)){
         if(emulators.auth){try{api.connectAuthEmulator(auth,emulators.auth,{disableWarnings:true});}catch{}try{api.connectAuthEmulator(adminAuth,emulators.auth,{disableWarnings:true});}catch{}}
         if(emulators.database){for(const database of [db,adminDb])try{api.connectDatabaseEmulator(database,emulators.database.host,emulators.database.port);}catch{}}
       }
       await Promise.all([api.setPersistence(auth,api.browserSessionPersistence),api.setPersistence(adminAuth,api.browserSessionPersistence)]);
       if(auth.authStateReady)await auth.authStateReady();if(adminAuth.authStateReady)await adminAuth.authStateReady();
       studentUid=auth.currentUser?.uid||null;adminUid=adminAuth.currentUser?.uid||null;
       // A newly opened tab can inherit sessionStorage and Firebase Auth from
       // its opener. Teacher access must be explicitly granted in this tab.
       if(adminUid&&readBound(ADMIN_KEY)?.uid!==adminUid){await api.signOut(adminAuth);adminUid=null;}
       try{const snap=await api.get(api.ref(db,'.info/serverTimeOffset'));offset=Number(snap.val())||0;}catch{}
       if(adminUid){await checkAdmin();watchAdmin();}notify();return {ok:true};
     }catch{sdk=null;message('Classroom connection is unavailable. Try again.','connection-unavailable');return fail('connection-unavailable');}finally{connecting=null;}})();
     return connecting;
   }
   async function student(){const connected=await connect();if(!connected.ok)return connected;if(!auth.currentUser)await sdk.signInAnonymously(auth);studentUid=auth.currentUser?.uid;return studentUid?{ok:true}:fail('sign-in-unavailable');}
   async function checkAdmin(){
     adminUid=adminAuth?.currentUser?.uid||null;adminAuthorized=false;if(!adminUid)return false;
     try{const token=await adminAuth.currentUser.getIdTokenResult();if(token.signInProvider&&token.signInProvider!=='google.com')return false;
       const snap=await sdk.get(sdk.ref(adminDb,path('admins/'+adminUid)));adminAuthorized=snap.val()===true;
     }catch{}return adminAuthorized;
   }
   function watchAdmin(){
     if(adminRoleStop){adminRoleStop();adminRoleStop=null;}if(!adminAuthorized||!adminUid)return;
     const uid=adminUid;adminRoleStop=sdk.onValue(sdk.ref(adminDb,path('admins/'+uid)),snap=>{
       if(adminUid===uid&&snap.val()!==true){adminAuthorized=false;message('This admin account is no longer approved.','admin-not-approved');}
     },()=>{if(adminUid===uid){adminAuthorized=false;message('Admin access needs to be checked again.','admin-not-approved');}});
   }
   async function adminSignIn(){const result=await connect();if(!result.ok)return result;loading=true;lastActivity=now();notify();try{
     const provider=new sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await sdk.signInWithPopup(adminAuth,provider);
     session.setItem(ADMIN_KEY,JSON.stringify({version:1,tabId,uid:adminAuth.currentUser?.uid}));
     await checkAdmin();watchAdmin();message(adminAuthorized?'School admin ready.':'Your school administrator needs to approve this admin account.',adminAuthorized?'':'admin-not-approved');
     return adminAuthorized?{ok:true}:fail('admin-not-approved');
   }catch{message('Admin sign-in could not finish. Try again.','admin-sign-in-failed');return fail('admin-sign-in-failed');}finally{loading=false;notify();}}
   async function adminSignOut(){if(adminRoleStop){adminRoleStop();adminRoleStop=null;}adminUid=null;adminAuthorized=false;try{session.removeItem(ADMIN_KEY);}catch{}notify();if(adminAuth)try{await sdk.signOut(adminAuth);}catch{}return {ok:true};}
   async function staff(){const ready=await connect();if(!ready.ok)return ready;if(!enabled)return fail('classroom-not-enabled');return await checkAdmin()?{ok:true}:fail('admin-not-approved');}
   async function withWorkspace(fn){return storageScope?.withLock?storageScope.withLock(fn):fn();}
   const tabId=storageScope?.tabId||'single-window';
   function readBound(key){try{const value=JSON.parse(session.getItem(key)||'null');return value?.version===1&&value.tabId===tabId?value:null;}catch{return null;}}
   function backupGuest(){if(!readBound(BACKUP_KEY))session.setItem(BACKUP_KEY,JSON.stringify({version:1,tabId,backup:dataApi.backup(storageScope?.storage||win?.localStorage||native)}));}
   function cachedProgress(profile=active){const value=readBound(PENDING_KEY);if(!profile||value?.classId!==profile.classId||value?.profileId!==profile.profileId||!Number.isSafeInteger(value.revision))return null;const valid=dataApi.validate(value.data);return valid.ok?{...value,data:valid.data}:null;}
   function clearPending(profile=active){if(cachedProgress(profile))session.removeItem(PENDING_KEY);}
   function keepPending(){
     if(!active||!loaded)return;
     try{const captured=dataApi.capture(storageScope?.storage||native);if(!captured.ok)return;
       if(stable(captured.data)===lastSaved){clearPending();return;}
       session.setItem(PENDING_KEY,JSON.stringify({version:1,tabId,classId:active.classId,profileId:active.profileId,revision:baseRevision,data:captured.data}));pending=true;
     }catch{}
   }
   function sessionMarker(){try{return JSON.parse(session.getItem(ACTIVE_KEY)||'null');}catch{return null;}}
   function identity(reason,reloadNeeded){try{options.onIdentityChange?.({active:!!active,profile:state().profile,reason,reloadNeeded});}catch{}}
   function restoreGuest(){
     if(!ownsWorkspace())return false;
     try{
       const backup=readBound(BACKUP_KEY),target=guardedStorage();
       const result=backup?dataApi.restore(target,backup.backup):dataApi.clear(target);if(!result.ok)return false;
       session.removeItem(BACKUP_KEY);storageScope?.release();return true;
     }catch{return false;}
   }
   function lock(reason='access-revoked'){
     if(destroyed||locked)return;keepPending();generation++;stopSubscriptions();leaseOwned=false;loaded=false;locked=true;waitingTakeover=false;
     const restored=reason!=='workspace-lost'&&reason!=='unsaved-conflict'&&restoreGuest();
     message(reason==='workspace-lost'?'This arcade tab is resting. Use your other tab.':reason==='device-changed'?'Your profile is open on another device.':reason==='unsaved-conflict'?'Another device saved newer progress. Ask your teacher which saved progress to use.':reason==='idle'?'Your profile is resting. Scan your card to play again.':'This card is no longer active. Ask your teacher for a new card.',reason);
     try{options.onLock?.({reason,profile:state().profile,pending,reloadNeeded:restored});}catch{}
   }
   async function lease(takeover=false,renew=false){
     if(!active||!studentUid)return false;const p=active,uid=studentUid,owner=generation;
     const result=await sdk.runTransaction(sdk.ref(db,profilePath(p)+'/lease'),current=>{
       if(owner!==generation||locked||!ownsWorkspace())return;
       if(renew&&current?.uid!==uid)return;
       if(current&&current.uid!==uid&&current.expiresAt>now()+offset&&!takeover)return;
       return {uid,expiresAt:Math.floor(now()+offset+60000)};
     },{applyLocally:false});
     if(owner!==generation)return false;leaseOwned=result.committed&&result.snapshot.val()?.uid===uid;return leaseOwned;
   }
   async function releaseLease(profile=active,uid=studentUid){
     if(!sdk||!profile||!uid)return;
     try{await sdk.runTransaction(sdk.ref(db,profilePath(profile)+'/lease'),current=>current===null?null:current.uid===uid?null:undefined,{applyLocally:false});}catch{}
   }
   function observeProfile(){
     const owner=generation,p=active;
     const invalid=()=>{if(owner===generation)lock('access-revoked');};
     subscriptions.push(sdk.onValue(sdk.ref(db,profilePath(p)+'/meta'),snap=>{if(owner!==generation)return;const value=snap.val();if(!value||value.passHash!==p.passHash)invalid();},invalid));
     subscriptions.push(sdk.onValue(sdk.ref(db,path('sessions/'+studentUid)),snap=>{if(owner!==generation)return;const value=snap.val();if(!value||value.profileId!==p.profileId||value.classId!==p.classId||value.passHash!==p.passHash)invalid();},invalid));
     subscriptions.push(sdk.onValue(sdk.ref(db,profilePath(p)+'/lease'),snap=>{
       if(owner!==generation)return;const value=snap.val();if(value?.uid!==studentUid&&value?.expiresAt>now()+offset)lock('device-changed');
     },invalid));
   }
   async function loadActive(reason){
     const owner=generation,p=active;
     const [metaSnap,stateSnap]=await Promise.all([sdk.get(sdk.ref(db,profilePath(p)+'/meta')),sdk.get(sdk.ref(db,profilePath(p)+'/state'))]);
     if(owner!==generation)return fail('closed');
     const meta=metaSnap.val(),saved=stateSnap.val();
     if(!meta||meta.passHash!==p.passHash||!saved||saved.schemaVersion!==1||!Number.isSafeInteger(saved.revision))return fail('profile-unavailable');
     const valid=dataApi.validate(saved.data);if(!valid.ok)return fail('profile-data-invalid');
     const cached=cachedProgress(p),encoded=stable(valid.data);
     if(cached&&cached.revision!==saved.revision&&stable(cached.data)!==encoded)return fail('unsaved-conflict');
     const working=cached&&cached.revision===saved.revision?cached.data:valid.data;
     active={...p,alias:meta.alias,picture:meta.picture||'owl'};baseRevision=saved.revision;lastSaved=encoded;
     const current=dataApi.capture(guardedStorage());const changed=reason!=='resumed'||!current.ok||stable(current.data)!==stable(working);
     if(changed){const result=dataApi.apply(guardedStorage(),working);if(!result.ok)return fail('local-saving-unavailable');}
     if(owner!==generation||!ownsWorkspace())return fail('workspace-lost');
     loaded=true;pending=stable(working)!==lastSaved;locked=false;waitingTakeover=false;if(!pending)clearPending();
     observeProfile();message('Your classroom profile is ready.');identity(reason,changed);return {ok:true};
   }
   async function activate(binding,{takeover=false,reason='joined'}={}){
     const owner=++generation;stopSubscriptions();loaded=false;leaseOwned=false;locked=false;pending=false;waitingTakeover=false;transitioning=true;
     try{await withWorkspace(async()=>{
       if(owner!==generation)return;
       if(!storageScope?.owns())backupGuest();
       if(storageScope)storageScope.claim({classId:binding.classId,profileId:binding.profileId});
       active={...binding};
     });}finally{transitioning=false;}
     if(owner!==generation)return fail('closed');
     if(!await lease(takeover)){waitingTakeover=true;message('This profile is open on another device.','profile-in-use');return fail('profile-in-use');}
     const result=await withWorkspace(()=>loadActive(reason));
     if(!result.ok){lock(result.code);return result;}return result;
   }
   async function join(input){
     if(!enabled){message('Your teacher is finishing classroom setup.','classroom-not-enabled');return fail('classroom-not-enabled');}
     const normalized=passCode(input);if(!normalized){message('Use the card your teacher gave you.','invalid-pass');return fail('invalid-pass');}
     if(loading||transitioning)return fail('busy');loading=true;notify();let owner=generation,bindingChanged=false;
     try{
       if(active&&loaded){const saved=await flush();if(!saved.ok)return saved;}
       const ready=await student();if(!ready.ok)return ready;
       const digest=await hashPass(normalized,crypto);
       const lookup=await sdk.get(sdk.ref(db,path('passes/'+digest)));if(owner!==generation)return fail('closed');
       const pass=lookup.val();if(!pass||!validId(pass.classId)||!validId(pass.profileId)){message('That card is unavailable. Ask your teacher for help.','invalid-pass');return fail('invalid-pass');}
       if(active?.classId===pass.classId&&active?.profileId===pass.profileId&&active.passHash===digest&&maySave()){message('Your classroom profile is ready.');return {ok:true};}
       await releaseLease();if(owner!==generation)return fail('closed');
       owner=++generation;stopSubscriptions();bindingChanged=true;
       await sdk.set(sdk.ref(db,path('sessions/'+studentUid)),{classId:pass.classId,profileId:pass.profileId,passHash:digest,createdAt:sdk.serverTimestamp()});
       if(owner!==generation)return fail('closed');queuedPass=null;
       return await activate({classId:pass.classId,profileId:pass.profileId,passHash:digest});
     }catch{if(bindingChanged&&active)lock('join-failed');message('Your card could not open. Ask your teacher for help.','join-failed');return fail('join-failed');}finally{loading=false;notify();}
   }
   async function resume(){
     const marker=enabled?sessionMarker():null,teacher=readBound(ADMIN_KEY);
     if(!marker&&!teacher?.uid)return {ok:true,guest:true};loading=true;notify();
     try{
       if(marker&&storageScope&&!ownsWorkspace()){lock('workspace-lost');return fail('workspace-lost');}
       const ready=await connect();if(!ready.ok)return ready;
       // Teacher sessions have no student profile marker. Restore their
       // tab-bound Firebase identity before rendering the teacher entry page.
       if(!marker)return {ok:true,guest:true};
       if(!auth.currentUser){lock('session-ended');return fail('session-ended');}
       studentUid=auth.currentUser.uid;
       const snap=await sdk.get(sdk.ref(db,path('sessions/'+studentUid))),binding=snap.val();
       if(!binding||!validId(binding.classId)||!validId(binding.profileId)){lock('access-revoked');return fail('session-ended');}
       return await activate(binding,{reason:'resumed'});
     }catch{lock('connection-unavailable');return fail('connection-unavailable');}finally{loading=false;notify();}
   }
   async function takeOver(){if(!active||!waitingTakeover)return fail('no-profile');loading=true;notify();try{return await activate(active,{takeover:true,reason:'device-changed'});}catch{return fail('connection-unavailable');}finally{loading=false;notify();}}
   async function flush(){
     if(!active)return {ok:true,guest:true};if(!maySave())return fail(locked?'access-revoked':'profile-read-only');
     if(inFlightSave){const previous=await inFlightSave;return previous.ok?flush():previous;}
     const owner=generation,revision=baseRevision;let captured;
     try{captured=dataApi.capture(guardedStorage());}catch{return fail('workspace-lost');}
     if(!captured.ok){pending=true;message('Your teacher needs to check this profile before it can save.','profile-data-invalid');return fail('profile-data-invalid');}
     const encoded=stable(captured.data);if(encoded===lastSaved)return {ok:true};
     if(!maySave()||owner!==generation)return fail('workspace-lost');
     try{session.setItem(PENDING_KEY,JSON.stringify({version:1,tabId,classId:active.classId,profileId:active.profileId,revision,data:captured.data}));}catch{message('This device cannot keep an unsent save safely. Ask your teacher for help.','local-saving-unavailable');return fail('local-saving-unavailable');}
     saving=true;pending=true;notify();
     inFlightSave=(async()=>{try{
       const result=await sdk.runTransaction(sdk.ref(db,profilePath(active)+'/state'),current=>{
         // Firebase first calls a transaction with an uncached null value.
         // The server retries it against the real revision; only a known
         // different revision is a conflict, and rules enforce old + 1.
         if(owner!==generation||!maySave()||(current!==null&&current?.revision!==revision))return;
         return {schemaVersion:1,revision:revision+1,updatedAt:sdk.serverTimestamp(),data:captured.data};
       },{applyLocally:false});
       if(owner!==generation||!ownsWorkspace())return fail('workspace-lost');
       if(!result.committed){lock('newer-progress');return fail('newer-progress');}
       baseRevision=revision+1;lastSaved=encoded;pending=false;keepPending();message(pending?'Saving your newest progress…':'Progress saved.');return {ok:true};
     }catch{pending=true;message('Not saved yet. Keep this tab open and try again.','save-unavailable');return fail('save-unavailable');}finally{saving=false;inFlightSave=null;notify();}})();
     return inFlightSave;
   }
   async function leave(settings={}){
     if(loading||transitioning)return fail('busy');loading=true;transitioning=true;notify();
     if(active&&loaded&&!settings.discard){const saved=await flush();if(!saved.ok){loading=false;transitioning=false;notify();return fail('unsaved-progress');}}
     const old=active,uid=studentUid;let restored=false;
     try{await withWorkspace(()=>{if(ownsWorkspace())restored=restoreGuest();});}
     catch{loading=false;transitioning=false;notify();return fail('local-saving-unavailable');}
     if(ownsWorkspace()&&!restored){loading=false;transitioning=false;message('This device could not switch players safely. Ask your teacher for help.','local-saving-unavailable');return fail('local-saving-unavailable');}
     if(settings.discard)clearPending(old);
     generation++;stopSubscriptions();leaseOwned=false;loaded=false;waitingTakeover=false;locked=false;active=null;pending=false;transitioning=false;
     if(sdk&&uid){
       const cleanup=(async()=>{await releaseLease(old,uid);try{await sdk.remove(sdk.ref(db,path('sessions/'+uid)));}catch{}})();
       // Online devices release their lease first. Offline cleanup may remain
       // queued; expiry still bounds it, without trapping the child in a menu.
       await Promise.race([cleanup,new Promise(resolve=>win.setTimeout(resolve,1500))]);
       try{await sdk.signOut(auth);}catch{}
     }
     studentUid=null;loading=false;message('This device is ready for another player.');identity(old?'left':'guest',!!old||restored);return {ok:true};
   }
   async function useSavedProgress(){
     if(!active||code!=='unsaved-conflict'||loading)return fail('no-conflict');
     clearPending();loading=true;notify();try{return await activate(active,{reason:'saved-progress-selected'});}catch{return fail('connection-unavailable');}finally{loading=false;notify();}
   }
   async function listClasses(){const allowed=await staff();if(!allowed.ok)return allowed;try{
     const snap=await sdk.get(sdk.ref(adminDb,path('directory')));const classes=[];
     snap.forEach(child=>{const meta=child.child('meta').val();if(meta)classes.push({classId:child.key,label:meta.label});});return {ok:true,classes};
   }catch{return fail('class-list-unavailable');}}
   async function createClass(label='Class 1'){const allowed=await staff();if(!allowed.ok)return allowed;
     if(typeof label!=='string'||!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$/.test(label))return fail('invalid-class-label');
     const classId=id('class');try{const meta={ownerUid:adminUid,label,createdAt:sdk.serverTimestamp()},changes={};changes['classes/'+classId+'/meta']=meta;changes['directory/'+classId+'/meta']=meta;await sdk.update(sdk.ref(adminDb,namespace),changes);return {ok:true,classId,label};}catch{return fail('class-create-failed');}}
   async function listProfiles(classId){const allowed=await staff();if(!allowed.ok)return allowed;if(!validId(classId))return fail('invalid-class');try{
     const snap=await sdk.get(sdk.ref(adminDb,path('directory/'+classId+'/profiles')));const profiles=[];
     snap.forEach(child=>{const meta=child.val();if(meta)profiles.push({profileId:child.key,alias:meta.alias,picture:meta.picture||'owl'});});return {ok:true,profiles};
   }catch{return fail('profile-list-unavailable');}}
   function receipt(profileId,meta,raw){const url=new URL('world-preview.html',location.href);url.search='';url.hash='classroom-pass='+formatPass(raw);return {ok:true,profileId,alias:meta.alias,picture:meta.picture,pass:formatPass(raw),link:url.href};}
   async function createProfile(classId){const allowed=await staff();if(!allowed.ok)return allowed;if(!validId(classId))return fail('invalid-class');try{
     const existing=await listProfiles(classId);if(!existing.ok)return existing;if(existing.profiles.length>=200)return fail('class-full');
     const aliases=new Set(existing.profiles.map(p=>p.alias));let alias,picture;
     do{const bytes=random(3);picture=ANIMALS[bytes[1]%ANIMALS.length];alias=COLORS[bytes[0]%COLORS.length]+' '+picture+' '+String(10+bytes[2]%90);}while(aliases.has(alias));
     const profileId=id('profile'),raw=encode(random(16)),digest=await hashPass(raw,crypto);
     const meta={alias,picture:picture.toLowerCase(),passHash:digest,createdAt:sdk.serverTimestamp()};
     const changes={};changes['classes/'+classId+'/profiles/'+profileId]={meta,state:{schemaVersion:1,revision:1,updatedAt:sdk.serverTimestamp(),data:dataApi.blank()}};
     changes['passes/'+digest]={classId,profileId,createdAt:sdk.serverTimestamp()};
     changes['directory/'+classId+'/profiles/'+profileId]={alias,picture:meta.picture};
     await sdk.update(sdk.ref(adminDb,namespace),changes);return receipt(profileId,meta,raw);
   }catch{return fail('profile-create-failed');}}
   async function reissuePass(classId,profileId){const allowed=await staff();if(!allowed.ok)return allowed;if(!validId(classId)||!validId(profileId))return fail('invalid-profile');try{
     const metaRef=sdk.ref(adminDb,path('classes/'+classId+'/profiles/'+profileId+'/meta')),snap=await sdk.get(metaRef),meta=snap.val();if(!meta)return fail('profile-unavailable');
     const raw=encode(random(16)),digest=await hashPass(raw,crypto),changes={};
     changes['classes/'+classId+'/profiles/'+profileId+'/meta/passHash']=digest;
     changes['classes/'+classId+'/profiles/'+profileId+'/lease']=null;changes['passes/'+meta.passHash]=null;
     changes['passes/'+digest]={classId,profileId,createdAt:sdk.serverTimestamp()};
     for(const row of await sessionsForClass(classId))if(row.profileId===profileId)changes['sessions/'+row.uid]=null;
     await sdk.update(sdk.ref(adminDb,namespace),changes);return receipt(profileId,meta,raw);
   }catch{return fail('pass-reissue-failed');}}
   async function sessionsForClass(classId){const snap=await sdk.get(sdk.query(sdk.ref(adminDb,path('sessions')),sdk.orderByChild('classId'),sdk.equalTo(classId)));const rows=[];snap.forEach(child=>rows.push({uid:child.key,...child.val()}));return rows;}
   async function deleteProfile(classId,profileId){const allowed=await staff();if(!allowed.ok)return allowed;if(!validId(classId)||!validId(profileId))return fail('invalid-profile');try{
     const snap=await sdk.get(sdk.ref(adminDb,path('classes/'+classId+'/profiles/'+profileId+'/meta'))),meta=snap.val();if(!meta)return {ok:true};
     const changes={};changes['classes/'+classId+'/profiles/'+profileId]=null;changes['passes/'+meta.passHash]=null;
     changes['directory/'+classId+'/profiles/'+profileId]=null;
     for(const row of await sessionsForClass(classId))if(row.profileId===profileId)changes['sessions/'+row.uid]=null;
     await sdk.update(sdk.ref(adminDb,namespace),changes);return {ok:true};
   }catch{return fail('profile-delete-failed');}}
   async function deleteClass(classId){const allowed=await staff();if(!allowed.ok)return allowed;if(!validId(classId))return fail('invalid-class');try{
     const snap=await sdk.get(sdk.ref(adminDb,path('classes/'+classId+'/profiles'))),changes={};changes['classes/'+classId]=null;changes['directory/'+classId]=null;
     snap.forEach(child=>{const digest=child.child('meta/passHash').val();if(digest)changes['passes/'+digest]=null;});
     for(const row of await sessionsForClass(classId))changes['sessions/'+row.uid]=null;
     await sdk.update(sdk.ref(adminDb,namespace),changes);return {ok:true};
   }catch{return fail('class-delete-failed');}}
   const activity=()=>{lastActivity=now();};
   const pageHidden=()=>{if(!win?.document||win.document.visibilityState==='hidden')keepPending();};
   win?.addEventListener?.('pagehide',keepPending);win?.document?.addEventListener?.('visibilitychange',pageHidden);
   for(const type of ['pointerdown','keydown','touchstart'])win?.addEventListener?.(type,activity,{passive:true});
   if(storageScope?.subscribe)pendingJobs.add(storageScope.subscribe(()=>{if(active&&!transitioning&&!ownsWorkspace())lock('workspace-lost');}));
   flushTimer=win?.setInterval?.(()=>{if(isWritable())flush();},1500);
   leaseTimer=win?.setInterval?.(async()=>{if(!isWritable())return;try{if(!await lease(false,true))lock('device-changed');}catch{message('Connection paused. Keep this tab open.','connection-unavailable');}},20000);
   idleTimer=win?.setInterval?.(()=>{if(now()-lastActivity<=Math.max(60000,options.idleMs||600000))return;if(adminUid)adminSignOut();if(active&&!locked&&!loading)flush().then(result=>{if(result.ok)leave({discard:true});else lock('idle');});},10000);
   function destroy(){keepPending();destroyed=true;generation++;stopSubscriptions();if(adminRoleStop){adminRoleStop();adminRoleStop=null;}for(const stop of pendingJobs)try{stop();}catch{}for(const timer of [flushTimer,leaseTimer,idleTimer])if(timer!==null)win?.clearInterval?.(timer);for(const type of ['pointerdown','keydown','touchstart'])win?.removeEventListener?.(type,activity);win?.removeEventListener?.('pagehide',keepPending);win?.document?.removeEventListener?.('visibilitychange',pageHidden);listeners.clear();}
   return {getState:state,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},connect,resume,join,leave,takeOver,useSavedProgress,adminSignIn,adminSignOut,listClasses,createClass,listProfiles,createProfile,reissuePass,deleteProfile,deleteClass,flush,isWritable,destroy};
 }
 return Object.freeze({create,consumeFragment,parsePass:passCode,formatPass,hashPass});
});
