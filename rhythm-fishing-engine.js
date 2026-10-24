/* Rhythm fishing rules and notation data. The room supplies a paused-aware clock. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CodaRhythmFishing=api;})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const copy=value=>JSON.parse(JSON.stringify(value));
 const METERS=Object.freeze({
  '4/4':Object.freeze({id:'4/4',timeSignature:'4/4',label:'4/4',numerator:4,denominator:4,barBeats:4,pulseBeats:1,pulsesPerBar:4,pulseUnit:'quarter'}),
  '6/8':Object.freeze({id:'6/8',timeSignature:'6/8',label:'6/8',numerator:6,denominator:8,barBeats:3,pulseBeats:1.5,pulsesPerBar:2,pulseUnit:'dotted-quarter'}),
  '2/2':Object.freeze({id:'2/2',timeSignature:'2/2',label:'Cut time',numerator:2,denominator:2,barBeats:4,pulseBeats:2,pulsesPerBar:2,pulseUnit:'half'})
 });
 const meterFor=value=>{let id=typeof value==='string'?value:value?.id;if(['cut','cut-time','cuttime'].includes(id))id='2/2';return Object.prototype.hasOwnProperty.call(METERS,id)?METERS[id]:null;};
 const RARITIES=Object.freeze([
  {id:'common',label:'Common',rank:0,weight:52,bpm:76,window:.19,hitGain:7,missLoss:12,extraLoss:8,description:'Quarter notes and pairs of eighth notes.'},
  {id:'uncommon',label:'Uncommon',rank:1,weight:28,bpm:82,window:.18,hitGain:7,missLoss:12,extraLoss:8,description:'Eighth notes, longer notes, and rests.'},
  {id:'rare',label:'Rare',rank:2,weight:13,bpm:88,window:.16,hitGain:6,missLoss:13,extraLoss:9,description:'Offbeat entrances and short sixteenth-note groups.'},
  {id:'epic',label:'Epic',rank:3,weight:5,bpm:96,window:.145,hitGain:5,missLoss:14,extraLoss:9,description:'Dotted notes, syncopation, and sixteenths.'},
  {id:'legendary',label:'Legendary',rank:4,weight:2,bpm:104,window:.13,hitGain:4,missLoss:15,extraLoss:10,description:'Quick sixteenths and dotted, offbeat phrases.'}
 ].map(Object.freeze));
 const SPECIES=[
  ['silver-minnow','Silver Minnow','common','#a7c8de','#eef9ff','slender',[5,12],4,8],
  ['cave-guppy','Cave Guppy','common','#8db0df','#eab1dd','round',[4,8],4,8],
  ['bluegill','Bluegill','common','#6b9ead','#e9ba6b','deep',[12,24],6,8],
  ['yellow-perch','Yellow Perch','common','#d6bc57','#445a70','striped',[15,32],6,9],
  ['brook-trout','Brook Trout','common','#6a9e91','#e8a995','spotted',[18,36],8,10],
  ['stone-loach','Stone Loach','common','#9e9588','#d5c5a2','long',[8,15],5,8],
  ['rainbow-trout','Rainbow Trout','uncommon','#9bbdc2','#e687b4','spotted',[24,48],12,12],
  ['crystal-carp','Crystal Carp','uncommon','#bdc5e8','#f0deac','round',[26,55],14,13],
  ['copper-catfish','Copper Catfish','uncommon','#b57d5b','#e5bf85','catfish',[22,50],14,13],
  ['moon-bream','Moon Bream','uncommon','#94b6c8','#e8e4c0','deep',[20,42],12,12],
  ['emerald-bass','Emerald Bass','uncommon','#4f9d86','#b5df96','broad',[25,52],16,14],
  ['ribbon-eel','Ribbon Eel','uncommon','#a28bc1','#e7b7f1','eel',[35,75],16,14],
  ['glass-cavefish','Glass Cavefish','rare','#b8e4df','#e6fff3','slender',[12,25],24,18],
  ['sapphire-pike','Sapphire Pike','rare','#507fc9','#9ce5ed','long',[45,90],28,20],
  ['amethyst-koi','Amethyst Koi','rare','#ad81cd','#f0bedc','round',[30,65],28,20],
  ['lantern-tench','Lantern Tench','rare','#d9a653','#a3f1b5','broad',[25,50],24,18],
  ['spotted-sturgeon','Spotted Sturgeon','rare','#8a9fc0','#d0e1ec','armoured',[60,110],32,22],
  ['velvet-char','Velvet Char','rare','#ab6c97','#f0be87','spotted',[25,55],26,19],
  ['opal-angelfish','Opal Angelfish','epic','#d3b3e7','#9ceadf','angel',[18,36],40,24],
  ['echo-salmon','Echo Salmon','epic','#de8b9e','#9cbcd8','slender',[45,85],44,25],
  ['golden-cave-carp','Golden Cave Carp','epic','#e6be53','#fff0aa','round',[35,75],48,26],
  ['aurora-eel','Aurora Eel','epic','#7fc6b5','#d59bda','eel',[70,130],48,26],
  ['midnight-catfish','Midnight Catfish','epic','#697cb8','#b5a1e2','catfish',[55,105],44,25],
  ['ruby-lionfish','Ruby Lionfish','epic','#d95d82','#f5b16a','spiny',[22,45],40,24],
  ['crescendo-coelacanth','Crescendo Coelacanth','legendary','#6b91bd','#bde9e0','armoured',[90,150],64,30],
  ['starlight-sturgeon','Starlight Sturgeon','legendary','#b3a7e7','#fff1b8','armoured',[120,200],72,32],
  ['prism-koi','Prism Koi','legendary','#9fe0cc','#eea5d1','round',[60,100],64,30],
  ['thunderfin-pike','Thunderfin Pike','legendary','#6e9ada','#f0d969','long',[100,170],72,32],
  ['royal-moonfish','Royal Moonfish','legendary','#b19ed4','#efd49c','deep',[70,120],80,35],
  ['luminous-dragonfish','Luminous Dragonfish','legendary','#7cc9c3','#e9a2cc','dragon',[90,160],80,35]
 ];
 const FISH=Object.freeze(SPECIES.map(([id,name,rarity,color,accent,shape,size,notes,xp],index)=>Object.freeze({
  id,name,rarity,rarityLabel:RARITIES.find(value=>value.id===rarity).label,rarityRank:RARITIES.find(value=>value.id===rarity).rank,
  color,accent,shape,silhouette:shape,size:Object.freeze(size),notes,reward:notes,rewardNotes:notes,xp,patternIndex:index%6,meter:['4/4','6/8','2/2'][index%3],timeSignature:['4/4','6/8','2/2'][index%3]
 })));
 const DURATIONS={h:2,q:1,e:.5,s:.25,dq:1.5,de:.75,rh:2,rq:1,re:.5,rs:.25,rdq:1.5};
 const GLYPHS={h:'noteHalfUp',q:'noteQuarterUp',e:'note8thUp',s:'note16thUp',dq:'noteQuarterUp',de:'note8thUp',rh:'restHalf',rq:'restQuarter',re:'rest8th',rs:'rest16th',rdq:'restQuarter'};
 const FOUR_FOUR={
  common:[['q','q','q','q'],['q','e','e','q','q'],['q','q','e','e','e','e']],
  uncommon:[['q','rq','e','e','q'],['e','re','q','e','e','q'],['h','e','e','rq']],
  rare:[['q','s','s','e','q','q'],['re','e','e','e','q','e','e'],['e','rs','s','q','e','e','q']],
  epic:[['dq','e','e','s','s','q'],['e','q','e','q','e','e'],['e','s','s','re','e','de','s','q']],
  legendary:[['de','s','e','re','s','s','e','q'],['e','q','s','s','re','e','q'],['s','s','e','de','s','e','re','q']]
 };
 const SIX_EIGHT={
  common:[['dq','dq'],['q','e','q','e'],['dq','e','e','e']],
  uncommon:[['q','e','re','e','e'],['rdq','q','e'],['e','e','e','q','e']],
  rare:[['e','s','s','e','q','e'],['re','e','e','e','s','s','e'],['q','s','s','re','e','e']],
  epic:[['de','s','e','e','q'],['e','q','de','s','e'],['e','s','s','e','re','e','e']],
  legendary:[['de','s','e','e','s','s','e'],['re','s','s','e','de','s','e'],['s','s','e','de','s','e','e']]
 };
 const CUT_TIME={
  common:[['h','h'],['h','q','q'],['q','q','h']],
  uncommon:[['h','rq','q'],['q','e','e','h'],['rh','q','q']],
  rare:[['q','s','s','e','h'],['re','e','q','q','q'],['q','e','e','re','e','q']],
  epic:[['dq','e','e','s','s','q'],['e','q','e','h'],['q','e','s','s','rq','q']],
  legendary:[['de','s','e','re','s','s','e','q'],['e','q','s','s','re','e','q'],['s','s','e','de','s','e','re','q']]
 };
 const PATTERN_SOURCE={'4/4':FOUR_FOUR,'6/8':SIX_EIGHT,'2/2':CUT_TIME};
 const PATTERNS=Object.freeze(Object.values(METERS).flatMap(meter=>RARITIES.flatMap(rarity=>PATTERN_SOURCE[meter.id][rarity.id].map((tokens,index)=>{
  let beat=0;const events=tokens.map((token,at)=>{
   const duration=DURATIONS[token],rest=token[0]==='r',dotted=token.includes('d'),event={id:at,token,onset:beat,beat,duration,rest,type:rest?'rest':'note',glyph:GLYPHS[token],dotted,dots:dotted?1:0,flags:duration<1?(duration===.25?2:1):0};beat+=duration;return Object.freeze(event);
  });
  if(beat!==meter.barBeats)throw Error('Fishing rhythm '+meter.id+'/'+rarity.id+'/'+index+' must fill exactly one bar.');
  return Object.freeze({id:rarity.id+'-'+meter.id.replace('/','-')+'-'+index,rarity:rarity.id,meter:meter.id,beats:meter.barBeats,pulses:meter.pulsesPerBar,events:Object.freeze(events)});
 }))));
 const rarityFor=value=>RARITIES.find(rarity=>rarity.id===(typeof value==='string'?value:value?.rarity))||null;
 const fishFor=value=>FISH.find(fish=>fish.id===(typeof value==='string'?value:value?.id))||null;
 function drawRandom(random){const value=Number((typeof random==='function'?random:Math.random)());return Number.isFinite(value)?clamp(value,0,.999999999999):0;}
 function chooseFish(options={}){
  const random=options.random||Math.random;let rarity=rarityFor(options.rarity);
  if(!rarity){let roll=drawRandom(random)*RARITIES.reduce((sum,value)=>sum+value.weight,0);rarity=RARITIES[RARITIES.length-1];for(const candidate of RARITIES){if(roll<candidate.weight){rarity=candidate;break;}roll-=candidate.weight;}}
  const choices=FISH.filter(fish=>fish.rarity===rarity.id);return choices[Math.floor(drawRandom(random)*choices.length)];
 }
 let serial=0;
 function sessionID(){try{if(typeof globalThis.crypto?.randomUUID==='function')return 'fishing-'+globalThis.crypto.randomUUID();}catch{}return 'fishing-'+Date.now().toString(36)+'-'+(++serial).toString(36)+'-'+Math.random().toString(36).slice(2,10);}
 function createSession(options={}){
  const fish=options.fish===undefined?chooseFish(options):fishFor(options.fish);if(!fish)throw Error('Choose a known fish species.');
  const rarity=rarityFor(fish),meter=meterFor(options.meter||fish.meter);if(!meter)throw Error('Choose 4/4, 6/8, or cut time.');
  // Keep the written subdivisions playable while naming the correct conducted
  // pulse: quarter, dotted quarter, or half note respectively.
  const bpm=Math.round(rarity.bpm/meter.pulseBeats),secondsPerPulse=60/bpm,secondsPerBeat=secondsPerPulse/meter.pulseBeats,countInBeats=meter.pulsesPerBar,countInSeconds=countInBeats*secondsPerPulse;
  const startTime=Number.isFinite(options.startTime)?options.startTime:0,id=typeof options.id==='string'&&options.id.length?options.id.slice(0,180):sessionID();
  const musicStart=startTime+countInSeconds;
  const patterns=PATTERNS.filter(pattern=>pattern.rarity===rarity.id&&pattern.meter===meter.id),events=[];
  let now=startTime,phase='count-in',progress=45,hits=0,misses=0,extras=0,bar=0,sequence=0,lastJudgement=null,result=null,finished=false;
  function makeUntil(beat){
   while(bar*meter.barBeats<=beat){const pattern=patterns[(bar+fish.patternIndex)%patterns.length],barNumber=bar++;
    for(const source of pattern.events){const onset=barNumber*meter.barBeats+source.onset,time=musicStart+onset*secondsPerBeat,beam=Math.floor(source.onset/meter.pulseBeats);
     events.push({...source,id:'note-'+sequence++,bar:barNumber,pattern:pattern.id,meter:meter.id,onset,beat:onset,time,at:time,durationSeconds:source.duration*secondsPerBeat,beamingGroup:!source.rest&&source.duration<1?'beam-'+barNumber+'-'+beam:null,beam:!source.rest&&source.duration<1?beam:null,judgement:source.rest?'rest':'pending',hitAt:null});
    }
   }
  }
  makeUntil(16);
  function finish(outcome,reason){
   if(finished)return;finished=true;phase=outcome;progress=outcome==='caught'?100:0;
   result={id,fishId:fish.id,fish:copy(fish),rarity:fish.rarity,outcome,caught:outcome==='caught',reason:reason||null,hits,misses,extras,perfect:hits>0&&misses===0&&extras===0,
    notes:outcome==='caught'?fish.notes:0,xp:outcome==='caught'?fish.xp:0,elapsed:Math.max(0,now-startTime),duration:Math.max(0,now-startTime-countInSeconds),bpm,meter:meter.id,timeSignature:meter.id,pulseUnit:meter.pulseUnit};
   try{options.onFinish?.(copy(result));}catch{/* Feedback cannot change a completed result. */}
  }
  function judge(kind,event){
   if(kind==='hit'){event.judgement='hit';event.hitAt=now;hits++;progress=Math.min(100,progress+rarity.hitGain);}
   else if(kind==='miss'){event.judgement='miss';misses++;progress=Math.max(0,progress-rarity.missLoss);}
   else{extras++;progress=Math.max(0,progress-rarity.extraLoss);}
   lastJudgement={kind,time:now,noteId:event?.id||null,progress};
   if(progress>=100)finish('caught');else if(progress<=0)finish('escaped','rhythm');
  }
  function update(time){
   if(!Number.isFinite(time)||time<now||finished)return getState();now=time;
   const beat=(now-musicStart)/secondsPerBeat;
   if(beat<0)return getState();phase='playing';
   for(const event of events){if(event.time+rarity.window>=now)break;if(event.judgement==='pending'){judge('miss',event);if(finished)break;}}
   if(!finished)makeUntil(beat+16);
   // Retain the nearby score for rendering; a long session must not grow forever.
   if(events.length>192){const remove=events.findIndex(event=>event.time>=now-8*secondsPerBeat);if(remove>0)events.splice(0,remove);}
   return getState();
  }
  function tap(time){
   if(!Number.isFinite(time)||time<now)return {accepted:false,kind:'ignored',state:getState()};
   update(time);if(finished)return {accepted:false,kind:'finished',state:getState()};
   if(phase==='count-in')return {accepted:false,kind:'count-in',state:getState()};
   let nearest=null,distance=Infinity;
   for(const event of events){if(event.judgement!=='pending')continue;const delta=Math.abs(event.time-now);if(delta<=rarity.window&&delta<distance){nearest=event;distance=delta;}}
   if(nearest){judge('hit',nearest);return {accepted:true,kind:'hit',noteId:nearest.id,error:now-nearest.time,state:getState()};}
   judge('extra');return {accepted:true,kind:'extra',state:getState()};
  }
  function getState(){const elapsed=Math.max(0,now-startTime),musicTime=now-musicStart,beat=musicTime/secondsPerBeat,countInRemaining=Math.max(0,musicStart-now);
   return {id,phase,fish:copy(fish),rarity:copy(rarity),meter:meter.id,timeSignature:meter.id,meterInfo:{...meter},bpm,displayBpm:bpm,startTime,now,time:now,elapsed,musicTime,beat,secondsPerBeat,secondsPerPulse,pulseBeats:meter.pulseBeats,pulsesPerBar:meter.pulsesPerBar,pulseUnit:meter.pulseUnit,barBeats:meter.barBeats,countInBeats,countInQuarterBeats:meter.barBeats,countInSeconds,
    countInRemaining,countInBeat:phase==='count-in'?Math.max(1,Math.ceil(countInRemaining/secondsPerPulse-1e-9)):0,
    progress,hits,misses,extras,window:rarity.window,lastJudgement:lastJudgement?{...lastJudgement}:null,
    notes:events.filter(event=>event.onset+event.duration>=beat-8&&event.onset<=beat+16).map(event=>({...event})),result:result?copy(result):null};}
  return {update,tap,getState,snapshot:getState,abort(){if(!finished)finish('escaped','aborted');return getState();}};
 }
 return Object.freeze({FISH,RARITIES,METERS,PATTERNS,chooseFish,fishFor,rarityFor,meterFor,createSession});
});
