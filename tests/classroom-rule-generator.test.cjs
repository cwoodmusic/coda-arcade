const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {SCHEMA}=require('../classroom-profile-data.js');
const {arrayIndexRegex,convertSchema,buildClassroomRules,renderClassroomRules}=require('../tools/build-classroom-rules.cjs');

test('array index caps accept exactly canonical decimal keys up to maxItems-1',()=>{
 for(const limit of [1,2,4,9,10,16,40,256,4096,5000,20000]){
  const regex=new RegExp(arrayIndexRegex(limit));
  for(let index=0;index<limit;index++)assert.equal(regex.test(String(index)),true,limit+':'+index);
  for(const invalid of [String(limit),String(limit+1),String(limit*10),'00','01','-1','1.0','1e0','name','', ' 0'])
   assert.equal(regex.test(invalid),false,limit+':'+invalid);
 }
 for(const invalid of [0,-1,1.5,Infinity,1000001])assert.throws(()=>arrayIndexRegex(invalid));
});

test('string enums stay exact literals and slash meters produce valid regex literals',()=>{
 const values=['4/4','6/8','2/2','a.b','a+b','(x)','[y]','a\\b'];
 const expression=convertSchema({type:'string',enum:values})['.validate'];
 const source=expression.match(/\.matches\((\/.+\/)\)/)[1];
 const regex=Function('return '+source)();
 for(const value of values)assert.equal(regex.test(value),true,value);
 for(const value of ['4x4','4/4 extra','axb','aaaab','x','y'])assert.equal(regex.test(value),false,value);
 assert.match(convertSchema({type:'boolean',enum:[true]})['.validate'],/isBoolean/);
 assert.throws(()=>convertSchema({type:'string',enum:[true]}),/declared scalar type/);
});

