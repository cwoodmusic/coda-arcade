const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'../'+name),'utf8');
const directions=['down','left','up','right'];
function fixture(){
  const clips={idle:{offset:0,frames:2,fps:2},walk:{offset:2,frames:6,fps:8},wave:{offset:8,frames:4,fps:8},dance:{offset:12,frames:6,fps:8},interact:{offset:18,frames:4,fps:6},talk:{offset:22,frames:4,fps:6},sit:{offset:26,frames:2,fps:2}};
  const descriptor=(name,layout,material)=>({url:name+'.png',layout,material});
  const variants=(prefix,names,layout,material)=>Object.fromEntries(names.map(name=>[name,descriptor(prefix+'-'+name,layout,material)]));
  return {version:1,cell:[80,96],anchor:[40,88],columns:8,framesPerDirection:28,clips,
    frameData:Array.from({length:112},()=>({headX:2,headY:-1,bodyX:0,bodyY:1,handX:3,handY:2})),
    layers:{body:descriptor('body','animated','skin'),
      hair:variants('hair',['short','bob','long','curly','ponytail','spiky','buns'],'directional','hair'),
      outfit:variants('outfit',['pants','shorts','dress','overalls','suit','coat'],'animated','clothes'),
      shoes:variants('shoes',['sneakers','boots','hightops','neon','gold'],'animated','shoes'),
      headwear:variants('headwear',['cap','beanie','bucket','crown','headwrap'],'directional',null),
      eyewear:variants('eyewear',['glasses','sunglasses','partyglasses'],'directional',null),
      accessory:variants('accessory',['bow','headphones','bowtie','starclip','halo','earrings','pixelheadphones','trumpet','microphone'],'directional',null)}};
}
function image(url){const name=new URL(url).pathname.split('/').pop(),animated=/^(body|outfit-|shoes-)/.test(name);return {name,naturalWidth:animated?640:320,naturalHeight:animated?1344:96};}
function canvas(w,h){
  const output={width:w,height:h,sourceFrame:null,pixels:null};
  const ctx={imageSmoothingEnabled:false,drawImage(source,sx,sy,sw,sh){output.sourceFrame={source,sx,sy,sw,sh};},
    getImageData(){return {data:new Uint8ClampedArray([208,153,107,255,12,12,24,255,250,250,250,255,204,40,166,255,45,85,180,255,220,174,60,255])};},
    putImageData(pixels){output.pixels=Array.from(pixels.data);}};
  output.getContext=()=>ctx;return output;
}
function renderer(options={}){
  const sandbox={window:{location:{href:'http://localhost/world-preview.html'}},URL,Uint8ClampedArray};
  vm.runInNewContext(read('sprite-animation.js'),sandbox);vm.runInNewContext(read('character-renderer.js'),sandbox);
  return sandbox.window.createCodaCharacterRenderer({manifest:fixture(),loadImage:async url=>image(url),createCanvas:canvas,...options});
}
function context(){
  const calls=[];let depth=0;
  return {calls,get depth(){return depth;},save(){depth++;calls.push(['save']);},restore(){depth--;calls.push(['restore']);},
    translate(...args){calls.push(['translate',...args]);},scale(...args){calls.push(['scale',...args]);},drawImage(...args){calls.push(['image',...args]);},
    fillRect(){throw Error('Character bodies must come from raster assets, not procedural rectangles.');},beginPath(){},ellipse(...args){calls.push(['shadow',...args]);},fill(){}};
}
function name(call){return call[1].name||call[1].sourceFrame?.source.name;}

