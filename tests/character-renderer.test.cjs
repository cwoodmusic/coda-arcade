const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function renderer(options={}){const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../character-renderer.js'),'utf8'),sandbox);return sandbox.window.createCodaCharacterRenderer(options);}
function context(){
  const calls=[];let color='',depth=0;
  return {calls,get depth(){return depth;},set fillStyle(value){color=value;},get fillStyle(){return color;},
    save(){depth++;calls.push(['save']);},restore(){depth--;calls.push(['restore']);},translate(...args){calls.push(['translate',...args]);},scale(...args){calls.push(['scale',...args]);},
    fillRect(...args){calls.push(['rect',color,...args]);},beginPath(){},ellipse(...args){calls.push(['shadow',...args]);},fill(){}};
}

test('normalization bounds untrusted saved cosmetics and preserves all requested choices',()=>{
  const r=renderer(),p=r.normalizeProfile({name:' '.repeat(2)+'A'.repeat(40),skin:'url(javascript:bad)',hair:'#ABCDEF',shirt:'#102030',hairstyle:'unknown',outfit:'dress',accessory:'headphones',shoes:'gold',emote:'spin'});
  assert.equal(p.name,'A'.repeat(18));assert.equal(p.skin,'#d49a76');assert.equal(p.hair,'#abcdef');assert.equal(p.shirt,'#102030');assert.equal(p.hairstyle,'short');
  assert.equal(p.outfit,'dress');assert.equal(p.accessory,'headphones');assert.equal(p.shoes,'gold');assert.equal(p.emote,'spin');
  assert.doesNotThrow(()=>r.normalizeProfile(null));assert.equal(r.normalizeProfile({hat:true,walked:450}).accessory,'halo');
  assert.equal(r.normalizeProfile({hat:true,walked:600,accessory:'none'}).accessory,'halo');
  for(const hairstyle of ['short','bob','long','curly','ponytail','spiky','bald','buns'])assert.equal(r.normalizeProfile({hairstyle}).hairstyle,hairstyle);
});

test('the historic cast has nine distinct immutable appearances including Miles Davis',()=>{
  const r=renderer(),ids=['bach','mozart','beethoven','clara','joplin','ellington','ella','nina','miles'];
  const looks=ids.map(id=>r.appearanceFor(id));assert.equal(new Set(looks.map(p=>JSON.stringify(p))).size,9);
  assert.equal(looks[8].name,'Miles Davis');assert.equal(looks[8].accessory,'sunglasses');assert.equal(looks[8].instrument,'trumpet');
  assert.equal(r.appearanceFor('Clara Schumann').id,'clara');assert.equal(r.appearanceFor('unknown').id,'guest');
  for(const look of looks)assert.ok(Object.isFrozen(look));
});

test('walking phase moves feet while idle and reduced-motion poses stay planted',()=>{
  const r=renderer();assert.equal(r.sampleMotion({walking:false,phase:Math.PI/2},1).stride,0);
  assert.equal(r.sampleMotion({walking:true,phase:Math.PI/2},1).stride,3);
  assert.equal(r.sampleMotion({walking:true,phase:Math.PI*1.5},1).stride,-3);
  const quiet=renderer({reducedMotion:()=>true}).sampleMotion({walking:true,phase:Math.PI/2,emote:'dance'},1);
  assert.equal(quiet.stride,0);assert.equal(quiet.bob,0);assert.equal(quiet.dx,0);assert.equal(quiet.lift,0);assert.equal(quiet.blink,false);
});

test('all facing directions render saved colors, preserve the foot anchor and restore canvas state',()=>{
  const r=renderer({reducedMotion:()=>true});
  for(const facing of ['down','left','up','right']){
    const ctx=context();r.drawPlayer(ctx,{skin:'#705030',hair:'#223344',shirt:'#4678ab',outfit:'overalls',accessory:'headphones'},{x:105,y:250,facing,walking:true,phase:1},3);
    assert.equal(ctx.depth,0);assert.ok(ctx.calls.some(c=>c[0]==='translate'&&c[1]===105&&c[2]===250));
    assert.ok(ctx.calls.some(c=>c[0]==='rect'&&c[1]==='#4678ab'));
    assert.ok(ctx.calls.some(c=>c[0]==='rect'&&c[1]==='#705030'));
    const rects=ctx.calls.filter(c=>c[0]==='rect');assert.ok(rects.every(c=>c[5]>0&&c[4]>0));
    assert.ok(rects.every(c=>c[3]+c[5]<=0),'body/shoes must not extend below their gameplay foot anchor');
    assert.equal(ctx.calls.some(c=>c[0]==='scale'&&c[1]===-1),facing==='left');
  }
});

test('outfits and accessories produce visibly different sprites without mutating saved profiles',()=>{
  const r=renderer({reducedMotion:()=>true}),p={name:'Guest',shirt:'#b34781',outfit:'pants',hairstyle:'short',accessory:'none'},before=JSON.stringify(p),a=context(),b=context();
  r.drawPlayer(a,p,{x:0,y:0,facing:'down'},1);r.drawPlayer(b,{...p,outfit:'dress',hairstyle:'buns',accessory:'halo'},{x:0,y:0,facing:'down'},1);
  assert.notDeepEqual(a.calls,b.calls);assert.equal(JSON.stringify(p),before);
});

test('NPC activity changes poses and instrument details while retaining balanced rendering state',()=>{
  const r=renderer(),idle=context(),playing=context();
  r.drawNPC(idle,{id:'miles',x:10,y:20,facing:'down',walking:false,activity:'relaxing'},1);
  r.drawNPC(playing,{id:'miles',x:10,y:20,facing:'down',walking:false,activity:'playing'},1);
  assert.notDeepEqual(idle.calls,playing.calls);assert.ok(idle.calls.some(c=>c[0]==='rect'&&c[1]==='#f0ce6e'),'Miles carries a brass trumpet');
  assert.equal(idle.depth,0);assert.equal(playing.depth,0);
  const dance=r.sampleMotion({facing:'down',emote:'dance'},.25);assert.equal(dance.gesture,'dance');assert.notEqual(dance.dx,0);
});
