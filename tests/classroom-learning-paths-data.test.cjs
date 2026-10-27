const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const paths=require('../classroom-learning-paths-data.js');
const curriculum=require('../classroom-exam-curriculum.js');
const accidentals=require('../classroom-accidentals-lesson.js');
const study=require('../classroom-exam-study.js');
const ids=cards=>cards.map(card=>card.id);
const flat=category=>category.sections.flatMap(section=>section.cards);

test('all nine categories have named basic and advanced chapters and complete canonical teaching coverage',()=>{
 assert.deepEqual(paths.CATEGORIES.map(item=>item.id),[...curriculum.IDS,'accidentals-key-signatures']);
 assert.deepEqual(paths.validate(),{ok:true,errors:[]});
 for(const {id}of paths.CATEGORIES){
  const category=paths.getCategory(id),cards=flat(category),original=id===accidentals.ID?accidentals.CARDS:curriculum.forLesson(id);
  assert.equal(new Set(ids(cards)).size,cards.length,id+' no duplicated teaching cards');
  for(const old of original){const selected=cards.find(card=>card.id===old.id);assert.ok(selected,id+' retains '+old.id);assert.deepEqual(selected.covers,old.covers,old.id+' keeps exam links');}
  assert.ok(category.sections.some(section=>section.tier==='basic'));
  assert.ok(category.sections.some(section=>section.tier==='advanced'));
  const firstAdvanced=category.sections.findIndex(section=>section.tier==='advanced');
  assert.ok(category.sections.slice(firstAdvanced).every(section=>section.tier==='advanced'),id+' basics come first');
  for(const card of cards)assert.ok(study.validCard(card),card.id+' is a complete teach/example/practice card');
 }
 const coverage=curriculum.getCoverage(undefined,Object.fromEntries(curriculum.IDS.map(id=>[id,flat(paths.getCategory(id))])));
 assert.equal(coverage.covered,800);assert.equal(coverage.complete,true);
});

test('rhythm begins with notehead/stem/flag, quarter/half/whole/eighth, tree, then counting',()=>{
 const category=paths.getCategory('rhythm-tree'),basic=category.sections.filter(section=>section.tier==='basic');
 assert.deepEqual(basic.map(section=>section.id),['note-parts','note-symbols','rhythm-tree','counting']);
 assert.deepEqual(basic[0].cards.map(card=>card.visual.focus),['head','stem','flag']);
 assert.match(basic[0].cards[0].teach,/notehead/);
 assert.deepEqual(ids(basic[1].cards),['rhythm-tree-quarter-note','path-half-note','rhythm-tree-whole-and-half','path-eighth-note']);
 assert.deepEqual(basic[2].cards.map(card=>card.visual.level),[1,2,3]);
 for(const card of basic.flatMap(section=>section.cards)){
  assert.doesNotMatch(JSON.stringify(card),/sixteenth|16th|dotted|1 e & a/i,card.id+' avoids untaught advanced rhythms');
  for(const note of card.visual?.notes||[])assert.ok([1,2,4,.5].includes(note.beats),card.id);
 }
 assert.ok(category.sections.find(section=>section.id==='sixteenth-notes').cards.some(card=>card.id==='path-sixteenth-note'));
 assert.ok(category.sections.find(section=>section.id==='dotted-notes').cards.some(card=>card.id==='rhythm-tree-dots'));
 const held=flat(category).find(card=>card.id==='path-count-held-notes');assert.equal(held.answers[held.correct],'1 2 3 4');
});

