const test=require('node:test');
const assert=require('node:assert/strict');
const progression=require('../player-progression.js');
function storage(){const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};}
const pitch={mode:'classic',score:20,correct:15,misses:0,streak:10,won:true,perfect:true};

test('verified game play, achievements and quests earn separately persisted XP',()=>{
 const saved=storage(),player=progression.create({storage:saved});
 assert.equal(player.getState().xp,0);assert.equal(player.getState().level,1);
 const run=player.recordGameEvent('pitch','run-1',pitch);
 assert.equal(run.ok,true);assert.equal(run.amount,270);assert.equal(run.level,3);
 assert.equal(player.recordGameEvent('pitch','run-1',pitch).alreadyAwarded,true);
 assert.equal(player.getState().xp,270);
 assert.equal(player.recordGameEvent('pitch','run-2',pitch).amount,70,'Only the new run earns again; achievements stay earned');
 assert.equal(player.recordQuest('bach-win',100).amount,100);
 assert.equal(player.recordQuest('bach-win',100).alreadyAwarded,true);
 assert.equal(progression.create({storage:saved}).getState().xp,440);
});

test('progression awards no XP from Notes balances, purchases, or malformed game results',()=>{
 const saved=storage();saved.setItem('codaNotesWalletV1',JSON.stringify({balance:999999,earned:999999,spent:1000}));
 const player=progression.create({storage:saved});assert.equal(player.getState().xp,0);
 for(const [game,result] of [['unknown',pitch],['pitch',{...pitch,correct:-1}],['pitch',{...pitch,streak:30}],['rhythm',{mode:'tap',total:5,hits:6,extra:0,early:0,late:0}]])assert.equal(player.recordGameEvent(game,'run',result).ok,false);
 assert.equal(player.getState().xp,0);
});

test('level cosmetics and bonus sounds unlock at exact experience thresholds',()=>{
 const player=progression.create({storage:storage()});
 assert.equal(player.unlocked('watchchain'),false);player.awardXP('quest:test',80,'Test quest');
 assert.equal(player.getState().level,2);assert.equal(player.unlocked('watchchain'),true);
 assert.deepEqual(player.getState().unlockedSounds,[10]);assert.equal(player.unlocked('astronaut'),false);
 assert.equal(progression.soundRequiredLevel(17),12);assert.equal(progression.soundRequiredLevel(9),1);
});

test('failed saving never grants unsaved levels, and journals refresh between callers',()=>{
 const blocked=progression.create({storage:{getItem:()=>null,setItem(){throw Error('quota');}}});
 assert.equal(blocked.awardXP('quest:a',100,'Quest').ok,false);assert.equal(blocked.getState().xp,0);
 const saved=storage(),a=progression.create({storage:saved}),b=progression.create({storage:saved});
 a.awardXP('achievement:first',50,'First');b.awardXP('quest:second',100,'Second');a.refresh();assert.equal(a.getState().xp,150);
 assert.equal(a.awardXP('quest:second',100,'Second').alreadyAwarded,true);
});

test('all reward identifiers correspond to actual character catalog and sound voices',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),sandbox={window:{}};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../character-renderer.js'),'utf8'),sandbox);
 const renderer=sandbox.window.createCodaCharacterRenderer(),ids=new Set(Object.values(renderer.catalog).flatMap(items=>items.map(item=>item.id)));
 for(const item of progression.COSMETICS)assert.ok(ids.has(item.id),item.id);
 const voices=require('../song-machine/sound-library.js');
 assert.deepEqual(progression.SOUNDS.map(item=>[item.id,item.level]),voices.EXTRA.map(item=>[item.id,item.level]));
});