test('normalization migrates old hats/glasses while retaining independent new slots and bounded colors',async()=>{
  const r=renderer();await r.ready;
  const legacy=r.normalizeProfile({name:' '.repeat(2)+'A'.repeat(40),skin:'url(javascript:bad)',hair:'#ABCDEF',shirt:'#102030',hairstyle:'unknown',outfit:'dress',accessory:'cap',shoes:'gold',emote:'spin'});
  assert.equal(legacy.name,'A'.repeat(18));assert.equal(legacy.skin,'#e5ad75');assert.equal(legacy.hair,'#abcdef');assert.equal(legacy.headwear,'cap');assert.equal(legacy.accessory,'none');
  assert.equal(r.normalizeProfile({accessory:'sunglasses'}).eyewear,'sunglasses');assert.equal(r.normalizeProfile({accessory:'partyglasses'}).eyewear,'partyglasses');
  assert.equal(r.normalizeProfile({hat:true,walked:600,accessory:'none'}).accessory,'halo');
  const explicit=r.normalizeProfile({headwear:'none',eyewear:'none',accessory:'cap',hat:true,walked:600});assert.equal(explicit.headwear,'none');assert.equal(explicit.eyewear,'none');assert.equal(explicit.accessory,'none');
  const combined=r.normalizeProfile({headwear:'beanie',eyewear:'glasses',accessory:'headphones',lowerColor:'#314159'});assert.equal(combined.headwear,'beanie');assert.equal(combined.eyewear,'glasses');assert.equal(combined.accessory,'headphones');assert.equal(combined.lowerColor,'#314159');
  assert.equal(r.normalizeProfile({accessory:'earrings'}).accessory,'earrings');
  for(const items of Object.values(r.catalog))for(const item of items){assert.equal(typeof item.id,'string');assert.equal(typeof item.label,'string');assert.ok(Object.isFrozen(item));}
  assert.doesNotThrow(()=>r.normalizeProfile(null));
});

test('raster assets become ready before drawing, and malformed/undersized sheets fail explicitly',async()=>{
  const r=renderer(),ctx=context();assert.equal(r.isReady(),false);assert.equal(r.drawPlayer(ctx,{},{}),false);assert.equal(ctx.calls.length,0);
  await r.ready;assert.equal(r.isReady(),true);assert.equal(r.getState().mode,'raster-sprites');assert.equal(r.getState().totalFrames,112);
  const broken=renderer({loadImage:async()=>({naturalWidth:1,naturalHeight:1})});await assert.rejects(broken.ready,/too small/);assert.match(broken.error,/too small/);assert.equal(broken.drawPlayer(context(),{},{}),false);
  const bad=fixture();bad.clips.walk.offset=3;const badRenderer=renderer({manifest:bad});await assert.rejects(badRenderer.ready,/clip layout mismatch/);
});

test('all four directions use image frames and preserve the same gameplay foot anchor',async()=>{
  const r=renderer({reducedMotion:()=>true});await r.ready;
  for(const [index,facing]of directions.entries()){
    const ctx=context();assert.equal(r.drawPlayer(ctx,{hairstyle:'short'},{x:105,y:250,facing,walking:true,phase:2},3),true);assert.equal(ctx.depth,0);
    assert.ok(ctx.calls.some(c=>c[0]==='translate'&&c[1]===105&&c[2]===250));
    const body=ctx.calls.find(c=>c[0]==='image'&&name(c)==='body.png'),source=body[1].sourceFrame;
    assert.equal(source.sx,(index*28%8)*80);assert.equal(source.sy,Math.floor(index*28/8)*96);
    assert.deepEqual(body.slice(6),[-40,-88,80,96]);
    const hair=ctx.calls.find(c=>c[0]==='image'&&name(c)==='hair-short.png');assert.deepEqual(hair.slice(6),[-38,-89,80,96]);
  }
});

test('walk, conversation and environment interactions use different authored frame sequences',async()=>{
  const r=renderer();await r.ready;
  const samples=[];
  for(const [walking,emote,phase]of [[true,null,0],[true,null,Math.PI],[false,'wave',0],[false,'talk',0],[false,'playing',0],[false,'sit',0]]){
    const ctx=context();r.drawPlayer(ctx,{}, {x:0,y:0,facing:'down',walking,emote,phase,emoteTime:.3},1);
    const image=ctx.calls.find(c=>c[0]==='image'&&name(c)==='body.png')[1];samples.push(image.sourceFrame.sx+':'+image.sourceFrame.sy);
  }
  assert.equal(new Set(samples).size,6);
  assert.equal(r.sampleMotion({walking:true,phase:2},0).index,r.sampleMotion({walking:true,phase:2},100).index);
});

test('hats, eyewear and accessories draw together and maintain their head/hand attachment anchors',async()=>{
  const r=renderer();await r.ready;const ctx=context();r.drawPlayer(ctx,{headwear:'cap',eyewear:'glasses',accessory:'headphones'},{x:0,y:0,facing:'down'},0);
  const images=ctx.calls.filter(c=>c[0]==='image');
  for(const expected of ['headwear-cap.png','eyewear-glasses.png','accessory-headphones.png']){const call=images.find(c=>name(c)===expected);assert.ok(call);assert.deepEqual(call.slice(6),[-38,-89,80,96]);}
  const npc=context();r.drawNPC(npc,{id:'miles',x:10,y:20,facing:'down',activity:'chatting'},1);
  assert.ok(npc.calls.some(c=>c[0]==='image'&&name(c)==='eyewear-sunglasses.png'));
  const trumpet=npc.calls.find(c=>c[0]==='image'&&name(c)==='accessory-trumpet.png');assert.deepEqual(trumpet.slice(6),[-37,-86,80,96]);
  const back=context();r.drawPlayer(back,{hairstyle:'long',eyewear:'glasses'},{facing:'up'},0);
  const backImages=back.calls.filter(c=>c[0]==='image');assert.ok(backImages.findIndex(c=>name(c)==='eyewear-glasses.png')<backImages.findIndex(c=>name(c)==='hair-long.png'));
});

