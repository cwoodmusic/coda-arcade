'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {KEY,DEFINITIONS,create}=require('../arcade-vibes.js');

function fixture(options={}){
 let level=1,quality='full',reduced=false,time=0;
 const values=new Map(),writes=[],body={dataset:{}};
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>{writes.push([key,value]);values.set(key,value);}};
 if(options.saved)values.set(KEY,JSON.stringify(options.saved));
 const vibe=create({body,storage,getLevel:()=>level,getQuality:()=>quality,reducedMotion:()=>reduced,getTime:()=>time,makeCanvas:canvas,...options.api});
 return {vibe,body,values,writes,level:value=>level=value,quality:value=>quality=value,reduced:value=>reduced=value,time:value=>time=value};
}
function context(){
 const calls=[],stack=[];
 const g={calls,globalAlpha:.4,globalCompositeOperation:'multiply',shadowBlur:11,lineWidth:7,lineCap:'butt',fillStyle:'original',strokeStyle:'original',
  save(){stack.push(Object.fromEntries(['globalAlpha','globalCompositeOperation','shadowBlur','lineWidth','lineCap','fillStyle','strokeStyle'].map(key=>[key,this[key]])));},
  restore(){Object.assign(this,stack.pop());},
  fillRect(...args){calls.push(['rect',...args,this.fillStyle,this.globalAlpha]);},
  drawImage(image,...args){calls.push(['image',...args,this.globalAlpha]);},
  beginPath(){calls.push(['path']);},moveTo(...args){calls.push(['move',...args]);},lineTo(...args){calls.push(['line',...args]);},
  closePath(){},fill(){calls.push(['fill',this.fillStyle,this.globalAlpha]);},stroke(){calls.push(['stroke',this.strokeStyle,this.lineWidth]);},translate(){},scale(){},
  createRadialGradient(){return {addColorStop(){}};}
 };return g;
}
function canvas(){const g=context();return {width:0,height:0,getContext:()=>g};}

test('vibes unlock at the authored milestone levels and low-level choices cannot persist',()=>{
 assert.deepEqual(DEFINITIONS.map(item=>[item.id,item.minLevel]),[['classic',1],['glowstick',20],['spooky',30],['aurora',40],['festival',50]]);
 const f=fixture();assert.equal(f.vibe.setVibe('glowstick'),false);assert.equal(f.writes.length,0);assert.equal(f.vibe.getState().active,'classic');
 for(const definition of DEFINITIONS){f.level(definition.minLevel);assert.equal(f.vibe.setVibe(definition.id),true);assert.equal(f.vibe.getState().active,definition.id);}
 assert.equal(f.vibe.setVibe('__proto__'),false);assert.equal(f.vibe.setVibe('constructor'),false);
});

test('a saved high-level vibe never activates for another low-level player',()=>{
 const f=fixture({saved:{version:1,selected:'festival'}});assert.equal(f.vibe.getState().selected,'festival');assert.equal(f.vibe.getState().active,'classic');assert.equal(f.body.dataset.arcadeVibe,'classic');
 f.level(50);f.vibe.refresh();assert.equal(f.vibe.getState().active,'festival');assert.equal(f.body.dataset.arcadeVibe,'festival');
 f.level(1);f.vibe.refresh();assert.equal(f.vibe.getState().active,'classic');assert.equal(f.body.dataset.arcadeVibe,'classic');
 assert.equal(f.writes.length,0,'Changing profiles must not write or mint a reward');
});

test('preference persistence contains only the selected vibe and storage failures retain the visit choice',()=>{
 const f=fixture();f.level(20);assert.equal(f.vibe.setVibe('glowstick'),true);assert.deepEqual(JSON.parse(f.values.get(KEY)),{version:1,selected:'glowstick'});
 const broken=fixture({api:{storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}}});broken.level(20);assert.equal(broken.vibe.setVibe('glowstick'),true);assert.equal(broken.vibe.getState().persistent,false);assert.equal(broken.vibe.getState().active,'glowstick');
});

test('classic draws nothing and each unlocked atmosphere restores its Canvas state',()=>{
 const f=fixture(),g=context();assert.equal(f.vibe.drawAtmosphere(g,{width:1672,height:941,time:1}),false);assert.deepEqual(g.calls,[]);
 f.level(50);
 for(const definition of DEFINITIONS.slice(1)){
  f.vibe.setVibe(definition.id);const original={alpha:g.globalAlpha,operation:g.globalCompositeOperation,blur:g.shadowBlur};g.calls.length=0;
  assert.equal(f.vibe.drawAtmosphere(g,{width:1672,height:941,time:2,lights:[{x:800,y:250,radius:120,color:'#44bbff'}]}),true);assert.ok(g.calls.length>0&&g.calls.length<500);
  assert.deepEqual({alpha:g.globalAlpha,operation:g.globalCompositeOperation,blur:g.shadowBlur},original);
 }
});

test('reduced motion and Effects Off freeze decorations and keep draw work bounded',()=>{
 const f=fixture();f.level(50);
 for(const id of ['glowstick','spooky','aurora','festival']){
  f.vibe.setVibe(id);f.reduced(true);const first=context(),last=context();f.vibe.drawAtmosphere(first,{width:1000,height:620,time:0});f.vibe.drawAtmosphere(last,{width:1000,height:620,time:100});assert.deepEqual(first.calls,last.calls,id+' reduced motion');
  f.reduced(false);f.quality('off');const off=context();f.vibe.drawAtmosphere(off,{width:1000,height:620,time:50});assert.ok(off.calls.length<50);assert.equal(f.vibe.getState().quality,'off');f.quality('full');
 }
});

test('every character can receive a bright glowstick without touching its profile or leaving context effects',()=>{
 const f=fixture(),actor={x:400,y:300,scale:1,facing:'left',time:1},before=JSON.stringify(actor),g=context();
 assert.equal(f.vibe.drawCharacterGlow(g,actor),false);f.level(20);f.vibe.setVibe('glowstick');assert.equal(f.vibe.drawCharacterGlow(g,actor),true);
 assert.equal(JSON.stringify(actor),before);assert.equal(g.calls.filter(call=>call[0]==='stroke').length,3);assert.equal(g.shadowBlur,11);assert.equal(g.globalCompositeOperation,'multiply');assert.equal(g.globalAlpha,.4);
 f.quality('off');g.calls.length=0;f.vibe.drawCharacterGlow(g,actor);assert.equal(g.calls.filter(call=>call[0]==='image').length,0,'FX off keeps the rod but omits its glow atlas');assert.equal(g.calls.filter(call=>call[0]==='stroke').length,3);
 f.level(1);assert.equal(f.vibe.drawCharacterGlow(g,actor),false,'A profile switch is gated even before the next atmosphere pass');
});

test('malformed preferences, anchors and actor positions cannot activate or expand drawing',()=>{
 const f=fixture({saved:{version:1,selected:'constructor'}});assert.equal(f.vibe.getState().active,'classic');f.level(50);f.vibe.setVibe('festival');
 const g=context();f.vibe.drawAtmosphere(g,{width:Infinity,height:NaN,time:NaN,lights:Array.from({length:1000},()=>({x:NaN,y:4,radius:Infinity,color:'url(evil)'}))});assert.ok(g.calls.length<500);
 assert.equal(f.vibe.drawCharacterGlow(g,{x:Infinity,y:4}),false);f.vibe.destroy();assert.equal(f.body.dataset.arcadeVibe,undefined);assert.equal(f.vibe.setVibe('classic'),false);assert.equal(f.vibe.drawAtmosphere(g),false);
});
