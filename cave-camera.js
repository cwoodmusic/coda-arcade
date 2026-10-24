/* The exploration camera is independent of the room editor and fishing clock. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.createCodaCaveCamera=api.createCodaCaveCamera;})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const finite=(value,fallback)=>Number.isFinite(value)?value:fallback;
 function createCodaCaveCamera(api={}){
  const canvas=api.canvas;if(!canvas)throw Error('The cave camera needs a canvas.');
  const W=finite(api.width,canvas.width||1000),H=finite(api.height,canvas.height||620),maxZoom=Math.max(1,finite(api.maxZoom,3));
  const camera={x:0,y:0,zoom:1};let pinch=null,destroyed=false,controls=null,indicator=null,out=null,inside=null;
  const enabled=()=>!destroyed&&(typeof api.enabled!=='function'||api.enabled()===true);
  function follow(){const focus=api.getFocus?.()||{x:W/2,y:H/2};camera.x=clamp(finite(focus.x,W/2)-W/camera.zoom/2,0,W-W/camera.zoom);camera.y=clamp(finite(focus.y,H/2)-H/camera.zoom/2,0,H-H/camera.zoom);}
  function refresh(){if(!controls)return;controls.hidden=!enabled();indicator.textContent=Math.round(camera.zoom*100)+'%';out.disabled=camera.zoom<=1;inside.disabled=camera.zoom>=maxZoom;}
  function update(){follow();refresh();}
  function setZoom(value){if(!Number.isFinite(value)||destroyed)return camera.zoom;camera.zoom=clamp(value,1,maxZoom);follow();refresh();return camera.zoom;}
  function onPinch(gesture){
   if(gesture?.phase==='end'){pinch=null;return;}
   if(!enabled()||!gesture||!(gesture.distance>0))return;
   if(gesture.phase==='start'){pinch={distance:gesture.distance,zoom:camera.zoom};api.onGestureStart?.();}
   else if(pinch)setZoom(pinch.zoom*gesture.distance/pinch.distance);
  }
  function toWorld(clientX,clientY){const bounds=canvas.getBoundingClientRect();return{x:camera.x+(clientX-bounds.left)*W/bounds.width/camera.zoom,y:camera.y+(clientY-bounds.top)*H/bounds.height/camera.zoom};}
  function begin(ctx){ctx.save();ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);}
  function end(ctx){ctx.restore();}
  function getState(){const gesture=api.getGestureState?.();return{...camera,minZoom:1,maxZoom,pinching:!!(gesture?.pinching||gesture?.suppressed||pinch),following:!!gesture?.following,visibleWidth:W/camera.zoom,visibleHeight:H/camera.zoom};}
  const doc=canvas.ownerDocument;
  if(api.controls!==false&&doc&&canvas.parentElement){
   controls=doc.createElement('div');controls.className='cave-camera-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Cave zoom controls');
   const make=(text,label,fn)=>{const button=doc.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-label',label);button.onclick=()=>{if(enabled())fn();};controls.append(button);return button;};
   out=make('−','Zoom cave out',()=>setZoom(camera.zoom-.25));indicator=make('100%','Reset cave zoom',()=>setZoom(1));inside=make('+','Zoom cave in',()=>setZoom(camera.zoom+.25));
   canvas.parentElement.append(controls);refresh();
  }
  function destroy(){if(destroyed)return;destroyed=true;pinch=null;controls?.remove();}
  update();
  return{update,setZoom,zoomBy:amount=>setZoom(camera.zoom+amount),reset:()=>setZoom(1),onPinch,toWorld,begin,end,getState,destroy};
 }
 return{createCodaCaveCamera};
});
