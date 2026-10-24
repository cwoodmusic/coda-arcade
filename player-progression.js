/* Local progression records verified play, achievements and completed quests.
 * Currency purchases never award experience. */
(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;if(root)root.CodaPlayerProgression=value;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const KEY='codaPlayerProgressV1',MAX_EVENTS=20000;
 const THRESHOLDS=Object.freeze([0,80,180,320,500,720,980,1280,1630,2030,2480,2980]);
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
 const SOUNDS=Object.freeze([
  {id:10,label:'Crystal Harp',level:2},{id:11,label:'Neon Marimba',level:3},
  {id:12,label:'Cathedral Organ',level:4},{id:13,label:'Glass Choir',level:5},
  {id:14,label:'Velvet Pad',level:6},{id:15,label:'Starlight Lead',level:8},
  {id:16,label:'FM Electric Piano',level:10},{id:17,label:'Music Box',level:12}
 ].map(Object.freeze));
 const integer=(n,max=1000000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 const levelForXP=xp=>THRESHOLDS.reduce((level,value,index)=>xp>=value?index+1:level,1);
 const soundRequiredLevel=id=>SOUNDS.find(sound=>sound.id===Number(id))?.level||1;
 function clean(value){
  if(!value||value.version!==1||!Array.isArray(value.events)||value.events.length>MAX_EVENTS)return null;
  const events=[],seen=new Set();let xp=0;
  for(const item of value.events){if(!item||typeof item.id!=='string'||!item.id.length||item.id.length>512||!integer(item.xp,1000)||item.xp<1||seen.has(item.id))continue;seen.add(item.id);const event={id:item.id,xp:item.xp,reason:typeof item.reason==='string'?item.reason.slice(0,150):'Arcade activity'};events.push(event);xp+=item.xp;}
  return {version:1,xp,events};
 }
 function describe(state){
  const xp=state.xp,level=levelForXP(xp),base=THRESHOLDS[level-1],next=THRESHOLDS[level]??null;
  return {version:1,xp,level,levelXP:xp-base,nextLevelXP:next,progress:next===null?1:(xp-base)/(next-base),
   unlockedCosmetics:COSMETICS.filter(item=>item.level<=level).map(item=>item.id),
   unlockedSounds:SOUNDS.filter(item=>item.level<=level).map(item=>item.id),
   eventCount:state.events.length,recent:state.events.slice(-8).reverse().map(item=>({...item}))};
 }
 function readState(storage){try{return describe(clean(JSON.parse(storage?.getItem(KEY)||'null'))||{version:1,xp:0,events:[]});}catch{return describe({version:1,xp:0,events:[]});}}
 function validResult(game,result){
  if(!result||typeof result!=='object')return false;
  if(game==='pitch')return ['classic','endless','levels','multi'].includes(result.mode)&&integer(result.correct)&&integer(result.misses)&&integer(result.streak)&&result.streak<=result.correct&&typeof result.won==='boolean';
  if(game==='triad')return ['computer','multiplayer'].includes(result.mode)&&integer(result.captures,1000)&&integer(result.score,16)&&typeof result.won==='boolean';
  return game==='rhythm'&&result.mode==='tap'&&integer(result.total,128)&&result.total>0&&integer(result.hits,128)&&result.hits<=result.total&&integer(result.extra,1000)&&integer(result.early,128)&&integer(result.late,128)&&result.early+result.late<=result.hits;
 }
 function create(api={}){
  let storage=api.storage;if(storage===undefined)try{storage=window.localStorage;}catch{}
  let state={version:1,xp:0,events:[]},persistent=false,error='';const listeners=new Set();
  if(api.onChange)listeners.add(api.onChange);
  function refresh(){try{const saved=clean(JSON.parse(storage?.getItem(KEY)||'null'));if(saved){state=saved;persistent=true;}}catch{}return getState();}
  function getState(){return {...describe(state),persistent,error};}
  function changed(){const value=getState();for(const listener of listeners)try{listener(value);}catch{}try{if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('coda-progression-change',{detail:value}));}catch{}return value;}
  refresh();
  function awardXP(id,amount,reason='Arcade activity'){
   if(typeof id!=='string'||id.length<1||id.length>512||!integer(amount,1000)||amount<1)return {ok:false,error:'Invalid experience award.'};
   refresh();if(state.events.some(item=>item.id===id))return {ok:true,alreadyAwarded:true,amount:0,...getState()};
   if(state.events.length>=MAX_EVENTS)return {ok:false,error:'The experience journal is full.'};
   const before=levelForXP(state.xp),next={version:1,xp:state.xp+amount,events:[...state.events,{id,xp:amount,reason:String(reason).slice(0,150)}]};
   try{if(!storage||typeof storage.setItem!=='function')throw Error('storage');storage.setItem(KEY,JSON.stringify(next));state=next;persistent=true;error='';}
   catch{persistent=false;error='Browser saving is unavailable. This experience has not been saved; try the activity again.';changed();return {ok:false,error};}
   changed();const result={ok:true,alreadyAwarded:false,amount,leveledUp:levelForXP(next.xp)>before,...getState()};try{api.onAward?.({id,amount,reason:String(reason).slice(0,150),levelBefore:before,level:result.level});}catch{}return result;
  }
  function recordGameEvent(game,runId,result){
   if(typeof runId!=='string'||!runId.length||runId.length>128||!validResult(game,result))return {ok:false,error:'A verified game result is required.'};
   let xp=0,title='';
   if(game==='pitch'){xp=10+Math.min(60,result.correct*2)+(result.won?30:0);title='Pitch Race run';}
   if(game==='triad'){xp=15+Math.min(30,result.captures*3)+(result.won?35:0);title='Music Triad match';}
   if(game==='rhythm'){xp=10+Math.min(60,result.hits*2)+(result.hits===result.total&&result.extra===0&&result.early===0&&result.late===0?20:0);title='Rhythm Room round';}
   const before=levelForXP(state.xp),resultAward=awardXP('game:'+game+':'+runId,xp,title);if(!resultAward.ok)return resultAward;
   const achievements=['first-'+game+'-result'];
   if(game==='triad'&&result.won)achievements.push('triad-first-win');
   if(game==='pitch'&&result.correct>=10)achievements.push('pitch-ten-correct');
   if(game==='pitch'&&result.streak>=10)achievements.push('pitch-ten-streak');
   if(game==='pitch'&&result.correct>0&&result.misses===0)achievements.push('pitch-perfect-run');
   if(game==='rhythm'&&result.hits===result.total&&result.extra===0&&result.early===0&&result.late===0)achievements.push('rhythm-perfect-round');
   const awarded=[resultAward,...achievements.map(recordAchievement)].filter(value=>value.ok&&!value.alreadyAwarded);
   return {...getState(),ok:true,alreadyAwarded:awarded.length===0,amount:awarded.reduce((sum,value)=>sum+value.amount,0),leveledUp:levelForXP(state.xp)>before};
  }
  function recordAchievement(id){return awardXP('achievement:'+id,50,'Achievement: '+String(id).replace(/[-_]/g,' '));}
  function recordQuest(id,amount=100){return awardXP('quest:'+id,amount,'Quest: '+String(id).replace(/[-_:]/g,' '));}
  function unlocked(id){const reward=COSMETICS.find(item=>item.id===id);return !!reward&&levelForXP(state.xp)>=reward.level;}
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
    const details=doc.createElement('p'),names=[...COSMETICS.filter(item=>item.level===level).map(item=>item.label),...SOUNDS.filter(item=>item.level===level).map(item=>item.label+' · Song Machine sound')];details.textContent=names.length?names.join(' · '):'Your next musician milestone';row.append(details);list.append(row);
   }
   section.append(list);
   if(value.recent.length){const heading=doc.createElement('h3');heading.textContent='Recent experience';section.append(heading);for(const event of value.recent){const line=doc.createElement('p');line.className='progression-event';line.textContent='+'+event.xp+' XP · '+event.reason;section.append(line);}}
   if(error){const status=doc.createElement('p');status.setAttribute('role','status');status.textContent=error;section.append(status);}api.panelBody.append(section);return value;
  }
  const onStorage=event=>{if(event.key===KEY){refresh();changed();}};
  if(typeof window!=='undefined')window.addEventListener('storage',onStorage);
  return {awardXP,recordGameEvent,recordAchievement,recordQuest,getState,snapshot:getState,refresh,unlocked,open,dispose(){if(typeof window!=='undefined')window.removeEventListener('storage',onStorage);listeners.clear();},subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);}};
 }
 return Object.freeze({KEY,THRESHOLDS,COSMETICS,SOUNDS,levelForXP,soundRequiredLevel,readState,validResult,create});
});
