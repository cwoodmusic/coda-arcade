const test=require('node:test');
const assert=require('node:assert/strict');
const {create,createStreakTracker,validResult,DEFINITIONS}=require('../musician-missions.js');
const {createWallet}=require('../notes-shop.js');

function emitter(extra={}){
  const listeners=new Map();
  return {...extra,addEventListener(name,callback){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(callback);},
    removeEventListener(name,callback){listeners.get(name)?.delete(callback);},
    dispatch(name,event){for(const callback of [...(listeners.get(name)||[])])callback(event);},
    listenerCount(name){return listeners.get(name)?.size||0;}};
}
function storage(){
  const values=new Map();let unavailable=false;
  return {getItem:key=>values.get(key)||null,setItem(key,value){if(unavailable)throw Error('denied');values.set(key,value);},fail(value){unavailable=value;}};
}
const triad=(changes={})=>({mode:'computer',won:true,comeback:false,captures:3,score:6,...changes});
const pitch=(changes={})=>({mode:'classic',score:100,correct:25,misses:0,streak:25,won:true,perfect:true,...changes});
const rhythm=(changes={})=>({mode:'tap',total:8,hits:8,extra:0,early:0,late:0,...changes});
function fixture(options={}){
  const store=options.storage||storage(),wallet=options.wallet||createWallet({storage:store});let token=0,near=options.near||null;
  const host=emitter({location:{href:'https://cwoodmusic.github.io/coda-arcade/world-preview.html'},crypto:{randomUUID:()=> 'token-'+(++token)}});
  const document=emitter({documentElement:{dataset:{codaGame:options.game||'triad'}}});
  const init=[];
  const child={document,CodaBridge:{report(){return 'original-result';}},postMessage(value,origin){init.push({value,origin});},...options.child};
  const frame=emitter({src:'https://cwoodmusic.github.io/musictriad/',contentWindow:child});
  const manager=create({window:host,storage:store,wallet,frame,now:()=>1000,canTurnIn:person=>person===near,...options.api});
  function attach(game=options.game||'triad'){
    document.documentElement.dataset.codaGame=game;
    const urls={triad:'musictriad',pitch:'Pitch-Race',rhythm:'rhythmroom'};
    manager.attachGame({name:{triad:'Music Triad',pitch:'Pitch Race',rhythm:'Rhythm Room'}[game],url:'https://cwoodmusic.github.io/'+urls[game]+'/'},frame);
  }
  function result(value=triad(),id='run-1',override={}){
    const message={coda:1,type:'result',game:document.documentElement.dataset.codaGame,token:init.at(-1)?.value.token,runId:id,result:value};
    host.dispatch('message',{source:child,origin:'https://cwoodmusic.github.io',data:message,...override});
  }
  return {manager,wallet,store,host,document,frame,child,attach,result,init,approach(person){near=person;manager.refresh();}};
}
function round(count=8){return {targets:Array.from({length:count},(_,i)=>i),taps:[],extras:0,matched:new Set(),tolerance:.2};}
function hit(tracker,current,index){current.taps.push({target:index,hit:true,error:0});current.matched.add(index);tracker.tap(current,{hit:true,error:0});}
function extra(tracker,current){current.taps.push({target:0,hit:false,error:.5});current.extras++;tracker.tap(current,{hit:false,error:.5});}

test('the nine musicians have stable, distinct missions and bounded Notes rewards',()=>{
  assert.equal(DEFINITIONS.length,9);assert.equal(new Set(DEFINITIONS.map(item=>item.person)).size,9);
  assert.equal(new Set(DEFINITIONS.map(item=>item.id)).size,9);
  assert.ok(DEFINITIONS.some(item=>item.kind==='triad-win'));
  assert.ok(DEFINITIONS.some(item=>item.kind==='rhythm-streak'&&item.target===50));
  assert.ok(DEFINITIONS.every(item=>item.reward>0&&item.reward<=1000));
});

