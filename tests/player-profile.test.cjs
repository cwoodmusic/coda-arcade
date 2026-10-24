const test=require('node:test'),assert=require('node:assert/strict');
const profile=require('../player-profile.js'),catalog=require('../player-progression.js'),missions=require('../musician-missions.js');
test('profile shows the exact next level, XP remaining and real next prizes',()=>{
 const source={avatar:{name:'Melody',headwear:'witch'},progression:{xp:130,level:2},notes:{balance:74}},before=JSON.stringify(source);
 const view=profile.profileModel(source,catalog);
 assert.equal(view.name,'Melody');assert.equal(view.level,2);assert.equal(view.nextLevel,3);assert.equal(view.xpToNext,50);assert.equal(view.levelXP,50);assert.equal(view.levelSize,100);assert.equal(view.progress,.5);
 assert.deepEqual(view.nextPrizes,[{id:'beret',label:'Artist beret',kind:'cosmetic'},{id:11,label:'Neon Marimba',kind:'sound'}]);assert.equal(view.notes,74);
 assert.equal(JSON.stringify(source),before);view.avatar.headwear='none';assert.equal(source.avatar.headwear,'witch','Profile snapshots must not change equipment');
});
test('exact level thresholds and maximum level never invent a further prize',()=>{
 for(const [index,xp] of catalog.THRESHOLDS.entries()){
  const view=profile.profileModel({progression:{xp}},catalog);assert.equal(view.level,index+1);
  if(index<catalog.THRESHOLDS.length-1){assert.equal(view.xpToNext,catalog.THRESHOLDS[index+1]-xp);assert.equal(view.progress,0);assert.ok(view.nextPrizes.length);}
  else{assert.equal(view.atMax,true);assert.equal(view.nextLevel,null);assert.equal(view.xpToNext,0);assert.equal(view.progress,1);assert.deepEqual(view.nextPrizes,[]);}
 }
 const beyond=profile.profileModel({progression:{xp:9000}},catalog);assert.equal(beyond.level,12);assert.equal(beyond.atMax,true);
});
test('active and pending-reward missions retain actual goals, progress and rewards',()=>{
 const snapshot={missions:missions.DEFINITIONS.map((mission,index)=>({...mission,status:['active','complete','rewarded','available'][index%4],progress:index===0?999:1}))};
 const view=profile.profileModel({missions:snapshot},catalog);
 assert.equal(view.activeMissions.length,5);assert.equal(view.completedMissions.length,2);assert.equal(view.availableMissions.length,2);
 assert.equal(view.activeMissions[0].progress,1);assert.equal(view.activeMissions[0].reward,90);assert.equal(view.activeMissions[0].gameName,'Music Triad');assert.equal(view.activeMissions[1].status,'complete');
 assert.equal(snapshot.missions[0].progress,999,'Display clamping must not alter saved mission data');
});
test('new or malformed profile data stays readable without making up progress',()=>{
 const fresh=profile.profileModel({},catalog);assert.equal(fresh.name,'Guest');assert.equal(fresh.level,1);assert.equal(fresh.xpToNext,80);assert.equal(fresh.notes,0);assert.deepEqual(fresh.activeMissions,[]);
 const broken=profile.profileModel({avatar:{name:42},progression:{xp:NaN},notes:{balance:-1},missions:{missions:[null,{status:'unknown'}]}},catalog);
 assert.equal(broken.level,1);assert.equal(broken.xp,0);assert.equal(broken.notes,0);assert.deepEqual(broken.activeMissions,[]);
});
test('tutorial state and recent XP are copied for display without consuming rewards',()=>{
 const progress={version:1,completed:['note-naming'],lessons:[{id:'note-naming',title:'Note naming',step:4,total:4,completed:true},{id:'rhythm-tree',title:'The rhythm tree',step:1,total:5,completed:false}]};
 const view=profile.profileModel({tutorials:progress,progression:{xp:50,recent:[{id:'achievement:lesson',xp:50,reason:'Note naming lesson'}]}},catalog);
 assert.deepEqual(view.tutorials,progress);assert.equal(view.recent[0].reason,'Note naming lesson');view.tutorials.completed.push('rhythm-tree');assert.deepEqual(progress.completed,['note-naming']);
});
