const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../sprite-animation.js'),'utf8'),sandbox);
const animation=sandbox.window.CodaSpriteAnimation;

test('all animation clips stay within their direction block and the112 authored frames',()=>{
  const visited=new Set();
  for(const [d,direction]of ['down','left','up','right'].entries()){
    for(const [clip,definition]of Object.entries(animation.clips))for(let i=0;i<definition.frames;i++){
      const emote={interact:'playing',walk:'',idle:''}[clip]??clip;
      const pose=animation.sample({facing:direction,walking:clip==='walk',phase:(i+.1)/6*Math.PI*2,emote},(i+.1)/definition.fps,false);
      assert.equal(pose.clip,clip);assert.equal(pose.direction,direction);assert.equal(pose.index,d*28+definition.offset+i);
      assert.ok(pose.index>=0&&pose.index<112);visited.add(pose.index);
    }
  }
  assert.equal(visited.size,112);
});

test('walking animation follows actual distance phase rather than wall-clock time',()=>{
  const a=animation.sample({walking:true,phase:1.5},0),b=animation.sample({walking:true,phase:1.5},100);
  assert.equal(a.index,b.index);
  assert.notEqual(animation.sample({walking:true,phase:0},10).index,animation.sample({walking:true,phase:Math.PI},10).index);
  assert.equal(animation.sample({walking:false,phase:Math.PI},0).clip,'idle');
});

test('authored emotes and interaction poses select distinct clips; spin changes direction',()=>{
  for(const [emote,clip]of [['wave','wave'],['dance','dance'],['talk','talk'],['playing','interact'],['sit','sit'],['robot','dance'],['disco','wave']])assert.equal(animation.sample({emote,emoteTime:.3},5).clip,clip);
  const turns=new Set([0,.18,.36,.54].map(emoteTime=>animation.sample({facing:'down',emote:'spin',emoteTime},0).direction));assert.equal(turns.size,4);
});

test('reduced motion freezes all clips at idle0 without changing position or ordinary facing',()=>{
  for(const emote of ['wave','dance','talk','playing','sit','spin']){
    const pose=animation.sample({facing:'right',walking:true,phase:2,emote,emoteTime:3},100,true);
    assert.equal(pose.clip,'idle');assert.equal(pose.frame,0);assert.equal(pose.direction,'right');assert.equal(pose.index,84);
  }
});

test('invalid saved motion and negative times never select out-of-range frames',()=>{
  for(const raw of [null,{}, {facing:'invalid',phase:Infinity}, {walking:true,phase:-200}, {emote:'dance',emoteTime:-3}]){
    const pose=animation.sample(raw,-100);assert.ok(Number.isInteger(pose.index)&&pose.index>=0&&pose.index<112);
  }
});
