const test=require('node:test');
const assert=require('node:assert/strict');
const library=require('../dj-library.js');

test('the guest DJ collection contains distinct playable original arrangements',()=>{
  assert.equal(library.songs.length,3);
  assert.equal(new Set(library.songs.map(song=>song.id)).size,3);
  assert.equal(new Set(library.songs.map(song=>JSON.stringify(song.composition))).size,3);
  for(const song of library.songs){assert.ok(library.valid(song.composition));assert.ok(song.composition.tracks.some(track=>track.notes.length>0));}
});

test('ordinary Song Machine drum notes do not need a melodic pitch field',()=>{
  const song=structuredClone(library.songs[0].composition);
  for(const row of song.drums)for(const note of row.notes)delete note.p;
  assert.equal(library.valid(song),true);
  song.tracks[0].notes[0].p=undefined;
  assert.equal(library.valid(song),false);
});

test('unsupported or unbounded imported songs cannot reach the audio scheduler',()=>{
  for(const edit of [
    song=>song.bpm=0,song=>song.bpm=Infinity,song=>song.bars=200,
    song=>song.meter='invalid',song=>song.tracks[0].volume=2,
    song=>song.tracks[0].notes[0].d=-1,song=>song.tracks[0].notes[0].p=300,
    song=>song.tracks[0].notes[0].t=9999,
    song=>song.tracks[0].notes=Array.from({length:9000},()=>({p:60,t:0,d:1}))
  ]){const song=structuredClone(library.songs[0].composition);edit(song);assert.equal(library.valid(song),false);}
});
