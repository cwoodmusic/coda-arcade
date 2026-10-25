const test=require('node:test'),assert=require('node:assert/strict');
const {KEY,LESSONS,VALUES,NOTE_STEPS,BASS_STEPS,GRAND_STEPS,staffSVG,validBar,normalize,readProgress}=require('../classroom-tutorials.js');
test('every rhythm-tree level preserves a four-beat bar while halving each note',()=>{
 assert.deepEqual(VALUES.map(value=>value.units),[16,8,4,2,1]);
 assert.deepEqual(VALUES.map(value=>value.count),[1,2,4,8,16]);
 for(let at=0;at<VALUES.length;at++){assert.equal(VALUES[at].units*VALUES[at].count/4,4);if(at)assert.equal(VALUES[at].units,VALUES[at-1].units/2);}
});
test('note-name teaching and staff positions agree with the actual musical pitches',()=>{
 const pitchLetters=['C','','D','','E','F','','G','','A','','B'];
 for(const step of NOTE_STEPS){assert.equal(pitchLetters[step.pitch%12],step.answer);assert.doesNotMatch(step.teach+' '+step.prompt+' '+step.hint,/\b[A-G][0-8]\b/);}
 const staff=NOTE_STEPS.filter(step=>step.kind==='staff');assert.deepEqual(staff.map(step=>step.position),[0,1,2,3,4,5]);assert.deepEqual(staff.map(step=>step.answer),['E','F','G','A','B','C']);
 assert.equal(new Set(LESSONS.map(lesson=>lesson.id)).size,5);
});
test('the build-a-bar check requires the actual recipe, not merely any four-beat total',()=>{
 assert.equal(validBar([4,2,2,8]),true);assert.equal(validBar([8,2,4,2]),true);
 for(const notes of [[16],[4,4,4,4],[4,2,2],[4,2,2,8,1],null,['4',2,2,8]])assert.equal(validBar(notes),false);
});
test('progress never accepts an incomplete lesson as completed and handles damaged saves',()=>{
 const state=normalize({version:1,lessons:{'note-naming':{step:3,completed:true},'rhythm-tree':{step:4,completed:true,completedAt:12}}});
 assert.equal(state.lessons['note-naming'].completed,false);assert.equal(state.lessons['rhythm-tree'].completed,true);
 const saved=readProgress({getItem:key=>key===KEY?JSON.stringify(state):null});assert.deepEqual(saved.completed,['rhythm-tree']);assert.equal(saved.completedCount,1);assert.equal(saved.total,5);
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
