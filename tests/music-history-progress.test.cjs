const test=require('node:test'),assert=require('node:assert/strict');
const history=require('../music-history-progress.js'),quizData=require('../music-history-quiz-data.js'),{createWallet}=require('../notes-shop.js');
function fixture(options={}){
 const values=options.values||new Map();let near=true,scholar=true,allowed=true,owner='guest',dev=false,writeHook=null;
 const storage={getItem:key=>values.get(key)??null,setItem(key,value){if(writeHook)writeHook(key,value);values.set(key,value);},removeItem:key=>values.delete(key)};
 const wallet=options.wallet||createWallet({storage});const events=[];
 const api={storage,wallet,canUse:()=>allowed,getIdentity:()=>owner,canTalk:()=>near,canVisitScholar:()=>scholar,isDeveloperTest:()=>dev,random:()=>0,onFactReady:event=>events.push(event),...options.api};
 const store=history.create(api);
 return {store,wallet,values,storage,api,events,setNear:value=>near=value,setScholar:value=>scholar=value,setAllowed:value=>allowed=value,setOwner:value=>owner=value,setDev:value=>dev=value,setWriteHook:value=>writeHook=value};
}
const pitch=correct=>({mode:'classic',score:100,correct,misses:0,streak:correct,won:true,perfect:true});
const triad={mode:'computer',captures:8,score:9,won:true,comeback:false};
const rhythm={mode:'tap',total:8,hits:8,extra:0,early:0,late:0};
let nextRun=0;
function complete(f,person){const accepted=f.store.acceptQuest(person);assert.equal(accepted.ok,true,accepted.error);const quest=accepted.quest;
 for(let at=0;at<(quest.game==='fishing'?quest.target:1);at++){
  const token=f.store.beginRun(quest.game),id='fixture-'+(++nextRun);let result;
  if(quest.game==='pitch')result=f.store.recordResult('pitch',id,pitch(quest.target),token);
  if(quest.game==='triad')result=f.store.recordResult('triad',id,triad,token);
  if(quest.game==='rhythm')result=f.store.recordResult('rhythm',id,rhythm,token);
  if(quest.game==='piano')result=f.store.recordActivity('piano',{runId:id,kind:'melody',mode:'guided',mistakes:0},token);
  if(quest.game==='fishing')result=f.store.recordActivity('fishing',{id,fishId:'test-minnow',rarity:'common',meter:'4/4',caught:true,outcome:'caught',hits:8,misses:0,extras:0,perfect:true},token);
  assert.equal(result,true);
 }assert.equal(f.store.conversation(person).hasNewFact,true);return quest;}
function answerAll(f,wrong=0){const state=f.store.quizState();for(const [index,question]of state.questions.entries()){
 const source=quizData.find(item=>item.id===question.id),correct=question.choices.indexOf(source.choices[source.answer]);
 assert.equal(f.store.answerQuiz(question.id,index<wrong?(correct+1)%question.choices.length:correct).ok,true);
}}

