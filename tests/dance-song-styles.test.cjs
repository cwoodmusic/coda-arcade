const test=require('node:test'),assert=require('node:assert/strict');
const campaign=require('../dance-campaign'),audio=require('../dance-song-audio');
test('all ten songs have distinct style labels, lead timbres, and rhythm arrangements',()=>{
 const leads=new Set(),drums=new Set(),melodies=new Set();
 assert.equal(new Set(campaign.STAGES.map(stage=>stage.style.label)).size,10);
 for(const stage of campaign.STAGES){
  const song=stage.composition,b=campaign.METERS[stage.meter].barBeats;
  leads.add(JSON.stringify(audio.voiceProfile(song.tracks[0].sound,stage.style.id)));
  drums.add(JSON.stringify(song.drums.map(track=>track.notes.filter(n=>n.t<b*4).map(n=>n.t/(b*4)))));
  melodies.add(JSON.stringify(song.tracks[0].notes.filter(n=>n.t<b*4).map(n=>[n.t/(b*4),n.d/(b*4)])));
  assert.ok(song.tracks.every(track=>track.notes.length>0));assert.equal(song.bars,16);
 }
 assert.equal(leads.size,10,'Different lead envelopes and partials must be audible, not just transposed');
 assert.equal(drums.size,10,'Each genre needs its own percussion rhythm');
 assert.equal(melodies.size,10,'Each genre needs its own melodic phrasing');
});
test('warm instruments sustain and percussive instruments decay, with acoustic genre overrides',()=>{
 assert.equal(audio.voiceProfile(4,'blues').hold,true);assert.equal(audio.voiceProfile(5,'orchestral').hold,true);
 assert.equal(audio.voiceProfile(2,'waltz').hold,false);assert.equal(audio.voiceProfile(3,'latin').hold,false);
 assert.ok(audio.voiceProfile(5,'orchestral').attack>audio.voiceProfile(8,'funk').attack);
 assert.notDeepEqual(audio.voiceProfile(2,'jazz'),audio.voiceProfile(2,'waltz'));
 assert.notDeepEqual(audio.voiceProfile(1,'march'),audio.voiceProfile(1,'jazz'));
});
