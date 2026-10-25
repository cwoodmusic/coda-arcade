/* Hands-on music lessons. Numeric pitches stay inside the audio engine. */
(function(root,factory){const node=typeof module==='object'&&module.exports,notation=node?require('./music-notation.js'):root?.CodaMusicNotation,timeLesson=node?require('./time-signature-lesson.js'):root?.CodaTimeSignatureLesson;const quizModule=node?require('./classroom-quiz.js'):root?.CodaClassroomQuiz;const api=factory(notation,timeLesson,quizModule);if(node)module.exports=api;if(root)root.CodaClassroomTutorials=api;})(typeof window!=='undefined'?window:null,function(notation,timeLesson,quizModule){
 'use strict';
 const KEY='codaClassroomLessonsV1';
 const VALUES=Object.freeze([
  {units:16,name:'whole',label:'Whole note',beats:'4 beats',count:1},
  {units:8,name:'half',label:'Half note',beats:'2 beats',count:2},
  {units:4,name:'quarter',label:'Quarter note',beats:'1 beat',count:4},
  {units:2,name:'eighth',label:'Eighth note',beats:'half a beat',count:8},
  {units:1,name:'sixteenth',label:'Sixteenth note',beats:'a quarter of a beat',count:16}
 ].map(Object.freeze));
 const NOTE_STEPS=Object.freeze([
  {
    "kind": "keys",
    "answer": "C",
    "pitch": 60,
    "prompt": "Tap C on the white keys below.",
    "teach": "Piano notes use seven letters: A B C D E F G. Then the letters repeat.",
    "example": "Find TWO black keys together. The white key just to their left is C.",
    "hint": "Find the two black keys. Tap the white key immediately to their left."
  },
  {
    "kind": "keys",
    "answer": "F",
    "pitch": 65,
    "prompt": "Tap F on the white keys below.",
    "teach": "Black keys also make groups of THREE. You can use that group to find F.",
    "example": "The white key just to the left of THREE black keys is F.",
    "hint": "Find the three black keys. Tap the white key immediately to their left."
  },
  {
    "kind": "keys",
    "answer": "D",
    "pitch": 62,
    "prompt": "Tap D on the white keys below.",
    "teach": "Move right to follow the note letters: C, D, E, F, G, A, B.",
    "example": "C → D: move ONE white key to the right from C.",
    "hint": "Find C beside the two black keys. D is the next white key to its right."
  },
  {
    "kind": "keys",
    "answer": "A",
    "pitch": 69,
    "prompt": "Tap A on the white keys below.",
    "teach": "After G, the next letter is A. The musical alphabet starts again.",
    "example": "F → G → A: start on F and move TWO white keys to the right.",
    "hint": "Find F beside the three black keys. Move right to G, then right once more to A."
  },
  {
    "kind": "staff",
    "answer": "E",
    "pitch": 64,
    "position": 0,
    "prompt": "Tap the letter for the purple note.",
    "teach": "The same note letters can be shown on five lines called a staff. Read the round notehead, not its tall stem.",
    "example": "Start at the BOTTOM line. A note on that line is E.",
    "hint": "The purple circle sits ON the bottom line. That line is E. Tap E below."
  },
  {
    "kind": "staff",
    "answer": "F",
    "pitch": 65,
    "position": 1,
    "prompt": "Tap the letter for the purple note.",
    "teach": "Notes can sit on a line or in a space between two lines. Count upward from the bottom.",
    "example": "Bottom line E → first SPACE F.",
    "hint": "The circle is in the first space above the bottom line. E → F. Tap F."
  },
  {
    "kind": "staff",
    "answer": "G",
    "pitch": 67,
    "position": 2,
    "prompt": "Tap the letter for the purple note.",
    "teach": "Each next line or space moves one letter forward.",
    "example": "Bottom line E → space F → next LINE G.",
    "hint": "Start on bottom-line E. Count E, F, G. This note is G."
  },
  {
    "kind": "staff",
    "answer": "A",
    "pitch": 69,
    "position": 3,
    "prompt": "Tap the letter for the purple note.",
    "teach": "The spaces spell FACE (F A C E), starting at the bottom space.",
    "example": "First space F → second SPACE A.",
    "hint": "Count only the spaces from the bottom: F, A. Tap A."
  },
  {
    "kind": "staff",
    "answer": "B",
    "pitch": 71,
    "position": 4,
    "prompt": "Tap the letter for the purple note.",
    "teach": "The line letters are E G B D F, starting at the bottom line. Remember: Every Good Boy Does Fine.",
    "example": "First line E → second line G → middle LINE B.",
    "hint": "Count only the lines from the bottom: E, G, B. Tap B."
  },
  {
    "kind": "staff",
    "answer": "C",
    "pitch": 72,
    "position": 5,
    "prompt": "Tap the letter for the purple note.",
    "teach": "Use the space letters F A C E again. Count from the bottom space.",
    "example": "First space F → second space A → third SPACE C.",
    "hint": "Count the spaces: F, A, C. The note is in the third space. Tap C."
  }
].map(Object.freeze));
 const staffStep=(clef,position,answer,pitch,teach,example,hint,grand=false)=>Object.freeze({kind:'staff',clef,grand,position,answer,pitch,prompt:'Check the clef. Tap the letter for the purple note.',teach,example,hint});
 const BASS_STEPS=Object.freeze([
  staffStep('bass',0,'G',43,'Bass clef helps us read lower sounds. It has a curved shape and two dots. Keep counting lines from the bottom.','Bass lines, bottom to top: G B D F A. Remember: Great Big Dreams For America.','The note sits on the bottom bass line. Great begins with G. Tap G.'),
  staffStep('bass',2,'B',47,'Each word helps you remember one LINE: Great Big Dreams For America. Start at the bottom every time.','First line G → second line B. Big begins with B.','Count only the lines: G, B. This note is B.'),
  staffStep('bass',4,'D',50,'The middle line is the third of the five lines. Find a line you know, then count upward.','Great Big Dreams: G, B, D. The middle line is D.','The purple head sits on the middle line. Dreams begins with D.'),
  staffStep('bass',6,'F',53,'The bass clef’s two dots sit on either side of the F line. Use that line as a landmark.','G B D F A: F is the fourth line from the bottom.','Find the line between the two dots. That line is F.'),
  staffStep('bass',8,'A',57,'Finish the five line names: Great Big Dreams For America. Read upward from the bottom.','G B D F A: America gives A on the top line.','The top line is the fifth line. America begins with A.'),
  staffStep('bass',1,'A',45,'Spaces have their own reminder. Bass spaces, bottom to top: A C E G. Remember: All Cows Eat Grass.','The first bass SPACE is A. All begins with A.','The round head is between the bottom two lines. The bottom space is A.'),
  staffStep('bass',3,'C',48,'For a space note, use All Cows Eat Grass. Count spaces from the bottom.','First space A → second space C.','Count only spaces: All, Cows. Cows begins with C.'),
  staffStep('bass',5,'E',52,'Keep the lines and spaces separate when using a reminder. This note sits in a space.','All Cows Eat: A, C, E. The third space is E.','Count three spaces upward: A, C, E. Tap E.'),
  staffStep('bass',7,'G',55,'You can now use both bass reminders: Great Big Dreams For America for lines; All Cows Eat Grass for spaces.','A C E G: Grass gives G in the top space.','The note sits in the fourth space. Grass begins with G.')
 ]);
 const GRAND_STEPS=Object.freeze([
  staffStep('treble',0,'E',64,'A grand staff joins two staffs: treble above bass. Check which clef belongs to the purple note before naming it.','Treble lines, bottom to top: Every Good Boy Does Fine = E G B D F.','This note belongs to the upper, treble staff. Its bottom line is E.',true),
  staffStep('bass',0,'G',43,'The lower staff uses bass clef. A note in the same place on a different clef can have a different letter.','Bass lines, bottom to top: Great Big Dreams For America = G B D F A.','This note belongs to the lower, bass staff. Its bottom line is G.',true),
  staffStep('treble',3,'A',69,'Treble spaces spell FACE. Count F A C E from the bottom space of the upper staff.','First treble space F → second treble space A.','Check the treble clef, then count two spaces: F, A.',true),
  staffStep('bass',3,'C',48,'Bass spaces use All Cows Eat Grass. Count A C E G from the bottom space of the lower staff.','First bass space A → second bass space C.','Check the bass clef, then count two spaces: A, C.',true),
  staffStep('treble',-2,'C',60,'A short extra line is a ledger line. Middle C sits on one ledger line BELOW the treble staff, between the two staffs.','Middle C → D in the space → E on the bottom treble line.','Find the little line below treble. The note on it is Middle C. Tap C.',true),
  staffStep('bass',10,'C',60,'Middle C can also sit on one ledger line ABOVE the bass staff. It is the SAME piano key and sound as Middle C below treble.','Top bass line A → space B → ledger line Middle C.','Find the little line above bass. It is another way to write Middle C. Tap C.',true),
  staffStep('treble',-1,'D',62,'Use Middle C as a stepping stone. Each next line or space moves one letter forward.','Middle C on its little line → D in the space just above it → E on the treble staff.','The note is one place above Middle C and just below the bottom treble line. C → D.',true),
  staffStep('bass',9,'B',59,'Middle C connects the two staffs. You can count down from it as well as up from it.','Top bass line A → space B → Middle C on its little line.','The note is one place below Middle C and just above the top bass line. C → B.',true)
 ]);
 const NOTE_LESSONS=Object.freeze({'note-naming':NOTE_STEPS,'bass-clef':BASS_STEPS,'grand-staff':GRAND_STEPS});
 const LESSONS=Object.freeze([{id:'note-naming',title:'Note naming',total:NOTE_STEPS.length},{id:'rhythm-tree',title:'The rhythm tree',total:4},timeLesson?.LESSON||{id:'time-signatures',title:'Time signatures',total:8},{id:'bass-clef',title:'Bass clef',total:BASS_STEPS.length},{id:'grand-staff',title:'Grand staff & Middle C',total:GRAND_STEPS.length}].map(Object.freeze));
 const SIMPLE_NOTE_COPY=Object.freeze({
  'note-naming':Object.freeze([
   ['Two black keys help us find C.','C','Tap C.','C is beside two black keys.'],
   ['Three black keys help us find F.','F','Tap F.','F is beside three black keys.'],
   ['D is one white key after C.','C → D','Tap D.','Find C. Move one white key right.'],
   ['After G, the letters start again at A.','G → A','Tap A.','Find F. Move two white keys right.'],
   ['These five lines are a staff.','Bottom line: E','Name the purple note.','The bottom line is E.'],
   ['Notes also fit in the spaces.','First space: F','Name the purple note.','The first space is F.'],
   ['Move up one line or space at a time.','E → F → G','Name the purple note.','Count upward: E, F, G.'],
   ['Treble spaces, bottom to top: FACE.','Bottom to top: F · A · C · E','Name the purple note.','Start at the bottom space: F, A.'],
   ['Treble lines, bottom to top: Every Good Boy Does Fine.','Bottom to top: E · G · B · D · F','Name the purple note.','Start at the bottom line: Every, Good, Boy. B!'],
   ['Read FACE from the bottom space to the top.','Bottom to top: F · A · C · E','Name the purple note.','Start at the bottom space: F, A, C.']
  ].map(Object.freeze)),
  'bass-clef':Object.freeze([
   ['Bass clef helps us read low notes.','Bottom line: G','Name the purple note.','The bottom bass line is G.'],
   ['Bass lines, bottom to top: Great Big Dreams For America.','Bottom to top: G · B · D · F · A','Name the purple note.','Start at the bottom line: Great, Big. B!'],
   ['Count the lines from the bottom.','Middle line: D','Name the purple note.','Great, Big, Dreams. This line is D.'],
   ['The two dots point to F.','Between the dots: F','Name the purple note.','The line between the dots is F.'],
   ['Read the five lines from bottom to top.','Top line: A','Name the purple note.','America reminds us of A.'],
   ['Bass spaces, bottom to top: All Cows Eat Grass.','Bottom to top: A · C · E · G','Name the purple note.','Start at the bottom space. All reminds us of A.'],
   ['Count only the spaces, from bottom to top.','Second space: C','Name the purple note.','Start at the bottom space: All, Cows. C!'],
   ['Move up one more space.','Third space: E','Name the purple note.','Start at the bottom space: All, Cows, Eat. E!'],
   ['Bottom to top: All Cows Eat Grass names the spaces.','Top space: G','Name the purple note.','Start at the bottom space. Grass is last: G.']
  ].map(Object.freeze)),
  'grand-staff':Object.freeze([
   ['Two staffs work together.','Top staff: treble','Name the purple note.','Treble lines, bottom to top: Every Good Boy Does Fine.'],
   ['The bottom staff uses bass clef.','Bottom line: G','Name the purple note.','Bass lines, bottom to top: Great Big Dreams For America.'],
   ['Treble spaces, bottom to top: FACE.','Second space: A','Name the purple note.','Start at the bottom treble space: F, A.'],
   ['Bass spaces, bottom to top: All Cows Eat Grass.','Second space: C','Name the purple note.','Start at the bottom bass space: A, C.'],
   ['Middle C has its own tiny line.','Below treble: Middle C','Name the purple note.','The tiny line belongs to Middle C.'],
   ['This is the same Middle C.','Above bass: Middle C','Name the purple note.','It is the same piano key: C.'],
   ['D is one step above Middle C.','C → D','Name the purple note.','Start at Middle C. Move up to D.'],
   ['B is one step below Middle C.','C → B','Name the purple note.','Start at Middle C. Move down to B.']
  ].map(Object.freeze))
 });
 function splitExample(level){
  level=Number.isInteger(level)?Math.max(0,Math.min(4,level)):0;const units=VALUES[level].units,notes=Array(level===0?1:2).fill(units);
  return {level,parentUnits:level?VALUES[level-1].units:null,notes,counts:notes.reduce((sum,n)=>sum+n,0)/4};
 }
 function validBar(notes){return Array.isArray(notes)&&notes.length>0&&notes.every(note=>VALUES.some(value=>value.units===note))&&notes.reduce((sum,note)=>sum+note,0)===16;}
 function beatCount(units){const whole=Math.floor(units/4),fraction=['','¼','½','¾'][units%4];return (whole?String(whole):'')+fraction||'0';}
 function defaultProgress(){return {version:1,lessons:Object.fromEntries(LESSONS.map(lesson=>[lesson.id,{step:0,completed:false,completedAt:0}]))};}
 function normalize(raw){const state=defaultProgress();if(!raw||raw.version!==1||!raw.lessons||typeof raw.lessons!=='object')return state;for(const lesson of LESSONS){const saved=raw.lessons[lesson.id];if(saved&&Number.isInteger(saved.step)&&saved.step>=0&&saved.step<=lesson.total){state.lessons[lesson.id]={step:saved.step,completed:saved.completed===true&&saved.step===lesson.total,completedAt:Number.isFinite(saved.completedAt)&&saved.completedAt>=0?saved.completedAt:0};}}return state;}
 function storageFor(storage){if(storage!==undefined)return storage;try{return window.localStorage;}catch{return null;}}
 function readProgress(storage){storage=storageFor(storage);let data=defaultProgress(),persistent=false,error='';try{data=normalize(JSON.parse(storage?.getItem(KEY)||'null'));persistent=!!storage;}catch{error='Lesson progress could not be read.';}const lessons=LESSONS.map(lesson=>({...lesson,...data.lessons[lesson.id]})),completed=lessons.filter(lesson=>lesson.completed).map(lesson=>lesson.id);return {version:1,lessons,completed,completedCount:completed.length,total:LESSONS.length,persistent,error};}
 function glyph(units,colour='currentColor'){return notation.glyphSVG(units/4,{colour});}
 function staffSVG(position,options={}){return (quizModule?.staffSVG||notation.staffSVG)(position,options);}
 function treeSVG(level){let lines='',nodes='';for(let row=0;row<=level;row++){const count=2**row,y=28+row*58;for(let at=0;at<count;at++){const x=(at+.5)*800/count;if(row){const px=(Math.floor(at/2)+.5)*800/(count/2);lines+='<path d="M'+px+' '+(y-45)+'L'+x+' '+(y-13)+'" stroke="#8c76b6" stroke-width="2"/>';}nodes+='<g data-tree-level="'+row+'" data-tree-index="'+at+'" transform="translate('+(x-14)+' '+(y-18)+')" color="'+(row===level?'#b8ffdd':'#d4bdeb')+'">'+glyph(VALUES[row].units).replace('<svg ','<svg x="0" y="0" ').replace('width="30" height="36"','width="28" height="34"')+'</g>';}}return '<svg viewBox="0 0 800 '+(55+level*58)+'" class="lesson-tree-picture" style="--lesson-tree-min-width:'+(2**level*40)+'px" aria-hidden="true" focusable="false">'+lines+nodes+'</svg>';}
 function create(api={}){
  const host=api.host;if(!host)throw Error('A tutorial needs a host element.');const doc=host.ownerDocument,win=doc.defaultView,storage=storageFor(api.storage);
  let id=null,step=0,learningStage='look',answered=false,complete=false,message='',correct=null,level=0,explored=new Set([0]),bar=[],names=false,hintShown=false,quizzing=false,quiz=null,freshQuiz=false,award=null,error='',destroyed=false,audio=null,voices=[],timers=[];
  const signatureLesson=timeLesson?.create({host,notation,onCorrect:()=>{if(complete||answered)return;answered=true;persist(step+1);const progress=host.querySelector('progress');if(progress)progress.value=step+1;},onNext:next});
  const element=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  function button(text,action,attributes={}){const node=element('button','',text);node.type='button';for(const [key,value]of Object.entries(attributes))node.setAttribute(key,value);node.onclick=action;return node;}
  function stopAudio(){signatureLesson?.stopAudio();for(const timer of timers)win.clearTimeout(timer);timers=[];for(const voice of voices)try{voice.stop();}catch{}voices=[];if(audio){audio.close().catch(()=>{});audio=null;}for(const node of host.querySelectorAll('.is-playing'))node.classList.remove('is-playing');}
  function play(notes,{rhythm=false,treeLevel=null}={}){
   stopAudio();const Constructor=api.AudioContext||win.AudioContext||win.webkitAudioContext;if(!Constructor){feedback('You can still try every question without sound.',null);return;}
   try{audio=new Constructor();audio.resume().catch(()=>{});const context=audio,beat=.55;let at=context.currentTime+.05;
    notes.forEach((note,index)=>{const length=rhythm?note/4*beat:.38,pitch=rhythm?67:note,osc=context.createOscillator(),gain=context.createGain();osc.type='triangle';osc.frequency.value=440*2**((pitch-69)/12);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.11,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+Math.max(.04,length*.92));osc.connect(gain).connect(context.destination);osc.start(at);osc.stop(at+length);voices.push(osc);
     if(rhythm){const start=(at-context.currentTime)*1000;timers.push(win.setTimeout(()=>host.querySelector(treeLevel===null?'[data-pattern-index="'+index+'"]':'[data-tree-level="'+treeLevel+'"][data-tree-index="'+(index%2)+'"]')?.classList.add('is-playing'),start));timers.push(win.setTimeout(()=>host.querySelector(treeLevel===null?'[data-pattern-index="'+index+'"]':'[data-tree-level="'+treeLevel+'"][data-tree-index="'+(index%2)+'"]')?.classList.remove('is-playing'),start+length*1000));}at+=rhythm?length:.44;
    });timers.push(win.setTimeout(stopAudio,(at-context.currentTime+.2)*1000));
   }catch{stopAudio();feedback('Sound could not start. You can still try the lesson.',null);}
  }
  function feedback(text,isCorrect){message=text;correct=isCorrect;const status=host.querySelector('.tutorial-feedback');if(status){status.textContent=text;status.dataset.correct=String(isCorrect);}}
  function persist(nextStep,finished=false){let data;try{data=normalize(JSON.parse(storage?.getItem(KEY)||'null'));const old=data.lessons[id];data.lessons[id]={step:Math.max(old.step,nextStep),completed:old.completed||finished,completedAt:old.completedAt||(finished?Date.now():0)};if(!storage||typeof storage.setItem!=='function')throw Error('storage');storage.setItem(KEY,JSON.stringify(data));error='';return true;}catch{error='Your progress could not be saved. You can keep practicing and try saving again.';return false;}}
  function ensureQuiz(){
   if(!quiz&&win.CodaClassroomQuiz)quiz=win.CodaClassroomQuiz.create({host,lessonId:id,storage,onPassed:()=>finish()});
   return quiz;
  }
  function beginQuiz(restart=false){
   stopAudio();step=LESSONS.find(lesson=>lesson.id===id).total;complete=false;answered=false;quizzing=true;message='';correct=null;persist(step);
   const current=ensureQuiz();if((restart||freshQuiz)&&current)current.restart();freshQuiz=false;render();const question=host.querySelector('.classroom-quiz-question,.classroom-quiz-result-title');question?.focus({preventScroll:true});host.querySelector('.classroom-quiz')?.scrollIntoView({block:'start',behavior:'auto'});
  }
  function finish(){
   const checked=quiz?.getState();if(!checked?.passed||!checked.saved){beginQuiz();return;}
   stopAudio();quizzing=false;complete=true;answered=true;if(!persist(LESSONS.find(lesson=>lesson.id===id).total,true)){award={ok:false,error};render();return;}
   notifyCompletion();render();
  }
  function notifyCompletion(){const lesson=LESSONS.find(lesson=>lesson.id===id);try{const result=api.onComplete?.(id,{title:lesson.title,correct:lesson.total,total:lesson.total});if(result&&typeof result.then==='function')result.then(value=>{award=value;render();}).catch(()=>{award={ok:false};render();});else award=result||null;}catch{award={ok:false};}}
  const namingSteps=()=>NOTE_LESSONS[id]||NOTE_STEPS;
  const noteCopy=()=>SIMPLE_NOTE_COPY[id]?.[step]||['Look at this note.','','Name the purple note.','Look at the line or space.'];
  function startTry(){learningStage='try';hintShown=false;message='';correct=null;render();host.querySelector('h3')?.focus({preventScroll:true});}
  function tryButton(section){section.append(button('Try it',startTry,{'data-lesson-try':''}));}
  function answerNote(letter,pitch){
   if(complete||answered||learningStage!=='try')return;play([pitch||60]);const expected=namingSteps()[step];
   if(letter!==expected.answer){feedback('Not yet. Try again.',false);return;}
   answered=true;persist(step+1);message='Yes!';correct=true;render();host.querySelector('[data-tutorial-next]')?.focus({preventScroll:true});
  }
  function revealNoteHint(){
   if(answered||learningStage!=='try')return;hintShown=true;const question=namingSteps()[step];feedback(noteCopy()[3],null);
   for(const key of host.querySelectorAll('.lesson-white-key'))key.classList.toggle('is-hint',key.dataset.noteAnswer===question.answer);
   const staff=host.querySelector('.lesson-staff-wrap');if(staff)staff.classList.add('is-hint');
   const hint=host.querySelector('[data-note-hint]');if(hint)hint.setAttribute('aria-expanded','true');
  }
  function next(){if(!answered||complete)return;stopAudio();step++;learningStage='look';answered=false;hintShown=false;message='';correct=null;if(step>=LESSONS.find(lesson=>lesson.id===id).total)beginQuiz();else{persist(step);render();}}
  function answerRhythm(value){
   if(complete||answered||learningStage!=='try')return;
   if(value!==2){feedback('Not yet. Try again.',false);return;}
   answered=true;persist(step+1);message='Yes! Two notes.';correct=true;render();host.querySelector('[data-tutorial-next]')?.focus({preventScroll:true});
  }
  function redrawBar(){const viewport=host.closest('.classroom-books'),scroll=viewport?.scrollTop;render();if(viewport&&Number.isFinite(scroll))viewport.scrollTop=scroll;}
  function addValue(units){if(complete||answered||learningStage!=='try'||!VALUES.some(value=>value.units===units))return;const total=bar.reduce((sum,value)=>sum+value,0);if(total+units>16){feedback('That note won’t fit. Choose a shorter note.',false);return;}stopAudio();bar.push(units);message='';correct=null;redrawBar();}
  function checkBar(){if(complete||answered||learningStage!=='try')return;if(!validBar(bar)){feedback('Add notes until you have four beats.',false);return;}stopAudio();answered=true;persist(step+1);message='You made four beats!';correct=true;render();host.querySelector('[data-tutorial-next]')?.focus({preventScroll:true});}
  function learningCard(section,teach,example){
   const card=element('div','lesson-learning-card');card.append(element('span','lesson-card-label','Learn'),element('p','',teach));
   if(example){const worked=element('p','lesson-worked-example');worked.append(element('strong','','Example: '),doc.createTextNode(example));card.append(worked);}section.append(card);return card;
  }
  function actionCue(section,text){const cue=element('div','lesson-action-cue'),heading=element('h3','lesson-instruction',text);heading.tabIndex=-1;cue.append(heading);section.append(cue);return heading;}
  function buildKeyboard(section){
   const wrapper=element('div','lesson-keyboard-scroll'),keyboard=element('div','lesson-keyboard');keyboard.setAttribute('role','group');keyboard.setAttribute('aria-label','Piano white keys');
   const high=['F','A'].includes(namingSteps()[step].answer),whites=(high?[['F',65],['G',67],['A',69],['B',71],['C',72]]:[['C',60],['D',62],['E',64],['F',65]]),keyWidth=100/whites.length;
   whites.forEach(([letter,pitch],index)=>{const key=button('',()=>answerNote(letter,pitch),{'aria-label':letter+' key','data-note-answer':letter,'data-pitch':pitch});key.className='lesson-white-key';if((hintShown||answered)&&letter===namingSteps()[step].answer)key.classList.add('is-hint');key.style.left=index*keyWidth+'%';key.style.width=keyWidth+'%';const label=element('span','lesson-key-name',letter);label.hidden=!names&&!(answered&&letter===namingSteps()[step].answer);key.append(label);key.disabled=answered;keyboard.append(key);});
   for(const boundary of high?[1,2,3]:[1,2]){const black=element('span','lesson-black-key');black.style.left=(boundary*keyWidth-keyWidth*.31)+'%';black.style.width=keyWidth*.62+'%';black.setAttribute('aria-hidden','true');keyboard.append(black);}wrapper.append(keyboard);section.append(wrapper);
   const label=element('label','lesson-name-toggle'),toggle=element('input');toggle.type='checkbox';toggle.checked=names;toggle.onchange=()=>{names=toggle.checked;for(const name of host.querySelectorAll('.lesson-key-name'))name.hidden=!names;};label.append(toggle,doc.createTextNode('Show letters'));if(!answered)section.append(label);
  }
  function namingExample(question){
   const example=element('figure','lesson-naming-example');example.dataset.noteExample=question.kind;
   if(question.kind==='staff')example.innerHTML=staffSVG(question.position,question);
   else{
    const letters=['C','D','E','F','G','A','B','C'],target=letters.indexOf(question.answer),anchor=question.answer==='A'?3:0,group=question.answer==='F'||question.answer==='A'?[4,5,6]:[1,2];
    let keys='';for(let index=0;index<8;index++){const fill=index===target?'#a9f2da':index===anchor?'#f5dda7':'#f9f4e6';keys+='<rect x="'+(index*50+1)+'" y="12" width="48" height="89" rx="3" fill="'+fill+'" stroke="#514861"/>';}
    for(const boundary of [1,2,4,5,6])keys+='<rect x="'+(boundary*50-14)+'" y="12" width="28" height="48" rx="2" fill="'+(group.includes(boundary)?'#8056ad':'#25213b')+'"/>';
    for(const index of new Set([target,anchor]))keys+='<text x="'+(index*50+25)+'" y="91" text-anchor="middle" fill="#263849" font-size="24" font-family="system-ui" font-weight="700">'+letters[index]+'</text>';
    example.innerHTML='<svg class="lesson-example-keyboard" viewBox="0 0 400 106" role="img" aria-label="Example: '+noteCopy()[0]+'">'+keys+'</svg>';
   }
   example.append(element('figcaption','lesson-model-label',noteCopy()[1]));return example;
  }
  function nextButton(section,label='Next'){const advance=button(label,next,{'data-tutorial-next':''});advance.disabled=!answered;section.append(advance);}
  function renderNaming(section){
   section.dataset.kind='note';const question=namingSteps()[step],copy=noteCopy();
   if(learningStage==='look'){actionCue(section,copy[0]);section.append(namingExample(question));tryButton(section);return;}
   actionCue(section,answered?'That’s '+question.answer+'.':copy[2]);
   if(question.kind==='keys')buildKeyboard(section);else{
    const drawing=element('div','lesson-staff-wrap'+(hintShown?' is-hint':''));drawing.innerHTML=staffSVG(question.position,question);section.append(drawing);
    if(question.position>=0)drawing.append(element('p','lesson-read-direction','Read from bottom to top.'));
    if(answered)section.append(element('div','lesson-answer-letter',question.answer));
    else{const choices=element('div','lesson-letter-answers');choices.setAttribute('role','group');choices.setAttribute('aria-label','Choose the note letter');for(const letter of ['A','B','C','D','E','F','G'])choices.append(button(letter,()=>answerNote(letter,question.pitch),{'data-note-answer':letter}));section.append(choices);}
   }
   if(!answered){const actions=element('div','lesson-actions lesson-help-actions');actions.append(button('Hint',revealNoteHint,{'data-note-hint':'','aria-expanded':String(hintShown)}),button('Hear it',()=>play([question.pitch])));section.append(actions);}
   appendFeedback(section);nextButton(section,step===namingSteps().length-1?'Start quiz':'Next');
  }
  function splitPicture(){
   const picture=element('div','lesson-split-picture');picture.setAttribute('role','img');picture.setAttribute('aria-label',level===0?'One whole note':VALUES[level-1].label+' splits into two '+VALUES[level].name+' notes');
   if(level>0){const parent=element('div','lesson-split-parent');parent.innerHTML=glyph(VALUES[level-1].units);picture.append(parent,element('span','lesson-split-arrow','→'));}
   const children=element('div','lesson-split-children');for(let at=0;at<splitExample(level).notes.length;at++){const note=element('span','');note.dataset.treeLevel=level;note.dataset.treeIndex=at;note.innerHTML=glyph(VALUES[level].units);children.append(note);}picture.append(children);return picture;
  }
  function renderTree(section){
   learningStage='explore';host.dataset.learningStage=learningStage;section.dataset.kind='tree';
   const guides=['One whole note lasts four counts.','Split the whole note into two halves.','Split each half into two quarters.','Split each quarter into two eighths.','Split each eighth into two sixteenths.'];
   actionCue(section,guides[level]);section.append(splitPicture());
   const value=VALUES[level],example=splitExample(level),shownCount=example.notes.length,totalCounts=example.counts,countWords=totalCounts===.5?'half a count':totalCounts+' '+(totalCounts===1?'count':'counts'),caption=element('p','lesson-tree-caption',shownCount+' '+value.name+(shownCount===1?' note':' notes')+' = '+countWords);caption.setAttribute('aria-live','polite');section.append(caption);
   const actions=element('div','lesson-actions');actions.append(button('Listen',()=>play(example.notes,{rhythm:true,treeLevel:level})));
   if(level<4){const split=button('Split it',()=>{level++;explored.add(level);stopAudio();message='';render();},{'data-tree-split':''});split.className='lesson-primary';actions.append(split);}else actions.append(button('Try a puzzle',()=>{answered=true;next();},{'data-tutorial-next':''}));section.append(actions);
   if(level>0){const more=element('details','lesson-extra-notes');more.append(element('summary','','Go back'));more.append(button('Join two notes',()=>{level--;stopAudio();render();},{'data-tree-join':''}));section.append(more);}appendFeedback(section);
  }
  function rhythmHint(text){hintShown=true;feedback(text,null);}
  function renderRhythm(section){
   section.dataset.kind='rhythm';if(step===0){renderTree(section);return;}
   if(step===1||step===2){
    const half=step===1,example=element('div','lesson-rhythm-example');
    if(learningStage==='look'){actionCue(section,half?'One half note lasts two counts.':'Two eighth notes share one count.');example.innerHTML=glyph(half?8:4)+'<span>=</span>'+glyph(half?4:2)+glyph(half?4:2);section.append(example);tryButton(section);return;}
    actionCue(section,answered?'Yes. Two notes!':half?'How many quarter notes match this?':'How many eighth notes match this?');example.innerHTML=glyph(half?8:4);section.append(example);
    if(!answered){const answers=element('div','lesson-number-answers');for(const value of [2,3,4])answers.append(button(String(value),()=>answerRhythm(value),{'data-rhythm-answer':value}));section.append(answers,button('Hint',()=>rhythmHint(half?'Each quarter lasts one count.':'Split the quarter in two.')));}
    appendFeedback(section);nextButton(section);return;
   }
   if(learningStage==='look'){actionCue(section,'Make four beats.');const example=element('div','lesson-rhythm-example lesson-recipe-example');example.setAttribute('aria-label','Four quarter notes, one beat each');example.innerHTML=[4,4,4,4].map(units=>glyph(units)).join('');section.append(example,element('p','lesson-model-label','1 + 1 + 1 + 1 = 4 beats'));tryButton(section);return;}
   section.classList.add('lesson-bar-builder');const total=bar.reduce((sum,value)=>sum+value,0);
   actionCue(section,answered?'Four beats. You did it!':'Make four beats.');
   const drawing=element('div','lesson-bar-drawing'),pattern=element('div','lesson-pattern');pattern.setAttribute('aria-label','Your four-beat bar');
   bar.forEach((units,index)=>{const cell=element('div','lesson-pattern-note');cell.dataset.patternIndex=index;cell.setAttribute('aria-label',VALUES.find(value=>value.units===units).label);cell.innerHTML=glyph(units);pattern.append(cell);});
   if(!bar.length)pattern.append(element('div','lesson-pattern-space','Your notes go here'));
   const count=element('p','lesson-bar-count',beatCount(total)+' / 4 beats');count.setAttribute('aria-live','polite');count.dataset.rhythmCount=total;drawing.append(pattern);
   if(!answered){
    const picker=element('div','lesson-bar-picker'),values=element('div','lesson-value-buttons lesson-all-values');values.setAttribute('role','group');values.setAttribute('aria-label','Choose any notes to make four beats');
    for(const value of VALUES){const choose=button('',()=>addValue(value.units),{'aria-label':'Add '+value.name+' note, '+value.beats,'data-add-value':value.units});choose.innerHTML=glyph(value.units);const label=element('span','lesson-value-label');label.append(element('span','',value.name[0].toUpperCase()+value.name.slice(1)),element('span','lesson-value-beats',beatCount(value.units)+' '+(value.units<=4?'beat':'beats')));choose.append(label);choose.disabled=total+value.units>16;values.append(choose);}picker.append(count,values);section.append(picker,drawing);
    const actions=element('div','lesson-actions');if(bar.length){actions.append(button('Undo',()=>{stopAudio();bar.pop();message='';correct=null;redrawBar();},{'data-rhythm-undo':''}),button('Listen',()=>play(bar,{rhythm:true})),button('Start again',()=>{stopAudio();bar=[];message='';correct=null;redrawBar();},{'data-rhythm-clear':''}));}if(actions.children.length)section.append(actions);
    const check=button('Check',checkBar,{'data-check-rhythm':''});check.disabled=total!==16;section.append(check);
   }else section.append(count,drawing);
   appendFeedback(section);if(answered)nextButton(section,'Start quiz');
  }
  function appendFeedback(section){const feedbackNode=element('p','tutorial-feedback',message);feedbackNode.setAttribute('role','status');feedbackNode.setAttribute('aria-live','polite');feedbackNode.dataset.correct=String(correct);section.append(feedbackNode);}
  function renderComplete(section){
   actionCue(section,'You did it!');
   let reward='Keep practising whenever you like.';if(award?.ok===false)reward=award.error||'Let’s save your reward again.';else if(award?.alreadyAwarded)reward='You already earned this reward.';else if(award?.amount>0)reward='+'+award.amount+' XP';
   const status=element('p','tutorial-feedback',reward);status.setAttribute('role','status');section.append(status);if(award?.ok===false)section.append(button('Save again',()=>{if(readProgress(storage).completed.includes(id)){notifyCompletion();render();}else finish();}));
   section.append(button('Quiz again',()=>beginQuiz(true),{'data-tutorial-quiz':''}),button('Practice again',()=>reset(false),{'data-tutorial-replay':''}));
  }
  function render(){
   if(destroyed||!id)return;const oldFocus=host.contains(doc.activeElement)?doc.activeElement:null;let restore=null;if(oldFocus){for(const attr of ['data-pitch','data-note-answer','data-tree-split','data-tree-join','data-tutorial-next','data-add-value','data-check-rhythm','data-tutorial-replay'])if(oldFocus.hasAttribute(attr)){restore='['+attr+'=\"'+oldFocus.getAttribute(attr)+'\"]';break;}}host.replaceChildren();host.classList.add('classroom-tutorial');host.dataset.tutorial=id;host.dataset.phase=complete?'complete':quizzing?'quiz':'lesson';host.dataset.learningStage=learningStage;const lesson=LESSONS.find(item=>item.id===id),heading=element('div','lesson-topline');heading.append(element('span','lesson-step-label',complete?'Finished':quizzing?'Quiz':'Step '+(step+1)+' of '+lesson.total));host.append(heading);
   if(!quizzing){const progress=element('progress');progress.max=lesson.total;progress.value=complete?lesson.total:step+(answered?1:0);progress.setAttribute('aria-label',lesson.title+' progress');host.append(progress);}
   const section=element('section','lesson-content');section.setAttribute('aria-label',lesson.title+(quizzing?' quiz':' activity'));host.append(section);
   if(complete)renderComplete(section);else if(quizzing){if(ensureQuiz())quiz.render(section);else section.append(element('p','lesson-teach','The quiz could not load. Reload the page to try again.'));}else if(NOTE_LESSONS[id])renderNaming(section);else if(id==='time-signatures'){if(signatureLesson)signatureLesson.render(section,{step,answered});else section.append(element('p','','The time-signature lesson could not load. Reload the page to try again.'));}else renderRhythm(section);const bookViewport=host.closest('.classroom-books');if(bookViewport)bookViewport.scrollTop=0;if(oldFocus&&!quizzing){let target=restore?host.querySelector(restore):null;if(!target||target.disabled)target=host.querySelector('h3');if(target){if(target.tagName==='H3')target.tabIndex=-1;target.focus({preventScroll:true});}}
  }
  function reset(resume=true){
   stopAudio();quiz?.destroy();quiz=null;signatureLesson?.reset();const saved=readProgress(storage).lessons.find(lesson=>lesson.id===id),total=LESSONS.find(lesson=>lesson.id===id).total;step=resume?saved.step:0;complete=resume&&saved.completed;quizzing=resume&&!complete&&step>=total;freshQuiz=!resume;learningStage='look';answered=false;message='';correct=null;hintShown=false;level=0;explored=new Set([0]);bar=[];award=null;
   if(complete){ensureQuiz();notifyCompletion();}else if(quizzing)ensureQuiz();render();
  }
  function open(lessonId){if(!LESSONS.some(lesson=>lesson.id===lessonId))return false;id=lessonId;reset();return true;}
  return {open,stopAudio,destroy(){stopAudio();quiz?.destroy();signatureLesson?.destroy();destroyed=true;host.replaceChildren();},getState:()=>({...readProgress(storage),active:id?{id,step,learningStage:id==='time-signatures'?signatureLesson?.getState().stage||'look':learningStage,answered,complete,phase:complete?'complete':quizzing?'quiz':'lesson',quiz:quiz?.getState()||null,treeLevel:level,explored:[...explored],bar:[...bar],timeSignatures:id==='time-signatures'?signatureLesson?.getState():null,audioPlaying:!!audio||signatureLesson?.getState().audioPlaying===true,error}:null})};
 }
 return {KEY,LESSONS,VALUES,NOTE_STEPS,BASS_STEPS,GRAND_STEPS,NOTE_LESSONS,SIMPLE_NOTE_COPY,splitExample,validBar,normalize,readProgress,glyph,staffSVG,treeSVG,create};
});
