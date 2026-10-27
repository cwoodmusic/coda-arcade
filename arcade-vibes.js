/* Level-earned arcade atmosphere. Preferences stay on this browser; unlocking
 * a vibe is always checked against the current player's level. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.CodaArcadeVibes=api;
})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const KEY='codaArcadeVibeV1',TAU=Math.PI*2;
 const DEFINITIONS=Object.freeze([
  {id:'classic',label:'Classic arcade',minLevel:1,description:'The familiar arcade lights.'},
  {id:'glowstick',label:'Glowstick Vibe',minLevel:20,description:'Blue lights and a glowstick for everybody.'},
  {id:'spooky',label:'Spooky Vibe',minLevel:30,description:'Purple mist and ghostly green lights.'},
  {id:'aurora',label:'Aurora Vibe',minLevel:40,description:'Northern lights and little stars.'},
  {id:'festival',label:'Festival Vibe',minLevel:50,description:'Neon ribbons and celebration sparkles.'}
 ].map(item=>Object.freeze(item)));
 const byId=new Map(DEFINITIONS.map(item=>[item.id,item]));
 const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const hex=value=>typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value);
 const seed=(index,salt=0)=>((Math.imul(index+1,1103515245+salt*1201)>>>0)%65521)/65521;
 function create(api={}){
  const win=api.window||(typeof window==='undefined'?null:window),doc=api.document||win?.document,body=api.body||doc?.body;
  let storage=api.storage;if(storage===undefined)try{storage=win?.localStorage;}catch{}
  let selected='classic',active='classic',level=1,persistent=true,destroyed=false,signature='',lastApplied=null;
  const originalBodyVibe=body?.dataset?.arcadeVibe,controls=new Set(),textures=new Map();
  try{const saved=storage?.getItem?.(KEY);if(saved){const parsed=JSON.parse(saved);if(parsed?.version===1&&byId.has(parsed.selected))selected=parsed.selected;}}
  catch{persistent=false;}
  function playerLevel(){try{const value=api.getLevel?.();return clamp(Math.floor(finite(typeof value==='object'?value?.level:value,1)),1,1000000);}catch{return 1;}}
  function quality(){try{const value=api.getQuality?.();return ['full','lite','off'].includes(value)?value:'full';}catch{return 'lite';}}
  function reduced(){try{return typeof api.reducedMotion==='function'?api.reducedMotion()===true:api.reducedMotion===true;}catch{return true;}}
  function state(){return {selected,active,level,persistent,quality:quality(),reducedMotion:reduced(),options:DEFINITIONS.map(item=>({...item,locked:level<item.minLevel}))};}
  function refresh(){
   if(destroyed)return state();
   level=playerLevel();active=level>=byId.get(selected).minLevel?selected:'classic';
   const next=selected+'|'+active+'|'+level+'|'+persistent;
   if(next!==signature){
    signature=next;
    if(body?.dataset&&body.dataset.arcadeVibe!==active)body.dataset.arcadeVibe=active;
    lastApplied=active;for(const view of controls)renderControls(view);
    try{api.onChange?.(state());}catch{/* A visual preference cannot interrupt play. */}
   }
   return state();
  }
  function announce(message){for(const view of controls)view.status.textContent=message;}
  function setVibe(id){
   if(destroyed||!byId.has(id))return false;
   level=playerLevel();const definition=byId.get(id);
   if(level<definition.minLevel){announce(definition.label+' unlocks at Level '+definition.minLevel+'.');return false;}
   selected=id;
   try{if(typeof storage?.setItem!=='function')throw Error('storage');storage.setItem(KEY,JSON.stringify({version:1,selected}));persistent=true;}catch{persistent=false;}
   refresh();announce(definition.label+' selected.'+(persistent?'':' This choice lasts for this visit.'));return true;
  }
  function renderControls(view){
   view.level.textContent='Your level: '+level;
   for(const definition of DEFINITIONS){
    const button=view.buttons.get(definition.id),locked=level<definition.minLevel;
    button.setAttribute('aria-pressed',String(active===definition.id));button.setAttribute('aria-disabled',String(locked));
    button.classList.toggle('is-locked',locked);button.querySelector('.arcade-vibe-requirement').textContent=locked?'🔒 Level '+definition.minLevel:definition.minLevel>1?'Level '+definition.minLevel+' reward':'Always available';
    button.title=definition.description+(locked?' Unlocks at Level '+definition.minLevel+'.':'');
   }
  }
  function mountControls(host){
   if(destroyed||!host?.ownerDocument)return null;
   const owner=host.ownerDocument,make=(tag,cls,text)=>{const node=owner.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
   const root=make('fieldset','arcade-vibe-controls'),legend=make('legend','','Arcade vibe'),levelLabel=make('p','arcade-vibe-level'),options=make('div','arcade-vibe-options'),status=make('p','arcade-vibe-status');
   status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   root.append(legend,make('p','arcade-vibe-help','Level up to change the mood of the whole arcade.'),levelLabel,options,status);
   const buttons=new Map();
   for(const definition of DEFINITIONS){
    const button=make('button','arcade-vibe-choice');button.type='button';button.dataset.arcadeVibe=definition.id;
    button.append(make('strong','',definition.label),make('span','arcade-vibe-description',definition.description),make('span','arcade-vibe-requirement'));
    button.onclick=()=>setVibe(definition.id);buttons.set(definition.id,button);options.append(button);
   }
   const view={root,buttons,status,level:levelLabel};controls.add(view);host.append(root);refresh();renderControls(view);
   return {refresh:()=>{refresh();renderControls(view);},destroy(){controls.delete(view);root.remove();}};
  }
  function makeCanvas(width,height){
   const canvas=api.makeCanvas?.(width,height)||doc?.createElement?.('canvas');if(!canvas?.getContext)return null;
   canvas.width=width;canvas.height=height;return canvas;
  }
  function glow(color){
   if(textures.has(color))return textures.get(color);
   if(textures.size>=48)textures.delete(textures.keys().next().value);
   const canvas=makeCanvas(96,96);if(!canvas){textures.set(color,null);return null;}
   const g=canvas.getContext('2d');if(!g){textures.set(color,null);return null;}
   const gradient=g.createRadialGradient(48,48,0,48,48,48);gradient.addColorStop(0,color+'c4');gradient.addColorStop(.16,color+'80');gradient.addColorStop(.48,color+'29');gradient.addColorStop(1,color+'00');g.fillStyle=gradient;g.fillRect(0,0,96,96);textures.set(color,canvas);return canvas;
  }
  function light(g,x,y,radius,color,opacity=1){
   const image=glow(color);if(!image)return;
   g.save();g.globalAlpha=opacity;g.globalCompositeOperation='screen';g.drawImage(image,x-radius,y-radius,radius*2,radius*2);g.restore();
  }
  function anchors(frame,width,height){
   let source=frame.lights;try{if(!Array.isArray(source))source=api.getLights?.();}catch{source=[];}
   return (Array.isArray(source)?source:[]).slice(0,32).filter(item=>item&&Number.isFinite(item.x)&&Number.isFinite(item.y)&&Math.abs(item.x)<=16384&&Math.abs(item.y)<=16384).map(item=>({x:item.x,y:item.y,radius:clamp(finite(item.radius,100),12,420),color:hex(item.color)?item.color:'#408dff',kind:item.kind}));
  }
  function drawSpecks(g,width,height,time,count,colors,drift){
   for(let i=0;i<count;i++){
    const x=(seed(i,2)*width+time*(2+seed(i,4)*5)*drift)%width,y=(seed(i,7)*height+Math.sin(time*.32+i*1.7)*6*drift+height)%height,size=i%5===0?3:2;
    g.fillStyle=colors[i%colors.length];g.globalAlpha=.22+(i%4)*.1;g.fillRect(Math.round(x),Math.round(y),size,size);
   }
   g.globalAlpha=1;
  }
  function ribbon(g,width,height,time,index,colors,opacity){
   const y=height*(.18+index*.14),amplitude=height*.035;
   g.beginPath();
   for(let point=0;point<=18;point++){
    const x=width*point/18,yy=y+Math.sin(point*.56+time*.13+index)*amplitude;
    if(point===0)g.moveTo(x,yy);else g.lineTo(x,yy);
   }
   for(let point=18;point>=0;point--){const x=width*point/18,yy=y+Math.sin(point*.56+time*.13+index)*amplitude+14+Math.sin(point*.31+index)*8;g.lineTo(x,yy);}
   g.closePath();g.fillStyle=colors[index%colors.length];g.globalAlpha=opacity;g.fill();g.globalAlpha=1;
  }
  function cobweb(g,x,y,scale){
   g.save();g.translate(x,y);g.scale(scale,Math.abs(scale));g.strokeStyle='#a3d5d4';g.lineWidth=1;g.globalAlpha=.14;g.beginPath();
   for(let i=0;i<4;i++){const angle=i*Math.PI/6;g.moveTo(0,0);g.lineTo(Math.cos(angle)*55,Math.sin(angle)*55);}
   for(const radius of [17,34,52]){g.moveTo(radius,0);for(let i=1;i<=3;i++){const angle=i*Math.PI/6;g.lineTo(Math.cos(angle)*radius,Math.sin(angle)*radius);}}
   g.stroke();g.restore();
  }
  // Call after the scene's fixtures, before actors. Existing camera transforms
  // are retained: dimensions and light anchors use native world coordinates.
  function drawAtmosphere(g,frame={}){
   if(destroyed||!g?.save)return false;refresh();if(active==='classic')return false;
   const width=clamp(finite(frame.width,1672),1,8192),height=clamp(finite(frame.height,941),1,8192),q=quality(),quiet=reduced()||q==='off';
   const time=quiet?0:Math.max(0,finite(frame.time,finite(api.getTime?.()))),count=q==='full'?24:q==='lite'?10:0;
   g.save();try{
    g.globalCompositeOperation='source-over';g.globalAlpha=1;g.shadowBlur=0;
    const fill=active==='glowstick'?'rgba(1,5,21,.72)':active==='spooky'?'rgba(13,3,29,.61)':active==='aurora'?'rgba(2,17,32,.34)':'rgba(16,4,32,.22)';g.fillStyle=fill;g.fillRect(0,0,width,height);
    const lights=anchors(frame,width,height),limit=q==='full'?24:q==='lite'?12:4;
    for(const anchor of lights.slice(0,limit)){
     const color=active==='glowstick'?(anchor.kind==='neon'?anchor.color:'#2b7cff'):active==='spooky'?'#56bda0':anchor.color;
     light(g,anchor.x,anchor.y,anchor.radius,color,q==='off'?.34:.7);
    }
    if(active==='glowstick'){
     light(g,width*.55,height*.44,Math.min(width,height)*.6,'#164cce',.34);
     if(count)drawSpecks(g,width,height,time,Math.ceil(count*.5),['#61f3ff','#c7ff5c'],quiet?0:1);
    }else if(active==='spooky'){
     if(q!=='off')for(let i=0;i<(q==='full'?5:3);i++){const x=width*(.08+i*.22)+Math.sin(time*.09+i)*width*.04;light(g,x,height*(.43+(i%2)*.28),Math.min(260,width*.18),'#7b45a3',.22);}
     cobweb(g,34,36,1);cobweb(g,width-30,36,-1);
     if(count)drawSpecks(g,width,height,time,Math.ceil(count*.6),['#a5e8cb','#b4a1d8'],quiet?0:.3);
    }else if(active==='aurora'){
     if(q!=='off')for(let i=0;i<(q==='full'?4:2);i++)ribbon(g,width,height,time,i,['#30dfc8','#5aa2ff','#9983ef','#b3f3d4'],.10);
     if(count)drawSpecks(g,width,height,time,count,['#cafff4','#d7e3ff','#9eeed8'],quiet?0:.22);
    }else if(active==='festival'){
     if(q!=='off')for(let i=0;i<(q==='full'?4:2);i++)ribbon(g,width,height,time,i,['#f777d7','#61d8ff','#f8d875','#90eac2'],.09);
     if(count)drawSpecks(g,width,height,time,count,['#ff97dc','#76e4ff','#ffe59a','#a2f6c6'],quiet?0:1);
    }
   }finally{g.restore();}
   return true;
  }
  function drawCharacterGlow(g,actor={}){
   if(destroyed||active!=='glowstick'||!g?.save||!Number.isFinite(actor.x)||!Number.isFinite(actor.y))return false;
   if(playerLevel()<byId.get('glowstick').minLevel){refresh();return false;}
   const scale=clamp(finite(actor.scale,1),.2,4),q=quality(),time=reduced()||q==='off'?0:finite(actor.time,finite(api.getTime?.())),side=actor.facing==='left'?-1:1;
   const x=actor.x+side*12*scale,y=actor.y-23*scale,lean=Math.sin(time*.8+actor.x*.01)*1.2*scale;
   g.save();try{
    g.shadowBlur=0;g.globalCompositeOperation='source-over';if(q!=='off')light(g,x,y,17*scale,'#60ffe3',.7);
    g.lineCap='round';g.strokeStyle='#164d61';g.lineWidth=5*scale;g.beginPath();g.moveTo(x,y+4*scale);g.lineTo(x+lean,y-7*scale);g.stroke();
    g.strokeStyle='#64ffe2';g.lineWidth=3*scale;g.stroke();g.strokeStyle='#edfff1';g.lineWidth=scale;g.stroke();
   }finally{g.restore();}
   return true;
  }
  function destroy(){
   if(destroyed)return;destroyed=true;for(const view of controls)view.root.remove();controls.clear();textures.clear();
   if(body?.dataset?.arcadeVibe===lastApplied){if(originalBodyVibe===undefined)delete body.dataset.arcadeVibe;else body.dataset.arcadeVibe=originalBodyVibe;}
  }
  refresh();
  return {setVibe,getState:()=>refresh(),refresh,drawAtmosphere,drawCharacterGlow,mountControls,destroy};
 }
 return Object.freeze({KEY,DEFINITIONS,create});
});