test('every collection has30 progressively priced relationship quests and no click-only facts',()=>{
 const f=fixture();assert.equal(Object.keys(history.PEOPLE).length,18);assert.equal(f.store.snapshot().total,540);
 for(const person of Object.keys(history.PEOPLE)){assert.equal(f.store.learnFact(person).ok,false);const quests=Array.from({length:30},(_,i)=>history.questFor(person,i));assert.equal(new Set(quests.map(q=>q.game)).size,5);assert.equal(quests[0].reward,50);assert.equal(quests[29].reward,125);}
 assert.equal(f.store.snapshot().count,0);assert.equal(f.wallet.snapshot().balance,150);
});
test('Bach starts with ten notes, one completed quest unlocks exactly one fact, and a global active quest cannot stack',()=>{
 const f=fixture();assert.equal(f.store.acceptQuest('bach').quest.target,10);assert.equal(f.store.acceptQuest('mozart').ok,false);
 const token=f.store.beginRun('pitch');assert.equal(f.store.recordResult('pitch','short',pitch(9),token),true);assert.equal(f.store.conversation('bach').hasNewFact,false);
 assert.equal(f.store.recordResult('pitch','ten',pitch(10),token),true);assert.equal(f.events.length,1);assert.equal(f.store.conversation('bach').hasNewFact,true);assert.equal(f.store.acceptQuest('bach').ok,false);
 const learned=f.store.learnFact('bach');assert.equal(learned.fact.id,'bach-01');assert.equal(f.store.learnFact('bach').ok,false);assert.deepEqual(f.store.snapshot().carriedIDs,['bach-01']);assert.equal(f.wallet.snapshot().balance,150);
 assert.equal(f.store.acceptQuest('bach').ok,true);assert.equal(f.store.recordResult('pitch','ten',pitch(20),token),false);
});
test('fresh run eligibility, valid payloads, origin-verified callback IDs, and replay protection prevent stale quest credit',()=>{
 const f=fixture();assert.equal(f.store.beginRun('pitch'),null);f.store.acceptQuest('bach');const token=f.store.beginRun('pitch');
 for(const [run,value,runToken]of [['wrong-token',pitch(10),'no'],['invalid',{...pitch(10),streak:999},token],['practice',{...pitch(10),practice:true},token],['multi',{...pitch(10),mode:'multi'},token]])assert.equal(f.store.recordResult('pitch',run,value,runToken),false);
 assert.equal(f.store.recordResult('pitch','one-completion',pitch(10),token),true);assert.equal(f.store.recordResult('pitch','one-completion',pitch(10),token),false);
 const restored=history.create(f.api);assert.equal(restored.recordResult('pitch','fresh-actor',pitch(10),token),false,'in-memory run eligibility is not restored');
});
test('nearby conversations, scholar proximity, permission and owner changes are all required at mutation time',()=>{
 const f=fixture();f.setNear(false);assert.equal(f.store.acceptQuest('bach').ok,false);f.setNear(true);complete(f,'bach');f.setNear(false);assert.equal(f.store.learnFact('bach').ok,false);f.setNear(true);f.store.learnFact('bach');
 f.setScholar(false);assert.equal(f.store.deposit().ok,false);assert.equal(f.store.startQuiz('bach').ok,false);assert.equal(f.store.snapshot().recordedCount,0);
 f.setScholar(true);f.setAllowed(false);assert.equal(f.store.deposit().ok,false);assert.equal(f.store.snapshot().ok,false);
});
test('carried facts become scholar records and pay only after a real deposit; reload and repeated deposits cannot pay twice',()=>{
 const f=fixture();complete(f,'bach');f.store.learnFact('bach');const before=f.wallet.snapshot().balance;
 const paid=f.store.deposit();assert.equal(paid.ok,true);assert.equal(paid.deposited,1);assert.equal(paid.amount,50);assert.equal(f.wallet.snapshot().balance,before+50);assert.equal(f.store.snapshot().carriedIDs.length,0);assert.equal(f.store.snapshot().recordedCount,1);
 const restored=history.create(f.api);assert.equal(restored.deposit().amount,0);assert.equal(f.wallet.snapshot().balance,before+50);assert.equal(f.wallet.snapshot().rewards.filter(id=>id==='scholar-fact:bach-01').length,1);
});
test('all30 quests can be completed through native activities, with tiered fact prizes and milestones totaling6125Notes',()=>{
 const f=fixture();for(let index=0;index<30;index++){complete(f,'bach');assert.equal(f.store.learnFact('bach').fact.id,'bach-'+String(index+1).padStart(2,'0'));}
 assert.equal(f.store.snapshot().carriedIDs.length,30);assert.equal(f.store.startQuiz('bach').ok,false);const result=f.store.deposit();assert.equal(result.ok,true,result.error);assert.equal(result.amount,6125);assert.equal(f.wallet.snapshot().balance,6275);assert.equal(f.store.conversation('bach').quiz.eligible,true);assert.equal(f.store.conversation('bach').relationship.count,30);assert.equal(f.store.learnFact('bach').ok,false);
});
test('v1 discoveries migrate into recorded legacy knowledge with no retroactive fact or milestone prizes',()=>{
 const old=history.PEOPLE.bach.facts.map(fact=>fact.id),f=fixture({values:new Map([[history.KEY,JSON.stringify({version:1,discovered:old})]])});
 assert.equal(f.store.snapshot().recordedCount,30);assert.equal(f.store.snapshot().carriedIDs.length,0);assert.equal(f.store.deposit().amount,0);assert.equal(f.wallet.snapshot().balance,150);assert.deepEqual(JSON.parse(f.values.get(history.KEY)).legacy,old);
});
test('damaged history is never silently reset or overwritten and a failed save leaves new facts unclaimed',()=>{
 const f=fixture();complete(f,'bach');const original=f.values.get(history.KEY);f.setWriteHook(key=>{if(key===history.KEY)throw Error('quota');});assert.equal(f.store.learnFact('bach').ok,false);assert.equal(f.values.get(history.KEY),original);f.setWriteHook(null);assert.equal(f.store.conversation('bach').hasNewFact,true);
 for(const raw of ['bad JSON',JSON.stringify({version:9}),JSON.stringify({...JSON.parse(original),earned:['missing-id']})]){f.values.set(history.KEY,raw);assert.equal(f.store.snapshot().ok,false);assert.equal(f.store.acceptQuest('bach').ok,false);assert.equal(f.values.get(history.KEY),raw);}
});
test('a saved wallet payment followed by failed history acknowledgement retries without double-paying',()=>{
 const f=fixture();complete(f,'bach');f.store.learnFact('bach');let historyWrites=0;f.setWriteHook(key=>{if(key===history.KEY&&++historyWrites===2)throw Error('history acknowledgement failed');});
 const first=f.store.deposit();assert.equal(first.ok,false);assert.equal(f.wallet.snapshot().balance,200);f.setWriteHook(null);assert.equal(f.store.snapshot().pendingAmount,50);assert.equal(f.store.snapshot().carriedIDs.length,0);
 const retry=f.store.deposit();assert.equal(retry.ok,true);assert.equal(retry.amount,0);assert.equal(f.wallet.snapshot().balance,200);assert.equal(f.store.snapshot().pendingAmount,0);
});
test('unavailable wallets leave retryable reward intents without claiming Notes',()=>{
 const real=fixture(),missing=history.create({...real.api,wallet:{grantReward:()=>({ok:false,error:'wallet blocked'})}});complete({...real,store:missing},'bach');missing.learnFact('bach');assert.equal(missing.deposit().ok,false);assert.equal(missing.snapshot().pendingAmount,50);assert.equal(real.wallet.snapshot().balance,150);
 assert.equal(real.store.deposit().amount,50);assert.equal(real.wallet.snapshot().balance,200);
});
test('quiz locks require thirty deposited facts; attempts hide correct choices until grading, preserve best scores, and pay once',()=>{
 const f=fixture();assert.equal(f.store.startQuiz('bach').ok,false);f.setDev(true);assert.equal(f.store.developerSet('bach','recorded').ok,true);f.store.deposit();const before=f.wallet.snapshot().balance;
 assert.equal(f.store.startQuiz('bach').ok,true);assert.equal(f.store.quizState().total,10);assert.ok(f.store.quizState().questions.every(q=>!Object.hasOwn(q,'answer')));assert.equal(f.store.finishQuiz().ok,false);
 answerAll(f,3);const failed=f.store.finishQuiz();assert.equal(failed.score,70);assert.equal(failed.passed,false);assert.equal(f.wallet.snapshot().balance,before);assert.ok(failed.questions.every(q=>Object.hasOwn(q,'answer')&&typeof q.correct==='boolean'));
 f.store.startQuiz('bach');answerAll(f,2);const passed=f.store.finishQuiz();assert.equal(passed.score,80);assert.equal(passed.passed,true);assert.equal(passed.amount,2000);assert.equal(f.wallet.snapshot().balance,before+2000);assert.equal(f.store.finishQuiz().amount,0);
 f.store.startQuiz('bach');answerAll(f,0);assert.equal(f.store.finishQuiz().amount,0);assert.equal(f.store.conversation('bach').quiz.best,100);assert.equal(f.wallet.snapshot().balance,before+2000);
});
test('quiz owner changes invalidate answers and completion, and developer progression fails closed outside isolated tests',()=>{
 const f=fixture();assert.equal(f.store.developerSet('bach','recorded').ok,false);assert.equal(f.store.snapshot().count,0);f.setDev(true);f.store.developerSet('bach','recorded');f.store.startQuiz('bach');const question=f.store.quizState().questions[0];f.setOwner('different-player');assert.equal(f.store.quizState(),null);assert.equal(f.store.answerQuiz(question.id,0).ok,false);assert.equal(f.store.finishQuiz().ok,false);
});
test('developer stages apply only to selected collection and leave other people unchanged',()=>{
 const f=fixture();f.setDev(true);f.store.developerSet('bach','carried');f.store.developerSet('mozart','recorded');assert.equal(f.store.snapshot().count,31);f.store.developerSet('bach','reset');assert.equal(f.store.snapshot().count,30);assert.equal(f.store.conversation('mozart').recordedCount,30);assert.equal(f.wallet.snapshot().balance,150);
});


