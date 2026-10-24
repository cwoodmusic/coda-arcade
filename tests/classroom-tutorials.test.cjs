const test=require('node:test'),assert=require('node:assert/strict');
const {KEY,LESSONS,VALUES,NOTE_STEPS,validBar,normalize,readProgress}=require('../classroom-tutorials.js');
test('every rhythm-tree level preserves a four-beat bar while halving each note',()=>{
 assert.deepEqual(VALUES.map(value=>value.units),[16,8,4,2,1]);
 assert.deepEqual(VALUES.map(value=>value.count),[1,2,4,8,16]);
 for(let at=0;at<VALUES.length;at++){assert.equal(VALUES[at].units*VALUES[at].count/4,4);if(at)assert.equal(VALUES[at].units,VALUES[at-1].units/2);}
});
test('note-name teaching and staff positions agree with the actual musical pitches',()=>{
 const pitchLetters=['C','','D','','E','F','','G','','A','','B'];
 for(const step of NOTE_STEPS){assert.equal(pitchLetters[step.pitch%12],step.answer);assert.doesNotMatch(step.teach+' '+step.prompt+' '+step.hint,/\b[A-G][0-8]\b/);}
 const staff=NOTE_STEPS.filter(step=>step.kind==='staff');assert.deepEqual(staff.map(step=>step.position),[0,1,2,3,4,5]);assert.deepEqual(staff.map(step=>step.answer),['E','F','G','A','B','C']);
 assert.equal(new Set(LESSONS.map(lesson=>lesson.id)).size,2);
});
test('the build-a-bar check requires the actual recipe, not merely any four-beat total',()=>{
 assert.equal(validBar([4,2,2,8]),true);assert.equal(validBar([8,2,4,2]),true);
 for(const notes of [[16],[4,4,4,4],[4,2,2],[4,2,2,8,1],null,['4',2,2,8]])assert.equal(validBar(notes),false);
});
test('progress never accepts an incomplete lesson as completed and handles damaged saves',()=>{
 const state=normalize({version:1,lessons:{'note-naming':{step:3,completed:true},'rhythm-tree':{step:4,completed:true,completedAt:12}}});
 assert.equal(state.lessons['note-naming'].completed,false);assert.equal(state.lessons['rhythm-tree'].completed,true);
 const saved=readProgress({getItem:key=>key===KEY?JSON.stringify(state):null});assert.deepEqual(saved.completed,['rhythm-tree']);assert.equal(saved.completedCount,1);assert.equal(saved.total,2);
 const damaged=readProgress({getItem(){throw Error('blocked');}});assert.equal(damaged.completedCount,0);assert.equal(damaged.persistent,false);assert.ok(damaged.error);
});
