'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
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
  fillRect(...args){calls.push(['rect',...args,this.fillStyle,this.globalAlpha,this.globalCompositeOperation]);},
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


test('split grade and luminous effects retain draw order without covering glowstick cores',()=>{
 const f=fixture();f.level(50);f.vibe.setVibe('glowstick');
 const grade=context();assert.equal(f.vibe.drawAtmosphere(grade,{width:1000,height:620,phase:'grade',time:1}),true);
 assert.equal(grade.calls.length,1);assert.equal(grade.calls[0][0],'rect');assert.equal(grade.calls[0].at(-1),'source-over');
 const effects=context();f.vibe.drawAtmosphere(effects,{width:1000,height:620,phase:'effects',time:1});
 assert.equal(effects.calls[0].at(-1),'screen','The foreground atmosphere adds light instead of darkening held rods');
 assert.equal(effects.globalCompositeOperation,'multiply');
 f.quality('off');const quiet=context();f.vibe.drawAtmosphere(quiet,{width:1000,height:620,time:10});
 assert.equal(quiet.calls.length,2,'Effects Off keeps only the static grade and colour wash');
});

test('glowstick bloom lights the character and nearby floor while the white core remains crisp',()=>{
 const f=fixture(),g=context();f.level(20);f.vibe.setVibe('glowstick');
 f.vibe.drawCharacterGlow(g,{x:400,y:300,scale:1,facing:'down',time:1});
 const bloom=g.calls.filter(call=>call[0]==='image');assert.ok(bloom.some(call=>call[3]>=80),'A broad halo reaches outside the physical rod');
 assert.ok(bloom.some(call=>call[2]>=265),'A separate light reaches the feet and floor');
 assert.ok(g.calls.some(call=>call[0]==='stroke'&&call[1]==='#f1fff8'&&call[2]<2),'A narrow white core stays sharp');
});

test('Halloween wardrobes are diverse catalog-valid previews and never alter identities or saved outfits',()=>{
 const scope={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../character-renderer.js'),'utf8'),scope);
 const renderer=scope.window.createCodaCharacterRenderer(),f=fixture();f.level(50);f.vibe.setVibe('spooky');
 const identity=Object.freeze({skin:'#885c43',hair:'#211e28',hairstyle:'curly',eyewear:'sunglasses',name:'Original musician',faceDetail:'miles',shirt:'#28384e',accessory:'trumpet'}),before=JSON.stringify(identity),looks=[];
 const ids=['bach','mozart','beethoven','clara','joplin','ellington','ella','nina','miles','dj','chopin','haydn','captain-cadence','visitor-vee-jay'];
 for(const id of ids){
  const look=f.vibe.characterAppearance(identity,{id,role:'npc'}),normalized=renderer.normalizeProfile(look);
  assert.notEqual(look,identity);assert.equal(look.skin,identity.skin);assert.equal(look.hair,identity.hair);assert.equal(look.hairstyle,identity.hairstyle);assert.equal(look.faceDetail,identity.faceDetail);assert.equal(look.name,identity.name);
  for(const key of ['outfit','headwear','accessory','shoes'])assert.equal(normalized[key],look[key],id+' '+key+' is supported by the real renderer');
  looks.push(JSON.stringify([look.shirt,look.outfit,look.headwear,look.accessory]));
  assert.deepEqual(f.vibe.characterAppearance(identity,{id,role:'npc'}),look,'A costume stays stable while an NPC moves');
 }
 assert.ok(new Set(looks).size>=10,'Musicians should not share one generic Halloween look');
 assert.equal(JSON.stringify(identity),before);assert.equal(f.writes.length,1,'Rendering costumes never persists NPC outfits');
 assert.equal(f.vibe.characterAppearance(identity,{id:'player',role:'player'}),identity,'The player keeps their chosen outfit');
 f.vibe.setVibe('classic');assert.equal(f.vibe.characterAppearance(identity,{id:'miles',role:'npc'}),identity,'Turning off the vibe restores the original appearance');
 f.vibe.setVibe('spooky');f.level(1);assert.equal(f.vibe.characterAppearance(identity,{id:'bach',role:'npc'}),identity,'Changing players does not retain unlocked costume effects');
});

test('Halloween details stay below the face and restore the caller canvas transform and paint state',()=>{
 const f=fixture();f.level(50);f.vibe.setVibe('spooky');
 for(const id of ['beethoven','joplin','chopin','mozart','ellington','ella']){
  const g=context(),before={alpha:g.globalAlpha,operation:g.globalCompositeOperation,blur:g.shadowBlur};
  assert.equal(f.vibe.drawCharacterCostume(g,{id,role:'npc',x:400,y:300,scale:1,facing:'down'}),true);
  assert.ok(g.calls.filter(call=>call[0]==='rect').every(call=>call[2]>=273),'Costume details leave the composer face visible');
  assert.deepEqual({alpha:g.globalAlpha,operation:g.globalCompositeOperation,blur:g.shadowBlur},before);
 }
 assert.equal(f.vibe.drawCharacterCostume(context(),{id:'player',role:'player',x:400,y:300}),false);
 assert.equal(f.vibe.drawCharacterCostume(context(),{id:'chopin',role:'npc',x:NaN,y:300}),false);
});
