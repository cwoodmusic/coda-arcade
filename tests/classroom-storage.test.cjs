const test=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const {create,WORKSPACE_KEY,ACTIVE_KEY,TAB_KEY}=require('../classroom-storage.js');
const SCOPED=['musicArcadeV1','codaPlayerProgressV1','codaNotesWalletV1'];
function memory(seed={}){const data=new Map(Object.entries(seed));return {get length(){return data.size;},key:index=>[...data.keys()][index]??null,getItem:key=>data.get(String(key))??null,setItem:(key,value)=>data.set(String(key),String(value)),removeItem:key=>data.delete(String(key)),clear:()=>data.clear(),dump:()=>Object.fromEntries(data)};}
function tab(storage,sessions=memory(),name=''){
 const events=new Map(),win={name,crypto:webcrypto,localStorage:storage,sessionStorage:sessions,queueMicrotask,
  addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:(name,fn)=>{if(events.get(name)===fn)events.delete(name);}};
 const workspace=create({window:win,storage,sessionStorage:sessions,keys:SCOPED});workspace.install();return {win,workspace,sessions,events};
}
const profileA={classId:'classAAAA',profileId:'profileAAAA'},profileB={classId:'classBBBB',profileId:'profileBBBB'};

test('guest saves and unknown browser settings retain native Storage behavior',()=>{
 const native=memory({musicArcadeV1:'guest',camera:'2'}),a=tab(native),store=a.win.localStorage;
 assert.equal(store.__codaClassroomScoped,true);assert.equal(store.getItem('musicArcadeV1'),'guest');
 store.codaNotesWalletV1='150';assert.equal(native.getItem('codaNotesWalletV1'),'150');
 store.setItem('firebase:authUser','opaque');assert.equal(native.getItem('firebase:authUser'),'opaque');
 assert.deepEqual(Object.keys(store).sort(),Object.keys(native.dump()).sort());assert.equal(store.length,native.length);
 delete store.codaNotesWalletV1;assert.equal(native.getItem('codaNotesWalletV1'),null);
 assert.equal(a.workspace.getState().mode,'guest');
});

test('new blocked tabs see no student saves and cannot mutate them even before events',()=>{
 const native=memory(),a=tab(native),markerA=a.workspace.claim(profileA);
 a.win.localStorage.musicArcadeV1='studentA';a.win.localStorage.codaNotesWalletV1='250';
 const b=tab(native),storeB=b.win.localStorage;
 assert.equal(b.workspace.getState().blocked,true);assert.equal(storeB.musicArcadeV1,null);assert.equal(storeB.getItem('codaNotesWalletV1'),null);
 storeB.setItem('musicArcadeV1','other student');storeB.removeItem('codaNotesWalletV1');
 assert.equal(native.getItem('musicArcadeV1'),'studentA');assert.equal(native.getItem('codaNotesWalletV1'),'250');
 assert.equal(a.workspace.owns(markerA),true);assert.equal(storeB.musicArcadeV1,'other student');
 assert.equal(Object.keys(storeB).includes('codaNotesWalletV1'),false);
});

test('taking ownership immediately quarantines old readers, writers and rollback handles',()=>{
 const native=memory(),a=tab(native),markerA=a.workspace.claim(profileA),guardA=a.workspace.guardedStorage(markerA);
 guardA.setItem('musicArcadeV1','studentA');guardA.setItem('codaPlayerProgressV1','xpA');
 const b=tab(native),markerB=b.workspace.claim(profileB),guardB=b.workspace.guardedStorage(markerB);
 guardB.setItem('musicArcadeV1','studentB');guardB.setItem('codaPlayerProgressV1','xpB');
 // Do not deliver a storage event: guards must consult ownership synchronously.
 assert.equal(a.win.localStorage.musicArcadeV1,'studentA');a.win.localStorage.musicArcadeV1='late old callback';
 assert.equal(native.getItem('musicArcadeV1'),'studentB');assert.equal(a.win.localStorage.musicArcadeV1,'late old callback');
 for(const method of ['getItem','setItem','removeItem','clear','key'])assert.throws(()=>guardA[method]('musicArcadeV1','rollback'),{code:'classroom/workspace-lost'});
 assert.throws(()=>guardA.length,{code:'classroom/workspace-lost'});
 assert.equal(a.workspace.release(),false);assert.equal(b.workspace.owns(markerB),true);
});

test('default guarded handles capture their epoch and cannot silently adopt a later claim',()=>{
 const native=memory(),a=tab(native);a.workspace.claim(profileA);
 const original=a.workspace.guardedStorage();original.setItem('musicArcadeV1','studentA');
 a.workspace.claim(profileB);a.workspace.guardedStorage().setItem('musicArcadeV1','studentB');
 assert.throws(()=>original.setItem('musicArcadeV1','old rollback'),{code:'classroom/workspace-lost'});
 assert.equal(native.getItem('musicArcadeV1'),'studentB');
 const fresh=tab(memory());assert.throws(()=>fresh.workspace.guardedStorage().getItem('musicArcadeV1'),{code:'classroom/workspace-lost'});
});