test('a completed mission waits for its own quest giver, then pays once and remains rewarded after reload',()=>{
  const completed=[],rewarded=[];
  const f=fixture({api:{onMissionCompleted:mission=>completed.push(mission),onMissionRewarded:mission=>rewarded.push(mission)}});
  assert.equal(f.manager.accept('bach').ok,true);f.attach();
  assert.equal(f.child.CodaBridge.report('win-1',triad()),'original-result','Gameplay return values are preserved');
  assert.equal(f.manager.get('bach').status,'complete');assert.equal(f.wallet.snapshot().balance,150);
  assert.equal(completed.length,1);assert.equal(completed[0].person,'bach');assert.equal(rewarded.length,0,'Quest XP cannot be triggered before collection');
  assert.equal(f.manager.turnIn('bach').ok,false,'A remote profile cannot collect');
  f.manager.retryRewards();assert.equal(f.wallet.snapshot().balance,150,'A generic retry cannot collect remotely');
  f.approach('mozart');assert.equal(f.manager.turnIn('bach').ok,false,'Being next to another musician does not count');
  assert.equal(f.manager.turnIn('mozart').ok,false,'The other musician cannot hand out Bach\'s reward');
  f.approach('bach');assert.equal(f.manager.turnIn('bach').ok,true);
  assert.equal(f.manager.get('bach').status,'rewarded');assert.equal(f.wallet.snapshot().balance,240);assert.equal(rewarded.length,1);
  assert.equal(rewarded[0].rewardId,'npc-mission:bach-triad-win');
  f.result(triad(),'win-1');assert.equal(f.wallet.snapshot().balance,240,'Bridge and local-hook duplicates cannot pay twice');
  assert.equal(f.manager.turnIn('bach').alreadyRewarded,true);assert.equal(rewarded.length,1);assert.equal(completed.length,1);
  f.manager.dispose();const restored=fixture({storage:f.store});
  assert.equal(restored.manager.get('bach').status,'rewarded');assert.equal(restored.wallet.snapshot().balance,240);
  restored.attach();restored.result(triad(),'win-2');assert.equal(restored.wallet.snapshot().balance,240);
});

test('unaccepted missions and stale wins on an existing iframe do not complete newly accepted missions',()=>{
  const f=fixture();f.child.document.getElementById=()=>({textContent:'You win!'});f.attach();
  f.result(triad(),'old-win');assert.equal(f.manager.get('bach').status,'available');
  f.manager.accept('bach');f.result(triad(),'old-win');f.result(triad(),'still-old-session');
  assert.equal(f.manager.get('bach').status,'active','Accepting requires a freshly opened cabinet');
  f.attach();assert.equal(f.manager.get('bach').status,'active','A winning DOM alone is never evidence');
  f.result(triad(),'old-win');assert.equal(f.manager.get('bach').status,'active','An old run ID cannot be reused after accepting');
  f.result(triad(),'fresh-win');assert.equal(f.manager.get('bach').status,'complete');
});

test('only the attached iframe, exact origin, game, token, and valid results are accepted',()=>{
  const f=fixture();f.manager.accept('bach');f.attach();
  f.result(triad(),'spoof-source',{source:{}});f.result(triad(),'spoof-origin',{origin:'https://evil.example'});
  for(const change of [{token:'wrong'},{game:'pitch'},{coda:0},{type:'complete'}]){
    const data={coda:1,type:'result',game:'triad',token:f.init.at(-1).value.token,runId:'spoof-data',result:triad(),...change};
    f.result(triad(),'unused',{data});
  }
  f.result(triad({score:999}),'bad-score');f.result(triad(),'x'.repeat(129));
  assert.equal(f.manager.get('bach').status,'active');assert.equal(f.wallet.snapshot().balance,150);
  f.result(triad(),'real-win');assert.equal(f.manager.get('bach').status,'complete');
  f.manager.detachGame();f.result(triad(),'closed-frame');assert.equal(f.wallet.snapshot().balance,150);
});