test('quiz completion rechecks recorded collection and all installment reward IDs clear on developer reset',()=>{
 const f=fixture();f.setDev(true);f.store.developerSet('bach','recorded');f.store.deposit();f.store.startQuiz('bach');answerAll(f);
 const changed=JSON.parse(f.values.get(history.KEY));changed.recorded.pop();changed.paid=[];changed.pending=[];f.values.set(history.KEY,JSON.stringify(changed));assert.equal(f.store.finishQuiz().ok,false);
 f.store.developerSet('bach','recorded');f.store.startQuiz('bach');answerAll(f);assert.equal(f.store.finishQuiz().ok,true);assert.equal(f.store.snapshot().paid.includes('scholar-quiz:bach:part-2'),true);assert.equal(f.store.developerSet('bach','reset').ok,true);assert.equal(f.store.snapshot().ok,true);assert.equal(f.store.snapshot().paid.some(id=>id.startsWith('scholar-quiz:bach')),false);
});
test('the complete18-person reward ledger stays valid through all648 idempotent payouts',()=>{
 const f=fixture();f.setDev(true);for(const person of Object.keys(history.PEOPLE))assert.equal(f.store.developerSet(person,'recorded').ok,true);
 const deposit=f.store.deposit();assert.equal(deposit.ok,true,deposit.error);assert.equal(f.store.snapshot().recordedCount,540);
 for(const person of Object.keys(history.PEOPLE)){assert.equal(f.store.startQuiz(person).ok,true);answerAll(f);assert.equal(f.store.finishQuiz().ok,true);}
 const snapshot=f.store.snapshot();assert.equal(snapshot.ok,true,snapshot.error);assert.equal(snapshot.paid.length,648);assert.equal(snapshot.pendingAmount,0);assert.equal(f.wallet.snapshot().balance,146400);assert.equal(f.store.deposit().amount,0);
});