test('missing storage key configuration fails closed and canonical DTO keys are the default',()=>{
 const native=memory(),sessions=memory(),win={crypto:webcrypto,localStorage:native,sessionStorage:sessions};
 assert.throws(()=>create({window:win}),/storage keys are required/);
 win.CodaClassroomProfileData={SCOPED_KEYS:SCOPED};const scoped=create({window:win});
 scoped.claim(profileA);scoped.storage.musicArcadeV1='studentA';
 const other=tab(native);assert.equal(other.win.localStorage.musicArcadeV1,null);
});

test('an old tab remains isolated after the new owner restores guest work and releases',()=>{
 const native=memory(),a=tab(native);a.workspace.claim(profileA);a.win.localStorage.musicArcadeV1='studentA';
 const b=tab(native);b.workspace.claim(profileB);b.win.localStorage.musicArcadeV1='studentB';
 b.win.localStorage.musicArcadeV1='restored guest';assert.equal(b.workspace.release(),true);
 assert.equal(a.workspace.getState().blocked,true);assert.equal(a.win.localStorage.musicArcadeV1,'studentA');
 a.win.localStorage.codaPlayerProgressV1='late XP';assert.equal(native.getItem('codaPlayerProgressV1'),null);
 const fresh=tab(native);assert.equal(fresh.workspace.getState().mode,'guest');assert.equal(fresh.win.localStorage.musicArcadeV1,'restored guest');
});

test('reload preserves this browsing context while cloned session storage does not adopt it',()=>{
 const native=memory(),a=tab(native),marker=a.workspace.claim(profileA);a.win.localStorage.musicArcadeV1='studentA';
 const reloaded=tab(native,a.sessions,a.win.name);
 assert.equal(reloaded.workspace.tabId,a.workspace.tabId);assert.equal(reloaded.workspace.owns(marker),true);assert.equal(reloaded.win.localStorage.musicArcadeV1,'studentA');
 const copiedSessions=memory(a.sessions.dump()),other=tab(native,copiedSessions,'');
 assert.notEqual(other.workspace.tabId,a.workspace.tabId);assert.equal(other.workspace.getState().blocked,true);assert.equal(other.win.localStorage.musicArcadeV1,null);
 assert.equal(native.getItem('musicArcadeV1'),'studentA');
});

test('blocked clear preserves the active owner marker and private saves',()=>{
 const native=memory({camera:'2'}),a=tab(native);const marker=a.workspace.claim(profileA);a.win.localStorage.musicArcadeV1='studentA';
 const b=tab(native);b.win.localStorage.musicArcadeV1='isolated scratch';b.win.localStorage.clear();
 assert.equal(a.workspace.owns(marker),true);assert.equal(native.getItem('musicArcadeV1'),'studentA');
 assert.equal(b.win.localStorage.musicArcadeV1,null);assert.equal(native.getItem('camera'),null);
});

test('corrupted or unreadable ownership metadata fails closed instead of exposing cached student work',()=>{
 for(const broken of ['not-json','null','{}']){
  const native=memory({[WORKSPACE_KEY]:broken,musicArcadeV1:'private student'}),fresh=tab(native);
  assert.equal(fresh.workspace.getState().blocked,true);assert.equal(fresh.win.localStorage.musicArcadeV1,null);
  fresh.win.localStorage.musicArcadeV1='scratch';assert.equal(native.getItem('musicArcadeV1'),'private student');
 }
 const native=memory({musicArcadeV1:'private student'}),sessions=memory({[ACTIVE_KEY]:'not-json'}),fresh=tab(native,sessions);
 assert.equal(fresh.workspace.getState().blocked,true);assert.equal(fresh.win.localStorage.musicArcadeV1,null);
});

test('claim failures restore the old tab marker without erasing another owner',()=>{
 const native=memory(),a=tab(native);const before=a.sessions.getItem(ACTIVE_KEY),set=native.setItem;
 native.setItem=(key,value)=>{if(key===WORKSPACE_KEY)throw Error('quota');return set(key,value);};
 assert.throws(()=>a.workspace.claim(profileA),/quota/);assert.equal(a.sessions.getItem(ACTIVE_KEY),before);assert.equal(native.getItem(WORKSPACE_KEY),null);
});

test('withLock delegates claim and apply as one browser lock operation',async()=>{
 const native=memory(),a=tab(native),calls=[];
 a.win.navigator={locks:{request:async(name,options,fn)=>{calls.push({name,options});return fn();}}};
 const marker=await a.workspace.withLock(()=>{const marker=a.workspace.claim(profileA);a.workspace.guardedStorage(marker).setItem('musicArcadeV1','studentA');return marker;});
 assert.equal(calls.length,1);assert.equal(calls[0].options.mode,'exclusive');assert.equal(a.workspace.owns(marker),true);
});

test('disposed ownership handles fail closed and no late callback gets native student data',()=>{
 const native=memory(),a=tab(native),marker=a.workspace.claim(profileA),guard=a.workspace.guardedStorage(marker);
 a.win.localStorage.musicArcadeV1='studentA';a.workspace.destroy();
 assert.throws(()=>guard.getItem('musicArcadeV1'),{code:'classroom/workspace-lost'});
 const b=tab(native);b.workspace.claim(profileB);b.win.localStorage.musicArcadeV1='studentB';
 assert.equal(a.win.localStorage.musicArcadeV1,'studentA');a.win.localStorage.musicArcadeV1='late';assert.equal(native.getItem('musicArcadeV1'),'studentB');
 assert.ok(a.sessions.getItem(TAB_KEY));
});
