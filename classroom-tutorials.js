/* Hands-on music lessons. Numeric pitches stay inside the audio engine. */
(function(root,factory){const node=typeof module==='object'&&module.exports,notation=node?require('./music-notation.js'):root?.CodaMusicNotation,timeLesson=node?require('./time-signature-lesson.js'):root?.CodaTimeSignatureLesson;const api=factory(notation,timeLesson);if(node)module.exports=api;if(root)root.CodaClassroomTutorials=api;})(typeof window!=='undefined'?window:null,function(notation,timeLesson){
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
    "teach": "The spaces spell F A C E, starting at the bottom space.",
    "example": "First space F → second SPACE A.",
    "hint": "Count only the spaces from the bottom: F, A. Tap A."
  },
  {
    "kind": "staff",
    "answer": "B",
    "pitch": 71,
    "position": 4,
    "prompt": "Tap the letter for the purple note.",
    "teach": "The line letters are E G B D F, starting at the bottom line.",
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
 const LESSONS=Object.freeze([{id:'note-naming',title:'Note naming',total:NOTE_STEPS.length},{id:'rhythm-tree',title:'The rhythm tree',total:4},timeLesson?.LESSON||{id:'time-signatures',title:'Time signatures',total:8}].map(Object.freeze));
 const recipe=[4,2,2,8];
 const valueFor=units=>VALUES.find(value=>value.units===units);
 function validBar(notes){return Array.isArray(notes)&&notes.length===recipe.length&&notes.every(note=>Number.isInteger(note))&&[...notes].sort((a,b)=>a-b).join(',')===[...recipe].sort((a,b)=>a-b).join(',');}
 function defaultProgress(){return {version:1,lessons:Object.fromEntries(LESSONS.map(lesson=>[lesson.id,{step:0,completed:false,completedAt:0}]))};}
 function normalize(raw){const state=defaultProgress();if(!raw||raw.version!==1||!raw.lessons||typeof raw.lessons!=='object')return state;for(const lesson of LESSONS){const saved=raw.lessons[lesson.id];if(saved&&Number.isInteger(saved.step)&&saved.step>=0&&saved.step<=lesson.total){state.lessons[lesson.id]={step:saved.step,completed:saved.completed===true&&saved.step===lesson.total,completedAt:Number.isFinite(saved.completedAt)&&saved.completedAt>=0?saved.completedAt:0};}}return state;}
 function storageFor(storage){if(storage!==undefined)return storage;try{return window.localStorage;}catch{return null;}}
 function readProgress(storage){storage=storageFor(storage);let data=defaultProgress(),persistent=false,error='';try{data=normalize(JSON.parse(storage?.getItem(KEY)||'null'));persistent=!!storage;}catch{error='Lesson progress could not be read.';}const lessons=LESSONS.map(lesson=>({...lesson,...data.lessons[lesson.id]})),completed=lessons.filter(lesson=>lesson.completed).map(lesson=>lesson.id);return {version:1,lessons,completed,completedCount:completed.length,total:LESSONS.length,persistent,error};}
 function glyph(units,colour='currentColor'){return notation.glyphSVG(units/4,{colour});}
 function staffSVG(position){return notation.staffSVG(position);}
 function treeSVG(level){let lines='',nodes='';for(let row=0;row<=level;row++){const count=2**row,y=28+row*58;for(let at=0;at<count;at++){const x=(at+.5)*800/count;if(row){const px=(Math.floor(at/2)+.5)*800/(count/2);lines+='<path d="M'+px+' '+(y-45)+'L'+x+' '+(y-13)+'" stroke="#8c76b6" stroke-width="2"/>';}nodes+='<g data-tree-level="'+row+'" data-tree-index="'+at+'" transform="translate('+(x-14)+' '+(y-18)+')" color="'+(row===level?'#b8ffdd':'#d4bdeb')+'">'+glyph(VALUES[row].units).replace('<svg ','<svg x="0" y="0" ').replace('width="30" height="36"','width="28" height="34"')+'</g>';}}return '<svg viewBox="0 0 800 '+(55+level*58)+'" class="lesson-tree-picture" style="--lesson-tree-min-width:'+(2**level*40)+'px" aria-hidden="true" focusable="false">'+lines+nodes+'</svg>';}
 function create(api={}){
  const host=api.host;if(!host)throw Error('A tutorial needs a host element.');const doc=host.ownerDocument,win=doc.defaultView,storage=storageFor(api.storage);
  let id=null,step=0,answered=false,complete=false,message='',correct=null,level=0,explored=new Set([0]),bar=[],names=false,hintShown=false,award=null,error='',destroyed=false,audio=null,voices=[],timers=[];
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
  function finish(){
   stopAudio();complete=true;answered=true;if(!persist(LESSONS.find(lesson=>lesson.id===id).total,true)){award={ok:false,error};render();return;}
   notifyCompletion();render();
  }
  function notifyCompletion(){const lesson=LESSONS.find(lesson=>lesson.id===id);try{const result=api.onComplete?.(id,{title:lesson.title,correct:lesson.total,total:lesson.total});if(result&&typeof result.then==='function')result.then(value=>{award=value;render();}).catch(()=>{award={ok:false};render();});else award=result||null;}catch{award={ok:false};}}
  function answerNote(letter,pitch){
   if(complete||answered)return;play([pitch||60]);const expected=NOTE_STEPS[step];
   if(letter!==expected.answer){feedback('That was '+letter+'. '+expected.hint+' You can try again.',false);return;}
   answered=true;persist(step+1);feedback('Yes! '+letter+' is correct. Tap '+(step===NOTE_STEPS.length-1?'Finish lesson':'Next step')+' when you are ready.',true);
   for(const choice of host.querySelectorAll('[data-note-answer],[data-note-hint]'))choice.disabled=true;
   const advance=host.querySelector('[data-tutorial-next]');advance.disabled=false;host.querySelector('progress').value=step+1;advance.focus({preventScroll:true});
  }
  function revealNoteHint(){
   if(answered)return;hintShown=true;const question=NOTE_STEPS[step];feedback(question.hint,null);
   for(const key of host.querySelectorAll('.lesson-white-key'))key.classList.toggle('is-hint',key.dataset.noteAnswer===question.answer);
   const staff=host.querySelector('.lesson-staff-wrap');if(staff)staff.classList.add('is-hint');
   const hint=host.querySelector('[data-note-hint]');if(hint)hint.setAttribute('aria-expanded','true');
  }
  function next(){if(!answered||complete)return;stopAudio();step++;answered=false;hintShown=false;message='';correct=null;if(step>=LESSONS.find(lesson=>lesson.id===id).total)finish();else{persist(step);render();}}
  function answerRhythm(value){
   if(complete||answered)return;
   if(value!==2){feedback(step===1?value+' quarter notes would last '+value+' beats. A half note lasts 2 beats. Try 2.':'A quarter note splits into TWO equal eighth notes. Try 2.',false);return;}
   answered=true;persist(step+1);feedback(step===1?'Yes! 1 beat + 1 beat = 2 beats. Two quarter notes match one half note.':'Yes! Say “1-and”: two eighth notes fit inside one beat.',true);
   for(const choice of host.querySelectorAll('[data-rhythm-answer]'))choice.disabled=true;
   const advance=host.querySelector('[data-tutorial-next]');advance.disabled=false;host.querySelector('progress').value=step+1;advance.focus({preventScroll:true});
  }
  function addValue(units){if(complete||answered)return;const total=bar.reduce((sum,value)=>sum+value,0);if(total+units>16){feedback('There is no room for that note. Tap Undo last note to remove a note, then follow the recipe.',false);return;}bar.push(units);message='';correct=null;render();}
  function checkBar(){if(!validBar(bar)){feedback('Match the four recipe cards: 1 quarter note, 2 eighth notes, and 1 half note. Tap Undo last note or Clear bar, then follow the highlighted next card.',false);return;}feedback('You did it! 1 + half + half + 2 makes 4 beats.',true);finish();}
  function learningCard(section,teach,example){
   const card=element('div','lesson-learning-card');card.append(element('span','lesson-card-label','Learn'),element('p','',teach));
   if(example){const worked=element('p','lesson-worked-example');worked.append(element('strong','','Example: '),doc.createTextNode(example));card.append(worked);}section.append(card);return card;
  }
  function actionCue(section,text){const cue=element('div','lesson-action-cue');cue.append(element('span','lesson-card-label','Your turn'),element('h3','',text));section.append(cue);}
  function buildKeyboard(section){
   const wrapper=element('div','lesson-keyboard-scroll'),keyboard=element('div','lesson-keyboard');keyboard.setAttribute('role','group');keyboard.setAttribute('aria-label','Piano white keys');
   const whites=[['C',60],['D',62],['E',64],['F',65],['G',67],['A',69],['B',71],['C',72]];
   whites.forEach(([letter,pitch],index)=>{const key=button('',()=>answerNote(letter,pitch),{'aria-label':letter+' key','data-note-answer':letter,'data-pitch':pitch});key.className='lesson-white-key';if(hintShown&&letter===NOTE_STEPS[step].answer)key.classList.add('is-hint');key.style.left=index*12.5+'%';const label=element('span','lesson-key-name',letter);label.hidden=!names;key.append(label);keyboard.append(key);});
   for(const boundary of [1,2,4,5,6]){const black=element('span','lesson-black-key');black.style.left=(boundary*12.5-3.8)+'%';black.setAttribute('aria-hidden','true');keyboard.append(black);}wrapper.append(keyboard);section.append(wrapper);
   const label=element('label','lesson-name-toggle'),toggle=element('input');toggle.type='checkbox';toggle.checked=names;toggle.onchange=()=>{names=toggle.checked;for(const name of host.querySelectorAll('.lesson-key-name'))name.hidden=!names;};label.append(toggle,doc.createTextNode('Show note letters'));section.append(label,element('p','lesson-small','If the keyboard is wider than your screen, swipe sideways to see the other keys.'));
  }
  function namingExample(question){
   const example=element('div','lesson-naming-example');example.dataset.noteExample=question.kind;
   if(question.kind==='staff'){
    example.classList.add('lesson-reference-staff');example.innerHTML=staffSVG(0);example.append(element('p','','Start here: bottom line = E.'));
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
   const question=NOTE_STEPS[step],card=learningCard(section,question.teach,question.example);card.append(namingExample(question));actionCue(section,question.prompt);
   if(question.kind==='keys')buildKeyboard(section);else{
    const drawing=element('div','lesson-staff-wrap'+(hintShown?' is-hint':''));drawing.innerHTML=staffSVG(question.position);section.append(drawing,element('p','lesson-small','Look at the purple round notehead. Then choose its letter below.'));
    const choices=element('div','lesson-letter-answers');choices.setAttribute('role','group');choices.setAttribute('aria-label','Choose the note letter');for(const letter of ['A','B','C','D','E','F','G'])choices.append(button(letter,()=>answerNote(letter,question.pitch),{'data-note-answer':letter}));section.append(choices);
   }
   const actions=element('div','lesson-actions lesson-help-actions');actions.append(button('Show me a hint',revealNoteHint,{'data-note-hint':'','aria-expanded':String(hintShown)}),button('Hear the note',()=>play([question.pitch])));section.append(actions);appendFeedback(section);
   const advance=button(step===NOTE_STEPS.length-1?'Finish lesson':'Next step',next,{'data-tutorial-next':''});advance.disabled=!answered;section.append(advance,element('p','lesson-small','No timer. You can use hints and try again.'));
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
   section.append(element('h3','','Lesson complete!'),element('p','lesson-teach',id==='note-naming'?'You found notes on the piano and on the staff. You can use those clues in Pitch Race and Piano Lab.':id==='time-signatures'?'You read 4/4, 6/8, and cut time, heard their different pulses, and built a bar for each one. Try feeling those pulses while rhythm fishing!':'You split and joined note values, compared their lengths, and built a four-beat rhythm. Try these skills in Rhythm Room and Music Triad.'));
   let reward='You can replay this lesson whenever you want.';if(award?.ok===false)reward=award.error||'Your lesson is finished. Try saving your reward again.';else if(award?.alreadyAwarded)reward='You already earned this lesson’s achievement. Keep practicing for fun!';else if(award?.amount>0)reward='Achievement earned! +'+award.amount+' XP.';
   const status=element('p','tutorial-feedback',reward);status.setAttribute('role','status');section.append(status);if(award?.ok===false)section.append(button('Try saving progress again',finish));section.append(button('Practice again',()=>reset(false),{'data-tutorial-replay':''}));
  }
  function render(){
   if(destroyed||!id)return;const oldFocus=host.contains(doc.activeElement)?doc.activeElement:null;let restore=null;if(oldFocus){for(const attr of ['data-pitch','data-note-answer','data-tree-split','data-tree-join','data-tutorial-next','data-add-value','data-check-rhythm','data-tutorial-replay'])if(oldFocus.hasAttribute(attr)){restore='['+attr+'=\"'+oldFocus.getAttribute(attr)+'\"]';break;}}host.replaceChildren();host.classList.add('classroom-tutorial');host.dataset.tutorial=id;const lesson=LESSONS.find(item=>item.id===id),heading=element('div','lesson-topline');heading.append(element('span','lesson-step-label',complete?'All steps finished':'Step '+(step+1)+' of '+lesson.total),button('Stop sound',stopAudio));const progress=element('progress');progress.max=lesson.total;progress.value=complete?lesson.total:step+(answered?1:0);progress.setAttribute('aria-label',lesson.title+' progress');host.append(heading,progress);const section=element('section','lesson-content');section.setAttribute('aria-label',lesson.title+' activity');host.append(section);
   if(complete)renderComplete(section);else if(id==='note-naming')renderNaming(section);else if(id==='time-signatures'){if(signatureLesson)signatureLesson.render(section,{step,answered});else section.append(element('p','','The time-signature lesson could not load. Reload the page to try again.'));}else renderRhythm(section);if(oldFocus){let target=restore?host.querySelector(restore):null;if(!target||target.disabled)target=host.querySelector('h3');if(target){if(target.tagName==='H3')target.tabIndex=-1;target.focus({preventScroll:true});}}
  }
  function reset(resume=true){stopAudio();signatureLesson?.reset();const saved=readProgress(storage).lessons.find(lesson=>lesson.id===id);step=resume?Math.min(saved.step,LESSONS.find(lesson=>lesson.id===id).total-1):0;complete=resume&&saved.completed;answered=resume&&saved.step>=LESSONS.find(lesson=>lesson.id===id).total&&!saved.completed;message='';correct=null;hintShown=false;level=0;explored=new Set([0]);bar=[];award=null;if(step>=LESSONS.find(lesson=>lesson.id===id).total)complete=true;if(complete)notifyCompletion();render();}
  function open(lessonId){if(!LESSONS.some(lesson=>lesson.id===lessonId))return false;id=lessonId;reset();return true;}
  return {open,stopAudio,destroy(){stopAudio();signatureLesson?.destroy();destroyed=true;host.replaceChildren();},getState:()=>({...readProgress(storage),active:id?{id,step,answered,complete,treeLevel:level,explored:[...explored],bar:[...bar],timeSignatures:id==='time-signatures'?signatureLesson?.getState():null,audioPlaying:!!audio||signatureLesson?.getState().audioPlaying===true,error}:null})};
 }
 return {KEY,LESSONS,VALUES,NOTE_STEPS,validBar,normalize,readProgress,glyph,staffSVG,treeSVG,create};
});
