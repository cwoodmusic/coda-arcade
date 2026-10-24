const test=require('node:test');
const assert=require('node:assert/strict');
const fishing=require('../rhythm-fishing-engine.js');

const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-8,message||`${actual} differs from ${expected}`);
function session(options={}){return fishing.createSession({fish:'silver-minnow',id:'engine-test',...options});}
function nextNote(game){return game.getState().notes.find(note=>note.judgement==='pending'&&note.time>=game.getState().now);}
function perfectCatch(game){for(let at=0;at<40&&!game.getState().result;at++){const note=nextNote(game);assert.ok(note,'A live fish needs a future rhythm target');assert.equal(game.tap(note.time).kind,'hit');}return game.getState();}

test('the lake contains thirty distinct fish, six at each rarity and ten in each meter',()=>{
 assert.equal(fishing.FISH.length,30);assert.equal(new Set(fishing.FISH.map(fish=>fish.id)).size,30);assert.equal(new Set(fishing.FISH.map(fish=>fish.name)).size,30);
 for(const rarity of fishing.RARITIES)assert.equal(fishing.FISH.filter(fish=>fish.rarity===rarity.id).length,6);
 for(const meter of Object.keys(fishing.METERS))assert.equal(fishing.FISH.filter(fish=>fish.meter===meter).length,10);
 for(const fish of fishing.FISH){assert.match(fish.color,/^#[\da-f]{6}$/i);assert.match(fish.accent,/^#[\da-f]{6}$/i);assert.ok(fish.size[0]>0&&fish.size[1]>fish.size[0]);assert.ok(fish.notes>=4&&fish.notes<=80);assert.ok(fish.xp>0);}
 assert.ok(fishing.FISH.find(fish=>fish.rarity==='legendary').notes>fishing.FISH.find(fish=>fish.rarity==='common').notes);
});

test('all ninety written phrases fill the exact bar in all three meters',()=>{
 assert.equal(fishing.PATTERNS.length,90);
 for(const meter of Object.values(fishing.METERS))for(const rarity of fishing.RARITIES){
  const patterns=fishing.PATTERNS.filter(pattern=>pattern.meter===meter.id&&pattern.rarity===rarity.id);assert.equal(patterns.length,6);
  for(const pattern of patterns){let onset=0;for(const note of pattern.events){close(note.onset,onset);assert.ok(note.duration>0);assert.ok(note.glyph.startsWith(note.rest?'rest':'note'));onset+=note.duration;}close(onset,meter.barBeats);}
 }
 for(const meter of Object.keys(fishing.METERS)){
  const simple=fishing.PATTERNS.filter(pattern=>pattern.meter===meter&&pattern.rarity==='common').flatMap(pattern=>pattern.events);
  const advanced=fishing.PATTERNS.filter(pattern=>pattern.meter===meter&&pattern.rarity==='legendary').flatMap(pattern=>pattern.events);
  assert.ok(simple.every(note=>note.duration>=.5));assert.ok(simple.some(note=>note.wholeBarRest));assert.ok(advanced.some(note=>note.duration===.25));assert.ok(advanced.some(note=>note.dotted));assert.ok(advanced.some(note=>note.rest));
 }
});

test('quarter, half, eighth and whole-bar rests have correct durations and written symbols',()=>{
 const notes=fishing.PATTERNS.flatMap(pattern=>pattern.events);
 for(const [token,duration,glyph]of [['rq',1,'restQuarter'],['rh',2,'restHalf'],['re',.5,'rest8th']]){
  const rests=notes.filter(note=>note.token===token);assert.ok(rests.length);
  assert.ok(rests.every(note=>note.rest&&note.duration===duration&&note.glyph===glyph&&note.flags===0));
 }
 for(const meter of Object.values(fishing.METERS)){
  const rests=fishing.PATTERNS.filter(pattern=>pattern.meter===meter.id).flatMap(pattern=>pattern.events).filter(note=>note.wholeBarRest);
  assert.ok(rests.length);assert.ok(rests.every(note=>note.rest&&note.duration===meter.barBeats&&note.notationBeats===4&&note.glyph==='restWhole'&&!note.dotted&&note.dots===0));
  for(const rarity of fishing.RARITIES){
   const patterns=fishing.PATTERNS.filter(pattern=>pattern.meter===meter.id&&pattern.rarity===rarity.id);
   for(let index=0;index<patterns.length;index++)if(patterns[index].events.every(note=>note.rest))assert.ok(patterns[(index+1)%patterns.length].events.some(note=>!note.rest),'An all-rest bar is followed by playable notes');
  }
 }
});

test('rare fish gain real syncopations across the selected meter’s main pulse',()=>{
 for(const meter of Object.values(fishing.METERS)){
  const syncopated=pattern=>pattern.events.some(note=>{const offset=note.onset%meter.pulseBeats;return !note.rest&&offset>1e-8&&note.duration>meter.pulseBeats-offset+1e-8;});
  for(const [rarity,minimum]of [['rare',2],['epic',3],['legendary',3]]){
   const phrases=fishing.PATTERNS.filter(pattern=>pattern.meter===meter.id&&pattern.rarity===rarity);
   assert.ok(phrases.filter(syncopated).length>=minimum,meter.id+' '+rarity+' needs notes held from weak subdivisions across a main pulse');
  }
  assert.equal(fishing.PATTERNS.filter(pattern=>pattern.meter===meter.id&&pattern.rarity==='common').filter(syncopated).length,0,'Common fish remain introductory');
 }
});

test('every written rest stays silent without losing progress and clear rest taps are mistakes',()=>{
 for(const [fish,token]of [['yellow-perch','rq'],['brook-trout','rh'],['crystal-carp','re'],['stone-loach','rw']]){
  const game=session({fish,meter:'4/4'}),rest=game.getState().notes.find(note=>note.token===token);assert.ok(rest,token);
  for(const note of game.getState().notes.filter(note=>!note.rest&&note.time<rest.time))game.tap(note.time);
  const before=game.getState(),middle=rest.time+rest.durationSeconds/2;game.update(middle);
  assert.equal(game.getState().progress,before.progress,token+' does not drain progress');assert.equal(game.getState().misses,before.misses);assert.equal(game.getState().hits,before.hits);
  assert.equal(game.tap(middle).kind,'extra',token+' is not a playable target');assert.equal(game.getState().hits,before.hits);
 }
 for(const meter of Object.values(fishing.METERS)){
  const game=session({fish:'stone-loach',meter:meter.id}),rest=game.getState().notes.find(note=>note.wholeBarRest);assert.equal(rest.onset,0);
  close(rest.durationSeconds,meter.barBeats*game.getState().secondsPerBeat);game.update(rest.time+rest.durationSeconds-.001);
  assert.equal(game.getState().progress,45);assert.equal(game.getState().misses,0);assert.equal(game.getState().hits,0);
 }
});

test('fish habitats include every meter but reserve some rarities for specific signatures',()=>{
 for(const fish of fishing.FISH){assert.ok(Object.isFrozen(fish.meters));assert.ok(fish.meters.includes(fish.meter));assert.ok(fish.meters.every(meter=>Object.hasOwn(fishing.METERS,meter)));}
 for(const meter of Object.keys(fishing.METERS)){
  assert.equal(fishing.canFishInMeter('silver-minnow',meter),true);
  assert.ok(fishing.availableFish(meter).every(fish=>fish.meters.includes(meter)));
  for(const rarity of fishing.RARITIES){
   const choices=fishing.availableFish(meter,rarity.id);assert.ok(choices.length);assert.ok(choices.every(fish=>fish.rarity===rarity.id&&fish.meters.includes(meter)));
   for(const draw of [0,.15,.5,.999999])assert.ok(choices.includes(fishing.chooseFish({meter,rarity:rarity.id,random:()=>draw})));
  }
  assert.ok(fishing.availableFish(meter,'legendary').some(fish=>fish.meters.length===1));
  for(let index=0;index<100;index++)assert.ok(fishing.canFishInMeter(fishing.chooseFish({meter,random:()=>index/100}),meter));
 }
 assert.deepEqual(fishing.availableFish('cut'),fishing.availableFish('2/2'));
 assert.deepEqual(fishing.availableFish('invalid'),[]);assert.deepEqual(fishing.availableFish('4/4','invalid'),[]);
 assert.equal(fishing.canFishInMeter('unknown','4/4'),false);assert.equal(fishing.canFishInMeter('silver-minnow','invalid'),false);
 assert.throws(()=>fishing.chooseFish({meter:'invalid'}),/4\/4/);
});

test('sessions enforce fish habitats and every eligible fish/meter remains catchable',()=>{
 for(const fish of fishing.FISH)for(const meter of Object.keys(fishing.METERS)){
  if(!fish.meters.includes(meter)){assert.throws(()=>session({fish,meter}),/can only be caught/);continue;}
  const result=perfectCatch(session({fish,meter})).result;assert.equal(result.caught,true);assert.equal(result.meter,meter);assert.equal(result.fishId,fish.id);assert.equal(result.notes,fish.notes);
 }
 for(const meter of Object.keys(fishing.METERS)){
  const game=fishing.createSession({meter,random:()=>.999999});assert.ok(game.getState().fish.meters.includes(meter));
 }
});

test('meter pulse units, displayed tempo, count-ins and seconds describe the same music',()=>{
 for(const meter of Object.values(fishing.METERS)){
  const game=session({meter:meter.id,startTime:1234.567}),state=game.getState();
  assert.equal(state.pulseUnit,meter.pulseUnit);assert.equal(state.countInBeats,meter.pulsesPerBar);assert.equal(state.countInBeat,meter.pulsesPerBar);
  close(state.secondsPerPulse,60/state.displayBpm);close(state.secondsPerBeat*meter.pulseBeats,state.secondsPerPulse);close(state.countInSeconds,state.secondsPerBeat*meter.barBeats);
  close(state.countInSeconds,state.secondsPerPulse*meter.pulsesPerBar);
  game.update(state.startTime+state.secondsPerPulse);assert.equal(game.getState().countInBeat,meter.pulsesPerBar-1);
  const note=nextNote(game);assert.equal(game.tap(note.time).kind,'hit','The exact first onset must work even with a large world clock');
 }
 assert.equal(fishing.meterFor('cut').id,'2/2');assert.equal(fishing.meterFor('__proto__'),null);assert.equal(fishing.meterFor('constructor'),null);
 assert.throws(()=>session({meter:'invalid'}),/4\/4/);
});

test('count-in taps do not hurt progress and paused simulation clocks do not expire notes',()=>{
 const game=session(),initial=game.getState();assert.equal(game.tap(initial.startTime+.1).kind,'count-in');assert.equal(game.getState().progress,45);
 for(let frame=0;frame<100;frame++)game.update(initial.startTime+.1);
 assert.equal(game.getState().misses,0);assert.equal(game.getState().extras,0);assert.equal(game.getState().phase,'count-in');
});

test('a target can be hit only once, correct timing fills progress, and mashing lowers it',()=>{
 const game=session(),first=nextNote(game);assert.equal(game.tap(first.time).kind,'hit');assert.equal(game.getState().progress,52);
 assert.equal(game.tap(first.time).kind,'extra');assert.equal(game.getState().progress,44);assert.equal(game.getState().hits,1);assert.equal(game.getState().extras,1);
 const next=nextNote(game);assert.equal(game.tap(next.time+.1).kind,'hit');assert.equal(game.getState().hits,2);
});

test('missed onsets lower the bar exactly once and idle waiting loses the fish',()=>{
 const game=session(),first=nextNote(game),limit=first.time+game.getState().window+.001;
 game.update(limit);assert.equal(game.getState().misses,1);assert.equal(game.getState().progress,33);
 game.update(limit);assert.equal(game.getState().misses,1);
 const final=game.update(1e9);assert.equal(final.phase,'escaped');assert.equal(final.progress,0);assert.equal(final.result.notes,0);assert.equal(final.result.xp,0);assert.equal(final.result.caught,false);assert.equal(final.result.perfect,false);
});

test('a written rest is silent: tapping its middle costs progress instead of awarding a note',()=>{
 const game=session({fish:'rainbow-trout',meter:'4/4'}),initial=game.getState();
 const first=initial.notes.find(note=>note.judgement==='pending');game.tap(first.time);
 const rest=initial.notes.find(note=>note.rest);assert.ok(rest);const time=rest.time+rest.durationSeconds/2;
 const before=game.getState().progress;assert.equal(game.tap(time).kind,'extra');assert.ok(game.getState().progress<before);assert.equal(game.getState().hits,1);
});

test('timing outside the window does not count as a hit, and old/nonfinite taps are ignored',()=>{
 const game=session(),first=nextNote(game),window=game.getState().window;game.update(first.time);
 const before=game.getState();assert.equal(game.tap(first.time-1).accepted,false);assert.equal(game.tap(NaN).accepted,false);assert.equal(game.tap(Infinity).accepted,false);assert.equal(game.getState().progress,before.progress);
 game.tap(first.time+window+.001);assert.equal(game.getState().hits,0);assert.equal(game.getState().misses,1);assert.equal(game.getState().extras,1);
});

test('perfect playing catches all thirty species with a single stable final result',()=>{
 for(const fish of fishing.FISH){const results=[],game=session({fish,id:'catch-'+fish.id,onFinish:result=>results.push(result)}),final=perfectCatch(game);
  assert.equal(final.phase,'caught');assert.equal(final.progress,100);assert.equal(final.result.fishId,fish.id);assert.equal(final.result.id,'catch-'+fish.id);assert.equal(final.result.meter,fish.meter);assert.equal(final.result.perfect,true);assert.ok(final.hits>=8&&final.hits<=14);assert.equal(final.result.notes,fish.notes);assert.equal(final.result.xp,fish.xp);
  game.tap(final.now+1);game.update(final.now+1000);game.abort();assert.equal(results.length,1);assert.equal(game.getState().result.id,final.result.id);
 }
});

test('harder rarities require more accurate catches and results do not claim imperfect runs were perfect',()=>{
 const common=perfectCatch(session({fish:'silver-minnow'})),legendary=perfectCatch(session({fish:'crescendo-coelacanth'}));assert.ok(legendary.hits>common.hits);assert.ok(legendary.window<common.window);
 const game=session(),first=nextNote(game);game.tap(first.time);game.tap(first.time);const final=perfectCatch(game);assert.equal(final.result.perfect,false);assert.equal(final.result.extras,1);
});

test('weighted shadows make rare fish rarer while deterministic rarity selection remains testable',()=>{
 assert.equal(fishing.chooseFish({random:()=>0}).rarity,'common');assert.equal(fishing.chooseFish({random:()=>.999999}).rarity,'legendary');
 for(const rarity of fishing.RARITIES){const fish=fishing.chooseFish({rarity:rarity.id,random:()=>.999999});assert.equal(fish.rarity,rarity.id);}
 assert.equal(fishing.chooseFish({random:()=>NaN}).rarity,'common');assert.throws(()=>session({fish:'not-a-fish'}),/known fish/);
 const byWeight=fishing.RARITIES.map(rarity=>rarity.weight);assert.deepEqual(byWeight,byWeight.slice().sort((a,b)=>b-a));
});

test('snapshots and callbacks cannot mutate live state, and cancellation never awards a catch',()=>{
 let calls=0;const game=session({onFinish:()=>{calls++;throw Error('UI failure');}}),state=game.getState();state.progress=100;state.notes[0].time=-999;state.fish.notes=99999;assert.equal(game.getState().progress,45);assert.ok(nextNote(game).time>0);assert.equal(game.getState().fish.notes,4);
 const final=game.abort();assert.equal(final.phase,'escaped');assert.equal(final.result.reason,'aborted');assert.equal(final.result.caught,false);assert.equal(final.result.notes,0);game.abort();assert.equal(calls,1);
});
