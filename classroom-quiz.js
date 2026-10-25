/* Short classroom checks. The lesson controller owns completion and XP. */
(function(root,factory){
 const notation=typeof module==='object'&&module.exports?require('./music-notation.js'):root?.CodaMusicNotation;
 const api=factory(notation);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CodaClassroomQuiz=api;
})(typeof window==='undefined'?null:window,function(notation){
 'use strict';
 const KEY='codaClassroomQuizzesV1',VERSION=1,PASS_SCORE=4;
 const quiz=(title,questions)=>Object.freeze({version:VERSION,title,passScore:PASS_SCORE,questions:Object.freeze(questions.map(item=>Object.freeze({...item,answers:Object.freeze(item.answers),visual:item.visual?Object.freeze(item.visual):null})))});
 const QUIZZES=Object.freeze({
  'note-naming':quiz('Note names',[
   {id:'find-c',prompt:'Which white key is just left of TWO black keys?',answers:['C','F','A'],correct:0,explanation:'C is the white key just to the left of two black keys.',visual:{kind:'piano',target:0}},
   {id:'find-f',prompt:'Which white key is just left of THREE black keys?',answers:['G','F','C'],correct:1,explanation:'F is the white key just to the left of three black keys.',visual:{kind:'piano',target:3}},
   {id:'after-g',prompt:'Which letter comes after G in the musical alphabet?',answers:['F','H','A'],correct:2,explanation:'The note letters are A B C D E F G. After G, start again at A.'},
   {id:'bottom-line',prompt:'What is the purple note on the BOTTOM treble line?',answers:['E','G','F'],correct:0,explanation:'Start at the bottom of the treble staff. Its bottom line is E.',visual:{kind:'staff',position:0}},
   {id:'second-space',prompt:'What is the purple note in the SECOND treble space?',answers:['B','A','C'],correct:1,explanation:'The treble spaces spell F A C E from bottom to top. The second space is A.',visual:{kind:'staff',position:3}}
  ]),
  'rhythm-tree':quiz('Note lengths',[
   {id:'half-length',prompt:'In 4/4, how many beats does a HALF note last?',answers:['1 beat','2 beats','4 beats'],correct:1,explanation:'A half note lasts two quarter-note beats. Count “1, 2”.',visual:{kind:'note',beats:2}},
   {id:'split-quarter',prompt:'How many EIGHTH notes last as long as one quarter note?',answers:['2 eighth notes','4 eighth notes','1 eighth note'],correct:0,explanation:'Split one quarter note into two equal pieces. Each piece is an eighth note.',visual:{kind:'note',beats:1}},
   {id:'whole-length',prompt:'In 4/4, how many beats does a WHOLE note last?',answers:['2 beats','1 beat','4 beats'],correct:2,explanation:'A whole note fills four quarter-note beats: “1, 2, 3, 4”.',visual:{kind:'note',beats:4}},
   {id:'split-sixteenths',prompt:'How many SIXTEENTH notes fit inside one quarter-note beat?',answers:['2 sixteenth notes','4 sixteenth notes','8 sixteenth notes'],correct:1,explanation:'Four sixteenth notes share one quarter-note beat. Say “1-e-and-a”.',visual:{kind:'note',beats:1}},
   {id:'four-beat-bar',prompt:'Which group fills exactly FOUR beats in 4/4?',answers:['1 quarter + 2 eighths + 1 half','1 half + 1 quarter','1 quarter + 1 eighth'],correct:0,explanation:'The quarter fills beat 1. Two eighths share beat 2. The half note fills beats 3 and 4.'}
  ]),
  'time-signatures':quiz('Time signatures',[
   {id:'four-four',prompt:'How many quarter-note beats are in one 4/4 bar?',answers:['2 beats','6 beats','4 beats'],correct:2,explanation:'In 4/4, count four quarter-note beats, then begin a new bar at ONE.',visual:{kind:'meter',meter:'4/4'}},
   {id:'six-eight-pulse',prompt:'How many BIG beats do we usually feel in 6/8?',answers:['6 big beats','2 big beats','3 big beats'],correct:1,explanation:'Feel TWO big beats: ONE-la-li, TWO-la-li. Each big beat has three small parts.',visual:{kind:'meter',meter:'6/8'}},
   {id:'cut-time-unit',prompt:'Which note gets one BIG beat in cut time?',answers:['Half note','Quarter note','Eighth note'],correct:0,explanation:'Cut time is 2/2. Each half note gets one big beat.',visual:{kind:'meter',meter:'2/2'}},
   {id:'six-eight-count',prompt:'Which count matches the two groups in 6/8?',answers:['ONE, two, three, four','ONE-and, TWO-and','ONE-la-li, TWO-la-li'],correct:2,explanation:'Six eighth-note lengths form two groups of three: ONE-la-li, TWO-la-li.',visual:{kind:'meter',meter:'6/8'}},
   {id:'cut-time-bar',prompt:'Which notes fill one cut-time bar with TWO big beats?',answers:['2 quarter notes','2 half notes','6 eighth notes'],correct:1,explanation:'Two half notes fill a 2/2 bar. Count ONE-and, TWO-and.',visual:{kind:'meter',meter:'2/2'}}
  ]),
  'bass-clef':quiz('Bass clef',[
   {id:'bass-bottom',prompt:'What is the purple note on the BOTTOM bass line?',answers:['G','E','A'],correct:0,explanation:'Count bass lines from the bottom: G B D F A. Great Big Dreams For America.',visual:{kind:'staff',clef:'bass',position:0}},
   {id:'bass-middle',prompt:'What is the purple note on the MIDDLE bass line?',answers:['B','D','F'],correct:1,explanation:'Great Big Dreams For America gives G B D F A. The third line is D.',visual:{kind:'staff',clef:'bass',position:4}},
   {id:'bass-dots',prompt:'Which note sits on the line between the bass clef’s two dots?',answers:['A','C','F'],correct:2,explanation:'The dots sit around the F line. It is the fourth line from the bottom.',visual:{kind:'staff',clef:'bass',position:6}},
   {id:'bass-space',prompt:'What is the purple note in the SECOND bass space?',answers:['C','A','E'],correct:0,explanation:'All Cows Eat Grass gives A C E G, bottom to top. The second space is C.',visual:{kind:'staff',clef:'bass',position:3}},
   {id:'bass-top-space',prompt:'What is the purple note in the TOP bass space?',answers:['E','G','F'],correct:1,explanation:'The bass spaces are A C E G. Grass reminds us that the top space is G.',visual:{kind:'staff',clef:'bass',position:7}}
  ]),
  'grand-staff':quiz('Grand staff & Middle C',[
   {id:'grand-treble',prompt:'Read the purple note on the UPPER staff. What is its letter?',answers:['E','G','C'],correct:0,explanation:'Check the clef first. The upper staff has treble clef, so its bottom line is E.',visual:{kind:'staff',clef:'treble',grand:true,position:0}},
   {id:'grand-bass',prompt:'Read the purple note on the LOWER staff. What is its letter?',answers:['B','D','F'],correct:1,explanation:'The lower staff has bass clef. Its middle line is D: Great Big Dreams For America.',visual:{kind:'staff',clef:'bass',grand:true,position:4}},
   {id:'middle-c-treble',prompt:'What is the note on the little line BELOW the treble staff?',answers:['A','E','C'],correct:2,explanation:'Middle C sits on one short ledger line below the treble staff.',visual:{kind:'staff',clef:'treble',grand:true,position:-2}},
   {id:'middle-c-bass',prompt:'What is the note on the little line ABOVE the bass staff?',answers:['C','G','B'],correct:0,explanation:'Middle C also sits on one short ledger line above the bass staff.',visual:{kind:'staff',clef:'bass',grand:true,position:10}},
   {id:'middle-c-same',prompt:'Middle C is written below treble or above bass. What stays the same?',answers:['It becomes a rest','It must sound different','It is the same piano key and sound'],correct:2,explanation:'These are two ways to write the same Middle C. The clef changes how we find its place.'}
  ])
 });
 const xml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
 function staffSVG(position,options={}){
  const clef=options.clef==='bass'?'bass':'treble';
  function single(at,name){
   let svg=notation.staffSVG(at,{label:options.label||(name==='bass'?'Bass':'Treble')+' staff. Read the purple notehead’s line or space.'});
   if(name==='bass')svg=svg.replace('class="coda-music-glyph staff-clef" x="36" y="105"','class="coda-music-glyph staff-clef" x="36" y="65"').replace(notation.glyph('gClef'),notation.glyph('fClef'));
   return svg.replace('class="lesson-staff coda-notated-staff"','class="lesson-staff coda-notated-staff" data-staff-clef="'+name+'"');
  }
  if(!options.grand)return single(position,clef);
  function inner(name){
   let svg=single(name===clef?position:0,name);svg=svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>')).replace(/<rect[^>]*\/>/,'');
   if(name!==clef)svg=svg.replace(/<text class="coda-music-glyph staff-note"[^>]*>[\s\S]*?<\/text>/,'').replace(/<path[^>]*class="staff-ledger"[^>]*\/>/g,'');
   return '<g data-staff-clef="'+name+'"'+(name==='bass'?' transform="translate(0 120)"':'')+'>'+svg+'</g>';
  }
  return '<svg class="lesson-staff coda-notated-staff lesson-grand-staff" viewBox="0 0 340 290" role="img" aria-label="'+xml(options.label||'Grand staff: treble above bass. Read the purple notehead.')+'"><rect x="1" y="1" width="338" height="288" rx="12" fill="#f9f2df"/><path d="M17 45C4 45 16 115 7 133C3 141 3 149 7 157C16 175 4 245 17 245M22 45V245M320 45V245" fill="none" stroke="#5f526d" stroke-width="2"/>'+inner('treble')+inner('bass')+'</svg>';
 }
 const copy=value=>JSON.parse(JSON.stringify(value));
 const scoreFor=(id,answers)=>!QUIZZES[id]||!Array.isArray(answers)?0:QUIZZES[id].questions.reduce((score,item,index)=>score+(answers[index]===item.correct?1:0),0);
 function cleanAnswers(id,answers){
  const questions=QUIZZES[id].questions,result=[];if(!Array.isArray(answers))return result;
  for(let index=0;index<Math.min(answers.length,questions.length);index++){
   const answer=answers[index];if(!Number.isInteger(answer)||answer<0||answer>=questions[index].answers.length)break;result.push(answer);
  }return result;
 }
 const blank=()=>({bankVersion:VERSION,index:0,answers:[],bestAnswers:[],completedAt:0});
 function normalize(raw){
  const result={version:VERSION,quizzes:{}};
  for(const id of Object.keys(QUIZZES)){
   const saved=raw?.version===VERSION?raw.quizzes?.[id]:null,record=blank();
   if(saved?.bankVersion===QUIZZES[id].version){
    record.answers=cleanAnswers(id,saved.answers);
    record.index=Math.max(0,Math.min(record.answers.length,Number.isInteger(saved.index)?saved.index:record.answers.length));
    const best=cleanAnswers(id,saved.bestAnswers);
    if(best.length===QUIZZES[id].questions.length)record.bestAnswers=best;
    if(record.answers.length===QUIZZES[id].questions.length&&scoreFor(id,record.answers)>=scoreFor(id,record.bestAnswers))record.bestAnswers=[...record.answers];
    if(record.answers.length===QUIZZES[id].questions.length&&Number.isFinite(saved.completedAt)&&saved.completedAt>0)record.completedAt=saved.completedAt;
   }
   result.quizzes[id]=record;
  }return result;
 }
 function resolveStorage(storage,win){if(storage!==undefined)return storage;try{return win?.localStorage??(typeof localStorage==='undefined'?null:localStorage);}catch{return null;}}
 function readJournal(storage){let raw=null;try{raw=JSON.parse(storage?.getItem(KEY)||'null');}catch{}return normalize(raw);}
 function createSession(api={}){
  const lessonId=api.lessonId,model=QUIZZES[lessonId];if(!model)throw Error('Choose a known classroom quiz.');
  const storage=resolveStorage(api.storage),record=copy(readJournal(storage).quizzes[lessonId]);let saved=!!storage,error='';
  function getState(){const total=model.questions.length,finished=record.answers.length===total,score=scoreFor(lessonId,record.answers);return{lessonId,index:record.index,total,passScore:model.passScore,answers:[...record.answers],score,finished,phase:record.index>=total?'result':'question',passed:finished&&score>=model.passScore,saved,error,bestScore:scoreFor(lessonId,record.bestAnswers),bankVersion:model.version};}
  function save(){
   try{if(!storage||typeof storage.setItem!=='function')throw Error('storage');const journal=readJournal(storage);journal.quizzes[lessonId]=copy(record);storage.setItem(KEY,JSON.stringify(journal));saved=true;error='';return true;}
   catch{saved=false;error='Your quiz result could not be saved. You can keep going, then try saving again.';return false;}
  }
  function answer(index){
   if(record.index>=model.questions.length||record.answers.length>record.index||!Number.isInteger(index)||index<0||index>=model.questions[record.index].answers.length)return false;
   record.answers.push(index);
   if(record.answers.length===model.questions.length){record.completedAt=Date.now();if(scoreFor(lessonId,record.answers)>=scoreFor(lessonId,record.bestAnswers))record.bestAnswers=[...record.answers];}
   save();return true;
  }
  function next(){if(record.index>=model.questions.length||record.answers.length<=record.index)return false;record.index++;save();return true;}
  function restart(){record.index=0;record.answers=[];record.completedAt=0;save();return getState();}
  return{getState,answer,next,restart,save};
 }
 function create(api={}){
  const host=api.host;if(!host)throw Error('A classroom quiz needs a host.');
  const doc=host.ownerDocument,win=doc.defaultView,lessonId=api.lessonId,model=QUIZZES[lessonId];if(!model)throw Error('Choose a known classroom quiz.');
  const session=createSession({lessonId,storage:resolveStorage(api.storage,win)});let target=host,destroyed=false,reported=false;
  const element=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const button=(text,fn,attr)=>{const node=element('button','',text);node.type='button';if(attr)node.setAttribute(attr,'');node.onclick=fn;return node;};
  function focusQuestion(){const heading=target.querySelector('.classroom-quiz-question,.classroom-quiz-result-title');heading?.focus({preventScroll:true});target.querySelector('.classroom-quiz')?.scrollIntoView({block:'start',behavior:'auto'});}
  function visual(parent,value){
   if(!value||!notation)return;
   const figure=element('div','classroom-quiz-visual');
   if(value.kind==='staff')figure.innerHTML=staffSVG(value.position,value);
   else if(value.kind==='note'){figure.setAttribute('role','img');figure.setAttribute('aria-label','The note shown in the question');figure.innerHTML=notation.glyphSVG(value.beats,{colour:'#fff0cf'});}
   else if(value.kind==='piano'){
    let keys='';for(let index=0;index<8;index++)keys+='<rect x="'+(index*50+1)+'" y="15" width="48" height="88" rx="3" fill="'+(index===value.target?'#f5d98d':'#faf6e8')+'" stroke="#59445d"/>';
    for(const at of [1,2,4,5,6])keys+='<rect x="'+(at*50-14)+'" y="15" width="28" height="50" rx="2" fill="#29233b"/>';
    figure.innerHTML='<svg viewBox="0 0 400 110" role="img" aria-label="Piano keyboard. The key in the question is gold.">'+keys+'</svg>';
   }else if(value.kind==='meter'){
    const canvas=element('canvas');canvas.width=120;canvas.height=110;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',value.meter==='2/2'?'Cut time sign':value.meter+' time signature');
    const draw=()=>{if(destroyed)return;const g=canvas.getContext('2d');g.clearRect(0,0,120,110);notation.drawTimeSignature(g,{x:60,y:58,meter:value.meter,fontSize:76,color:'#fff0cf'});};figure.append(canvas);draw();notation.load?.(doc)?.then?.(draw);
   }parent.append(figure);notation.load?.(doc);
  }
  function saveHelp(parent,state){if(state.saved)return;const box=element('div','classroom-quiz-save-help');box.setAttribute('role','status');box.append(element('p','',state.error||'Your quiz progress is not saved yet.'));box.append(button('Try saving quiz again',()=>{session.save();render();},'data-quiz-save'));parent.append(box);}
  function finish(){
   const state=session.getState();if(reported||!state.passed||state.phase!=='result')return;
   if(!session.save()){render();return;}
   reported=true;api.onPassed?.({...session.getState(),passed:true});
  }
  function renderResult(parent,state){
   const title=element('h3','classroom-quiz-result-title',state.passed?'Quiz passed!':'Keep practising—you can try again');title.tabIndex=-1;
   parent.append(title,element('p','classroom-quiz-score',state.score+' of '+state.total+' correct'));
   parent.append(element('p','classroom-quiz-result-copy',state.passed?'You checked what you learned. Choose Finish lesson to complete it.':'You need '+state.passScore+' of '+state.total+' to pass. Read the helpful reminders below, then try the quiz again.'));
   const review=element('div','classroom-quiz-review');
   model.questions.forEach((item,index)=>{if(state.answers[index]===item.correct)return;const row=element('section');row.append(element('h4','',item.prompt),element('p','','Answer: '+item.answers[item.correct]),element('p','',item.explanation));review.append(row);});if(review.childNodes.length){review.setAttribute('aria-label','Review the questions to practise');parent.append(review);}
   saveHelp(parent,state);
   if(state.passed)parent.append(button('Finish lesson',finish,'data-quiz-finish'));
   parent.append(button(state.passed?'Try the quiz again':'Try quiz again',()=>{session.restart();reported=false;render();focusQuestion();},'data-quiz-retry'));
  }
  function render(nextTarget){
   if(destroyed)return;if(nextTarget)target=nextTarget;const state=session.getState();target.replaceChildren();
   const panel=element('section','classroom-quiz');panel.dataset.quizLesson=lessonId;panel.setAttribute('aria-label',model.title+' end-of-lesson quiz');target.append(panel);
   const topline=element('div','classroom-quiz-topline');topline.append(element('span','',model.title+' · Quiz'),element('span','',state.phase==='result'?'Quiz finished':'Question '+(state.index+1)+' of '+state.total));panel.append(topline);
   const progress=element('progress');progress.max=state.total;progress.value=state.answers.length;progress.setAttribute('aria-label','Quiz questions answered');panel.append(progress);
   if(state.phase==='result'){renderResult(panel,state);return;}
   const question=model.questions[state.index],answered=state.answers.length>state.index;
   if(state.index===0)panel.append(element('p','classroom-quiz-intro','Choose one answer at a time. Get '+state.passScore+' of '+state.total+' correct to pass. No timer—you can try again.'));
   const heading=element('h3','classroom-quiz-question',question.prompt);heading.tabIndex=-1;panel.append(heading);visual(panel,question.visual);
   const answers=element('div','classroom-quiz-answers');answers.setAttribute('role','group');answers.setAttribute('aria-label','Choose one answer');
   question.answers.forEach((text,index)=>{const choose=button(text,()=>{if(!session.answer(index))return;render();target.querySelector('[data-quiz-next]')?.focus({preventScroll:true});});choose.dataset.quizAnswer=index;choose.disabled=answered;choose.setAttribute('aria-pressed',String(answered&&state.answers[state.index]===index));if(answered&&index===question.correct)choose.classList.add('is-correct');if(answered&&state.answers[state.index]===index&&index!==question.correct)choose.classList.add('is-incorrect');answers.append(choose);});panel.append(answers);
   const feedback=element('p','classroom-quiz-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
   if(answered){const correct=state.answers[state.index]===question.correct;feedback.dataset.correct=String(correct);feedback.textContent=(correct?'That’s right! ':'Not quite. The answer is '+question.answers[question.correct]+'. ')+question.explanation;}
   panel.append(feedback);saveHelp(panel,state);
   const next=button(state.index===state.total-1?'See my results':'Next question',()=>{if(!session.next())return;render();focusQuestion();},'data-quiz-next');next.disabled=!answered;panel.append(next);
  }
  return{render,restart(){reported=false;return session.restart();},getState:session.getState,destroy(){destroyed=true;}};
 }
 return{KEY,VERSION,PASS_SCORE,QUIZZES,scoreFor,normalize,staffSVG,createSession,create};
});