test('both clefs and both mnemonic maps are explained before their first note-naming question',()=>{
 for(const [id,prefix,firstQuestion]of [['note-naming','treble','treble-all-lines'],['bass-clef','bass','bass-all-lines']]){
  const cards=flat(paths.getCategory(id)),at=cards.findIndex(card=>card.id===firstQuestion);
  for(const introId of ['path-'+prefix+'-clef','path-'+prefix+'-lines-reminder','path-'+prefix+'-spaces-reminder'])assert.ok(cards.findIndex(card=>card.id===introId)<at,introId+' must be taught first');
  assert.match(cards.find(card=>card.id==='path-'+prefix+'-lines-reminder').teach,/bottom to top/);
  assert.match(cards.find(card=>card.id==='path-'+prefix+'-spaces-reminder').teach,/bottom.*top/);
  assert.equal(cards.find(card=>card.id===firstQuestion).visual.kind,'clef-intro');
 }
 const treble=paths.getCards('note-naming').find(card=>card.id==='path-treble-clef');assert.match(treble.example,/second line from the bottom.*G/);
 const bass=paths.getCards('bass-clef').find(card=>card.id==='path-bass-clef');assert.match(bass.teach,/two dots.*F line/);
});

test('basics checks draw only from already taught basic cards and never leak advanced rhythm',()=>{
 for(const {id}of paths.CATEGORIES){
  const category=paths.getCategory(id),cards=category.sections.filter(section=>section.tier==='basic').flatMap(section=>section.cards),quiz=paths.basicsQuiz(category);
  assert.equal(quiz.questions.length,5,id);assert.equal(quiz.passScore,4);assert.equal(quiz.custom,true);
  for(const question of quiz.questions){
   const taught=cards.find(card=>'basics-'+card.id===question.id);assert.ok(taught,question.id);
   assert.equal(question.prompt,taught.prompt);assert.deepEqual(question.answers,taught.answers);assert.equal(question.correct,taught.correct);
  }
 }
 assert.doesNotMatch(JSON.stringify(paths.basicsQuiz('rhythm-tree')),/sixteenth|16th|dotted|1 e & a/i);
});

test('authored deletions, empty categories, edits, section ordering and new cards remain intentional',()=>{
 const all=paths.getCards('rhythm-tree'),head=all.find(card=>card.id==='path-note-head'),flag=all.find(card=>card.id==='path-note-flag');
 const added={...head,id:'teacher-new-card',title:'A teacher’s new idea'},edited={...flag,title:'Teacher flag words'};
 const authored=[edited,head,added];
 const category=paths.getCategory('rhythm-tree',{content:{getStudyCards:()=>authored}});
 assert.deepEqual(category.sections.map(section=>section.id),['note-parts','additional-practice']);
 assert.deepEqual(ids(category.sections[0].cards),['path-note-flag','path-note-head']);
 assert.equal(category.sections[0].cards[0].title,'Teacher flag words');
 assert.deepEqual(category.sections[1].cards,[added]);assert.equal(category.sections[1].tier,'advanced');
 assert.equal(flat(category).some(card=>card.id==='path-note-stem'),false);
 assert.deepEqual(paths.getCategory('rhythm-tree',{content:{getStudyCards:()=>[]}}).sections,[]);
 assert.deepEqual(authored,[edited,head,added]);
});

test('returned models can be edited without mutating defaults, and the browser API is pure',()=>{
 const before=paths.getCards('note-naming');
 const edited=paths.getCategory('note-naming');edited.sections[0].cards[0].title='Changed';edited.basicsQuiz.questions[0].answers[0]='Changed';
 assert.deepEqual(paths.getCards('note-naming'),before);
 const window={CodaExamCurriculum:curriculum,CodaAccidentalsLesson:accidentals};
 vm.runInNewContext(fs.readFileSync(require.resolve('../classroom-learning-paths-data.js'),'utf8'),{window});
 assert.deepEqual(JSON.parse(JSON.stringify(window.CodaClassroomLearningPathsData.getCategory('rhythm-tree'))),paths.getCategory('rhythm-tree'));
 assert.equal(paths.getCategory('does-not-exist'),null);assert.deepEqual(paths.getCards('does-not-exist'),[]);
 assert.ok(Object.isFrozen(paths.CATEGORIES));assert.ok(Object.isFrozen(paths.DEFINITIONS[0].sections));
});
