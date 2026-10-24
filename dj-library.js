/* Original house music and the Song Machine JSON format, playable as a guest. */
(function(root){
 'use strict';
 const meters=['4/4','2/4','3/4','5/4','6/8','9/8','12/8'];
 function valid(song){
  if(!song||!Number.isFinite(song.bpm)||song.bpm<40||song.bpm>240||!Number.isInteger(song.bars)||song.bars<1||song.bars>16||!meters.includes(song.meter))return false;
  if(!Array.isArray(song.tracks)||song.tracks.length>12||!Array.isArray(song.drums)||song.drums.length!==3)return false;
  const [top,bottom]=song.meter.split('/').map(Number),end=song.bars*top*16/bottom;
  let count=0;
  return [...song.tracks,...song.drums].every((track,index)=>{
   if(!track||!Array.isArray(track.notes)||(count+=track.notes.length)>8192||!Number.isInteger(track.sound)||track.sound<0||track.sound>(index<song.tracks.length?17:4)||!Number.isFinite(track.volume)||track.volume<0||track.volume>1)return false;
   return track.notes.every(note=>note&&Number.isFinite(note.t)&&note.t>=0&&note.t<end&&Number.isFinite(note.d)&&note.d>0&&note.d<=64&&(index>=song.tracks.length||Number.isFinite(note.p)&&note.p>=0&&note.p<=127));
  });
 }
 function compose(id,title,bpm,rootPitch,melody,sound){
  const lead=[],bass=[],drums=[[],[],[]],changes=[0,5,3,7];
  for(let bar=0;bar<4;bar++){
   const chord=changes[bar];
   for(let beat=0;beat<4;beat++){
    const t=bar*16+beat*4;
    lead.push({p:rootPitch+12+chord+melody[(bar*4+beat)%melody.length],t,d:3});
    bass.push({p:rootPitch-12+chord+(beat%2?7:0),t,d:3});
    drums[0].push({p:45,t,d:1});if(beat%2)drums[1].push({p:57,t,d:1});
    drums[2].push({p:88,t,d:1},{p:88,t:t+2,d:1});
   }
  }
  return {id,title,description:'An original Coda Arcade house track',composition:{bpm,bars:4,meter:'4/4',root:0,scale:'chromatic',tracks:[
   {id:1,name:'Lead',sound,volume:.45,mute:false,notes:lead},
   {id:2,name:'Bass',sound:1,volume:.55,mute:false,notes:bass}
  ],drums:drums.map((notes,index)=>({sound:index===0?3:1,volume:index===2?.15:.25,mute:false,notes}))}};
 }
 const songs=[
  compose('neon-afterhours','Neon Afterhours',110,60,[0,7,10,12,7,3,5,10],0),
  compose('velvet-lounge','Velvet Lounge',86,57,[0,4,7,11,9,7,4,2],6),
  compose('mirrorball-bounce','Mirrorball Bounce',124,62,[0,12,7,10,5,7,3,10],1)
 ];
 const library=Object.freeze({songs,valid});
 if(typeof module==='object'&&module.exports)module.exports=library;
 else root.CodaDJLibrary=library;
})(typeof window==='object'?window:globalThis);
