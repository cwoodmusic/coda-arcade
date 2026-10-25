/* Authored musician missions. Live cabinet gameplay completes a mission;
 * its musician gives the reward when the player returns to them. */
(function(root,factory){
  const library=factory();
  if(typeof module==='object'&&module.exports)module.exports=library;
  if(root)root.CodaMusicianMissions=library;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const KEY='codaMusicianMissionsV1';
  const GAMES=Object.freeze({pitch:'Pitch Race',triad:'Music Triad',rhythm:'Rhythm Room'});
  const DEFINITIONS=Object.freeze([
    {id:'bach-triad-win',person:'bach',title:'Counterpoint Champion',game:'triad',goal:'Win a Music Triad match against the computer.',kind:'triad-win',target:1,reward:90},
    {id:'mozart-triad-capture',person:'mozart',title:'A Clever Turn',game:'triad',goal:'Capture at least 3 opposing cards in one completed Music Triad computer match.',kind:'triad-captures',target:3,reward:80},
    {id:'beethoven-pitch-win',person:'beethoven',title:'Race with Resolve',game:'pitch',goal:'Win a Classic Pitch Race against the computer with at least one correct note.',kind:'pitch-win',target:1,reward:100},
    {id:'clara-pitch-streak',person:'clara',title:'A Clear Musical Line',game:'pitch',goal:'Identify 20 notes in a row in Pitch Race, then finish the run. Classic, Endless, and Level Challenge count.',kind:'pitch-streak',target:20,reward:100},
    {id:'joplin-rhythm-streak',person:'joplin',title:'Ragtime Steady',game:'rhythm',goal:'Match 20 notes in a row in Rhythm Room Tap Practice. Missed notes and extra taps reset the streak; keep the loop running between rounds.',kind:'rhythm-streak',target:20,reward:90},
    {id:'ellington-rhythm-streak',person:'ellington',title:'In the Pocket',game:'rhythm',goal:'Match 50 notes in a row in Rhythm Room Tap Practice. Missed notes and extra taps reset the streak; keep the loop running between rounds.',kind:'rhythm-streak',target:50,reward:160},
    {id:'ella-rhythm-perfect',person:'ella',title:'Every Entrance Counts',game:'rhythm',goal:'Finish a Rhythm Room tap round with at least 8 notes, matching every note with no extra, early, or late taps.',kind:'rhythm-perfect',target:1,reward:100},
    {id:'nina-pitch-notes',person:'nina',title:'Make Every Note Speak',game:'pitch',goal:'Correctly identify at least 15 notes in one completed Pitch Race run. Classic, Endless, and Level Challenge count.',kind:'pitch-correct',target:15,reward:80},
    {id:'miles-triad-comeback',person:'miles',title:'Find Another Way',game:'triad',goal:'Win a Music Triad computer match after trailing your opponent during the match.',kind:'triad-comeback',target:1,reward:140}
  ].map(item=>Object.freeze(item)));
  const byPerson=new Map(DEFINITIONS.map(item=>[item.person,item]));
  const PERSON_NAMES=Object.freeze({bach:'Bach',mozart:'Mozart',beethoven:'Beethoven',clara:'Clara Schumann',joplin:'Scott Joplin',ellington:'Duke Ellington',ella:'Ella Fitzgerald',nina:'Nina Simone',miles:'Miles Davis'});
  const integer=(value,max=1000000)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
  function validResult(game,result){
    if(!result||typeof result!=='object'||Array.isArray(result))return false;
    if(game==='triad')return ['computer','multiplayer','advanced'].includes(result.mode)&&integer(result.captures,1000)&&integer(result.score,16)&&typeof result.won==='boolean'&&typeof result.comeback==='boolean';
    if(game==='pitch')return ['classic','endless','levels','level','multi'].includes(result.mode)&&integer(result.score)&&integer(result.correct)&&integer(result.misses)&&integer(result.streak)&&result.streak<=result.correct&&typeof result.won==='boolean'&&typeof result.perfect==='boolean';
    return game==='rhythm'&&result.mode==='tap'&&integer(result.total,128)&&result.total>0&&integer(result.hits,128)&&result.hits<=result.total&&integer(result.extra,1000)&&integer(result.early,128)&&integer(result.late,128)&&result.early+result.late<=result.hits;
  }
  function resultProgress(mission,result){
    switch(mission.kind){
      case 'triad-win':return ['computer','advanced'].includes(result.mode)&&result.won?1:0;
      case 'triad-captures':return ['computer','advanced'].includes(result.mode)?result.captures:0;
      case 'triad-comeback':return ['computer','advanced'].includes(result.mode)&&result.won&&result.comeback?1:0;
      case 'pitch-win':return result.mode==='classic'&&result.won&&result.correct>0?1:0;
      case 'pitch-streak':return result.mode!=='multi'?result.streak:0;
      case 'pitch-correct':return result.mode!=='multi'?result.correct:0;
      case 'rhythm-perfect':return result.total>=8&&result.hits===result.total&&result.extra===0&&result.early===0&&result.late===0?1:0;
      default:return 0;
    }
  }
  // Rhythm Room exposes its actual grading function. Track ordered targets,
  // including missed notes before a hit and unfinished tails at round end.
  // Saved practice-history totals cannot establish a consecutive-note streak.
  function createStreakTracker(onChange=()=>{}){
    let current=null,next=0,streak=0,best=0,finished=false;
    function emit(){best=Math.max(best,streak);onChange({streak,best});}
    function reset(){streak=0;emit();}
    function finish(){
      if(!current||finished)return;
      finished=true;
      if(next<current.targets.length)reset();
    }
    function begin(round){
      if(round===current)return;
      finish();current=round;next=0;finished=false;
      if(!round||!Array.isArray(round.targets)||round.targets.length>128||!round.targets.every(Number.isFinite)){current=null;reset();}
    }
    function tap(round,result){
      begin(round);if(!current)return;
      const last=round.taps?.[round.taps.length-1];
      if(!result?.hit||!integer(last?.target,127)||last.target>=round.targets.length){reset();return;}
      if(last.target!==next)reset();
      next=last.target+1;streak++;emit();
    }
    function stop(){current=null;next=0;finished=false;reset();}
    return {begin,tap,finish,stop,snapshot:()=>({streak,best})};
  }
  function gameKey(game){
    if(typeof game==='string'&&GAMES[game])return game;
    const label=typeof game==='string'?game:game?.name;
    return Object.keys(GAMES).find(key=>GAMES[key]===label)||null;
  }
  function create(api={}){
    const host=api.window||(typeof window!=='undefined'?window:null),doc=api.document||host?.document;
    let storage=api.storage;if(storage===undefined)try{storage=host?.localStorage;}catch{}
    const now=()=>Math.max(1,Math.floor(api.now?.()||Date.now()));
    const empty=()=>({version:1,missions:{},seen:[]});
    let state=empty(),persistent=true,lastError='',session=null,displayed=null,disposed=false;
    function clean(raw){
      if(!raw||raw.version!==1||!raw.missions||typeof raw.missions!=='object'||Array.isArray(raw.missions)||!Array.isArray(raw.seen))return empty();
      const output=empty();
      for(const mission of DEFINITIONS){
        const value=raw.missions[mission.id];
        if(!value||!integer(value.acceptedAt,Number.MAX_SAFE_INTEGER)||!value.acceptedAt)continue;
        const progress=integer(value.progress)?Math.min(value.progress,mission.target):0;
        const completedAt=progress>=mission.target&&integer(value.completedAt,Number.MAX_SAFE_INTEGER)?value.completedAt:0;
        output.missions[mission.id]={acceptedAt:value.acceptedAt,progress,completedAt,rewardedAt:completedAt&&integer(value.rewardedAt,Number.MAX_SAFE_INTEGER)?value.rewardedAt:0};
      }
      output.seen=raw.seen.filter(id=>typeof id==='string'&&id.length<=140).slice(-512);return output;
    }
    try{const raw=storage?.getItem(KEY);if(raw)state=clean(JSON.parse(raw));}catch{persistent=false;lastError='Browser saving is unavailable. Mission progress cannot be saved yet.';}
    const clone=value=>JSON.parse(JSON.stringify(value));
    function persist(){
      try{if(!storage?.setItem)throw Error('storage');storage.setItem(KEY,JSON.stringify(state));persistent=true;lastError='';return true;}
      catch{persistent=false;lastError='Browser saving is unavailable. Keep this page open and retry saving your mission reward.';return false;}
    }
    function missionFor(person){return byPerson.get(typeof person==='string'?person:person?.id)||null;}
    function entry(mission){
      const value=state.missions[mission.id];
      return {...mission,status:!value?'available':value.rewardedAt?'rewarded':value.completedAt?'complete':'active',progress:value?.progress||0,
        acceptedAt:value?.acceptedAt||0,completedAt:value?.completedAt||0,rewardedAt:value?.rewardedAt||0};
    }
    function snapshot(){return {persistent,error:lastError,missions:DEFINITIONS.map(entry),connection:session?{game:session.game,connected:session.connected,streak:session.tracker?.snapshot().streak??session.fallbackStreak}:null};}
    function changed(){render();try{api.onChange?.(snapshot());}catch{/* Feedback cannot interrupt gameplay. */}}
    function canTurnIn(mission){
      try{return api.canTurnIn?.(mission.person,entry(mission))===true;}catch{return false;}
    }
    function turnIn(person){
      const mission=missionFor(person),value=mission&&state.missions[mission.id];
      if(!mission||!value)return {ok:false,error:'Accept this musician\'s mission first.'};
      if(value.rewardedAt)return {ok:true,alreadyRewarded:true};
      if(!value.completedAt)return {ok:false,error:'Finish this mission before collecting its reward.'};
      if(!canTurnIn(mission))return {ok:false,error:'Return to '+PERSON_NAMES[mission.person]+' to collect your reward.'};
      // Save the completed mission before touching the wallet. Its stable reward
      // ID also protects a retry if the wallet saves but the final mission save fails.
      if(!persist()){changed();return {ok:false,error:lastError};}
      const rewardId='npc-mission:'+mission.id;
      let result;try{result=api.wallet?.grantReward(rewardId,mission.reward);}catch{result={ok:false};}
      if(!result?.ok){
        lastError=result?.error||'Your mission is complete. Your Notes could not be saved. Talk to '+PERSON_NAMES[mission.person]+' to try again.';
        changed();return {ok:false,error:lastError};
      }
      value.rewardedAt=now();
      if(!persist()){value.rewardedAt=0;changed();return {ok:false,error:lastError};}
      try{api.onMissionRewarded?.({...mission,rewardId});}catch{/* Progress feedback cannot undo an awarded mission. */}
      changed();return {ok:true,alreadyRewarded:false,rewardId};
    }
    function accept(person){
      const mission=missionFor(person);if(!mission)return {ok:false,error:'This musician has no mission yet.'};
      if(state.missions[mission.id])return {ok:true,alreadyAccepted:true};
      state.missions[mission.id]={acceptedAt:now(),progress:0,completedAt:0,rewardedAt:0};
      const saved=persist();changed();return {ok:saved,error:saved?'':lastError};
    }
    function advance(mission,amount){
      const value=state.missions[mission.id];
      if(!value||value.completedAt||!session?.eligible.has(mission.id))return;
      const progress=Math.min(mission.target,Math.max(value.progress,amount));
      if(progress===value.progress)return;
      value.progress=progress;const completed=progress>=mission.target;if(completed)value.completedAt=now();
      persist();
      if(completed)try{api.onMissionCompleted?.(entry(mission));}catch{/* Completion feedback cannot interrupt gameplay. */}
      changed();
    }
    function rhythmProgress(best){try{api.onVerifiedRhythmStreak?.(best);}catch{}for(const mission of DEFINITIONS)if(mission.kind==='rhythm-streak')advance(mission,best);}
    function recordResult(game,runId,result){
      if(!session||session.game!==game||typeof runId!=='string'||!runId.length||runId.length>128||!validResult(game,result))return false;
      const key=game+':'+runId;if(state.seen.includes(key))return false;
      state.seen.push(key);state.seen=state.seen.slice(-512);persist();
      try{api.onVerifiedResult?.(game,runId,clone(result));}catch{/* Other progress systems cannot interrupt game verification. */}
      for(const mission of DEFINITIONS)if(mission.game===game)advance(mission,resultProgress(mission,result));
      // Cross-origin fallback is deliberately conservative: only whole rounds
      // without any missed note or extra tap can extend a verified streak.
      if(game==='rhythm'&&!session.rhythmHook){session.fallbackStreak=result.hits===result.total&&result.extra===0?session.fallbackStreak+result.hits:0;rhythmProgress(session.fallbackStreak);}
      changed();return true;
    }
    function initBridge(){
      if(!session)return;
      try{session.frame.contentWindow.postMessage({coda:1,type:'init',game:session.game,token:session.token},session.origin);}catch{/* Frame navigation may be in progress. */}
    }
    function onMessage(event){
      const value=event.data;
      if(!session||event.source!==session.frame.contentWindow||event.origin!==session.origin||!value||value.coda!==1||value.game!==session.game)return;
      if(value.type==='ready'){initBridge();return;}
      if(value.type==='result'&&value.token===session.token){session.connected=true;recordResult(session.game,value.runId,value.result);}
    }
    function wrap(object,key,after){
      const original=object?.[key];if(typeof original!=='function')return false;
      const owner=session;
      const wrapped=function(...args){const result=original.apply(this,args);if(session===owner)after(args,result);return result;};
      try{object[key]=wrapped;if(object[key]!==wrapped)return false;}catch{return false;}
      owner.cleanup.push(()=>{try{if(object[key]===wrapped)object[key]=original;}catch{}});return true;
    }
    function connectFrame(){
      if(!session)return;
      initBridge();
      try{
        const win=session.frame.contentWindow,document=win.document;
        if(document.documentElement?.dataset?.codaGame!==session.game)return;
        if(wrap(win.CodaBridge,'report',(args)=>recordResult(session.game,args[0],args[1])))session.connected=true;
        if(session.game==='rhythm'){
          const tracker=createStreakTracker(({best})=>rhythmProgress(best));session.tracker=tracker;
          const a=wrap(win,'createTapRound',(_,round)=>tracker.begin(round));
          const b=wrap(win,'gradeTap',([round],result)=>tracker.tap(round,result));
          const d=wrap(win,'finishTapRound',()=>tracker.finish());
          session.rhythmHook=a&&b&&d;
          if(session.rhythmHook){
            session.connected=true;
            const reset=event=>{
              const target=event.target?.closest?.('button,input,select');if(!target)return;
              if(event.type==='change'||['stop','home-button','generate','none','all'].includes(target.id)||target.id==='play'&&target.textContent.includes('Stop'))tracker.stop();
            };
            document.addEventListener('click',reset,true);document.addEventListener('change',reset,true);
            session.cleanup.push(()=>{document.removeEventListener('click',reset,true);document.removeEventListener('change',reset,true);});
          }
        }
      }catch{/* Deployed same-origin cabinets offer live hooks; the bridge handles other approved hosts. */}
      changed();
    }
    function detachGame(){
      if(!session)return;const previous=session;session=null;
      previous.frame.removeEventListener?.('load',previous.loaded);
      for(const cleanup of previous.cleanup)try{cleanup();}catch{}
      changed();
    }
    function attachGame(game,frame=api.frame){
      detachGame();const key=gameKey(game);if(!key||!frame)return false;
      let url;try{url=new URL(game?.url||game?.file||frame.src,host?.location?.href||'https://cwoodmusic.github.io/coda-arcade/');}catch{return false;}
      const token=host?.crypto?.randomUUID?.()||'mission-'+now().toString(36)+'-'+Math.random().toString(36).slice(2);
      const eligible=new Set(DEFINITIONS.filter(mission=>state.missions[mission.id]&&!state.missions[mission.id].completedAt).map(mission=>mission.id));
      session={game:key,frame,origin:url.origin,token,eligible,connected:false,cleanup:[],rhythmHook:false,fallbackStreak:0,loaded:null};
      session.loaded=()=>{
        if(!session||session.frame!==frame)return;
        for(const cleanup of session.cleanup.splice(0))try{cleanup();}catch{}
        session.tracker=null;session.rhythmHook=false;session.fallbackStreak=0;
        connectFrame();
      };
      frame.addEventListener?.('load',session.loaded);connectFrame();return true;
    }
    function node(tag,text){const element=doc.createElement(tag);if(text!==undefined)element.textContent=text;return element;}
    function action(label,click){const button=node('button',label);button.type='button';button.onclick=click;return button;}
    function render(){
      if(!displayed?.section?.isConnected)return;
      const mission=displayed.mission,value=entry(mission),section=displayed.section;section.replaceChildren();
      section.append(node('h3',mission.title),node('p',mission.goal),node('p','Reward: '+mission.reward+' Notes'));
      const progress=node('p',value.status==='available'?'Accept this mission, then start a fresh game through an arcade cabinet.':
        value.status==='rewarded'?'Mission complete · '+mission.reward+' Notes collected!':value.status==='complete'?'Mission complete! Return to '+PERSON_NAMES[mission.person]+' to collect your reward.':
        'Mission active · Best progress '+value.progress+' / '+mission.target);
      progress.setAttribute('role','status');section.append(progress);
      if(value.status==='available')section.append(action('Accept mission',()=>accept(mission.person)));
      if(value.status==='active')section.append(action('Play '+GAMES[mission.game],()=>api.openGame?.(mission.game)));
      if(value.status==='complete'){
        const collect=action('Collect reward',()=>turnIn(mission.person));collect.disabled=!canTurnIn(mission);section.append(collect);
        if(typeof api.findQuestGiver==='function')section.append(action('Find quest giver',()=>api.findQuestGiver(mission.person,entry(mission))));
      }
      const note=node('p','Results are checked automatically while you play through this arcade. Missions and Notes stay in this browser.');note.className='muted';section.append(note);
      if(lastError){const error=node('p',lastError);error.setAttribute('role','alert');section.append(error);}
    }
    function open(person){
      const mission=missionFor(person);if(!mission)return false;
      api.openPanel?.((typeof person==='object'?person.name:PERSON_NAMES[mission.person])+' · Mission');
      const section=node('section');section.className='musician-mission';section.setAttribute('aria-label',mission.title+' mission');
      api.panelBody.append(section);displayed={mission,section};render();return true;
    }
    host?.addEventListener?.('message',onMessage);
    return {open,accept,attachGame,detachGame,turnIn,snapshot,refresh:changed,get:person=>{const mission=missionFor(person);return mission?entry(mission):null;},
      retryRewards(person){return turnIn(person||displayed?.mission.person);},dispose(){if(disposed)return;disposed=true;detachGame();host?.removeEventListener?.('message',onMessage);displayed=null;}};
  }
  return {KEY,DEFINITIONS,GAMES,validResult,createStreakTracker,create};
});
