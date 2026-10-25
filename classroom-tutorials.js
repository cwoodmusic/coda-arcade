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
 const recipe=[4,2,2,8];
 const valueFor=units=>VALUES.find(value=>value.units===units);
 function validBar(notes){return Array.isArray(notes)&&notes.length===recipe.length&&notes.every(note=>Number.isInteger(note))&&[...notes].sort((a,b)=>a-b).join(',')===[...recipe].sort((a,b)=>a-b).join(',');}
 function defaultProgress(){return {version:1,lessons:Object.fromEntries(LESSONS.map(lesson=>[lesson.id,{step:0,completed:false,completedAt:0}]))};}
 function normalize(raw){const state=defaultProgress();if(!raw||raw.version!==1||!raw.lessons||typeof raw.lessons!=='object')return state;for(const lesson of LESSONS){const saved=raw.lessons[lesson.id];if(saved&&Number.isInteger(saved.step)&&saved.step>=0&&saved.step<=lesson.total){state.lessons[lesson.id]={step:saved.step,completed:saved.completed===true&&saved.step===lesson.total,completedAt:Number.isFinite(saved.completedAt)&&saved.completedAt>=0?saved.completedAt:0};}}return state;}
 function storageFor(storage){if(storage!==undefined)return storage;try{return window.localStorage;}catch{return null;}}
 function readProgress(storage){storage=storageFor(storage);let data=defaultProgress(),persistent=false,error='';try{data=normalize(JSON.parse(storage?.getItem(KEY)||'null'));persistent=!!storage;}catch{error='Lesson progress could not be read.';}const lessons=LESSONS.map(lesson=>({...lesson,...data.lessons[lesson.id]})),completed=lessons.filter(lesson=>lesson.completed).map(lesson=>lesson.id);return {version:1,lessons,completed,completedCount:completed.length,total:LESSONS.length,persistent,error};}
 function glyph(units,colour='currentColor'){return notation.glyphSVG(units/4,{colour});}
 function staffSVG(position,options={}){return (quizModule?.staffSVG||notation.staffSVG)(position,options);}
 function treeSVG(level){let lines='',nodes='';for(let row=0;row<=level;row++){const count=2**row,y=28+row*58;for(let at=0;at<count;at++){const x=(at+.5)*800/count;if(row){const px=(Math.floor(at/2)+.5)*800/(count/2);lines+='<path d="M'+px+' '+(y-45)+'L'+x+' '+(y-13)+'" stroke="#8c76b6" stroke-width="2"/>';}nodes+='<g data-tree-level="'+row+'" data-tree-index="'+at+'" transform="translate('+(x-14)+' '+(y-18)+')" color="'+(row===level?'#b8ffdd':'#d4bdeb')+'">'+glyph(VALUES[row].units).replace('<svg ','<svg x="0" y="0" ').replace('width="30" height="36"','width="28" height="34"')+'</g>';}}return '<svg viewBox="0 0 800 '+(55+level*58)+'" class="lesson-tree-picture" style="--lesson-tree-min-width:'+(2**level*40)+'px" aria-hidden="true" focusable="false">'+lines+nodes+'</svg>';}
 function create(api={}){
  const host=api.host;if(!host)throw Error('A tutorial needs a host element.');const doc=host.ownerDocument,win=doc.defaultView,storage=storageFor(api.storage);
  let id=null,step=0,answered=false,complete=false,message='',correct=null,level=0,explored=new Set([0]),bar=[],names=false,hintShown=false,quizzing=false,quiz=null,freshQuiz=false,award=null,error='',destroyed=false,audio=null,voices=[],timers=[];
  const signatureLesson=timeLesson?.create({host,notation,onCorrect:()=>{if(complete||answered)return;answered=true;persist(step+1);const progress=host.querySelector('progress');if(progress)progress.value=step+1;},onNext:next});
  const element=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  function button(text,action,attributes={}){const node=element('button','',text);node.type='button';for(const [key,value]of Object.entries(attributes))node.setAttribute(key,value);node.onclick=action;return node;}
  function stopAudio(){signatureLesson?.stopAudio();for(const timer of timers)win.clearTimeout(timer);timers=[];for(const voice of voices)try{voice.stop();}catch{}voices=[];if(audio){audio.close().catch(()=>{});audio=null;}for(const node of host.querySelectorAll('.is-playing'))node.classList.remove('is-playing');}
  function play(notes,{rhythm=false,treeLevel=null}={}){
   stopAudio();const Constructor=api.AudioContext||win.AudioContext||win.webkitAudioContext;if(!Constructor){feedback('You can still try every question without sound.',null);return;}
   try{audio=new Constructor();audio.resume().catch(()=>{});const context=audio,beat=.55;let at=context.currentTime+.05;
    notes.forEach((note,index)=>{const length=rhythm?note/4*beat:.38,pitch=rhythm?67:note,osc=context.createOscillator(),gain=context.createGain();osc.type='triangle';osc.frequency.value=440*2**((pitch-69)/12);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.11,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+Math.max(.04,length*.92));osc.connect(gain).connect(context.destination);osc.start(at);osc.stop(at+length);voices.push(osc);
     if(rhythm){const start=(at-context.currentTime)*1000;timers.push(win.setTimeout(()=>host.querySelector(treeLevel===null?'[data-pattern-index="'+index+'"]':'[data-tree-level="'+treeLevel+'"][data-tree-index="'+index+'"]')?.classList.add('is-playing'),start));timers.push(win.setTimeout(()=>host.querySelector(treeLevel===null?'[data-pattern-index="'+index+'"]':'[data-tree-level="'+treeLevel+'"][data-tree-index="'+index+'"]')?.classList.remove('is-playing'),start+length*1000));}at+=rhythm?length:.44;
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
  function answerNote(letter,pitch){
   if(complete||answered)return;play([pitch||60]);const expected=namingSteps()[step];
   if(letter!==expected.answer){feedback('That was '+letter+'. '+expected.hint+' You can try again.',false);return;}
   answered=true;persist(step+1);feedback('Yes! '+letter+' is correct. Tap '+(step===namingSteps().length-1?'Start quiz':'Next step')+' when you are ready.',true);
   for(const choice of host.querySelectorAll('[data-note-answer],[data-note-hint]'))choice.disabled=true;
   const advance=host.querySelector('[data-tutorial-next]');advance.disabled=false;host.querySelector('progress').value=step+1;advance.focus({preventScroll:true});
  }
  function revealNoteHint(){
   if(answered)return;hintShown=true;const question=namingSteps()[step];feedback(question.hint,null);
   for(const key of host.querySelectorAll('.lesson-white-key'))key.classList.toggle('is-hint',key.dataset.noteAnswer===question.answer);
   const staff=host.querySelector('.lesson-staff-wrap');if(staff)staff.classList.add('is-hint');
   const hint=host.querySelector('[data-note-hint]');if(hint)hint.setAttribute('aria-expanded','true');
  }
  function next(){if(!answered||complete)return;stopAudio();step++;answered=false;hintShown=false;message='';correct=null;if(step>=LESSONS.find(lesson=>lesson.id===id).total)beginQuiz();else{persist(step);render();}}
  function answerRhythm(value){
   if(complete||answered)return;
   if(value!==2){feedback(step===1?value+' quarter notes would last '+value+' beats. A half note lasts 2 beats. Try 2.':'A quarter note splits into TWO equal eighth notes. Try 2.',false);return;}
   answered=true;persist(step+1);feedback(step===1?'Yes! 1 beat + 1 beat = 2 beats. Two quarter notes match one half note.':'Yes! Say “1-and”: two eighth notes fit inside one beat.',true);
   for(const choice of host.querySelectorAll('[data-rhythm-answer]'))choice.disabled=true;
   const advance=host.querySelector('[data-tutorial-next]');advance.disabled=false;host.querySelector('progress').value=step+1;advance.focus({preventScroll:true});
  }
  function addValue(units){if(complete||answered)return;const total=bar.reduce((sum,value)=>sum+value,0);if(total+units>16){feedback('There is no room for that note. Tap Undo last note to remove a note, then follow the recipe.',false);return;}bar.push(units);message='';correct=null;render();}
  function checkBar(){if(!validBar(bar)){feedback('Match the four recipe cards: 1 quarter note, 2 eighth notes, and 1 half note. Tap Undo last note or Clear bar, then follow the highlighted next card.',false);return;}feedback('You did it! 1 + half + half + 2 makes 4 beats.',true);beginQuiz();}
  function learningCard(section,teach,example){
   const card=element('div','lesson-learning-card');card.append(element('span','lesson-card-label','Learn'),element('p','',teach));
   if(example){const worked=element('p','lesson-worked-example');worked.append(element('strong','','Example: '),doc.createTextNode(example));card.append(worked);}section.append(card);return card;
  }
  function actionCue(section,text){const cue=element('div','lesson-action-cue');cue.append(element('span','lesson-card-label','Your turn'),element('h3','',text));section.append(cue);}
  function buildKeyboard(section){
   const wrapper=element('div','lesson-keyboard-scroll'),keyboard=element('div','lesson-keyboard');keyboard.setAttribute('role','group');keyboard.setAttribute('aria-label','Piano white keys');
   const whites=[['C',60],['D',62],['E',64],['F',65],['G',67],['A',69],['B',71],['C',72]];
   whites.forEach(([letter,pitch],index)=>{const key=button('',()=>answerNote(letter,pitch),{'aria-label':letter+' key','data-note-answer':letter,'data-pitch':pitch});key.className='lesson-white-key';if(hintShown&&letter===namingSteps()[step].answer)key.classList.add('is-hint');key.style.left=index*12.5+'%';const label=element('span','lesson-key-name',letter);label.hidden=!names;key.append(label);keyboard.append(key);});
   for(const boundary of [1,2,4,5,6]){const black=element('span','lesson-black-key');black.style.left=(boundary*12.5-3.8)+'%';black.setAttribute('aria-hidden','true');keyboard.append(black);}wrapper.append(keyboard);section.append(wrapper);
   const label=element('label','lesson-name-toggle'),toggle=element('input');toggle.type='checkbox';toggle.checked=names;toggle.onchange=()=>{names=toggle.checked;for(const name of host.querySelectorAll('.lesson-key-name'))name.hidden=!names;};label.append(toggle,doc.createTextNode('Show note letters'));section.append(label,element('p','lesson-small','If the keyboard is wider than your screen, swipe sideways to see the other keys.'));
  }
  function namingExample(question){
   const example=element('div','lesson-naming-example');example.dataset.noteExample=question.kind;
   if(question.kind==='staff'){
    example.classList.add('lesson-reference-staff');const clef=question.clef||'treble',middle=question.position===-2||question.position===10;example.innerHTML=staffSVG(middle?question.position:0,question);example.append(element('p','',middle?'Middle C: one little line below treble or above bass. The same key and sound.':'Start here: '+clef+' bottom line = '+(clef==='bass'?'G.':'E.')));
   }else{
    const letters=['C','D','E','F','G','A','B','C'],target=letters.indexOf(question.answer),anchor=question.answer==='A'?3:0;
    let keys='';for(let index=0;index<8;index++){const fill=index===target?'#a9f2da':index===anchor?'#f5dda7':'#f9f4e6';keys+='<rect x="'+(index*50+1)+'" y="22" width="48" height="79" rx="3" fill="'+fill+'" stroke="#514861"/>';}
    for(const boundary of [1,2,4,5,6])keys+='<rect x="'+(boundary*50-14)+'" y="22" width="28" height="46" rx="2" fill="#25213b"/>';
    for(const index of new Set([target,anchor]))keys+='<text x="'+(index*50+25)+'" y="91" text-anchor="middle" fill="#263849" font-size="20" font-family="system-ui" font-weight="700">'+letters[index]+'</text>';
    example.innerHTML='<svg class="lesson-example-keyboard" viewBox="0 0 400 106" role="img" aria-label="Example piano: '+question.example+'"><text x="75" y="14" text-anchor="middle" fill="#d6eee8" font-size="13" font-family="system-ui">2 black keys</text><text x="250" y="14" text-anchor="middle" fill="#d6eee8" font-size="13" font-family="system-ui">3 black keys</text>'+keys+'</svg>';
   }
   return example;
  }
  function renderNaming(section){
   const question=namingSteps()[step],card=learningCard(section,question.teach,question.example);card.append(namingExample(question));actionCue(section,question.prompt);
   if(question.kind==='keys')buildKeyboard(section);else{
    const drawing=element('div','lesson-staff-wrap'+(hintShown?' is-hint':''));drawing.innerHTML=staffSVG(question.position,question);section.append(drawing,element('p','lesson-small','Look at the purple round notehead. Then choose its letter below.'));
    const choices=element('div','lesson-letter-answers');choices.setAttribute('role','group');choices.setAttribute('aria-label','Choose the note letter');for(const letter of ['A','B','C','D','E','F','G'])choices.append(button(letter,()=>answerNote(letter,question.pitch),{'data-note-answer':letter}));section.append(choices);
   }
   const actions=element('div','lesson-actions lesson-help-actions');actions.append(button('Show me a hint',revealNoteHint,{'data-note-hint':'','aria-expanded':String(hintShown)}),button('Hear the note',()=>play([question.pitch])));section.append(actions);appendFeedback(section);
   const advance=button(step===namingSteps().length-1?'Start quiz':'Next step',next,{'data-tutorial-next':''});advance.disabled=!answered;section.append(advance,element('p','lesson-small','No timer. You can use hints and try again.'));
  }
  function renderTree(section){
   const teaching=[
    ['In this lesson we count in 4/4. A beat is one steady count: “1, 2, 3, 4”. A whole note lasts for all four counts.','One whole note = 4 beats.'],
    ['Splitting one whole note gives two equal half notes. Each half note lasts 2 beats.','2 beats + 2 beats = 4 beats.'],
    ['Split again: each half note becomes two quarter notes. Each quarter note lasts 1 beat.','1 + 1 + 1 + 1 = 4 beats.'],
    ['Each quarter note can split into two eighth notes. Two even sounds share one beat.','Say “1-and, 2-and, 3-and, 4-and”.'],
    ['Each eighth note can split into two sixteenth notes. Four quick sounds share one beat.','For one beat, say “1-e-and-a”.']
   ];learningCard(section,teaching[level][0],teaching[level][1]);
   actionCue(section,level<4?'Tap Split into smaller notes to see what happens.':'You found all five note lengths. Try the puzzle next.');
   const diagram=element('div','lesson-tree-wrap');diagram.innerHTML=treeSVG(level);section.append(diagram,element('p','lesson-tree-swipe','Swipe sideways to see a wide row. The newest row is green.'));diagram.scrollLeft=Math.max(0,(diagram.scrollWidth-diagram.clientWidth)/2);
   const value=VALUES[level],caption=element('p','lesson-tree-caption',value.count+' '+value.name+(value.count===1?' note':' notes')+' = four beats altogether. '+(level===3?'Two eighth notes fit inside each beat.':level===4?'Four sixteenth notes fit inside each beat.':'Each '+value.name+' note lasts '+value.beats+'.'));caption.setAttribute('aria-live','polite');section.append(caption);
   const actions=element('div','lesson-actions'),split=button('Split into smaller notes',()=>{level=Math.min(4,level+1);explored.add(level);stopAudio();message='';render();},{'data-tree-split':''}),join=button('Join notes together',()=>{level=Math.max(0,level-1);stopAudio();render();},{'data-tree-join':''});split.className='lesson-primary';split.disabled=level===4;join.disabled=level===0;actions.append(split,join,button('Hear this row',()=>play(Array(value.count).fill(value.units),{rhythm:true,treeLevel:level})));section.append(actions);
   if(level<4)section.append(element('p','lesson-next-action','Next split: '+value.label+' → '+VALUES[level+1].label.toLowerCase()+'. '+(4-level)+' split'+(4-level===1?'':'s')+' left to explore.'));
   const details=element('details','lesson-extra-notes'),summary=element('summary','','See the note lengths you have found'),ledger=element('ul','lesson-tree-summary');for(let index=0;index<=level;index++){const row=VALUES[index];ledger.append(element('li','',row.count+' '+row.name+(row.count===1?' note':' notes')+' fills four beats.'));}details.append(summary,ledger);section.append(details);
   const advance=button(explored.size===5?'Try a rhythm puzzle':'Keep splitting to unlock the puzzle',()=>{answered=true;next();},{'data-tutorial-next':''});advance.disabled=explored.size<5;section.append(advance);appendFeedback(section);
  }
  function renderRhythm(section){
   if(step===0){renderTree(section);return;}
   if(step===1||step===2){
    const half=step===1;learningCard(section,half?'A half note lasts 2 beats. Each quarter note lasts 1 beat.':'A quarter note lasts 1 beat. Two eighth notes share that same beat.',half?'Count “1, 2” for a half note. Two quarter notes also fill counts 1 and 2.':'Say “1-and” evenly: “1” is one eighth note, and “and” is another.');
    const example=element('div','lesson-rhythm-example');example.setAttribute('aria-label',half?'One half note equals two quarter notes':'One quarter note equals two eighth notes');example.innerHTML=glyph(half?8:4)+'<span>=</span>'+glyph(half?4:2)+glyph(half?4:2);section.append(example);
    actionCue(section,half?'How many quarter notes match one half note? Tap a number.':'How many eighth notes match one quarter note? Tap a number.');
    const answers=element('div','lesson-number-answers');for(const value of [2,3,4])answers.append(button(String(value),()=>answerRhythm(value),{'data-rhythm-answer':value}));section.append(answers);appendFeedback(section);const advance=button('Next step',next,{'data-tutorial-next':''});advance.disabled=!answered;section.append(advance);return;
   }
   learningCard(section,'A bar is a group of beats. This bar has 4 beats. Follow the four recipe cards to build it.','Count “1 | 2-and | 3, 4”. The two eighth notes share beat 2.');
   const used=new Map();for(const units of bar)used.set(units,(used.get(units)||0)+1);const targets=recipe.map(units=>{const count=used.get(units)||0;used.set(units,Math.max(0,count-1));return{units,filled:count>0};}),nextTarget=targets.find(target=>!target.filled);
   const targetList=element('ol','lesson-recipe-targets');targets.forEach((target,index)=>{const card=element('li',target.filled?'is-filled':target===nextTarget?'is-next':'');card.dataset.recipeStep=index;card.innerHTML=glyph(target.units);card.append(element('span','',valueFor(target.units).label),element('small','',target.filled?'Added':target===nextTarget?'Add this next':'Then add this'));targetList.append(card);});section.append(targetList);
   actionCue(section,nextTarget?'Tap '+valueFor(nextTarget.units).label+' below.':'Your recipe is ready. Tap Check my rhythm.');
   const pattern=element('div','lesson-pattern');pattern.setAttribute('aria-label','Your four-beat rhythm');
   bar.forEach((units,index)=>{const cell=element('div','lesson-pattern-note');cell.style.flex=String(units);cell.dataset.patternIndex=index;cell.innerHTML=glyph(units);cell.append(element('small','',valueFor(units).name));pattern.append(cell);});if(!bar.length)pattern.append(element('p','lesson-small','Your bar is empty. Start with a quarter note.'));section.append(pattern);
   const total=bar.reduce((sum,value)=>sum+value,0),meter=element('progress');meter.max=16;meter.value=total;meter.setAttribute('aria-label','Four-beat bar filled');section.append(meter,element('p','lesson-small',(total/4)+' of 4 beats filled.'));
   const makeValue=value=>{const choose=button('',()=>addValue(value.units),{'aria-label':'Add '+value.name+' note','data-add-value':value.units});choose.innerHTML=glyph(value.units);choose.append(element('span','',value.label),element('small','',value.beats));if(value.units===nextTarget?.units)choose.classList.add('is-next-value');return choose;};
   const values=element('div','lesson-value-buttons');for(const value of [4,2,8].map(valueFor))values.append(makeValue(value));section.append(values);
   const extras=element('details','lesson-extra-notes');extras.append(element('summary','','Other note lengths (optional)'));const extraValues=element('div','lesson-value-buttons');for(const value of VALUES.filter(value=>![4,2,8].includes(value.units)))extraValues.append(makeValue(value));extras.append(extraValues);section.append(extras);
   const actions=element('div','lesson-actions');actions.append(button('Undo last note',()=>{bar.pop();message='';render();}),button('Clear bar',()=>{bar=[];message='';render();}),button('Listen and clap along',()=>{if(bar.length)play(bar,{rhythm:true});else feedback('Add a note first, then listen.',null);}));section.append(actions,element('p','lesson-small','Listening is optional. Clap once at the start of each sound. Count “1, 2” during the half note.'));appendFeedback(section);const check=button('Check my rhythm',checkBar,{'data-check-rhythm':''});check.disabled=!bar.length;section.append(check);
  }
  function appendFeedback(section){const feedbackNode=element('p','tutorial-feedback',message);feedbackNode.setAttribute('role','status');feedbackNode.setAttribute('aria-live','polite');feedbackNode.dataset.correct=String(correct);section.append(feedbackNode);}
  function renderComplete(section){
   section.append(element('h3','','Lesson complete!'),element('p','lesson-teach',id==='note-naming'?'You found notes on the piano and on the staff. You can use those clues in Pitch Race and Piano Lab.':id==='bass-clef'?'You used the bass clef’s lines, spaces, and F landmark. Try Bass Clef in Pitch Race when you are ready.':id==='grand-staff'?'You read both clefs and found the same Middle C from either staff. Try Grand Staff in Pitch Race.':id==='time-signatures'?'You read 4/4, 6/8, and cut time, heard their different pulses, and built a bar for each one. Try feeling those pulses while rhythm fishing!':'You split and joined note values, compared their lengths, and built a four-beat rhythm. Try these skills in Rhythm Room and Music Triad.'));
   let reward='You can replay this lesson whenever you want.';if(award?.ok===false)reward=award.error||'Your lesson is finished. Try saving your reward again.';else if(award?.alreadyAwarded)reward='You already earned this lesson’s achievement. Keep practicing for fun!';else if(award?.amount>0)reward='Achievement earned! +'+award.amount+' XP.';
   const checked=ensureQuiz()?.getState();if(checked?.passed)section.append(element('p','lesson-teach','Quiz passed · '+checked.score+' of '+checked.total+' correct.'));
   const status=element('p','tutorial-feedback',reward);status.setAttribute('role','status');section.append(status);if(award?.ok===false)section.append(button('Try saving progress again',()=>{if(readProgress(storage).completed.includes(id)){notifyCompletion();render();}else finish();}));
   section.append(button(checked?.finished?'Try quiz again':'Take the quiz',()=>beginQuiz(true),{'data-tutorial-quiz':''}),button('Practice again',()=>reset(false),{'data-tutorial-replay':''}));
  }
  function render(){
   if(destroyed||!id)return;const oldFocus=host.contains(doc.activeElement)?doc.activeElement:null;let restore=null;if(oldFocus){for(const attr of ['data-pitch','data-note-answer','data-tree-split','data-tree-join','data-tutorial-next','data-add-value','data-check-rhythm','data-tutorial-replay'])if(oldFocus.hasAttribute(attr)){restore='['+attr+'=\"'+oldFocus.getAttribute(attr)+'\"]';break;}}host.replaceChildren();host.classList.add('classroom-tutorial');host.dataset.tutorial=id;host.dataset.phase=complete?'complete':quizzing?'quiz':'lesson';const lesson=LESSONS.find(item=>item.id===id),heading=element('div','lesson-topline');heading.append(element('span','lesson-step-label',complete?'Lesson finished':quizzing?'End-of-lesson quiz':'Step '+(step+1)+' of '+lesson.total));if(!quizzing&&!complete)heading.append(button('Stop sound',stopAudio));host.append(heading);
   if(!quizzing){const progress=element('progress');progress.max=lesson.total;progress.value=complete?lesson.total:step+(answered?1:0);progress.setAttribute('aria-label',lesson.title+' progress');host.append(progress);}
   const section=element('section','lesson-content');section.setAttribute('aria-label',lesson.title+(quizzing?' quiz':' activity'));host.append(section);
   if(complete)renderComplete(section);else if(quizzing){if(ensureQuiz())quiz.render(section);else section.append(element('p','lesson-teach','The quiz could not load. Reload the page to try again.'));}else if(NOTE_LESSONS[id])renderNaming(section);else if(id==='time-signatures'){if(signatureLesson)signatureLesson.render(section,{step,answered});else section.append(element('p','','The time-signature lesson could not load. Reload the page to try again.'));}else renderRhythm(section);if(oldFocus&&!quizzing){let target=restore?host.querySelector(restore):null;if(!target||target.disabled)target=host.querySelector('h3');if(target){if(target.tagName==='H3')target.tabIndex=-1;target.focus({preventScroll:true});}}
  }
  function reset(resume=true){
   stopAudio();quiz?.destroy();quiz=null;signatureLesson?.reset();const saved=readProgress(storage).lessons.find(lesson=>lesson.id===id),total=LESSONS.find(lesson=>lesson.id===id).total;step=resume?saved.step:0;complete=resume&&saved.completed;quizzing=resume&&!complete&&step>=total;freshQuiz=!resume;answered=false;message='';correct=null;hintShown=false;level=0;explored=new Set([0]);bar=[];award=null;
   if(complete){ensureQuiz();notifyCompletion();}else if(quizzing)ensureQuiz();render();
  }
  function open(lessonId){if(!LESSONS.some(lesson=>lesson.id===lessonId))return false;id=lessonId;reset();return true;}
  return {open,stopAudio,destroy(){stopAudio();quiz?.destroy();signatureLesson?.destroy();destroyed=true;host.replaceChildren();},getState:()=>({...readProgress(storage),active:id?{id,step,answered,complete,phase:complete?'complete':quizzing?'quiz':'lesson',quiz:quiz?.getState()||null,treeLevel:level,explored:[...explored],bar:[...bar],timeSignatures:id==='time-signatures'?signatureLesson?.getState():null,audioPlaying:!!audio||signatureLesson?.getState().audioPlaying===true,error}:null})};
 }
 return {KEY,LESSONS,VALUES,NOTE_STEPS,BASS_STEPS,GRAND_STEPS,NOTE_LESSONS,validBar,normalize,readProgress,glyph,staffSVG,treeSVG,create};
});
