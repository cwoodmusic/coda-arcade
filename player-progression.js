/* Local progression records verified play, achievements and completed quests.
 * Currency purchases never award experience. */
(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;if(root)root.CodaPlayerProgression=value;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const KEY='codaPlayerProgressV1',MAX_EVENTS=20000;
 const levels=[0,80,180,320,500,720,980,1280,1630,2030,2480,2980,3600];
 for(let level=14;level<=50;level++)levels.push(levels.at(-1)+650+(level-14)*50);
 const THRESHOLDS=Object.freeze(levels);
 const milestoneNotes=Object.freeze({10:1000,20:1500,30:2500,40:4000,50:6000});
 const LEVEL_NOTES=Object.freeze([10,...Array.from({length:38},(_,index)=>index+13)].map(level=>{
  const amount=milestoneNotes[level]??Math.min(500,150+(level-13)*10);
  return Object.freeze({id:'level-prize:'+level,kind:'notes',label:amount+' Notes',level,amount});
 }));
 const VIBES=Object.freeze([
  {id:'glowstick',label:'Glowstick Vibe',level:20},
  {id:'spooky',label:'Spooky Vibe',level:30},
  {id:'aurora',label:'Aurora Vibe',level:40},
  {id:'festival',label:'Festival Vibe',level:50}
 ].map(item=>Object.freeze({...item,kind:'vibe'})));
 const COSMETICS=Object.freeze([
  {id:'watchchain',label:'Pocket watch chain',level:2},
  {id:'beret',label:'Artist beret',level:3},
  {id:'gold',label:'Gold shoes',level:4},
  {id:'steampunk',label:'Clockwork goggles',level:5},
  {id:'cape',label:'Hero cape',level:6},
  {id:'crown',label:'Crown',level:7},
  {id:'wings',label:'Angel wings',level:8},
  {id:'breakdance',label:'Breakdance emote',level:9},
  {id:'astronaut',label:'Space helmet',level:10},
  {id:'trophy',label:'Champion trophy',level:11},
  {id:'halo',label:'Neon halo',level:12},
  {id:'magicorb',label:'Magic orb',level:12}
 ].map(Object.freeze));
 const PIANO_MEMORIES=Object.freeze(['twinkle','mary','london-bridge','hot-cross-buns','row-your-boat','frere-jacques','ode-to-joy','jingle-bells','old-macdonald']);
 const ACHIEVEMENT_REWARDS=Object.freeze([
  {id:'rhythmfox',label:'Rhythm fox companion',achievement:'rhythm-hundred-streak',requirement:'Match 100 notes in a row in Rhythm Room.'},
  {id:'lakeotter',label:'Lake otter companion',achievement:'fishing-all-species',requirement:'Catch all 30 fish species.'},
  {id:'pianophoenix',label:'Piano phoenix companion',achievement:'piano-memory-master',requirement:'Complete all nine Piano Lab melodies from memory.'},
  {id:'triadchampion',label:'Triad champion crown',achievement:'triad-hard-advanced-win',requirement:'Win an Advanced Music Triad game on Hard.'},
  {id:'bassclefpin',label:'Bass clef pin',achievement:'pitch-bass-reader',requirement:'Read 10 bass-clef notes correctly in one Pitch Race run.'},
  {id:'basslaurel',label:'Bass reader laurel',achievement:'pitch-bass-streak',requirement:'Read 20 bass-clef notes in a row without a mistake in one Pitch Race run.'},
  {id:'grandstaffbadge',label:'Grand staff badge',achievement:'pitch-grand-reader',requirement:'Read 10 treble and 10 bass notes correctly in one Grand Staff run.'},
  {id:'grandstaffcrown',label:'Grand staff crown',achievement:'pitch-grand-perfect',requirement:'Read at least 20 notes, including both clefs, without a mistake in one Grand Staff run.'},
  ...[10,20,30,40,50].map(level=>({id:level===50?'starlight':level===40?'pitchcrown40':'pitchlaurel'+level,label:level===50?'Starlight transformation':level===40?'Radiant pitch crown':({10:'Bronze',20:'Silver',30:'Gold'}[level]+' pitch laurel'),achievement:'pitch-level-'+level,requirement:'Complete level '+level+' in Pitch Race Level mode.'}))
 ].map(Object.freeze));
 const requirement=id=>ACHIEVEMENT_REWARDS.find(item=>item.id===id)?.requirement||'';
 const reportedPitchLevel=result=>{
  if(!['levels','level'].includes(result?.mode))return 0;
  const completed=Number.isSafeInteger(result.completedLevel)?result.completedLevel:Number.isSafeInteger(result.levelsCompleted)?result.levelsCompleted:result.won===true?(Number.isSafeInteger(result.maxLevel)?result.maxLevel:result.level):0;
  return Number.isSafeInteger(completed)&&completed>=0&&completed<=1000?completed:0;
 };
 const SOUNDS=Object.freeze([
  {id:10,label:'Crystal Harp',level:2},{id:11,label:'Neon Marimba',level:3},
  {id:12,label:'Cathedral Organ',level:4},{id:13,label:'Glass Choir',level:5},
  {id:14,label:'Velvet Pad',level:6},{id:15,label:'Starlight Lead',level:8},
  {id:16,label:'FM Electric Piano',level:10},{id:17,label:'Music Box',level:12}
 ].map(Object.freeze));
 function prizesForLevel(level){
  if(!Number.isSafeInteger(level)||level<1||level>THRESHOLDS.length)return [];
  return [...COSMETICS.filter(item=>item.level===level).map(item=>({...item,kind:'cosmetic'})),
   ...SOUNDS.filter(item=>item.level===level).map(item=>({...item,kind:'sound'})),
   ...LEVEL_NOTES.filter(item=>item.level===level).map(item=>({...item})),
   ...VIBES.filter(item=>item.level===level).map(item=>({...item}))];
 }
 const integer=(n,max=1000000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 function validClefStats(result){
  if(!['treble','bass','grand'].includes(result.staff)||!result.clefStats)return false;
  const t=result.clefStats.treble,b=result.clefStats.bass;
  if(![t,b].every(s=>s&&integer(s.correct)&&integer(s.misses)&&integer(s.bestStreak)&&s.bestStreak<=s.correct&&s.bestStreak<=result.streak))return false;
  return t.correct+b.correct===result.correct&&t.misses+b.misses===result.misses&&
   (result.staff!=='treble'||b.correct+b.misses===0)&&(result.staff!=='bass'||t.correct+t.misses===0);
 }
 const levelForXP=xp=>THRESHOLDS.reduce((level,value,index)=>xp>=value?index+1:level,1);
 const soundRequiredLevel=id=>SOUNDS.find(sound=>sound.id===Number(id))?.level||1;
 function clean(value){
  if(!value||value.version!==1||!Array.isArray(value.events)||value.events.length>MAX_EVENTS)return null;
  const events=[],seen=new Set();let xp=0;
  for(const item of value.events){if(!item||typeof item.id!=='string'||!item.id.length||item.id.length>512||!integer(item.xp,1000)||item.xp<1||seen.has(item.id))continue;seen.add(item.id);const event={id:item.id,xp:item.xp,reason:typeof item.reason==='string'?item.reason.slice(0,150):'Arcade activity'};events.push(event);xp+=item.xp;}
  return {version:1,xp,events,bestPitchLevel:integer(value.bestPitchLevel,1000)?value.bestPitchLevel:0};
 }
 function describe(state){
  const achievementRewards=ACHIEVEMENT_REWARDS.filter(item=>state.events.some(event=>event.id==='achievement:'+item.achievement));
  const xp=state.xp,level=levelForXP(xp),base=THRESHOLDS[level-1],next=THRESHOLDS[level]??null;
  return {version:1,xp,level,bestPitchLevel:state.bestPitchLevel||0,achievementRewards:achievementRewards.map(item=>({...item})),levelXP:xp-base,nextLevelXP:next,progress:next===null?1:(xp-base)/(next-base),
   unlockedCosmetics:[...COSMETICS.filter(item=>item.level<=level).map(item=>item.id),...achievementRewards.map(item=>item.id)],
   unlockedSounds:SOUNDS.filter(item=>item.level<=level).map(item=>item.id),unlockedVibes:VIBES.filter(item=>item.level<=level).map(item=>item.id),
   eventCount:state.events.length,recent:state.events.slice(-8).reverse().map(item=>({...item}))};
 }
 function readState(storage){try{return describe(clean(JSON.parse(storage?.getItem(KEY)||'null'))||{version:1,xp:0,events:[]});}catch{return describe({version:1,xp:0,events:[]});}}
 function validResult(game,result){
  if(!result||typeof result!=='object')return false;
  if(game==='pitch')return ['classic','endless','levels','level','multi'].includes(result.mode)&&integer(result.correct)&&integer(result.misses)&&integer(result.streak)&&result.streak<=result.correct&&typeof result.won==='boolean';
  if(game==='triad')return ['computer','multiplayer','advanced'].includes(result.mode)&&integer(result.captures,1000)&&integer(result.score,16)&&typeof result.won==='boolean';
  return game==='rhythm'&&result.mode==='tap'&&integer(result.total,128)&&result.total>0&&integer(result.hits,128)&&result.hits<=result.total&&integer(result.extra,1000)&&integer(result.early,128)&&integer(result.late,128)&&result.early+result.late<=result.hits;
 }
 function create(api={}){
  let storage=api.storage;if(storage===undefined)try{storage=window.localStorage;}catch{}
  let state={version:1,xp:0,events:[]},persistent=false,error='',claimingLevelPrizes=false;const listeners=new Set();
  if(api.onChange)listeners.add(api.onChange);
  function refresh(){try{const saved=clean(JSON.parse(storage?.getItem(KEY)||'null'));if(saved){state=saved;persistent=true;}}catch{}return getState();}
  function getState(){return {...describe(state),persistent,error};}
  function changed(){const value=getState();for(const listener of listeners)try{listener(value);}catch{}try{if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('coda-progression-change',{detail:value}));}catch{}return value;}
  refresh();
  function awardXP(id,amount,reason='Arcade activity',metrics={}){
   if(typeof id!=='string'||id.length<1||id.length>512||!integer(amount,1000)||amount<1)return {ok:false,error:'Invalid experience award.'};
   refresh();if(state.events.some(item=>item.id===id))return {ok:true,alreadyAwarded:true,amount:0,...getState()};
   if(state.events.length>=MAX_EVENTS)return {ok:false,error:'The experience journal is full.'};
   const before=levelForXP(state.xp),next={version:1,xp:state.xp+amount,bestPitchLevel:Math.max(state.bestPitchLevel||0,integer(metrics.pitchLevel,1000)?metrics.pitchLevel:0),events:[...state.events,{id,xp:amount,reason:String(reason).slice(0,150)}]};
   try{if(!storage||typeof storage.setItem!=='function')throw Error('storage');storage.setItem(KEY,JSON.stringify(next));state=next;persistent=true;error='';}
   catch{persistent=false;error='Browser saving is unavailable. This experience has not been saved; try the activity again.';changed();return {ok:false,error};}
   changed();const result={ok:true,alreadyAwarded:false,amount,leveledUp:levelForXP(next.xp)>before,...getState()};try{api.onAward?.({id,amount,reason:String(reason).slice(0,150),levelBefore:before,level:result.level});}catch{}return result;
  }
  function recordGameEvent(game,runId,result){
   if(typeof runId!=='string'||!runId.length||runId.length>128||!validResult(game,result))return {ok:false,error:'A verified game result is required.'};
   const rhythmPerfect=game==='rhythm'&&result.hits===result.total&&result.extra===0;
   let xp=0,title='';
   if(game==='pitch'){xp=10+Math.min(60,result.correct*2)+(result.won?30:0);title='Pitch Race run';}
   if(game==='triad'){xp=15+Math.min(30,result.captures*3)+(result.won?35:0);title='Music Triad match';}
   if(game==='rhythm'){xp=10+Math.min(60,result.hits*2)+(rhythmPerfect?20:0);title='Rhythm Room round';}
   const before=levelForXP(state.xp),resultAward=awardXP('game:'+game+':'+runId,xp,title,{pitchLevel:game==='pitch'?reportedPitchLevel(result):0});if(!resultAward.ok)return resultAward;
   const achievements=['first-'+game+'-result'];
   if(game==='triad'&&result.won)achievements.push('triad-first-win');
   if(game==='triad'&&['computer','advanced'].includes(result.mode)&&result.won&&String(result.difficulty).toLowerCase()==='hard'&&(result.mode==='advanced'||result.rules==='advanced'||result.gameMode==='advanced'||result.advanced===true))achievements.push('triad-hard-advanced-win');
   if(game==='pitch'&&result.correct>=10)achievements.push('pitch-ten-correct');
   if(game==='pitch'&&result.streak>=10)achievements.push('pitch-ten-streak');
   if(game==='pitch')for(const level of [10,20,30,40,50])if(reportedPitchLevel(result)>=level)achievements.push('pitch-level-'+level);
   if(game==='pitch'&&validClefStats(result)){
    const {treble,bass}=result.clefStats;
    if(bass.correct>=10)achievements.push('pitch-bass-reader');
    if(bass.bestStreak>=20)achievements.push('pitch-bass-streak');
    if(result.staff==='grand'&&treble.correct>=10&&bass.correct>=10)achievements.push('pitch-grand-reader');
    if(result.staff==='grand'&&result.correct>=20&&treble.correct>0&&bass.correct>0&&result.misses===0)achievements.push('pitch-grand-perfect');
   }
   if(game==='rhythm'&&integer(result.streak)&&result.streak>=100&&result.streak<=result.hits)achievements.push('rhythm-hundred-streak');
   if(game==='pitch'&&result.correct>0&&result.misses===0)achievements.push('pitch-perfect-run');
   if(rhythmPerfect)achievements.push('rhythm-perfect-round');
   const awarded=[resultAward,...achievements.map(recordAchievement)].filter(value=>value.ok&&!value.alreadyAwarded);
   return {...getState(),ok:true,alreadyAwarded:awarded.length===0,amount:awarded.reduce((sum,value)=>sum+value.amount,0),leveledUp:levelForXP(state.xp)>before};
  }
  function recordAchievement(id){return awardXP('achievement:'+id,({'pitch-bass-reader':100,'pitch-bass-streak':150,'pitch-grand-reader':150,'pitch-grand-perfect':250})[id]||(['rhythm-hundred-streak','piano-memory-master','triad-hard-advanced-win','pitch-level-50'].includes(id)?250:50),'Achievement: '+String(id).replace(/[-_]/g,' '));}
  function recordQuest(id,amount=100){return awardXP('quest:'+id,amount,'Quest: '+String(id).replace(/[-_:]/g,' '));}
  function recordRhythmStreak(value){if(!integer(value)||value<100)return {ok:false,error:'A verified streak of 100 notes is required.'};return recordAchievement('rhythm-hundred-streak');}
  function recordPianoMemory(id){
   if(!PIANO_MEMORIES.includes(id))return {ok:false,error:'Choose a known Piano Lab melody.'};
   const quest=recordQuest('piano-memory:'+id);if(!quest.ok)return quest;
   const complete=PIANO_MEMORIES.every(melody=>state.events.some(event=>event.id==='quest:piano-memory:'+melody));
   return complete?recordAchievement('piano-memory-master'):{...quest,complete:false};
  }
  function unlocked(id){const reward=COSMETICS.find(item=>item.id===id)||VIBES.find(item=>item.id===id),achievement=ACHIEVEMENT_REWARDS.find(item=>item.id===id);return !!reward&&levelForXP(state.xp)>=reward.level||!!achievement&&state.events.some(event=>event.id==='achievement:'+achievement.achievement);}
  function claimLevelPrizes(wallet){
   const claimed=[];let amount=0;
   const result=(ok,extra={})=>({ok,amount,claimed,alreadyClaimed:ok&&claimed.length===0,...extra});
   const canRecord=()=>{try{return api.canRecord?.()!==false;}catch{return false;}};
   if(claimingLevelPrizes)return result(true,{busy:true});
   if(!canRecord())return result(false,{error:'Progress rewards are paused.'});
   if(typeof wallet?.grantReward!=='function')return result(false,{error:'A Notes wallet is required.'});
   let proof,saved,raw;
   try{proof=storage?.getItem(KEY);raw=JSON.parse(proof||'null');saved=clean(raw);}catch{}
   // Never use this engine's cached high level after a profile has been
   // cleared or replaced. The current saved XP journal is the reward proof.
   if(!saved||raw.xp!==saved.xp||raw.events.length!==saved.events.length)return result(false,{error:'Saved progress is required to claim level prizes.'});
   const reached=levelForXP(saved.xp);
   claimingLevelPrizes=true;
   try{
    for(const prize of LEVEL_NOTES){
     if(prize.level>reached)continue;
     if(!canRecord()||storage?.getItem(KEY)!==proof)return result(false,{error:'Your player changed before all level prizes were saved.'});
     const award=wallet.grantReward(prize.id,prize.amount);
     if(!award?.ok)return result(false,{error:award?.error||'A level prize could not save. Try again.'});
     if(!award.alreadyClaimed){const paid=integer(award.amount)&&award.amount<=prize.amount?award.amount:0;amount+=paid;claimed.push({...prize,amount:paid});}
    }
    return result(true);
   }catch{return result(false,{error:'A level prize could not save. Try again.'});}
   finally{claimingLevelPrizes=false;}
  }

  function open(){
   refresh();if(!api.openPanel||!api.panelBody)return getState();api.openPanel('Your musician level');const doc=api.panelBody.ownerDocument,value=getState();
   const section=doc.createElement('section');section.className='player-progression';
   const title=doc.createElement('h2');title.textContent='Level '+value.level+' · '+value.xp+' XP';section.append(title);
   const progress=doc.createElement('progress');progress.max=1;progress.value=value.progress;progress.setAttribute('aria-label','Experience toward the next level');section.append(progress);
   const note=doc.createElement('p');note.textContent=value.nextLevelXP===null?'All current level rewards unlocked. Your experience keeps growing.':(value.nextLevelXP-value.xp)+' XP until level '+(value.level+1)+'.';section.append(note);
   const help=doc.createElement('p');help.className='muted';help.textContent='Earn experience by playing cabinet games, earning achievements, and completing musician or Chopin quests. Buying items and spending Notes never gives XP.';section.append(help);
   const list=doc.createElement('div');list.className='progression-rewards';
   for(let level=2;level<=THRESHOLDS.length;level++){
    const row=doc.createElement('article');row.className='progression-reward'+(value.level>=level?' is-unlocked':'');const heading=doc.createElement('strong');heading.textContent=(value.level>=level?'✓ ':'🔒 ')+'Level '+level;row.append(heading);
    const details=doc.createElement('p'),names=prizesForLevel(level).map(item=>item.label+(item.kind==='sound'?' · Song Machine sound':''));details.textContent=names.length?names.join(' · '):'Your next musician milestone';row.append(details);list.append(row);
   }
   section.append(list);
   const masteryTitle=doc.createElement('h3');masteryTitle.textContent='Long-term mastery rewards';section.append(masteryTitle);
   for(const item of ACHIEVEMENT_REWARDS){const row=doc.createElement('p');row.textContent=(unlocked(item.id)?'✓ ':'🔒 ')+item.label+' — '+item.requirement;section.append(row);}

   if(value.recent.length){const heading=doc.createElement('h3');heading.textContent='Recent experience';section.append(heading);for(const event of value.recent){const line=doc.createElement('p');line.className='progression-event';line.textContent='+'+event.xp+' XP · '+event.reason;section.append(line);}}
   if(error){const status=doc.createElement('p');status.setAttribute('role','status');status.textContent=error;section.append(status);}api.panelBody.append(section);return value;
  }
  const onStorage=event=>{if(event.key===KEY){refresh();changed();}};
  if(typeof window!=='undefined')window.addEventListener('storage',onStorage);
  return {awardXP,recordGameEvent,recordAchievement,recordQuest,recordRhythmStreak,recordPianoMemory,claimLevelPrizes,prizesForLevel,requirement,getState,snapshot:getState,refresh,unlocked,open,dispose(){if(typeof window!=='undefined')window.removeEventListener('storage',onStorage);listeners.clear();},subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);}};
 }
 return Object.freeze({KEY,THRESHOLDS,COSMETICS,SOUNDS,LEVEL_NOTES,VIBES,prizesForLevel,ACHIEVEMENT_REWARDS,PIANO_MEMORIES,requirement,levelForXP,soundRequiredLevel,readState,validResult,create});
});