test('tinting preserves eye whites, outlines, unrelated trim and alpha while changing skin and clothing materials',async()=>{
  const r=renderer();await r.ready;const ctx=context();r.drawPlayer(ctx,{skin:'#705030',shirt:'#4d9c62',lowerColor:'#9d4e7c'},{},0);
  const body=ctx.calls.find(c=>c[0]==='image'&&name(c)==='body.png')[1].pixels;
  assert.notDeepEqual(body.slice(0,3),[208,153,107]);assert.deepEqual(body.slice(4,12),[12,12,24,255,250,250,250,255]);
  const outfit=ctx.calls.find(c=>c[0]==='image'&&name(c)==='outfit-pants.png')[1].pixels;
  assert.notDeepEqual(outfit.slice(12,15),[204,40,166]);assert.notDeepEqual(outfit.slice(16,19),[45,85,180]);assert.deepEqual(outfit.slice(20,24),[220,174,60,255]);
  assert.ok(body.filter((_,i)=>i%4===3).every(alpha=>alpha===255));
});

test('the historic cast remains distinct and NPC appearance overrides use the same real asset slots',async()=>{
  const r=renderer();await r.ready;const ids=['bach','mozart','beethoven','clara','joplin','ellington','ella','nina','miles'];
  assert.equal(new Set(ids.map(id=>JSON.stringify(r.appearanceFor(id)))).size,9);
  assert.equal(r.appearanceFor('bach').headwear,'none');assert.equal(r.appearanceFor('miles').headwear,'none');assert.equal(r.appearanceFor('Miles Davis').eyewear,'sunglasses');assert.equal(r.appearanceFor('miles').accessory,'trumpet');
  for(const id of ids)assert.ok(Object.isFrozen(r.appearanceFor(id)));
  const ctx=context();r.drawNPC(ctx,{id:'miles',x:0,y:0,facing:'down',appearance:{outfit:'dress',headwear:'beanie',eyewear:'glasses',accessory:'none'}},0);
  const names=ctx.calls.filter(c=>c[0]==='image').map(name);assert.ok(names.includes('outfit-dress.png'));assert.ok(names.includes('headwear-beanie.png'));assert.ok(names.includes('eyewear-glasses.png'));assert.ok(!names.includes('accessory-trumpet.png'));
});

test('per-frame tint cache stays bounded across many independently customized looks',async()=>{
  const r=renderer({cacheLimit:32});await r.ready;
  for(let i=0;i<90;i++)r.drawPlayer(context(),{skin:'#'+(0x704000+i*103).toString(16).padStart(6,'0')},{walking:true,phase:i/5},i);
  assert.equal(r.getState().tintedFrames,32);assert.equal(r.getState().cacheLimit,32);
});

test('exposed legs follow skin color independently of clothing colors and cached looks',async()=>{
  const skinCanvas=(w,h)=>{const value=canvas(w,h);value.getContext().getImageData=()=>({data:new Uint8ClampedArray([30,180,40,255])});return value;};
  const r=renderer({createCanvas:skinCanvas});await r.ready;
  function legs(profile){const ctx=context();r.drawPlayer(ctx,{outfit:'shorts',shirt:'#a04060',lowerColor:'#304080',...profile},{},0);return ctx.calls.find(c=>c[0]==='image'&&name(c)==='outfit-shorts.png')[1].pixels;}
  const dark=legs({skin:'#704633'}),light=legs({skin:'#e5ad75'}),otherClothes=legs({skin:'#704633',shirt:'#48b8dd',lowerColor:'#decb82'});
  assert.notDeepEqual(dark,light,'Changing skin must update exposed legs even when the outfit is unchanged');
  assert.deepEqual(dark,otherClothes,'Clothing dyes must not recolor exposed skin');
  assert.equal(dark[3],255);
});