test('draws, multiplayer results, and insufficient statistics cannot satisfy computer challenges',()=>{
  const f=fixture();for(const person of ['bach','mozart','miles'])f.manager.accept(person);f.attach();
  f.result(triad({won:false,captures:2}),'loss');f.result(triad({mode:'multiplayer',won:true,comeback:true}),'multiplayer');
  for(const person of ['bach','mozart','miles'])assert.equal(f.manager.get(person).status,'active');
  f.result(triad({won:true,comeback:false}),'win');assert.equal(f.manager.get('bach').status,'complete');assert.equal(f.manager.get('mozart').status,'complete');
  assert.equal(f.manager.get('miles').status,'active');f.result(triad({comeback:true}),'comeback');assert.equal(f.manager.get('miles').status,'complete');
});

test('Pitch Race missions use completed-run correctness, streak, and Classic wins',()=>{
  const f=fixture({game:'pitch'});for(const person of ['beethoven','clara','nina'])f.manager.accept(person);f.attach();
  f.result(pitch({mode:'multi'}),'multi');for(const person of ['beethoven','clara','nina'])assert.equal(f.manager.get(person).status,'active');
  f.result(pitch({mode:'endless',correct:18,streak:12,won:false}),'endless');
  assert.equal(f.manager.get('nina').status,'complete');assert.equal(f.manager.get('clara').progress,12);assert.equal(f.manager.get('beethoven').status,'active');
  f.result(pitch(),'classic');assert.equal(f.manager.get('clara').status,'complete');assert.equal(f.manager.get('beethoven').status,'complete');
});

test('a failed wallet write preserves a completed mission and retries its stable reward only once',()=>{
  const store=storage(),actual=createWallet({storage:store});let denied=true,calls=0;
  const f=fixture({storage:store,wallet:{grantReward(id,amount){calls++;return denied?{ok:false,error:'Saving paused'}:actual.grantReward(id,amount);}}});
  f.manager.accept('bach');f.attach();f.result(triad());
  assert.equal(calls,0,'Completing does not attempt a wallet write');f.approach('bach');assert.equal(f.manager.turnIn('bach').ok,false);
  assert.equal(f.manager.get('bach').status,'complete');assert.equal(actual.snapshot().balance,150);assert.match(f.manager.snapshot().error,/Saving paused/);
  denied=false;f.manager.retryRewards('bach');assert.equal(f.manager.get('bach').status,'rewarded');assert.equal(actual.snapshot().balance,240);
  f.manager.retryRewards('bach');assert.equal(actual.snapshot().balance,240);assert.equal(calls,2);
});

test('blocked mission storage does not silently spend or credit Notes and can recover without replaying',()=>{
  const f=fixture();f.manager.accept('bach');f.attach();f.store.fail(true);f.result(triad());
  assert.equal(f.manager.get('bach').status,'complete');assert.equal(f.wallet.snapshot().balance,150);assert.equal(f.manager.snapshot().persistent,false);
  f.approach('bach');assert.equal(f.manager.turnIn('bach').ok,false);assert.equal(f.wallet.snapshot().balance,150);
  f.store.fail(false);f.manager.retryRewards('bach');assert.equal(f.manager.get('bach').status,'rewarded');assert.equal(f.wallet.snapshot().balance,240);
});

test('completed missions restore quietly and require a fresh nearby collection',()=>{
  const f=fixture();f.manager.accept('bach');f.attach();f.result(triad());f.manager.dispose();
  const completed=[],rewarded=[];
  const restored=fixture({storage:f.store,api:{onMissionCompleted:mission=>completed.push(mission),onMissionRewarded:mission=>rewarded.push(mission)}});
  assert.equal(restored.manager.get('bach').status,'complete');assert.equal(restored.wallet.snapshot().balance,150);
  assert.deepEqual(completed,[],'Restoring a completed mission must not replay its popup');assert.deepEqual(rewarded,[]);
  assert.equal(restored.manager.turnIn('bach').ok,false);restored.manager.retryRewards('bach');assert.equal(restored.wallet.snapshot().balance,150);
  restored.approach('bach');assert.equal(restored.manager.turnIn('bach').ok,true);
  assert.equal(restored.wallet.snapshot().balance,240);assert.equal(rewarded.length,1);assert.equal(completed.length,0);
});

