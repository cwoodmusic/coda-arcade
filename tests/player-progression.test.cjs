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

test('award announcements happen only after a new saved award, never on reload or retry',()=>{
 const saved=storage(),announced=[],player=progression.create({storage:saved,onAward:award=>announced.push(award)});
 player.recordAchievement('first-triad-result');
 assert.equal(announced.length,1);assert.equal(announced[0].id,'achievement:first-triad-result');
 assert.equal(announced[0].amount,50);assert.equal(announced[0].levelBefore,1);
 assert.equal(progression.create({storage:saved,onAward:award=>announced.push(award)}).getState().xp,50);
 player.recordAchievement('first-triad-result');assert.equal(announced.length,1);
 const blocked=progression.create({storage:{getItem:()=>null,setItem(){throw Error('quota');}},onAward:award=>announced.push(award)});
 blocked.recordAchievement('failed');assert.equal(announced.length,1);
});

test('all reward identifiers correspond to actual character catalog and sound voices',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),sandbox={window:{}};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../character-renderer.js'),'utf8'),sandbox);
 const renderer=sandbox.window.createCodaCharacterRenderer(),ids=new Set(Object.values(renderer.catalog).flatMap(items=>items.map(item=>item.id)));
 for(const item of progression.COSMETICS)assert.ok(ids.has(item.id),item.id);
 const voices=require('../song-machine/sound-library.js');
 assert.deepEqual(progression.SOUNDS.map(item=>[item.id,item.level]),voices.EXTRA.map(item=>[item.id,item.level]));
});


test('mastery companions unlock from saved achievements without purchases or auto-equipping',()=>{
 const disk=storage(),player=progression.create({storage:disk});
 assert.equal(player.unlocked('rhythmfox'),false);assert.equal(player.recordRhythmStreak(99).ok,false);
 assert.equal(player.recordRhythmStreak(100).ok,true);assert.equal(player.unlocked('rhythmfox'),true);
 assert.equal(player.recordRhythmStreak(100).alreadyAwarded,true);
 player.recordAchievement('fishing-all-species');assert.equal(player.unlocked('lakeotter'),true);
 assert.equal(progression.create({storage:disk}).unlocked('lakeotter'),true);
 assert.match(player.requirement('lakeotter'),/30 fish/);
});

test('Piano memory mastery needs all nine saved melodies and deduplicates its bonus',()=>{
 const disk=storage(),player=progression.create({storage:disk});
 for(const id of progression.PIANO_MEMORIES.slice(0,-1))player.recordPianoMemory(id);
 assert.equal(player.unlocked('pianophoenix'),false);assert.equal(player.recordPianoMemory('invented').ok,false);
 const loaded=progression.create({storage:disk});loaded.recordPianoMemory(progression.PIANO_MEMORIES.at(-1));
 assert.equal(loaded.unlocked('pianophoenix'),true);const xp=loaded.getState().xp;
 assert.equal(loaded.recordPianoMemory('twinkle').alreadyAwarded,true);assert.equal(loaded.getState().xp,xp);
 assert.equal(loaded.getState().achievementRewards.filter(item=>item.id==='pianophoenix').length,1);
});

test('Hard Advanced Triad mastery requires explicit difficulty, rule mode, and a win',()=>{
 const player=progression.create({storage:storage()}),result={mode:'computer',captures:5,score:10,won:true};
 for(const [id,extra]of [['missing',{}],['hard-only',{difficulty:'hard'}],['advanced-only',{rules:'advanced'}],['lost',{rules:'advanced',difficulty:'hard',won:false}]]){
  assert.equal(player.recordGameEvent('triad',id,{...result,...extra}).ok,true);assert.equal(player.unlocked('triadchampion'),false);
 }
 assert.equal(player.recordGameEvent('triad','winner',{...result,mode:'advanced',difficulty:'hard'}).ok,true);
 assert.equal(player.unlocked('triadchampion'),true);
});

test('Pitch Race Level milestones preserve the highest completed level and require reported evidence',()=>{
 const disk=storage(),player=progression.create({storage:disk}),run={...pitch,mode:'levels',won:false,completedLevel:30};
 player.recordGameEvent('pitch','thirty',run);
 assert.equal(player.getState().bestPitchLevel,30);
 for(const id of ['pitchlaurel10','pitchlaurel20','pitchlaurel30'])assert.equal(player.unlocked(id),true);
 assert.equal(player.unlocked('pitchcrown40'),false);assert.equal(player.unlocked('starlight'),false);
 player.recordGameEvent('pitch','lower',{...run,completedLevel:10});assert.equal(player.getState().bestPitchLevel,30);
 player.recordGameEvent('pitch','unwon-current',{...pitch,mode:'levels',won:false,level:50});assert.equal(player.getState().bestPitchLevel,30);
 player.recordGameEvent('pitch','classic',{...pitch,mode:'classic',completedLevel:50});assert.equal(player.getState().bestPitchLevel,30);
 player.recordGameEvent('pitch','fifty',{...pitch,mode:'levels',level:50,won:true});
 assert.equal(player.getState().bestPitchLevel,50);assert.equal(player.unlocked('pitchcrown40'),true);assert.equal(player.unlocked('starlight'),true);
 assert.equal(progression.create({storage:disk}).getState().bestPitchLevel,50);
});
