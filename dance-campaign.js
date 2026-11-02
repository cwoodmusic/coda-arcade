/* Ten original sixteen-bar songs, fixed dance routines, and campaign rules. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CodaDanceCampaign=api;})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const DIFFICULTIES=Object.freeze(['normal','hard','extreme']);
 const METERS=Object.freeze(Object.fromEntries([
  ['4/4',4,[0,1,2,3]],['2/4',2,[0,1]],['3/4',3,[0,1,2]],['6/8',3,[0,1.5]],['2/2',4,[0,2]],
  ['5/4',5,[0,1,2,3,4]],['7/8',3.5,[0,1,2]],['9/8',4.5,[0,1.5,3]],['12/8',6,[0,1.5,3,4.5]]
 ].map(([id,barBeats,pulses])=>[id,Object.freeze({id,barBeats,pulses:Object.freeze(pulses)})])));
 const rows=[
  ['neon-first-light','Neon First Light','4/4',60,[0,2,1,3,2,0,1,2],'left up right down', [0,-4,3,-2]],
  ['double-bounce','Double Bounce','2/4',62,[0,1,3,2,0,3,1,2],'left right left down', [0,3,-2,5]],
  ['mirrorball-waltz','Mirrorball Waltz','3/4',65,[0,2,3,1,2,0,3,2],'up right down left up down', [0,-3,-5,2]],
  ['electric-sway','Electric Sway','6/8',57,[0,1,2,3,2,1,0,2],'left up up right down down', [0,5,3,7]],
  ['midnight-march','Midnight March','2/2',59,[3,2,0,1,3,0,2,1],'down up left right up down right left', [0,-4,-2,3]],
  ['five-star-strut','Five Star Strut','5/4',64,[0,2,4,1,3,2,0,3],'left up right down up right left down', [0,3,-2,-5]],
  ['seven-sparks','Seven Sparks','7/8',61,[2,0,1,3,4,2,1,0],'left right up down left up right', [0,5,-2,3]],
  ['triple-current','Triple Current','9/8',67,[0,3,2,1,4,2,3,0],'up up right down down left right left up', [0,-5,-3,2]],
  ['twelve-lights','Twelve Lights','12/8',58,[3,1,0,2,4,3,2,0],'left up right up right down left down', [0,3,5,7]],
  ['afterglow-finale','Afterglow Finale','4/4',63,[0,4,2,3,1,3,4,0],'up left down right down left up right', [0,-4,5,7]]
 ];
 function composition(stage){
  const meter=METERS[stage.meter],tracks=[{name:'Lead',sound:stage.index%2?1:0,volume:.28,notes:[]},{name:'Bass',sound:7,volume:.34,notes:[]},{name:'Chords',sound:4,volume:.11,notes:[]},{name:'Arpeggio',sound:8,volume:.09,notes:[]}],drums=[{sound:0,volume:.34,notes:[]},{sound:3,volume:.18,notes:[]},{sound:3,volume:.075,notes:[]}];
  const add=(track,bar,beat,pitch,length)=>track.notes.push({p:pitch,t:(bar*meter.barBeats+beat)*4,d:Math.min(length,meter.barBeats-beat)*4});
  for(let bar=0;bar<16;bar++){
   const section=Math.floor(bar/4),root=stage.tonic+stage.progression[bar%4],palette=[0,3,7,10,12],sparse=section===2&&bar%4<2;
   for(let i=0;i<meter.pulses.length;i++){
    const at=meter.pulses[i],length=(meter.pulses[i+1]??meter.barBeats)-at;
    add(drums[0],bar,at,45,.2);if(i%2||meter.pulses.length===3&&i===2)add(drums[1],bar,at,57,.15);
    add(tracks[1],bar,at,root-12+(i%2?7:0),length*.62);
    if(i===0||!sparse&&i===Math.floor(meter.pulses.length/2))for(const interval of [0,3,7])add(tracks[2],bar,at,root+interval,length*.9);
    if(!sparse||i===0){const hook=stage.hook[(bar%4*2+i+(section===1?3:0))%stage.hook.length],pitch=root+12+palette[hook]+(section===3&&bar%2?12:0);add(tracks[0],bar,at,bar===15&&i===meter.pulses.length-1?stage.tonic+12:pitch,length*.78);}
    const divisions=length===1.5?3:2;
    for(let sub=0;sub<divisions;sub++){const off=at+length*sub/divisions;if(!sparse||sub===1)add(drums[2],bar,off,88,.12);if(!sparse&&sub>0)add(tracks[3],bar,off,root+12+[0,3,7][(sub+bar)%3],length/divisions*.65);}
   }
  }
  tracks.forEach((track,index)=>{track.id=index+1;});
  tracks[0].notes.at(-1).p=tracks[0].notes[0].p-1;
  for(const track of [...tracks,...drums]){track.mute=false;track.notes.sort((a,b)=>a.t-b.t||a.p-b.p);}
  return {bpm:80,bars:16,meter:stage.meter,root:0,scale:'chromatic',tracks,drums};
 }
 const STAGES=Object.freeze(rows.map(([id,title,meter,tonic,hook,directions,progression],index)=>{const stage={id,title,meter,tonic,hook,directions:directions.split(' '),progression,index};return Object.freeze({...stage,composition:composition(stage)});}));
 const stageFor=value=>STAGES.find(s=>s.id===value)||STAGES[Number.isInteger(value)?Math.max(0,Math.min(9,value)):0];
 function progress(events=[]){
  const ids=new Set(events.map(event=>typeof event==='string'?event:event?.id));
  const tiers=DIFFICULTIES.map((difficulty,index)=>{const passed=STAGES.filter(stage=>ids.has('dance-stage:'+difficulty+':'+stage.id)).map(stage=>stage.id);return {difficulty,passed,complete:passed.length===10,unlocked:index===0||DIFFICULTIES.slice(0,index).every(tier=>STAGES.every(stage=>ids.has('dance-stage:'+tier+':'+stage.id)))};});
  return {tiers,songs:STAGES.filter(stage=>ids.has('dance-song:'+stage.id)).map(stage=>stage.id)};
 }
 function canPlay(difficulty,stageId,events=[]){const stage=STAGES.find(s=>s.id===stageId),tier=(Array.isArray(events)?progress(events):events).tiers.find(t=>t.difficulty===difficulty);return !!stage&&!!tier?.unlocked&&(stage.index===0||tier.passed.includes(STAGES[stage.index-1].id));}
 const scorePercent=result=>result?.notesTotal>0?100*result.score/(100*(result.notesTotal+(result.extras||0))):0;
 function musicEvents(stageId,from,to){
  const song=stageFor(stageId).composition,events=[];
  for(const [part,tracks]of [['tone',song.tracks],['drum',song.drums]])for(const [trackIndex,track]of tracks.entries())for(const [index,note]of track.notes.entries())if(note.t/4>=from-1e-9&&note.t/4<to-1e-9)events.push({id:part+':'+trackIndex+':'+index,part,track:trackIndex,sound:track.sound,volume:track.volume,beat:note.t/4,duration:note.d/4,midi:note.p});
  return events.sort((a,b)=>a.beat-b.beat);
 }
 return Object.freeze({STAGES,METERS,DIFFICULTIES,stageFor,progress,canPlay,scorePercent,musicEvents});
});