test('mission collection fails closed when its proximity check is missing or fails',()=>{
  for(const canTurnIn of [undefined,()=>{throw Error('NPC unavailable');},()=> 'true']){
    const f=fixture({api:{canTurnIn}});f.manager.accept('bach');f.attach();f.result(triad());
    assert.equal(f.manager.turnIn('bach').ok,false);assert.equal(f.wallet.snapshot().balance,150);assert.equal(f.manager.get('bach').status,'complete');
  }
});

test('an interrupted final mission save retries the wallet ledger without giving a second reward',()=>{
  const store=storage(),actual=createWallet({storage:store}),rewarded=[];let interrupt=true,calls=0;
  const wallet={grantReward(id,amount){calls++;const result=actual.grantReward(id,amount);if(interrupt)store.fail(true);return result;}};
  const f=fixture({storage:store,wallet,api:{onMissionRewarded:mission=>rewarded.push(mission)}});
  f.manager.accept('bach');f.attach();f.result(triad());f.approach('bach');
  assert.equal(f.manager.turnIn('bach').ok,false);assert.equal(f.manager.get('bach').status,'complete');assert.equal(actual.snapshot().balance,240);assert.equal(rewarded.length,0);
  f.manager.dispose();store.fail(false);interrupt=false;
  const restored=fixture({storage:store,wallet,api:{onMissionRewarded:mission=>rewarded.push(mission)}});
  assert.equal(restored.manager.get('bach').status,'complete');assert.equal(calls,1,'Restoring never retries the payout');
  restored.approach('bach');assert.equal(restored.manager.turnIn('bach').ok,true);
  assert.equal(actual.snapshot().balance,240);assert.equal(calls,2);assert.equal(rewarded.length,1);assert.equal(restored.manager.get('bach').status,'rewarded');
});

test('a mission panel offers collection only beside its giver and checks proximity again when clicked',()=>{
  function element(tag){return {tag,isConnected:true,children:[],textContent:'',append(...children){this.children.push(...children);},replaceChildren(){this.children=[];},setAttribute(){}};}
  const document={createElement:element},panelBody=element('div'),found=[];
  const f=fixture({api:{document,panelBody,findQuestGiver:person=>found.push(person)}});
  f.manager.accept('bach');f.attach();f.result(triad());assert.equal(f.manager.open('bach'),true);
  const section=panelBody.children.at(-1),buttons=()=>section.children.filter(child=>child.tag==='button');
  assert.match(section.children.find(child=>child.textContent.includes('Return to')).textContent,/Return to Bach/);
  assert.equal(buttons().find(button=>button.textContent==='Collect reward').disabled,true);
  buttons().find(button=>button.textContent==='Find quest giver').onclick();assert.deepEqual(found,['bach']);
  f.approach('bach');const collect=buttons().find(button=>button.textContent==='Collect reward');assert.equal(collect.disabled,false);
  f.approach(null);collect.onclick();assert.equal(f.wallet.snapshot().balance,150,'A previously enabled button cannot collect after walking away');
  f.approach('bach');buttons().find(button=>button.textContent==='Collect reward').onclick();assert.equal(f.wallet.snapshot().balance,240);
});

