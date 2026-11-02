const test=require('node:test'),assert=require('node:assert/strict'),reading=require('../piano-sight-reading.js');
function rng(){let seed=19;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};}
test('ten-second clock, mistakes, three-second bonuses, and expiry are exact',()=>{
 const game=reading.create({random:rng()});assert.equal(game.snapshot().remaining,10);
 game.tick(2);const note=game.snapshot().turn.notes[0];assert.equal(game.answer(note.midi+1).ok,false);assert.equal(game.snapshot().remaining,8);
 assert.equal(game.answer(note.midi).bonus,3);assert.equal(game.snapshot().remaining,11);assert.equal(game.snapshot().score,1);
 game.tick(12);assert.equal(game.snapshot().remaining,0);assert.equal(game.answer(game.snapshot().turn.notes[0].midi).ok,false);assert.equal(game.snapshot().score,1);
});
test('all clefs and levels stay on the floor keyboard and use correctly spelled signatures and accidentals',()=>{
 for(const clef of ['bass','treble'])for(const level of reading.LEVELS){
  const game=reading.create({clef,difficulty:level.id,random:rng()}),accidentals=new Set(),keys=new Set();
  for(let turn=0;turn<50;turn++){
   const s=game.snapshot();assert.equal(s.turn.notes.length,level.count);keys.add(s.turn.key);
   const changes=new Map();
   for(const note of s.turn.notes){
    assert.ok(note.midi>=s.baseMidi&&note.midi<s.baseMidi+24);
    const natural=[0,2,4,5,7,9,11]['CDEFGAB'.indexOf(note.letter)],octave=Math.floor(note.diatonic/7);assert.equal(note.midi,12*(octave+1)+natural+note.alter);
    const prior=changes.has(note.diatonic)?changes.get(note.diatonic):s.turn.keyLetters.includes(note.letter)?Math.sign(s.turn.key):0;
    const heard=note.accidental?({sharp:1,flat:-1,natural:0})[note.accidental]:prior;assert.equal(heard,note.alter);
    changes.set(note.diatonic,heard);if(note.accidental)accidentals.add(note.accidental);
    if(level.id==='easy'){assert.equal(note.alter,0);assert.equal(note.accidental,null);}
    assert.equal(game.answer(note.midi).ok,true);
   }
  }
  if(level.accidentals){assert.ok(accidentals.has('sharp'));assert.ok(accidentals.has('flat'));}
  if(level.keys){assert.ok([...keys].some(k=>k>0));assert.ok([...keys].some(k=>k<0));assert.ok(accidentals.has('natural'));}
  assert.equal(game.snapshot().turns,50);
 }
});
test('multi-pitch turns must be played in order and each correct pitch gets its own bonus',()=>{
 const game=reading.create({difficulty:'expert',random:rng()}),notes=game.snapshot().turn.notes;
 for(let i=0;i<3;i++){const result=game.answer(notes[i].midi);assert.equal(result.complete,i===2);assert.equal(game.snapshot().remaining,13+i*3);}
 assert.equal(game.snapshot().score,3);assert.equal(game.snapshot().turns,1);
 const copy=game.snapshot();copy.turn.notes[0].midi=-1;assert.notEqual(game.snapshot().turn.notes[0].midi,-1);
});
