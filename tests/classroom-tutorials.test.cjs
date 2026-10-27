const test=require('node:test'),assert=require('node:assert/strict');
const {KEY,LESSONS,VALUES,NOTE_STEPS,BASS_STEPS,GRAND_STEPS,KEY_STEPS,staffSVG,validBar,normalize,readProgress}=require('../classroom-tutorials.js');
test('every rhythm-tree level preserves a four-beat bar while halving each note',()=>{
 assert.deepEqual(VALUES.map(value=>value.units),[16,8,4,2,1]);
 assert.deepEqual(VALUES.map(value=>value.count),[1,2,4,8,16]);
 for(let at=0;at<VALUES.length;at++){assert.equal(VALUES[at].units*VALUES[at].count/4,4);if(at)assert.equal(VALUES[at].units,VALUES[at-1].units/2);}
});
test('note-name teaching and staff positions agree with the actual musical pitches',()=>{
 const pitchLetters=['C','','D','','E','F','','G','','A','','B'];
 for(const step of NOTE_STEPS){assert.equal(pitchLetters[step.pitch%12],step.answer);assert.doesNotMatch(step.teach+' '+step.prompt+' '+step.hint,/\b[A-G][0-8]\b/);}
 const staff=NOTE_STEPS.filter(step=>step.kind==='staff');assert.deepEqual(staff.map(step=>step.position),[0,1,2,3,4,5]);assert.deepEqual(staff.map(step=>step.answer),['E','F','G','A','B','C']);
 assert.equal(new Set(LESSONS.map(lesson=>lesson.id)).size,6);
});
test('the build-a-bar check accepts any supported notes totaling four beats',()=>{
 for(const notes of [[4,2,2,8],[8,2,4,2],[16],[8,8],[4,4,4,4],Array(16).fill(1),[8,4,2,1,1]])assert.equal(validBar(notes),true);
 for(const notes of [[],[4,2,2],[4,2,2,8,1],[15,1],[0,16],[-4,16,4],[.5,.5,15],null,['4',2,2,8]])assert.equal(validBar(notes),false);
});
test('progress never accepts an incomplete lesson as completed and handles damaged saves',()=>{
 const state=normalize({version:1,lessons:{'note-naming':{step:3,completed:true},'rhythm-tree':{step:4,completed:true,completedAt:12}}});
 assert.equal(state.lessons['note-naming'].completed,false);assert.equal(state.lessons['rhythm-tree'].completed,true);
 const saved=readProgress({getItem:key=>key===KEY?JSON.stringify(state):null});assert.deepEqual(saved.completed,['rhythm-tree']);assert.equal(saved.completedCount,1);assert.equal(saved.total,6);
 const damaged=readProgress({getItem(){throw Error('blocked');}});assert.equal(damaged.completedCount,0);assert.equal(damaged.persistent,false);assert.ok(damaged.error);
});
test('bass and grand staff steps teach the requested bottom-up reminders and real pitches',()=>{
 const pitchLetters=['C','','D','','E','F','','G','','A','','B'];
 for(const step of [...BASS_STEPS,...GRAND_STEPS]){
  assert.equal(pitchLetters[step.pitch%12],step.answer);
  const scale=step.clef==='bass'?[43,45,47,48,50,52,53,55,57,59,60]:[64,65,67,69,71,72,74,76,77];
  if(step.position>=0&&step.position<scale.length)assert.equal(scale[step.position],step.pitch);
  assert.doesNotMatch(step.teach+' '+step.example+' '+step.hint,/\b[A-G][0-8]\b/);
 }
 const bass=BASS_STEPS.map(step=>step.teach+' '+step.example).join(' '),grand=GRAND_STEPS.map(step=>step.teach+' '+step.example).join(' ');
 assert.match(bass,/Great Big Dreams For America/);assert.match(bass,/All Cows Eat Grass/);
 assert.match(grand,/Every Good Boy Does Fine/);assert.match(grand,/FACE/);
 const middle=GRAND_STEPS.filter(step=>step.pitch===60);assert.deepEqual(middle.map(step=>[step.clef,step.position]),[['treble',-2],['bass',10]]);
 assert.ok(GRAND_STEPS.every(step=>step.grand));
 const legacy=normalize({version:1,lessons:{'note-naming':{step:10,completed:true,completedAt:1}}});
 assert.equal(legacy.lessons['note-naming'].completed,true);assert.equal(legacy.lessons['bass-clef'].step,0);assert.equal(legacy.lessons['grand-staff'].completed,false);
});
test('lesson pictures reuse engraved clefs and join two staffs with one question note',()=>{
 const notation=require('../music-notation.js'),bass=staffSVG(6,{clef:'bass'}),grand=staffSVG(10,{clef:'bass',grand:true});
 assert.ok(bass.includes(notation.glyph('fClef')));assert.ok(!bass.includes(notation.glyph('gClef')));assert.match(bass,/staff-clef" x="36" y="65"/);
 assert.equal((grand.match(/class="staff-line"/g)||[]).length,10);
 assert.ok(grand.includes(notation.glyph('fClef'))&&grand.includes(notation.glyph('gClef')));
 assert.equal((grand.match(/class="coda-music-glyph staff-note"/g)||[]).length,1);
 assert.match(grand,/data-staff-position="10"/);assert.match(grand,/class="staff-ledger"/);assert.match(grand,/translate\(0 120\)/);
});

test('little learner pages keep one short instruction and preserve every saved exercise',()=>{
 const {SIMPLE_NOTE_COPY,NOTE_LESSONS}=require('../classroom-tutorials.js');
 for(const [id,steps]of Object.entries(NOTE_LESSONS)){
  assert.equal(SIMPLE_NOTE_COPY[id].length,steps.length,id+' keeps its saved step count');
  for(const [index,copy]of SIMPLE_NOTE_COPY[id].entries()){
   const [guide,caption,prompt,hint]=copy;
   assert.ok(guide.trim().split(/\s+/).length<=12,id+' guide '+index+' is one small idea');
   assert.ok(hint.trim().split(/\s+/).length<=16,id+' hint '+index+' stays short');
   assert.ok(prompt.trim().split(/\s+/).length<=6,id+' action '+index+' is simple');
   assert.doesNotMatch([guide,caption,prompt,hint].join(' '),/\b[A-G][0-8]\b/,'No octave labels in child-facing text');
   if(steps[index].kind==='keys')assert.equal(prompt,'Tap '+steps[index].answer+'.');
  }
 }
 const all=Object.values(SIMPLE_NOTE_COPY).flat().flat().join(' ');
 for(const saying of ['Every Good Boy Does Fine','FACE','Great Big Dreams For America','All Cows Eat Grass','Middle C'])assert.ok(all.includes(saying),saying+' remains available in the teaching');
});


test('a tiny split picture and its sound always describe the same local amount of music',()=>{
 const {splitExample}=require('../classroom-tutorials.js');
 assert.deepEqual([0,1,2,3,4].map(level=>splitExample(level).counts),[4,4,2,1,.5]);
 for(let level=0;level<5;level++){
  const example=splitExample(level);assert.equal(example.notes.length,level?2:1);
  assert.ok(example.notes.every(units=>units===VALUES[level].units));
  if(level)assert.equal(example.notes.reduce((sum,n)=>sum+n,0),example.parentUnits,'The two children last exactly as long as their pictured parent');
 }
});

test('major and minor keys teach musical homes through short, correctly pitched examples',()=>{
 assert.equal(LESSONS.find(lesson=>lesson.id==='major-minor-keys').total,8);
 assert.equal(KEY_STEPS.length,8);
 for(const question of KEY_STEPS){
  assert.ok(question.guide.split(/\s+/).length<=13,'One small teaching idea at a time');
  assert.equal(question.answers.length,3);assert.ok(question.answers[question.answer]);
  assert.ok(question.hint&&question.caption);assert.ok(question.sounds.length>0);
  assert.doesNotMatch(JSON.stringify({guide:question.guide,caption:question.caption,prompt:question.prompt,notes:question.notes}),/\b[A-G][♯♭]?[0-8]\b/);
  for(const sound of question.sounds)assert.ok(sound.notes.every(note=>Number.isInteger(note)&&note>=48&&note<=84));
 }
 assert.deepEqual(KEY_STEPS[2].sounds.map(sound=>sound.notes[1]),[64,63],'C major uses E, C minor E-flat');
 assert.deepEqual(KEY_STEPS[1].sounds[0].notes,[60,62,64,65,67,69,71,72,71,69,67,65,64,62,60]);
 assert.deepEqual(KEY_STEPS[5].sounds[0].notes,[62,64,66,67,69,71,73,74],'D major has F-sharp and C-sharp');
 assert.deepEqual(KEY_STEPS[6].sounds[0].notes,[57,59,60,62,64,65,67,69],'A natural minor has no altered notes');
 assert.match(KEY_STEPS[4].caption,/Either.*happy or sad/,'Mood is not a rigid major/minor rule');
 const legacy=normalize({version:1,lessons:{'note-naming':{step:10,completed:true,completedAt:123}}});
 assert.equal(legacy.lessons['note-naming'].completed,true);assert.deepEqual(legacy.lessons['major-minor-keys'],{step:0,completed:false,completedAt:0});
});