test('Rhythm streak tracks ordered hits across rounds and resets at missing targets, extras, and unfinished tails',()=>{
  const tracker=createStreakTracker();let current=round(4);tracker.begin(current);
  for(let i=0;i<4;i++)hit(tracker,current,i);tracker.finish();assert.equal(tracker.snapshot().streak,4);
  current=round(4);tracker.begin(current);hit(tracker,current,0);hit(tracker,current,2);assert.equal(tracker.snapshot().streak,1,'Skipped target resets before the next correct note');
  extra(tracker,current);assert.equal(tracker.snapshot().streak,0);hit(tracker,current,3);assert.equal(tracker.snapshot().streak,1);
  tracker.finish();assert.equal(tracker.snapshot().streak,1,'An earlier extra must not erase a later valid tail twice');
  current=round(4);tracker.begin(current);hit(tracker,current,0);hit(tracker,current,1);tracker.finish();assert.equal(tracker.snapshot().streak,0,'A missed final note breaks the streak');
  current=round(0);tracker.begin(current);tracker.finish();assert.equal(tracker.snapshot().streak,0);
  current=round(4);tracker.begin(current);hit(tracker,current,0);tracker.stop();assert.equal(tracker.snapshot().streak,0);
});

test('live Rhythm Room grading hooks verify 50 consecutive taps without counting bridge reports twice',()=>{
  let current;
  const child={
    createTapRound(){return current=round(8);},
    gradeTap(value,elapsed){
      let nearest=-1,error=Infinity;value.targets.forEach((target,i)=>{const diff=elapsed-target;if(!value.matched.has(i)&&Math.abs(diff)<Math.abs(error)){nearest=i;error=diff;}});
      const hit=nearest>=0&&Math.abs(error)<=value.tolerance;value.taps.push({elapsed,error,hit,target:nearest});
      if(hit)value.matched.add(nearest);else value.extras++;return {hit,error};
    },finishTapRound(){return true;}
  };
  const f=fixture({game:'rhythm',child});f.manager.accept('joplin');f.manager.accept('ellington');f.attach();
  for(let r=0;r<6;r++){
    const value=f.child.createTapRound(r);for(let i=0;i<8;i++)f.child.gradeTap(value,i);
    f.child.CodaBridge.report('rhythm-'+r,rhythm());f.child.finishTapRound();
  }
  assert.equal(f.manager.get('joplin').status,'complete');assert.equal(f.manager.get('ellington').progress,48);assert.equal(f.manager.get('ellington').status,'active');
  const value=f.child.createTapRound(6);f.child.gradeTap(value,0);assert.equal(f.manager.get('ellington').progress,49);
  f.child.gradeTap(value,1);assert.equal(f.manager.get('ellington').status,'complete');assert.equal(f.wallet.snapshot().balance,150);
  f.manager.dispose();assert.equal(f.child.gradeTap,child.gradeTap,'Detaching restores the game grading function');
});

test('cross-origin Rhythm fallback extends streaks only with complete clean rounds and rejects accumulated accuracy',()=>{
  const f=fixture({game:'rhythm'});f.manager.accept('ellington');f.manager.accept('ella');f.attach();
  for(let i=0;i<5;i++)f.result(rhythm(),'round-'+i);
  assert.equal(f.manager.get('ellington').progress,40);assert.equal(f.manager.get('ella').status,'complete');
  f.result(rhythm({hits:7}),'missed');f.result(rhythm(),'after-miss');assert.equal(f.manager.get('ellington').progress,40);
  for(let i=0;i<6;i++)f.result(rhythm(),'fresh-'+i);
  assert.equal(f.manager.get('ellington').status,'complete');
});

test('malformed result data never becomes mission evidence',()=>{
  assert.equal(validResult('triad',triad()),true);assert.equal(validResult('pitch',pitch()),true);assert.equal(validResult('rhythm',rhythm()),true);
  for(const value of [null,[],{},triad({captures:-1}),triad({won:'yes'}),triad({score:NaN})])assert.equal(validResult('triad',value),false);
  assert.equal(validResult('pitch',pitch({streak:26})),false);assert.equal(validResult('rhythm',rhythm({hits:9})),false);
  assert.equal(validResult('rhythm',rhythm({early:6,late:5})),false);
});
