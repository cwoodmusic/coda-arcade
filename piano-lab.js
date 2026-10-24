/* A self-contained, polyphonic piano room. No samples or network are needed. */
(function(root){
 'use strict';
 const NOTE_NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
 const SHORTCUTS=['a','w','s','e','d','f','t','g','y','h','u','j','k'];
 const LESSONS=Object.freeze([
  {id:'twinkle',name:'Twinkle, Twinkle, Little Star',description:'Chopin asks: Can you play Twinkle, Twinkle, Little Star? Follow the glowing notes. Any comfortable rhythm works.',notes:[0,0,7,7,9,9,7,5,5,4,4,2,2,0,7,7,5,5,4,4,2,7,7,5,5,4,4,2,0,0,7,7,9,9,7,5,5,4,4,2,2,0]},
  {id:'mary',name:'Mary Had a Little Lamb',description:'Chopin asks: Can you play Mary Had a Little Lamb? Step away and back to repeat a note.',notes:[4,2,0,2,4,4,4,2,2,2,4,7,7,4,2,0,2,4,4,4,4,2,2,4,2,0]},
  {id:'london-bridge',name:'London Bridge Is Falling Down',description:'Chopin asks: Can you play London Bridge Is Falling Down? Take your time and follow each note.',notes:[7,9,7,5,4,5,7,2,4,5,4,5,7,7,9,7,5,4,5,7,2,7,4,0]}
 ]);
 const INTERVALS=Object.freeze([[1,'minor second'],[2,'major second'],[3,'minor third'],[4,'major third'],[5,'perfect fourth'],[7,'perfect fifth'],[12,'octave']].flatMap(([semitones,name])=>[1,-1].map(direction=>({id:(direction>0?'up-':'down-')+semitones,name:name+' '+(direction>0?'higher':'lower'),start:direction>0?0:12,target:direction>0?semitones:12-semitones}))));
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 function noteName(midi){return NOTE_NAMES[midi%12]+(Math.floor(midi/12)-1);}
 function noteLetter(midi){return NOTE_NAMES[midi%12];}
 function keyPositionName(midi,firstMidi){const position=midi-firstMidi;return (position<12?'lower ':position<24?'higher ':'highest ')+noteLetter(midi);}
 function frequency(midi){return 440*Math.pow(2,(midi-69)/12);}
 // Measured from the room painting. Each hit polygon is also the exact live
 // light/name overlay, so a drawn key and the sound underfoot cannot diverge.
 function paintedFloorKeys(){
  const sx=1000/1593,sy=620/987,project=points=>points.map(([x,y])=>[x*sx,y*sy]);
  const fronts=[170,268,366,468,556,663,761,860,945,1041,1131,1230,1323,1427],offsets=[0,2,4,5,7,9,11,12,14,16,17,19,21];
  const back=x=>240+(x-170)/(1427-170)*(1358-240);
  const keys=offsets.map((offset,index)=>({offset,black:false,polygon:project([[back(fronts[index]),640],[back(fronts[index+1]),640],[fronts[index+1],824],[fronts[index],824]])}));
  const blacks=[
   [1,[[294,639],[336,639],[314,742],[257,742]]],
   [3,[[391,639],[431,639],[416,742],[361,742]]],
   [6,[[556,639],[596,639],[591,742],[538,742]]],
   [8,[[652,639],[694,639],[694,742],[640,742]]],
   [10,[[752,639],[794,639],[796,742],[744,742]]],
   [13,[[910,639],[950,639],[965,742],[912,742]]],
   [15,[[1005,639],[1045,639],[1065,742],[1012,742]]],
   [18,[[1163,639],[1204,639],[1231,742],[1178,742]]],
   [20,[[1259,639],[1300,639],[1336,742],[1281,742]]]
  ];
  return keys.concat(blacks.map(([offset,polygon])=>({offset,black:true,polygon:project(polygon)})));
 }
 function polygonContains(polygon,x,y){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
 function createCodaPianoLab(api={}){
  const host=api.host;if(!host)throw new Error('Piano Lab needs a host element.');
  const doc=host.ownerDocument,win=doc.defaultView||root;
  let opened=false,octave=4,volume=.55,sustain=false,context=null,master=null,voices=new Map(),held=new Map(),pointerKeys=new Map(),computerKeys=new Map();
  let recording=false,recordStart=0,recorded=[],recordHeld=new Map(),playing=false,playTimers=[],recordTimer=null,lesson=null,lessonStep=0,completed=new Set(),priorFocus=null,destroyed=false;
  let roomFinger=null,roomFrame=0,frameTime=0,roomClock=0,roomKeys=new Set(),roomDest=null,roomPlayer={x:500,y:310,facing:'down',phase:0,jump:0,velocity:0},floorNote=null,showNames=false,keyboardMode='walk',lastWallNote=null;
  let challengeMode='free',interval=null,intervalStep=0,mobileView='room';const touchHeld=new Set();
  const mobileLayout=()=>win.matchMedia?.('(max-width:760px), (pointer:coarse)').matches===true;
  const renderer=api.renderer||(typeof win.createCodaCharacterRenderer==='function'?win.createCodaCharacterRenderer({}):null),ROOM={width:1000,height:620,keyX:130,keyY:370,keyW:740,keyH:185};
  const now=()=>win.performance.now()/1000;
  host.classList.add('piano-lab');host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-labelledby','pianoLabTitle');
  host.innerHTML=`<div class="piano-room-shell">
   <header class="piano-room-heading"><div><span class="piano-eyebrow">CODA ARCADE · MUSIC ROOMS</span><h1 id="pianoLabTitle">Piano Lab</h1><p>A little room for big musical ideas.</p></div><button type="button" id="closepiano" aria-label="Return to arcade"><span class="room-return-full">← Return to arcade</span><span class="room-return-short" aria-hidden="true">← Arcade</span> <small>Esc</small></button></header>
   <nav class="piano-mobile-nav" aria-label="Piano Lab views"><button type="button" data-piano-view="room">Room</button><button type="button" data-piano-view="games">Chopin games</button><button type="button" data-piano-view="keyboard">Keyboard</button><button type="button" data-piano-view="recording">Record</button></nav>
   <section class="piano-walk-room" aria-label="Walkable Piano Lab"><canvas id="pianoRoomCanvas" width="1000" height="620" tabindex="0" aria-label="Piano Lab. Walk with WASD or arrow keys. Step on the giant piano keys to play. Space jumps. Press E near Chopin to start a melody challenge."></canvas><div class="piano-room-instructions"><span class="room-keyboard-hint">WASD / arrows · Walk &nbsp; Space · Jump &nbsp; E · Talk to Chopin</span><span class="room-touch-hint">Hold and drag on the floor to walk · Lift to stop · Or use the pad · Jump · Talk / Play note</span><label><input id="pianoKeyNames" type="checkbox"> Show letter names on keys</label></div><p id="pianoWallNote" class="piano-wall-note" role="status" aria-live="polite">Back wall: no note yet.</p><p id="pianoRoomMessage" class="piano-mobile-feedback" role="status" aria-live="polite">Free play: hold a finger on the floor to walk; lift to stop. Or use the movement pad.</p></section>
   <main class="piano-workspace"><section id="pianoKeyboardPanel" class="piano-stage" aria-label="Accessible piano keyboard">
    <div class="piano-stage-lights" aria-hidden="true"><i></i><i></i><i></i></div><div class="piano-instrument-name">CODA <span>CONCERT / 01</span></div>
    <div class="piano-display"><span id="pianoNoteDisplay" aria-live="off">Ready to play</span><span id="pianoModeDisplay">FREE PLAY</span></div>
    <p class="piano-mobile-swipe">Swipe the keyboard sideways to reach more notes.</p><div class="piano-keyboard-scroll"><div id="pianoKeys" class="piano-keyboard" role="group" aria-label="Piano keys, from lower sounds on the left to higher sounds on the right. Use arrow keys to move between keys and Enter or Space to play."></div></div>
    <p class="piano-shortcuts">Walk across the giant keys above, or play these buttons with a mouse, touch, or Enter. In Piano shortcuts mode, use <kbd>A W S E D F T G Y H U J K</kbd>.</p>
    <div class="piano-controls"><label>Keyboard controls <select id="pianoKeyboardMode"><option value="walk">Walk around</option><option value="piano">Piano shortcuts</option></select></label><label>Note range <select id="pianoOctave" aria-label="Piano note range"><option value="3">Low notes</option><option value="4" selected>Middle notes</option><option value="5">High notes</option></select></label><label>Volume <input id="pianoVolume" aria-label="Piano volume" type="range" min="0" max="100" value="55"></label><button id="pianoSustain" type="button" aria-pressed="false">Sustain: Off</button><button id="pianoPanic" type="button">Release all notes</button></div>
   </section><aside class="piano-activities"><section id="pianoRecordingPanel"><h2>Make a recording</h2><p>Capture up to 60 seconds of your playing. Your last take stays in this browser.</p><div class="piano-record-actions"><button type="button" id="pianoRecord">● Record</button><button type="button" id="pianoPlayback" disabled>▶ Play take</button><button type="button" id="pianoClear" disabled>Clear take</button></div><p id="pianoRecordStatus">No recording yet.</p></section>
    <section id="pianoChallengePanel"><h2>Chopin’s challenges</h2><button type="button" id="pianoTalkChopin">Talk to Chopin</button><label for="pianoLesson">Melody game · earn Notes once each</label><select id="pianoLesson"><option value="">Choose a melody</option>${LESSONS.map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}</select><p id="pianoLessonDescription">Chopin: “Welcome! Would you play a familiar melody for me?”</p><div id="pianoLessonProgress" class="piano-lesson-progress" aria-label="Lesson progress"></div><button type="button" id="pianoLessonRestart" hidden>Restart melody</button><label for="pianoInterval">Interval game</label><select id="pianoInterval">${INTERVALS.map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}</select><button type="button" id="pianoStartInterval">Ask for interval challenge</button><p class="piano-interval-help">An interval is a jump between two notes. Higher sounds are to the right; lower sounds are to the left. If a letter appears twice, its left-hand key makes the lower sound.</p><p id="pianoIntervalPrompt"></p><button type="button" id="pianoFreePlay">Return to free play</button><p id="pianoGameInstructions">Free play: stepping on a key makes a sound.</p></section>
    <p id="pianoMessage" class="piano-message" role="status" aria-live="polite">Sound starts when you play your first note.</p>
   </aside></main>
  </div>`;
  const el=id=>host.querySelector('#'+id),keyButtons=new Map();
  const storage=api.storage||(()=>{try{return win.localStorage;}catch{return null;}})();
  function message(text){if(mobileLayout())text=text.replace(/press E\b/gi,'tap Play note');el('pianoMessage').textContent=text;el('pianoRoomMessage').textContent=text;}
  function setMobileView(view,focus=false){
   if(!['room','games','keyboard','recording'].includes(view))return;
   releaseControls();mobileView=view;host.dataset.mobileView=view;
   for(const button of host.querySelectorAll('[data-piano-view]'))button.setAttribute('aria-pressed',String(button.dataset.pianoView===view));
   if(focus&&mobileLayout()){host.scrollTop=0;const target=view==='room'?el('pianoRoomCanvas'):view==='games'?el('pianoLesson'):view==='keyboard'?keyButtons.get((octave+1)*12):el('pianoRecord');target?.focus({preventScroll:true});}
  }
  function returnToFloor(){if(mobileLayout())setMobileView('room',true);}
  function loadTake(){try{const saved=JSON.parse(storage?.getItem('codaPianoTakeV1')||'null');if(validTake(saved))recorded=saved;}catch{}}
  function validTake(value){return Array.isArray(value)&&value.length<=1024&&value.every(note=>note&&Number.isInteger(note.midi)&&note.midi>=48&&note.midi<=96&&Number.isFinite(note.at)&&note.at>=0&&note.at<=60&&Number.isFinite(note.duration)&&note.duration>0&&note.duration<=60&&note.at+note.duration<=60.1);}
  function persistTake(){try{storage?.setItem('codaPianoTakeV1',JSON.stringify(recorded));}catch{message('Your take is ready for this visit; this browser could not save it.');}}
  function updateRecordingUI(){
   el('pianoRecord').textContent=recording?'■ Finish recording':'● Record';el('pianoRecord').setAttribute('aria-pressed',String(recording));
   el('pianoPlayback').textContent=playing?'■ Stop take':'▶ Play take';el('pianoPlayback').disabled=recording||!recorded.length;
   el('pianoClear').disabled=recording||playing||!recorded.length;
   el('pianoRecordStatus').textContent=recording?'Recording… '+Math.floor(Math.min(60,now()-recordStart))+' / 60 seconds':recorded.length?recorded.length+' note'+(recorded.length===1?'':'s')+' · '+Math.ceil(Math.max(...recorded.map(note=>note.at+note.duration)))+' seconds saved.':'No recording yet.';
  }
  function drawKeys(){
   let whites=0;el('pianoKeys').innerHTML='';keyButtons.clear();
   for(let offset=0;offset<=24;offset++){
    const midi=(octave+1)*12+offset,black=[1,3,6,8,10].includes(midi%12),button=doc.createElement('button');
    button.type='button';button.className='piano-key '+(black?'piano-black':'piano-white');button.dataset.midi=String(midi);button.setAttribute('aria-label','Play '+keyPositionName(midi,(octave+1)*12));button.setAttribute('aria-pressed','false');
    button.style.setProperty('--key-position',String(black?whites-.31:whites));
    button.innerHTML='<span class="piano-key-name"'+(showNames?'':' hidden')+'>'+noteLetter(midi)+'</span>'+(offset<SHORTCUTS.length?'<kbd>'+SHORTCUTS[offset].toUpperCase()+'</kbd>':'');
    if(!black)whites++;button.addEventListener('pointerdown',event=>{event.preventDefault();if(event.button!==0)return;button.focus({preventScroll:true});try{button.setPointerCapture(event.pointerId);}catch{}pointerKeys.set(event.pointerId,midi);press(midi,'pointer:'+event.pointerId);});
    button.addEventListener('keydown',event=>{
     if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const target=event.key==='Home'?0:event.key==='End'?24:clamp(offset+(event.key==='ArrowRight'?1:-1),0,24);keyButtons.get((octave+1)*12+target)?.focus();}
     if(event.key==='Enter'||event.key===' '){event.preventDefault();if(!event.repeat)press(midi,'button:'+midi);}
    });
    button.addEventListener('keyup',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();release(midi,'button:'+midi);}});
    button.addEventListener('blur',()=>release(midi,'button:'+midi));
    el('pianoKeys').append(button);keyButtons.set(midi,button);
   }
   el('pianoKeys').style.setProperty('--white-keys',String(whites));updateKeyHighlights();
  }
  function updateKeyHighlights(){const next=challengeMode==='interval'&&interval&&intervalStep<2?(octave+1)*12+(intervalStep?interval.target:interval.start):lesson&&lessonStep<lesson.notes.length?(octave+1)*12+lesson.notes[lessonStep]:null;for(const [midi,button] of keyButtons){const active=held.has(midi);button.classList.toggle('is-playing',active);button.setAttribute('aria-pressed',String(active));button.classList.toggle('is-next',midi===next);}}
  function audio(){
   if(!context){const Constructor=api.AudioContext||win.AudioContext||win.webkitAudioContext;if(!Constructor){message('Audio is unavailable in this browser. The keyboard and lessons still work.');return null;}try{context=new Constructor();master=context.createGain();master.gain.value=volume*.24;master.connect(context.destination);}catch{message('Audio could not start. You can still use the keyboard and lessons.');return null;}}
   if(context.state==='suspended')context.resume().catch(()=>message('Tap a piano key to enable sound.'));
   return context;
  }
  function startVoice(midi){
   const ctx=audio();if(!ctx||ctx.state==='closed')return;stopVoice(midi,true);const at=ctx.currentTime,envelope=ctx.createGain();envelope.gain.setValueAtTime(.0001,at);envelope.gain.exponentialRampToValueAtTime(.65,at+.008);envelope.gain.exponentialRampToValueAtTime(.20,at+.35);envelope.gain.exponentialRampToValueAtTime(.0001,at+4);envelope.connect(master);
   const oscillators=[1,2,3].map((partial,index)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type='sine';oscillator.frequency.value=frequency(midi)*partial;gain.gain.value=[1,.18,.055][index];oscillator.connect(gain);gain.connect(envelope);oscillator.start(at);oscillator.stop(at+4.1);return oscillator;});
   const voice={envelope,oscillators,timer:null};voice.timer=win.setTimeout(()=>{if(voices.get(midi)===voice){voices.delete(midi);try{envelope.disconnect();}catch{}}},4200);voices.set(midi,voice);
  }
  function stopVoice(midi,immediate=false){const voice=voices.get(midi);if(!voice)return;voices.delete(midi);win.clearTimeout(voice.timer);if(context?.state!=='closed'){const at=context.currentTime;try{voice.envelope.gain.cancelScheduledValues(at);voice.envelope.gain.setTargetAtTime(.0001,at,immediate?.008:.09);for(const oscillator of voice.oscillators)oscillator.stop(at+(immediate?.04:.4));}catch{}}win.setTimeout(()=>{try{voice.envelope.disconnect();}catch{}},immediate?60:450);}
  function captureRelease(midi){const entry=recordHeld.get(midi);if(!entry)return;entry.duration=clamp(now()-recordStart-entry.at,.04,60-entry.at);recordHeld.delete(midi);}
  function press(midi,source='external',playback=false){
   if(!opened||destroyed||!Number.isInteger(midi))return;
   let sources=held.get(midi);if(!sources){sources=new Set();held.set(midi,sources);startVoice(midi);if(recording&&!playback&&recorded.length<1024){const at=clamp(now()-recordStart,0,59.96),entry={midi,at,duration:.04};recorded.push(entry);recordHeld.set(midi,entry);}if(!playback){if(challengeMode==='interval')advanceInterval(midi);else advanceLesson(midi);}}
   sources.add(source);lastWallNote=midi;el('pianoWallNote').textContent='Back wall: '+noteLetter(midi);el('pianoNoteDisplay').textContent=Array.from(held.keys()).sort((a,b)=>a-b).map(noteLetter).join(' · ');updateKeyHighlights();
  }
  function release(midi,source='external'){const sources=held.get(midi);if(!sources)return;sources.delete(source);if(sources.size)return;held.delete(midi);captureRelease(midi);if(!sustain)stopVoice(midi);el('pianoNoteDisplay').textContent=held.size?Array.from(held.keys()).sort((a,b)=>a-b).map(noteLetter).join(' · '):'Ready to play';updateKeyHighlights();}
  function releaseAll(){touchHeld.clear();for(const midi of recordHeld.keys())captureRelease(midi);held.clear();computerKeys.clear();pointerKeys.clear();roomKeys.clear();floorNote=roomPlayer.jump>1?null:floorKeyAt(roomPlayer.x,roomPlayer.y);for(const midi of voices.keys())stopVoice(midi,true);el('pianoNoteDisplay').textContent='Ready to play';updateKeyHighlights();}
  function setSustain(value){sustain=!!value;el('pianoSustain').setAttribute('aria-pressed',String(sustain));el('pianoSustain').textContent='Sustain: '+(sustain?'On':'Off');if(!sustain)for(const midi of voices.keys())if(!held.has(midi))stopVoice(midi);}
  function stopPlayback(){for(const timer of playTimers)win.clearTimeout(timer);playTimers=[];playing=false;releaseAll();updateRecordingUI();}
  function stopRecording(){if(!recording)return;for(const midi of recordHeld.keys())captureRelease(midi);recording=false;win.clearInterval(recordTimer);recordTimer=null;persistTake();updateRecordingUI();message(recorded.length?'Take saved. Press Play take to hear it.':'No notes recorded. Try another take.');}
  function toggleRecording(){if(recording){stopRecording();return;}stopPlayback();releaseAll();recorded=[];recordHeld.clear();recordStart=now();recording=true;updateRecordingUI();message('Recording started. Play anything you like.');recordTimer=win.setInterval(()=>{if(now()-recordStart>=60)stopRecording();else updateRecordingUI();},200);}
  function togglePlayback(){if(playing){stopPlayback();message('Playback stopped.');return;}if(!recorded.length||recording)return;releaseAll();audio();playing=true;el('pianoModeDisplay').textContent='PLAYING TAKE';updateRecordingUI();for(let index=0;index<recorded.length;index++){const note=recorded[index],source='take:'+index;playTimers.push(win.setTimeout(()=>{if(playing)press(note.midi,source,true);},note.at*1000),win.setTimeout(()=>release(note.midi,source),(note.at+note.duration)*1000));}const duration=Math.max(...recorded.map(note=>note.at+note.duration));playTimers.push(win.setTimeout(()=>{stopPlayback();el('pianoModeDisplay').textContent=lesson?'GUIDED MELODY':'FREE PLAY';message('Playback finished.');},duration*1000+100));}
  function renderLesson(){
   el('pianoLessonDescription').textContent=lesson?lesson.description:'Explore the keys, build a chord, or choose a guided melody.';el('pianoLessonRestart').hidden=!lesson;
   el('pianoModeDisplay').textContent=playing?'PLAYING TAKE':lesson?'GUIDED MELODY':'FREE PLAY';
   el('pianoLessonProgress').innerHTML=lesson?lesson.notes.map((offset,index)=>'<span class="'+(index<lessonStep?'is-done':index===lessonStep?'is-current':'')+'">'+noteLetter((octave+1)*12+offset)+'</span>').join(''):'';
   el('pianoLessonProgress').setAttribute('aria-label',lesson?'Lesson progress: '+lessonStep+' of '+lesson.notes.length+' notes complete.':'No lesson selected.');updateKeyHighlights();
  }
  function updateGameInstructions(){el('pianoGameInstructions').textContent=challengeMode==='free'?'Free play: stepping on a key makes a sound.':mobileLayout()?'Game active: walk to a key, then tap Play note. Walking alone stays silent. You can also use the Keyboard view.':'Game active: walk to a key, then press E to play it. Walking alone stays silent. The piano buttons below also count.';el('pianoModeDisplay').textContent=challengeMode==='free'?'FREE PLAY':challengeMode==='interval'?'INTERVAL GAME':'MELODY GAME';}
  function chooseLesson(id){releaseAll();lesson=LESSONS.find(item=>item.id===id)||null;lessonStep=0;interval=null;intervalStep=0;challengeMode=lesson?'melody':'free';el('pianoIntervalPrompt').textContent='';renderLesson();updateGameInstructions();if(lesson)message('Chopin: “Start with the '+keyPositionName((octave+1)*12+lesson.notes[0],(octave+1)*12)+'. Walk onto a key and press E.”');}
  function reward(id){if(completed.has(id))return ' You have already collected this challenge’s Notes.';completed.add(id);if(typeof api.onReward!=='function')return '';try{const result=api.onReward(id,35);if(result===true||Number(result)>0||result?.amount>0)return ' You earned '+(result?.amount||35)+' Notes!';if(result?.alreadyClaimed)return ' You have already collected this challenge’s Notes.';if(result?.ok===false){completed.delete(id);return ' Notes could not be saved; complete the challenge again to retry.';}}catch{completed.delete(id);}return '';}
  function advanceLesson(midi){if(!lesson||lessonStep>=lesson.notes.length)return;const expected=(octave+1)*12+lesson.notes[lessonStep];if(midi!==expected){message('Chopin: “Try the '+keyPositionName(expected,(octave+1)*12)+' next.”');return;}lessonStep++;renderLesson();updateGameInstructions();if(lessonStep===lesson.notes.length)message('Chopin: “Beautifully played!”'+reward('piano-lesson:'+lesson.id)+' Choose another melody or keep exploring.');else message('Chopin: “Lovely! Next: the '+keyPositionName((octave+1)*12+lesson.notes[lessonStep],(octave+1)*12)+'.”');}
  function startInterval(){releaseAll();lesson=null;lessonStep=0;el('pianoLesson').value='';interval=INTERVALS.find(item=>item.id===el('pianoInterval').value)||INTERVALS[0];intervalStep=0;challengeMode='interval';renderLesson();updateGameInstructions();el('pianoIntervalPrompt').textContent='Chopin: “Start on the '+keyPositionName((octave+1)*12+interval.start,(octave+1)*12)+', then play a '+interval.name+'.”';message('Interval challenge ready. Step onto the starting note and press E.');}
  function advanceInterval(midi){if(!interval||intervalStep>=2)return;const expected=(octave+1)*12+(intervalStep?interval.target:interval.start);if(midi!==expected){message(intervalStep?'Chopin: “Find a '+interval.name+' from the starting note.”':'Chopin: “Start on the '+keyPositionName(expected,(octave+1)*12)+' first.”');return;}intervalStep++;updateKeyHighlights();if(intervalStep===2){el('pianoIntervalPrompt').textContent='Correct! '+keyPositionName((octave+1)*12+interval.start,(octave+1)*12)+' → '+keyPositionName((octave+1)*12+interval.target,(octave+1)*12);message('Chopin: “Exactly right!”'+reward('piano-interval:'+interval.id));}else message('Chopin: “Good. Now play a '+interval.name+'.”');}
  const WHITE_OFFSETS=[0,2,4,5,7,9,11,12],BLACK_KEYS=[[1,1],[3,2],[6,4],[8,5],[10,6]];
  const paintedKeys=paintedFloorKeys();
  function floorKeyAt(x,y){if(backdropReady){for(let at=paintedKeys.length-1;at>=0;at--)if(polygonContains(paintedKeys[at].polygon,x,y))return (octave+1)*12+paintedKeys[at].offset;return null;}if(x<ROOM.keyX||x>=ROOM.keyX+ROOM.keyW||y<ROOM.keyY||y>ROOM.keyY+ROOM.keyH)return null;const width=ROOM.keyW/8;if(y<ROOM.keyY+112)for(const [offset,index] of BLACK_KEYS){const left=ROOM.keyX+(index-.31)*width;if(x>=left&&x<left+width*.62)return (octave+1)*12+offset;}return (octave+1)*12+WHITE_OFFSETS[Math.min(7,Math.floor((x-ROOM.keyX)/width))];}
  function syncFloorNote(){const next=roomPlayer.jump>1?null:floorKeyAt(roomPlayer.x,roomPlayer.y);if(next===floorNote)return;if(floorNote!==null){release(floorNote,'floor');release(floorNote,'floor-intent');}floorNote=next;if(next!==null&&challengeMode==='free')press(next,'floor');}
  function talkChopin(){if(challengeMode==='free'){el('pianoLesson').value='twinkle';chooseLesson('twinkle');}else message('Chopin: “'+(challengeMode==='interval'?'Start on the pitch I asked for, then play the interval.':'Play '+lesson.name+' for me. Follow the glowing key.')+' Walk onto each key and press E.”');}
  function roomPointer(event){if(event.button!==0||roomFinger&&event.pointerType==='touch'&&mobileLayout())return;el('pianoRoomCanvas').focus();const box=event.currentTarget.getBoundingClientRect();roomDest={x:clamp((event.clientX-box.left)/box.width*ROOM.width,50,950),y:clamp((event.clientY-box.top)/box.height*ROOM.height,235,590)};}
  const roomContext=el('pianoRoomCanvas').getContext('2d');
  let roomBackdrop=null,backdropReady=false;
  if(typeof api.backgroundUrl==='string'&&api.backgroundUrl){roomBackdrop=new win.Image();roomBackdrop.onload=()=>{backdropReady=roomBackdrop.naturalWidth>0;};roomBackdrop.src=api.backgroundUrl;}
  function drawRoom(){
   const g=roomContext;if(!g)return;g.clearRect(0,0,1000,620);g.imageSmoothingEnabled=false;
   const rect=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);},text=(value,x,y,size,color,align='center')=>{g.fillStyle=color;g.font='bold '+size+'px monospace';g.textAlign=align;g.fillText(value,x,y);};
   const help=challengeMode==='free'?'STEP ON A KEY TO PLAY':'STAND ON A KEY + PRESS E';
   if(!backdropReady){
   rect(0,0,1000,620,'#10172e');rect(26,20,948,212,'#263052');
   for(let x=26;x<974;x+=44){rect(x,20,2,212,'#3c3e67');rect(x+2,20,1,212,'#1a2544');}for(let y=20;y<232;y+=42){rect(26,y,948,2,'#3b3e66');rect(26,y+2,948,2,'#192440');}
   rect(25,229,950,10,'#151b30');rect(25,238,950,4,'#7c5b9a');rect(25,242,950,378,'#23283f');
   for(let row=0;row<10;row++)for(let col=0;col<19;col++){const x=25+col*50,y=242+row*38;rect(x+3,y+3,45,33,(row+col)%2?'#292841':'#25243c');rect(x,y,50,2,'#465078');rect(x,y+2,50,1,'#171e36');rect(x,y,2,38,'#445079');rect(x+2,y+3,1,34,'#151f35');}
   // Recessed neon wall columns and their crisp, broken tile reflections.
   for(const [x,color,shade] of [[47,'#6fdfee','#24536d'],[234,'#bb7adb','#49345e'],[758,'#ba7ada','#48365d'],[946,'#69d7ec','#26536c']]){rect(x-11,28,22,208,'#151a30');rect(x-7,32,14,196,shade);rect(x-3,34,6,190,color);rect(x-1,36,2,186,'#ecf4ff');for(let row=0;row<9;row++){const y=248+row*38;rect(x-8-(row%2)*3,y,16+(row%2)*6,30,shade);rect(x-2,y+3,4,25,row<4?color:shade);}}
   // Side wall bevels tie the room into the connected arcade architecture.
   rect(9,22,17,598,'#11172b');rect(15,28,7,592,'#3c4270');rect(21,27,3,593,'#8a6eb0');rect(974,22,17,598,'#11172b');rect(976,28,7,592,'#3c4270');rect(975,27,2,593,'#8166a2');
   rect(35,28,930,4,'#6e4391');rect(35,33,930,2,'#db8dde');
   rect(280,47,440,153,'#101e30');rect(286,53,428,141,'#16353f');rect(292,59,416,129,'#0d232e');text('PIANO LAB',500,86,18,'#e4c9f4');
   text(lastWallNote===null?'♪':noteLetter(lastWallNote),500,156,60,lastWallNote===null?'#46667a':'#aaffdf');
   text(help,500,185,12,'#94a4c1');
   for(const x of [90,910]){rect(x-10,60,20,100,'#392d4f');rect(x-6,68,12,72,'#ffd48d');rect(x-3,72,6,63,'#fff2bb');rect(x-19,143,38,5,'#8c5361');}
   // Framed scores, a book cabinet, and rolled music give Chopin a lived-in corner.
   for(const x of [139,771]){rect(x,82,70,103,'#110f23');rect(x+3,85,64,97,'#997391');rect(x+8,90,54,87,'#dfcfbb');for(let line=0;line<8;line++)rect(x+14,106+line*7,40,1,'#8e7586');for(let i=0;i<9;i++)rect(x+18+(i%4)*9,105+Math.floor(i/4)*23+(i%3)*7,5,3,'#4b465a');}
   rect(57,180,145,55,'#181528');rect(61,184,137,5,'#715369');rect(61,224,137,7,'#674e65');for(let i=0;i<12;i++){rect(66+i*10,192+(i%3)*3,8,31-(i%3)*3,['#5b516e','#7d626f','#3e6873','#8b7459'][i%4]);rect(68+i*10,197+(i%3)*3,4,2,'#b39c9d');}
   // The side piano and bench stay off the giant keyboard walking surface.
   rect(785,194,129,42,'#111225');rect(795,184,104,15,'#3e354e');rect(789,237,9,29,'#171526');rect(901,237,9,29,'#171526');rect(797,191,101,4,'#77617d');rect(818,169,42,25,'#665167');rect(823,171,33,21,'#e0ccbb');for(let line=0;line<4;line++)rect(828,176+line*4,23,1,'#947c8c');
   for(let x=795;x<901;x+=8)rect(x,216,7,16,'#e9e4e9');for(let x=800;x<895;x+=16)rect(x,215,4,11,'#1a1930');
   text('FRÉDÉRIC CHOPIN',860,177,12,'#dec4ef');
   }
   if(backdropReady){
    g.drawImage(roomBackdrop,0,0,1000,620);
    // Preserve the painting's neon frame, scanlines, and polished piano keys.
    // Only the current note, key lighting, and optional letter names are live.
    text('PIANO LAB',500,102,15,'#e4c9f4');text(lastWallNote===null?'♪':noteLetter(lastWallNote),500,153,46,lastWallNote===null?'#637fa8':'#b7ffe6');text(help,500,178,10,'#b1b6d9');
   }
   const keyWidth=ROOM.keyW/8,expected=challengeMode==='interval'&&interval&&intervalStep<2?(octave+1)*12+(intervalStep?interval.target:interval.start):lesson&&lessonStep<lesson.notes.length?(octave+1)*12+lesson.notes[lessonStep]:null;
   function floorKey(offset,left,width,black){const midi=(octave+1)*12+offset,active=held.has(midi),next=midi===expected;rect(left,ROOM.keyY,width-2,black?112:ROOM.keyH,active?'#d789c6':next?'#91dbca':black?'#201f35':'#d9d6de');rect(left+2,ROOM.keyY+2,width-6,black?97:ROOM.keyH-14,active?'#efafe0':next?'#b0f9e7':black?'#343047':'#f1edf0');if(showNames)text(noteLetter(midi),left+width/2,ROOM.keyY+(black?90:163),black?14:18,black?'#d4cce0':'#5b536c');}
   if(backdropReady){
    for(const key of paintedKeys){
     const midi=(octave+1)*12+key.offset,active=held.has(midi),next=midi===expected;
     if(active||next){g.save();g.beginPath();g.moveTo(...key.polygon[0]);for(let at=1;at<key.polygon.length;at++)g.lineTo(...key.polygon[at]);g.closePath();g.globalCompositeOperation='screen';g.fillStyle=active?'#f5caec':'#7cf6c7';g.globalAlpha=active?.32:.18;g.fill();g.globalAlpha=active?.92:.72;g.strokeStyle=active?'#fff0fc':'#a8ffe3';g.lineWidth=active?2:1.5;g.stroke();g.restore();}
     if(showNames){const x=key.polygon.reduce((sum,point)=>sum+point[0],0)/4,y=key.black?key.polygon[2][1]-9:key.polygon[2][1]-11;g.font='bold '+(key.black?10:13)+'px monospace';g.textAlign='center';g.lineWidth=3;g.strokeStyle='#111533';g.strokeText(noteLetter(midi),x,y);g.fillStyle=key.black?'#eeefff':'#242c5a';g.fillText(noteLetter(midi),x,y);}
    }
   }else{
    rect(ROOM.keyX-9,ROOM.keyY-9,ROOM.keyW+18,ROOM.keyH+21,'#111426');rect(ROOM.keyX-4,ROOM.keyY-4,ROOM.keyW+8,ROOM.keyH+13,'#76627d');
    WHITE_OFFSETS.forEach((offset,index)=>floorKey(offset,ROOM.keyX+index*keyWidth,keyWidth,false));BLACK_KEYS.forEach(([offset,index])=>floorKey(offset,ROOM.keyX+(index-.31)*keyWidth,keyWidth*.62,true));
   }
   const actors=[{x:860,y:306,id:'chopin'},{x:roomPlayer.x,y:roomPlayer.y,id:'player'}].sort((a,b)=>a.y-b.y);
   for(const actor of actors){g.save();g.translate(actor.x,actor.y);g.scale(1.5,1.5);if(renderer){if(actor.id==='player')renderer.drawPlayer(g,api.getAvatar?.()||{},{x:0,y:0,facing:roomPlayer.facing,walking:roomKeys.size>0||!!roomDest||roomFinger?.getState().following===true,phase:roomPlayer.phase,jumpHeight:roomPlayer.jump/1.5},roomClock);else renderer.drawPlayer(g,{name:'Chopin',skin:'#e6b99d',hair:'#493239',shirt:'#282b42',lowerColor:'#3d3a4a',hairstyle:'long',outfit:'coat',shoes:'oxfords',accessory:'bowtie'},{x:0,y:0,facing:'down'},roomClock);}else{rect(-8,-45,16,15,actor.id==='player'?'#c38d6c':'#e6b99d');rect(-10,-28,20,20,actor.id==='player'?'#92959c':'#282b42');rect(-9,-8,7,8,'#404257');rect(2,-8,7,8,'#404257');}g.restore();}
   if(backdropReady){g.font='bold 12px monospace';g.textAlign='center';g.lineWidth=3;g.strokeStyle='#10142c';g.strokeText('CHOPIN',860,228);g.fillStyle='#e8d7f5';g.fillText('CHOPIN',860,228);}
   if(Math.hypot(roomPlayer.x-860,roomPlayer.y-306)<110){rect(751,319,220,29,'#172538');text('E · TALK TO CHOPIN',861,339,13,'#b7f6e4');}
   if(challengeMode!=='free'&&floorNote!==null){rect(roomPlayer.x-70,roomPlayer.y+12,140,27,'#172538');text('E · PLAY '+noteLetter(floorNote),roomPlayer.x,roomPlayer.y+31,13,'#ffddb0');}
   if(!backdropReady){rect(26,610,948,4,'#8b5c9a');rect(30,615,940,3,'#332a4b');}
  }
  function roomTick(timestamp){if(!opened)return;const dt=frameTime?Math.min(.05,(timestamp-frameTime)/1000):0;frameTime=timestamp;roomClock+=dt;
   let dx=(roomKeys.has('d')||roomKeys.has('arrowright')?1:0)-(roomKeys.has('a')||roomKeys.has('arrowleft')?1:0),dy=(roomKeys.has('s')||roomKeys.has('arrowdown')?1:0)-(roomKeys.has('w')||roomKeys.has('arrowup')?1:0);
   const finger=roomFinger?.getState(),fingerTarget=finger?.following?finger.target:null;
   if(dx||dy){roomFinger?.stop('direction-controls');roomDest=null;}else if(fingerTarget){const box=el('pianoRoomCanvas').getBoundingClientRect();dx=clamp((fingerTarget.clientX-box.left)/box.width*ROOM.width,50,950)-roomPlayer.x;dy=clamp((fingerTarget.clientY-box.top)/box.height*ROOM.height,250,590)-roomPlayer.y;if(Math.hypot(dx,dy)<3)dx=dy=0;}else if(roomDest){dx=roomDest.x-roomPlayer.x;dy=roomDest.y-roomPlayer.y;if(Math.hypot(dx,dy)<3){roomDest=null;dx=dy=0;}}
   const distance=Math.hypot(dx,dy);if(distance){const step=Math.min(220*dt,roomDest||fingerTarget?distance:Infinity),nextX=clamp(roomPlayer.x+dx/distance*step,50,950),nextY=clamp(roomPlayer.y+dy/distance*step,250,590);if(Math.hypot(nextX-860,nextY-306)>30){roomPlayer.x=nextX;roomPlayer.y=nextY;}else roomDest=null;roomPlayer.phase+=step/14;roomPlayer.facing=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
   if(roomPlayer.jump>0||roomPlayer.velocity>0){roomPlayer.velocity-=650*dt;roomPlayer.jump=Math.max(0,roomPlayer.jump+roomPlayer.velocity*dt);if(!roomPlayer.jump)roomPlayer.velocity=0;}
   syncFloorNote();drawRoom();roomFrame=win.requestAnimationFrame(roomTick);
  }
  function pointerUp(event){const midi=pointerKeys.get(event.pointerId);if(midi===undefined)return;pointerKeys.delete(event.pointerId);release(midi,'pointer:'+event.pointerId);}
  function isTyping(target){return /^(INPUT|SELECT|TEXTAREA)$/.test(target?.tagName)||target?.isContentEditable;}
  function keyDown(event){
   if(!opened||event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey)return;
   if(event.key==='Escape'){event.preventDefault();close();return;}
   if(event.key==='Tab'){const controls=Array.from(host.querySelectorAll('button:not(:disabled),select,input,[tabindex="0"]')).filter(node=>!node.hidden&&node.getClientRects().length);if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&(doc.activeElement===first||!host.contains(doc.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(doc.activeElement===last||!host.contains(doc.activeElement))){event.preventDefault();first.focus();}return;}
   if(isTyping(event.target))return;
   const key=event.key.toLowerCase(),inRoom=event.target===el('pianoRoomCanvas')||keyboardMode==='walk'&&!event.target?.classList?.contains('piano-key');
   if(inRoom&&['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)){event.preventDefault();roomFinger?.stop('direction-controls');roomKeys.add(key);return;}
   if(inRoom&&key==='e'){event.preventDefault();if(event.repeat)return;if(floorNote!==null&&challengeMode!=='free')press(floorNote,'floor-intent');else if(Math.hypot(roomPlayer.x-860,roomPlayer.y-306)<110)talkChopin();return;}
   if(inRoom&&event.code==='Space'){event.preventDefault();if(!event.repeat&&!roomPlayer.jump){roomPlayer.velocity=280;roomPlayer.jump=.1;}return;}
   // A focused piano key uses Space as a button; elsewhere Space is the pedal.
   if(event.code==='Space'&&!event.target?.classList?.contains('piano-key')){event.preventDefault();if(!event.repeat)setSustain(true);return;}
   const offset=SHORTCUTS.indexOf(event.key.toLowerCase());if(offset<0)return;event.preventDefault();if(event.repeat)return;const midi=(octave+1)*12+offset;computerKeys.set(event.code||event.key,midi);press(midi,'keyboard:'+(event.code||event.key));
  }
  function keyUp(event){if(!opened)return;roomKeys.delete(event.key.toLowerCase());if(event.key.toLowerCase()==='e'&&floorNote!==null)release(floorNote,'floor-intent');if(event.code==='Space'&&!event.target?.classList?.contains('piano-key')){event.preventDefault();setSustain(false);}const code=event.code||event.key,midi=computerKeys.get(code);if(midi!==undefined){event.preventDefault();computerKeys.delete(code);release(midi,'keyboard:'+code);}}
  function control(raw,pressed){
   const key=raw==='Space'?' ':String(raw).toLowerCase();
   if(!opened||destroyed||!['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright','e',' '].includes(key))return false;
   const target=el('pianoRoomCanvas'),event={key,code:key===' '?'Space':'',target,preventDefault(){},repeat:false,defaultPrevented:false};
   if(pressed){if(touchHeld.has(key))return true;target.focus({preventScroll:true});touchHeld.add(key);keyDown(event);}else{touchHeld.delete(key);keyUp(event);}
   return true;
  }
  function releaseControls(){roomFinger?.stop('controls-released');for(const key of Array.from(touchHeld))control(key,false);touchHeld.clear();}
  function blur(){roomFinger?.stop('blur');roomKeys.clear();roomDest=null;if(opened){releaseAll();setSustain(false);}}
  function visibility(){if(doc.hidden)blur();}
  function open(){if(destroyed||opened)return;priorFocus=doc.activeElement;opened=true;host.hidden=false;host.scrollTop=0;setMobileView('room');loadTake();updateRecordingUI();el('pianoRoomCanvas').focus({preventScroll:true});frameTime=0;roomFrame=win.requestAnimationFrame(roomTick);api.onOpen?.();}
  function close(){if(!opened)return;stopRecording();stopPlayback();setSustain(false);roomFinger?.stop('closed');roomKeys.clear();opened=false;host.hidden=true;win.cancelAnimationFrame(roomFrame);frameTime=0;roomDest=null;try{context?.suspend().catch(()=>{});}catch{}api.onClose?.();if(priorFocus?.isConnected&&!host.contains(priorFocus))priorFocus.focus({preventScroll:true});}
  function getState(){return {open:opened,mobileView,fingerWalk:roomFinger?.getState()||null,octave,volume,sustain,held:Array.from(held.keys()),voiceCount:voices.size,audioState:context?.state||'closed',recording,playing,recorded:recorded.map(note=>({...note})),lesson:lesson?.id||null,lessonStep,lessonLength:lesson?.notes.length||0,challengeMode,interval:interval?{...interval}:null,intervalStep,completed:Array.from(completed),showNames,keyboardMode,lastWallNote,floorNote,player:{...roomPlayer},chopin:{x:860,y:306,name:'Frédéric Chopin'},background:{ready:backdropReady,url:api.backgroundUrl||null},floorKeys:backdropReady?paintedKeys.map(key=>({midi:(octave+1)*12+key.offset,black:key.black,polygon:key.polygon.map(point=>point.slice())})):[]};}
  function destroy(){close();roomFinger?.dispose();destroyed=true;win.removeEventListener('keydown',keyDown);win.removeEventListener('keyup',keyUp);win.removeEventListener('pointerup',pointerUp);win.removeEventListener('pointercancel',pointerUp);win.removeEventListener('blur',blur);doc.removeEventListener('visibilitychange',visibility);try{context?.close().catch(()=>{});}catch{}}
  el('closepiano').addEventListener('click',close);el('pianoPanic').addEventListener('click',()=>{stopPlayback();releaseAll();setSustain(false);message('All notes released.');});
  el('pianoSustain').addEventListener('click',()=>setSustain(!sustain));el('pianoVolume').addEventListener('input',event=>{volume=Number(event.target.value)/100;if(master&&context)master.gain.setTargetAtTime(volume*.24,context.currentTime,.02);});
  el('pianoOctave').addEventListener('change',event=>{stopPlayback();releaseAll();octave=Number(event.target.value);drawKeys();lessonStep=0;intervalStep=0;renderLesson();updateGameInstructions();if(interval)startInterval();});
  el('pianoRecord').addEventListener('click',toggleRecording);el('pianoPlayback').addEventListener('click',togglePlayback);el('pianoClear').addEventListener('click',()=>{recorded=[];persistTake();updateRecordingUI();message('Recording cleared.');});
  el('pianoLesson').addEventListener('change',event=>{chooseLesson(event.target.value);returnToFloor();});el('pianoLessonRestart').addEventListener('click',()=>{chooseLesson(lesson?.id);returnToFloor();});
  el('pianoTalkChopin').addEventListener('click',()=>{talkChopin();returnToFloor();});el('pianoStartInterval').addEventListener('click',()=>{startInterval();returnToFloor();});el('pianoFreePlay').addEventListener('click',()=>{el('pianoLesson').value='';chooseLesson('');message('Free play: step onto any giant key to make it sing.');returnToFloor();});
  el('pianoKeyNames').addEventListener('change',event=>{showNames=event.target.checked;for(const span of host.querySelectorAll('.piano-key-name'))span.hidden=!showNames;});
  el('pianoKeyboardMode').addEventListener('change',event=>{keyboardMode=event.target.value;releaseAll();});
  roomFinger=win.createCodaFingerWalk?.({canvas:el('pianoRoomCanvas'),enabled:()=>opened&&!destroyed&&mobileLayout()&&mobileView==='room',onStart:()=>{roomDest=null;roomKeys.clear();el('pianoRoomCanvas').focus({preventScroll:true});},onStop:()=>{roomDest=null;}})||null;
  el('pianoRoomCanvas').addEventListener('pointerdown',roomPointer);
  win.addEventListener('keydown',keyDown);win.addEventListener('keyup',keyUp);win.addEventListener('pointerup',pointerUp);win.addEventListener('pointercancel',pointerUp);win.addEventListener('blur',blur);doc.addEventListener('visibilitychange',visibility);
  for(const button of host.querySelectorAll('[data-piano-view]'))button.addEventListener('click',()=>setMobileView(button.dataset.pianoView,true));
  drawKeys();loadTake();updateRecordingUI();renderLesson();setMobileView('room');drawRoom();
  return {open,close,destroy,getState,control,releaseControls,setMobileView};
 }
 const exported={createCodaPianoLab,noteName,noteLetter,keyPositionName,frequency,LESSONS,INTERVALS,paintedFloorKeys,polygonContains};
 if(typeof module==='object'&&module.exports)module.exports=exported;else root.createCodaPianoLab=createCodaPianoLab;
})(typeof window==='object'?window:globalThis);
