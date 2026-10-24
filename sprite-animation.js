/* Shared frame selection for the authored raster sprite atlases. */
(function(){
  'use strict';
  const DIRECTIONS=Object.freeze(['down','left','up','right']);
  const CLIPS=Object.freeze({
    idle:Object.freeze({offset:0,frames:2,fps:2}),walk:Object.freeze({offset:2,frames:6,fps:8}),
    wave:Object.freeze({offset:8,frames:4,fps:8}),dance:Object.freeze({offset:12,frames:6,fps:8}),
    interact:Object.freeze({offset:18,frames:4,fps:6}),talk:Object.freeze({offset:22,frames:4,fps:6}),
    sit:Object.freeze({offset:26,frames:2,fps:2})
  });
  const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
  const wrap=(value,size)=>((value%size)+size)%size;
  function sample(raw={},time=0,reducedMotion=false){
    const motion=raw&&typeof raw==='object'?raw:{},quiet=!!reducedMotion;
    const t=finite(time),actionTime=finite(motion.emoteTime,t);
    let direction=DIRECTIONS.includes(motion.facing)?motion.facing:'down';
    const walking=motion.walking===true,phase=finite(motion.phase),emote=typeof motion.emote==='string'?motion.emote:'';
    let clip='idle',frame=0;
    if(!quiet){
      if(walking){clip='walk';frame=Math.floor(wrap(phase,Math.PI*2)/(Math.PI*2)*CLIPS.walk.frames);}
      else if(emote==='spin'){
        direction=DIRECTIONS[wrap(DIRECTIONS.indexOf(direction)+Math.floor(actionTime*6),4)];
        frame=Math.floor(wrap(actionTime*4,2));
      }else{
        clip={wave:'wave',dance:'dance',robot:'dance',disco:'wave',talk:'talk',playing:'interact',interact:'interact',sit:'sit'}[emote]||'idle';
        const definition=CLIPS[clip],clock=clip==='idle'?t+finite(motion.seed)*.173:actionTime;
        if(emote==='robot')frame=[0,2,4,2][Math.floor(wrap(clock*4,4))];
        else if(emote==='disco')frame=[2,3,2,1][Math.floor(wrap(clock*3,4))];
        else frame=Math.floor(wrap(clock*definition.fps,definition.frames));
      }
    }
    const directionIndex=DIRECTIONS.indexOf(direction),index=directionIndex*28+CLIPS[clip].offset+frame;
    return {direction,facing:direction,directionIndex,clip,frame,index,walking,quiet,phase,actionTime};
  }
  window.CodaSpriteAnimation=Object.freeze({directions:DIRECTIONS,clips:CLIPS,framesPerDirection:28,sample});
})();
