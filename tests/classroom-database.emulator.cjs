/* Real Firebase rules tests. Run tools/test-classroom-rules.cjs; never live. */
'use strict';
const {test,before,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const {mergeClassroomRules}=require('../tools/classroom-rules-merge.cjs');
const DTO=require('../classroom-profile-data.js');

const endpoint=process.env.FIREBASE_DATABASE_EMULATOR_HOST||'';
if(!/^127\.0\.0\.1:[1-9][0-9]{1,4}$/.test(endpoint))throw Error('Refusing to run: FIREBASE_DATABASE_EMULATOR_HOST must explicitly name a loopback emulator.');
const port=Number(endpoint.split(':')[1]);if(port>65535)throw Error('Invalid emulator port.');
const requireTool=createRequire(path.join(process.env.CODA_FIREBASE_TEST_TOOLS||'/tmp/coda-classroom-emulator','package.json'));
const {initializeTestEnvironment,assertSucceeds,assertFails}=requireTool('@firebase/rules-unit-testing');

const ROOT='classroomV1',CLASS='classroom_0001',OTHER_CLASS='classroom_0002',PROFILE='profile_0001',OTHER_PROFILE='profile_0002';
// Test-only fixed credentials, unrelated to any deployed project or real card.
const HASH='a'.repeat(64),OTHER_HASH='b'.repeat(64),NEW_HASH='c'.repeat(64);
const PROFILE_PATH=`${ROOT}/classes/${CLASS}/profiles/${PROFILE}`,OTHER_PATH=`${ROOT}/classes/${OTHER_CLASS}/profiles/${OTHER_PROFILE}`;
const clone=value=>JSON.parse(JSON.stringify(value));
const stamp=()=>Date.now();
const state=(revision=2,data=DTO.blank())=>({schemaVersion:1,revision,updatedAt:stamp(),data});
const binding=(classId=CLASS,profileId=PROFILE,passHash=HASH)=>({classId,profileId,passHash,createdAt:stamp()});
let env;
const anonymous=uid=>env.authenticatedContext(uid,{firebase:{sign_in_provider:'anonymous'}}).database();
const google=uid=>env.authenticatedContext(uid,{firebase:{sign_in_provider:'google.com'}}).database();
const staff=()=>google('school_admin');
const ref=(database,location)=>database.ref(location);
const read=(database,location)=>ref(database,location).get();
const write=(database,location,value)=>ref(database,location).set(value);
const remove=(database,location)=>ref(database,location).remove();

before(async()=>{
 const fragment=JSON.parse(fs.readFileSync(path.join(__dirname,'../classroom-database.rules.json'),'utf8'));
 const rules=mergeClassroomRules({rules:{'.read':false,'.write':false,existingScores:{'.read':true,'.write':false}}},fragment);
 env=await initializeTestEnvironment({projectId:'demo-coda-classroom-rules',database:{host:'127.0.0.1',port,rules:JSON.stringify(rules)}});
});
beforeEach(async()=>{
 const now=stamp(),seed={existingScores:{top:{alias:'COD',score:123}},[ROOT]:{
  admins:{school_admin:true,password_admin:true},
  directory:{
   [CLASS]:{meta:{ownerUid:'school_admin',label:'Blue group',createdAt:now},profiles:{[PROFILE]:{alias:'Blue Otter 27',picture:'otter'}}},
   [OTHER_CLASS]:{meta:{ownerUid:'school_admin',label:'Green group',createdAt:now},profiles:{[OTHER_PROFILE]:{alias:'Green Fox 8',picture:'fox'}}}
  },
  classes:{
   [CLASS]:{meta:{ownerUid:'school_admin',label:'Blue group',createdAt:now},profiles:{[PROFILE]:{meta:{alias:'Blue Otter 27',picture:'otter',createdAt:now,passHash:HASH},state:state(1),lease:{uid:'student_one',expiresAt:now+60000}}}},
   [OTHER_CLASS]:{meta:{ownerUid:'school_admin',label:'Green group',createdAt:now},profiles:{[OTHER_PROFILE]:{meta:{alias:'Green Fox 8',picture:'fox',createdAt:now,passHash:OTHER_HASH},state:state(1)}}}
  },
  passes:{[HASH]:{classId:CLASS,profileId:PROFILE,createdAt:now},[OTHER_HASH]:{classId:OTHER_CLASS,profileId:OTHER_PROFILE,createdAt:now}},
  sessions:{student_one:binding(),student_two:binding(OTHER_CLASS,OTHER_PROFILE,OTHER_HASH),second_device:binding()}
 }};
 await env.clearDatabase();await env.withSecurityRulesDisabled(context=>write(context.database(),'/',seed));
});
after(async()=>{if(env)await env.cleanup();});

test('logged-out users and parent listings cannot discover classroom data or pass mappings',async()=>{
 const guest=env.unauthenticatedContext().database(),student=anonymous('new_device');
 for(const location of [ROOT,`${ROOT}/classes`,`${ROOT}/passes`,`${ROOT}/sessions`,`${ROOT}/admins`,`${ROOT}/passes/${HASH}`,`${PROFILE_PATH}/state`])await assertFails(read(guest,location));
 for(const location of [ROOT,`${ROOT}/classes`,`${ROOT}/passes`,`${ROOT}/sessions`,`${ROOT}/admins`])await assertFails(read(student,location));
 await assertFails(ref(student,`${ROOT}/passes`).orderByKey().equalTo(HASH).get());
 const lookup=await assertSucceeds(read(student,`${ROOT}/passes/${HASH}`));assert.equal(lookup.val().profileId,PROFILE);
});

test('school administration requires both Google provider and the provisioned allowlist',async()=>{
 await assertSucceeds(read(staff(),`${ROOT}/classes`));
 const sessions=await assertSucceeds(ref(staff(),`${ROOT}/sessions`).orderByChild('classId').equalTo(CLASS).get());
 assert.deepEqual(Object.keys(sessions.val()).sort(),['second_device','student_one']);
 await assertFails(ref(anonymous('student_one'),`${ROOT}/sessions`).orderByChild('classId').equalTo(CLASS).get());
 const notStaff=google('ordinary_google'),anonymousAdmin=anonymous('school_admin');
 const passwordAdmin=env.authenticatedContext('password_admin',{firebase:{sign_in_provider:'password'}}).database();
 for(const database of [notStaff,anonymousAdmin,passwordAdmin]){
  await assertFails(read(database,`${ROOT}/classes`));
  await assertFails(write(database,`${ROOT}/classes/new_class_0001/meta`,{ownerUid:'ordinary_google',label:'Unauthorized',createdAt:stamp()}));
 }
 assert.equal((await assertSucceeds(read(staff(),`${ROOT}/admins/school_admin`))).val(),true);
 await assertFails(read(staff(),`${ROOT}/admins`));await assertFails(read(staff(),`${ROOT}/admins/password_admin`));
 for(const database of [staff(),notStaff,anonymousAdmin,passwordAdmin]){
  await assertFails(write(database,`${ROOT}/admins/ordinary_google`,true));
  await assertFails(remove(database,`${ROOT}/admins/school_admin`));
 }
});

test('the admin-only directory lists metadata without hashes or journals and rejects private or unknown fields',async()=>{
 const admin=staff(),roster=`${ROOT}/directory/${CLASS}/profiles/${PROFILE}`,metadata=`${ROOT}/directory/${CLASS}/meta`;
 const listed=(await assertSucceeds(read(admin,`${ROOT}/directory`))).val();
 assert.deepEqual(listed[CLASS].profiles[PROFILE],{alias:'Blue Otter 27',picture:'otter'});
 assert.equal(JSON.stringify(listed).includes('passHash'),false);assert.equal(JSON.stringify(listed).includes('wallet'),false);
 const password=env.authenticatedContext('password_admin',{firebase:{sign_in_provider:'password'}}).database();
 for(const database of [env.unauthenticatedContext().database(),anonymous('student_one'),google('ordinary_google'),password]){
  await assertFails(read(database,`${ROOT}/directory`));await assertFails(read(database,roster));
  await assertFails(write(database,`${roster}/alias`,'Changed Alias'));
 }
 for(const [target,value]of [[`${roster}/passHash`,HASH],[`${roster}/state`,state(1)],[`${roster}/email`,'child@example.invalid'],[`${metadata}/privateNote`,'No freeform notes'],[roster,{alias:'Blue Otter 27',picture:'dragon'}],[`${ROOT}/directory/${CLASS}/profiles`,'not a roster'],[`${ROOT}/directory`,'not a directory'],[`${ROOT}/classes`,'not a class map'],[`${ROOT}/classes/${CLASS}/profiles`,'not a profile map']])await assertFails(write(admin,target,value));
 await assertFails(write(admin,`${metadata}/ownerUid`,'ordinary_google'));
 const newProfile='profile_index_0003';await assertSucceeds(write(admin,`${ROOT}/directory/${CLASS}/profiles/${newProfile}`,{alias:'Orange Owl 42',picture:'owl'}));
 await assertSucceeds(remove(admin,`${ROOT}/directory/${CLASS}/profiles/${newProfile}`));
});

test('an anonymous session can bind only its own UID to an exact current pass mapping',async()=>{
 const student=anonymous('new_device');
 await assertFails(write(student,`${ROOT}/sessions/victim_uid`,binding()));
 await assertFails(write(student,`${ROOT}/sessions/new_device`,binding(CLASS,OTHER_PROFILE,HASH)));
 await assertFails(write(student,`${ROOT}/sessions/new_device`,binding(CLASS,PROFILE,OTHER_HASH)));
 await assertFails(write(student,`${ROOT}/sessions/new_device`,{...binding(),email:'child@example.invalid'}));
 await assertSucceeds(write(student,`${ROOT}/sessions/new_device`,binding()));
 await assertSucceeds(read(student,`${PROFILE_PATH}/meta`));await assertSucceeds(read(student,`${PROFILE_PATH}/state`));
 await assertFails(read(student,`${OTHER_PATH}/state`));await assertFails(read(student,`${ROOT}/sessions/student_one`));
 await assertSucceeds(write(student,`${ROOT}/sessions/new_device`,binding(OTHER_CLASS,OTHER_PROFILE,OTHER_HASH)));
 await assertSucceeds(read(student,`${OTHER_PATH}/state`));await assertFails(read(student,`${PROFILE_PATH}/state`));
 await assertSucceeds(remove(student,`${ROOT}/sessions/new_device`));
 await assertFails(write(google('ordinary_google'),`${ROOT}/sessions/ordinary_google`,binding()));
});

test('student profile saves require a matching current session, an unexpired lease, and exact revision CAS',async()=>{
 const owner=anonymous('student_one'),other=anonymous('student_two'),device=anonymous('second_device');
 await assertSucceeds(read(owner,`${PROFILE_PATH}/state`));
 await assertFails(write(other,`${PROFILE_PATH}/state`,state()));
 await assertFails(write(device,`${PROFILE_PATH}/state`,state()));
 await assertFails(write(owner,`${PROFILE_PATH}/state`,state(1)));
 await assertFails(write(owner,`${PROFILE_PATH}/state`,state(3)));
 await assertSucceeds(write(owner,`${PROFILE_PATH}/state`,state(2)));
 await assertFails(write(owner,`${PROFILE_PATH}/state`,state(2)));
 await assertSucceeds(write(owner,`${PROFILE_PATH}/state`,state(3)));
 await assertFails(remove(owner,`${PROFILE_PATH}/state`));
 await assertFails(write(owner,`${PROFILE_PATH}/state/data/wallet/balance`,900));
});

test('initial state revision starts at one and a missing session never grants a lease or state',async()=>{
 await assertSucceeds(remove(staff(),`${PROFILE_PATH}/state`));
 const owner=anonymous('student_one');
 await assertFails(write(owner,`${PROFILE_PATH}/state`,state(0)));
 await assertFails(write(owner,`${PROFILE_PATH}/state`,state(2)));
 await assertSucceeds(write(owner,`${PROFILE_PATH}/state`,state(1)));
 const unknown=anonymous('unknown_device');
 await assertFails(read(unknown,`${PROFILE_PATH}/state`));
 await assertFails(write(unknown,`${PROFILE_PATH}/lease`,{uid:'unknown_device',expiresAt:stamp()+60000}));
});

test('lease takeover displaces the old writer, has a bounded expiry, and cannot be assigned to another UID',async()=>{
 const owner=anonymous('student_one'),device=anonymous('second_device');
 await assertFails(write(device,`${PROFILE_PATH}/lease`,{uid:'student_one',expiresAt:stamp()+60000}));
 await assertFails(write(device,`${PROFILE_PATH}/lease`,{uid:'second_device',expiresAt:stamp()+120000}));
 await assertFails(write(device,`${PROFILE_PATH}/lease`,{uid:'second_device',expiresAt:stamp()-1000}));
 await assertFails(write(device,`${PROFILE_PATH}/lease`,{uid:'second_device',expiresAt:stamp()+60000,name:'No identity fields'}));
 await assertSucceeds(write(device,`${PROFILE_PATH}/lease`,{uid:'second_device',expiresAt:stamp()+60000}));
 await assertFails(write(owner,`${PROFILE_PATH}/state`,state()));
 await assertFails(remove(owner,`${PROFILE_PATH}/lease`));
 await assertSucceeds(write(device,`${PROFILE_PATH}/state`,state()));
 await assertSucceeds(remove(device,`${PROFILE_PATH}/lease`));
 await assertFails(write(device,`${PROFILE_PATH}/state`,state(3)));
 await env.withSecurityRulesDisabled(context=>write(context.database(),`${PROFILE_PATH}/lease`,{uid:'second_device',expiresAt:stamp()-1000}));
 await assertFails(write(device,`${PROFILE_PATH}/state`,state(3)));
});

test('student lease release requires an existing own lease and current pass-bound membership',async()=>{
 const owner=anonymous('student_one'),sameProfile=anonymous('second_device'),otherProfile=anonymous('student_two');
 for(const database of [sameProfile,otherProfile,anonymous('unknown_device')])await assertFails(remove(database,`${PROFILE_PATH}/lease`));
 assert.equal((await read(staff(),`${PROFILE_PATH}/lease`)).val().uid,'student_one');
 await assertSucceeds(remove(owner,`${PROFILE_PATH}/lease`));
 assert.equal((await read(staff(),`${PROFILE_PATH}/lease`)).exists(),false);
 await assertFails(remove(owner,`${PROFILE_PATH}/lease`),'A missing lease is not an owned lease');
 await assertSucceeds(write(owner,`${PROFILE_PATH}/lease`,{uid:'student_one',expiresAt:stamp()+60000}));
 await assertSucceeds(ref(staff(),ROOT).update({
  [`classes/${CLASS}/profiles/${PROFILE}/meta/passHash`]:NEW_HASH,
  [`passes/${HASH}`]:null,[`passes/${NEW_HASH}`]:{classId:CLASS,profileId:PROFILE,createdAt:stamp()}
 }));
 await assertFails(remove(owner,`${PROFILE_PATH}/lease`),'The same UID cannot release after its pass membership is revoked');
 assert.equal((await read(staff(),`${PROFILE_PATH}/lease`)).val().uid,'student_one');
 await assertSucceeds(write(owner,`${ROOT}/sessions/student_one`,binding(CLASS,PROFILE,NEW_HASH)));
 await assertSucceeds(remove(owner,`${PROFILE_PATH}/lease`));
});

test('atomic pass reissue keeps progress while immediately revoking every old device and lease',async()=>{
 const owner=anonymous('student_one'),device=anonymous('second_device'),admin=staff();
 await assertSucceeds(ref(admin,ROOT).update({
  [`classes/${CLASS}/profiles/${PROFILE}/meta/passHash`]:NEW_HASH,
  [`passes/${HASH}`]:null,
  [`passes/${NEW_HASH}`]:{classId:CLASS,profileId:PROFILE,createdAt:stamp()}
 }));
 for(const database of [owner,device]){
  await assertFails(read(database,`${PROFILE_PATH}/state`));
  await assertFails(write(database,`${PROFILE_PATH}/state`,state()));
  await assertFails(write(database,`${PROFILE_PATH}/lease`,{uid:database===owner?'student_one':'second_device',expiresAt:stamp()+60000}));
 }
 await assertFails(read(anonymous('fresh_device'),`${ROOT}/passes/${HASH}`));
 await assertFails(write(owner,`${ROOT}/sessions/student_one`,binding()));
 await assertSucceeds(write(owner,`${ROOT}/sessions/student_one`,binding(CLASS,PROFILE,NEW_HASH)));
 const restored=await assertSucceeds(read(owner,`${PROFILE_PATH}/state`));assert.equal(restored.val().revision,1);assert.equal(restored.val().data.wallet.balance,150);
 // Knowing the fresh pass restores the session; that device still needs a
 // deliberate, current lease before saving if another device took over.
 await assertSucceeds(write(owner,`${PROFILE_PATH}/lease`,{uid:'student_one',expiresAt:stamp()+60000}));
 await assertSucceeds(write(owner,`${PROFILE_PATH}/state`,state()));
});

test('students cannot edit identity, passes, class labels, other profiles, or unknown namespace fields',async()=>{
 const student=anonymous('student_one');
 for(const [location,value]of [
  [`${PROFILE_PATH}/meta/alias`,'Changed alias'],[`${PROFILE_PATH}/meta/passHash`,NEW_HASH],
  [`${ROOT}/classes/${CLASS}/meta/label`,'Changed class'],[`${ROOT}/passes/${NEW_HASH}`,{classId:CLASS,profileId:PROFILE,createdAt:stamp()}],
  [`${ROOT}/unexpected`,true],[`${OTHER_PATH}/state`,state()]
 ])await assertFails(write(student,location,value));
 await assertFails(remove(student,`${ROOT}/classes/${CLASS}`));
});

test('the state envelope and DTO reject unknown/private fields, wrong types, and out-of-range values',async()=>{
 const student=anonymous('student_one');
 const invalid=[
  {...state(),email:'child@example.invalid'}, {...state(),schemaVersion:2}, {...state(),revision:2.5},
  {...state(),updatedAt:stamp()+120000},
 ];
 const mutate=action=>{const value=state();action(value.data);invalid.push(value);};
 mutate(data=>{data.name='Child real name';});mutate(data=>{data.avatar.name='Child real name';});
 mutate(data=>{data.avatar.form='unknown-form';});mutate(data=>{data.avatar.skin='not-a-color';});
 mutate(data=>{data.wallet.balance=-1;});mutate(data=>{data.wallet.balance=1000001;});
 mutate(data=>{data.progression.xp='100';});mutate(data=>{data.pitch.bestCompleted=1000;});
 mutate(data=>{data.piano.learned=['unlisted-melody'];});mutate(data=>{data.lessons.lessons['time-signatures'].step=9;});
 mutate(data=>{data.quizzes.quizzes['note-naming'].answers=[3];});mutate(data=>{data.songs={version:1,items:[]};});
 for(const [index,value]of invalid.entries())await assertFails(write(student,`${PROFILE_PATH}/state`,value),`Invalid DTO case ${index}`);
 await assertSucceeds(write(student,`${PROFILE_PATH}/state`,state()));
});

test('bounded numeric array keys prevent oversized collections and arbitrary text maps',async()=>{
 const student=anonymous('student_one');
 for(const [slot,field,index,item]of [
  ['wallet','owned',256,'witch'],['wallet','rewards',4096,'game:triad:test'],
  ['progression','events',20000,{id:'game:triad:test',xp:10}],
  ['avatar','visited',4,0],['piano','learned',9,'twinkle']
 ]){
  const value=state();value.data[slot][field]={'0':item,[String(index)]:item};
  await assertFails(write(student,`${PROFILE_PATH}/state`,value));
 }
 const malicious=state();malicious.data.wallet.rewards={studentEmail:'child@example.invalid'};await assertFails(write(student,`${PROFILE_PATH}/state`,malicious));
});

test('school admins can atomically create/reissue/delete valid profiles but metadata remains closed',async()=>{
 const admin=staff(),newClass='classroom_0003',newProfile='profile_0003',now=stamp(),newHash='d'.repeat(64);
 await assertSucceeds(ref(admin,ROOT).update({
  [`directory/${newClass}/meta`]:{ownerUid:'school_admin',label:'Purple group',createdAt:now},
  [`directory/${newClass}/profiles/${newProfile}`]:{alias:'Purple Owl 4',picture:'owl'},
  [`classes/${newClass}/meta`]:{ownerUid:'school_admin',label:'Purple group',createdAt:now},
  [`classes/${newClass}/profiles/${newProfile}/meta`]:{alias:'Purple Owl 4',picture:'owl',createdAt:now,passHash:newHash},
  [`classes/${newClass}/profiles/${newProfile}/state`]:state(1),
  [`passes/${newHash}`]:{classId:newClass,profileId:newProfile,createdAt:now}
 }));
 await assertSucceeds(read(admin,`${ROOT}/classes/${newClass}`));
 await assertFails(write(admin,`${ROOT}/classes/${CLASS}/meta/ownerUid`,'ordinary_google'));
 await assertFails(write(admin,`${PROFILE_PATH}/meta/email`,'child@example.invalid'));
 await assertFails(write(admin,`${PROFILE_PATH}/meta/alias`,'A'.repeat(33)));
 await assertFails(write(admin,`${PROFILE_PATH}/meta/picture`,'dragon'));
 await assertFails(write(admin,`${ROOT}/passes/${'E'.repeat(64)}`,{classId:CLASS,profileId:PROFILE,createdAt:now}));
 await assertFails(write(admin,`${ROOT}/passes/${newHash}/privateNote`,'No extra fields'));
 await assertSucceeds(ref(admin,ROOT).update({[`directory/${newClass}`]:null,[`classes/${newClass}`]:null,[`passes/${newHash}`]:null}));
 await assertFails(read(anonymous('new_device'),`${ROOT}/passes/${newHash}`));
});

test('removing a class/profile or admin allowlist entry revokes access without changing unrelated rules',async()=>{
 const student=anonymous('student_one');await assertSucceeds(remove(staff(),PROFILE_PATH));
 await assertFails(read(student,`${PROFILE_PATH}/state`));await assertFails(write(student,`${PROFILE_PATH}/state`,state()));
 await env.withSecurityRulesDisabled(context=>remove(context.database(),`${ROOT}/admins/school_admin`));
 await assertFails(read(staff(),`${ROOT}/classes`));
 await assertFails(write(staff(),`${ROOT}/classes/another_class/meta`,{ownerUid:'school_admin',label:'Revoked',createdAt:stamp()}));
 assert.equal((await assertSucceeds(read(env.unauthenticatedContext().database(),'existingScores/top'))).val().score,123);
 await assertFails(write(student,'existingScores/top/score',900));
});