test('canonical schema closes every object and caps every array without unsupported snapshot APIs',()=>{
 const converted=convertSchema(SCHEMA);let arrays=0,objects=0;
 function visit(schema,rules){
  if(schema.type==='object'){
   objects++;assert.deepEqual(rules.$other,{'.validate':false});
   assert.deepEqual(Object.keys(rules).filter(key=>!key.startsWith('.')&&!key.startsWith('$')).sort(),Object.keys(schema.properties).sort());
   for(const [key,child]of Object.entries(schema.properties))visit(child,rules[key]);
  }else if(schema.type==='array'){
   arrays++;const wildcard=Object.keys(rules).find(key=>key.startsWith('$'));
   assert.match(rules[wildcard]['.validate'],new RegExp('\\'+wildcard+'\\.matches'));
   assert.ok(rules[wildcard]['.validate'].includes(arrayIndexRegex(schema.maxItems)));
   visit(schema.items,rules[wildcard]);
  }
 }
 visit(SCHEMA,converted);assert.ok(arrays>10);assert.ok(objects>20);
 assert.doesNotMatch(JSON.stringify(converted),/numChildren|\.size\(|isObject/);
 assert.throws(()=>convertSchema({type:'object',properties:{},additionalProperties:true}),/close additionalProperties/);
 assert.throws(()=>convertSchema({type:'string'}),/bounded maxLength/);
});

test('generated artifact is deterministic and contains only the private namespace',()=>{
 const rules=buildClassroomRules(SCHEMA),space=rules.rules.classroomV1;
 assert.deepEqual(Object.keys(rules),['rules']);assert.deepEqual(Object.keys(rules.rules),['classroomV1']);
 assert.equal(space['.read'],false);assert.equal(space['.write'],false);
 assert.equal(space.admins['.read'],false);assert.equal(space.admins['.write'],false);
 assert.equal(space.admins.$uid['.write'],false);assert.equal(space.passes['.read'],false);
 assert.match(space.sessions['.read'],/sign_in_provider === "google\.com"/);
 assert.match(space.sessions['.read'],/classroomV1\/admins/);
 assert.deepEqual(space.sessions['.indexOn'],['classId']);
 assert.match(space.directory['.read'],/sign_in_provider === "google\.com"/);
 assert.match(space.directory['.write'],/classroomV1\/admins/);
 const entry=space.directory.$classId.profiles.$profileId;
 assert.deepEqual(Object.keys(entry).filter(key=>!key.startsWith('.')&&!key.startsWith('$')).sort(),['alias','picture']);
 assert.deepEqual(entry.$other,{'.validate':false});
 const meta=space.classes.$classId.profiles.$profileId.meta;
 assert.ok(meta['.validate'].includes('"picture"'));
 const picture=Function('return '+meta.picture['.validate'].match(/\.matches\((\/.+\/)\)/)[1])();
 for(const value of ['cat','fox','frog','owl','otter','penguin','rabbit','turtle'])assert.equal(picture.test(value),true);
 for(const value of ['dog','https://avatar.example/image','Alice Smith',''])assert.equal(picture.test(value),false);
 assert.deepEqual(space.$other,{'.validate':false});
 assert.equal(renderClassroomRules(SCHEMA),fs.readFileSync(path.join(__dirname,'../classroom-database.rules.json'),'utf8'));
});

test('teacher players are closed exact-owner Google records using the same canonical progress schema',()=>{
 const space=buildClassroomRules(SCHEMA).rules.classroomV1,players=space.teacherPlayers,owner=players.$uid;
 assert.equal(players['.read'],false);assert.equal(players['.write'],false);
 for(const expression of [owner['.read'],owner['.write'],owner.meta['.write'],owner.state['.write']]){
  assert.match(expression,/auth\.uid === \$uid/);
  assert.match(expression,/sign_in_provider === "google\.com"/);
  assert.match(expression,/classroomV1\/admins/);
 }
 assert.match(owner['.write'],/!data\.exists\(\)/);assert.match(owner['.write'],/newData\.exists\(\)/);
 assert.deepEqual(owner.$other,{'.validate':false});assert.deepEqual(owner.meta.$other,{'.validate':false});assert.deepEqual(owner.state.$other,{'.validate':false});
 assert.deepEqual(Object.keys(owner.meta).filter(key=>!key.startsWith('.')&&!key.startsWith('$')).sort(),['alias','createdAt','picture']);
 assert.match(owner.meta.alias['.validate'],/length <= 40/);
 assert.match(owner.meta.createdAt['.validate'],/newData\.val\(\) === data\.val\(\)/);
 assert.deepEqual(owner.state.data,convertSchema(SCHEMA));
 assert.deepEqual(owner.state.data,space.classes.$classId.profiles.$profileId.state.data);
 assert.match(owner.state['.validate'],/data\.child\("revision"\)\.val\(\) \+ 1/);
 assert.match(owner.state['.validate'],/newData\.child\("revision"\)\.val\(\) === 1/);
});

test('additional quest targets change only the student and teacher mission validation subtrees',()=>{
 const legacyIds=['bach-triad-win','mozart-triad-capture','beethoven-pitch-win','clara-pitch-streak','joplin-rhythm-streak','ellington-rhythm-streak','ella-rhythm-perfect','nina-pitch-notes','miles-triad-comeback'];
 const legacySchema=JSON.parse(JSON.stringify(SCHEMA)),mission=legacySchema.properties.missions.properties.missions;
 mission.properties=Object.fromEntries(legacyIds.map(id=>[id,mission.properties[id]]));
 const before=buildClassroomRules(legacySchema),after=buildClassroomRules(SCHEMA);
 function takeMissions(rules){
  const space=rules.rules.classroomV1,teacher=space.teacherPlayers.$uid.state.data.missions,student=space.classes.$classId.profiles.$profileId.state.data.missions;
  const values=[teacher.missions,student.missions];delete teacher.missions;delete student.missions;return values;
 }
 const previous=takeMissions(before),expanded=takeMissions(after);
 assert.deepEqual(after,before,'All roles, profile boundaries, revision checks, leases, and unrelated data fields stay unchanged');
 assert.deepEqual(expanded[0],expanded[1],'Both identities validate the same exact quest data');
 for(const rules of expanded){
  const keys=Object.keys(rules).filter(key=>!key.startsWith('.')&&!key.startsWith('$'));
  assert.equal(keys.length,29);assert.equal(keys.length-legacyIds.length,20);
  assert.deepEqual(rules.$other,{'.validate':false});
  for(const id of legacyIds)assert.deepEqual(rules[id],previous[0][id],id+' retains its original contract');
 }
});
