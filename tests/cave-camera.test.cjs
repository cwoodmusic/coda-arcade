const test=require('node:test'),assert=require('node:assert/strict');
const {createCodaCaveCamera}=require('../cave-camera.js');
function fixture(){let focus={x:500,y:310},enabled=true,gesture={};let starts=0;const camera=createCodaCaveCamera({canvas:{width:1000,height:620,getBoundingClientRect:()=>({left:20,top:30,width:500,height:310})},getFocus:()=>focus,enabled:()=>enabled,getGestureState:()=>gesture,onGestureStart:()=>starts++});return{camera,setFocus:value=>focus=value,setEnabled:value=>enabled=value,setGesture:value=>gesture=value,starts:()=>starts};}
test('cave zoom follows the boat or avatar, keeps map bounds, and converts displayed input back to world coordinates',()=>{
 const f=fixture();assert.deepEqual(f.camera.toWorld(270,185),{x:500,y:310});f.camera.setZoom(2);assert.deepEqual(f.camera.toWorld(270,185),{x:500,y:310});assert.equal(f.camera.getState().x,250);assert.equal(f.camera.getState().visibleWidth,500);
 f.setFocus({x:120,y:285});f.camera.update();assert.equal(f.camera.getState().x,0);assert.equal(f.camera.getState().y,130);assert.deepEqual(f.camera.toWorld(140,185),{x:120,y:285});
 f.setFocus({x:990,y:615});f.camera.update();assert.equal(f.camera.getState().x,500);assert.equal(f.camera.getState().y,310);f.camera.reset();assert.equal(f.camera.getState().x,0);assert.equal(f.camera.getState().y,0);
});
test('pinch ratios clamp to a usable range and a remaining suppressed finger keeps the movement guard active',()=>{
 const f=fixture();f.camera.onPinch({phase:'start',distance:100});f.camera.onPinch({phase:'move',distance:240});assert.equal(f.camera.getState().zoom,2.4);assert.equal(f.starts(),1);f.camera.onPinch({phase:'move',distance:1000});assert.equal(f.camera.getState().zoom,3);f.camera.onPinch({phase:'move',distance:10});assert.equal(f.camera.getState().zoom,1);
 f.setGesture({suppressed:true});f.camera.onPinch({phase:'end'});assert.equal(f.camera.getState().pinching,true);f.setGesture({});assert.equal(f.camera.getState().pinching,false);f.setEnabled(false);f.camera.onPinch({phase:'start',distance:100});assert.equal(f.starts(),1);
});
test('canvas transforms remain balanced and preferences are not corrupted by nonfinite zoom input',()=>{
 const f=fixture(),calls=[];f.camera.setZoom(2);const ctx={save:()=>calls.push('save'),restore:()=>calls.push('restore'),scale:(...v)=>calls.push(['scale',...v]),translate:(...v)=>calls.push(['translate',...v])};f.camera.begin(ctx);f.camera.end(ctx);assert.deepEqual(calls,['save',['scale',2,2],['translate',-250,-155],'restore']);for(const value of [NaN,Infinity,undefined])f.camera.setZoom(value);assert.equal(f.camera.getState().zoom,2);f.camera.destroy();f.camera.setZoom(3);assert.equal(f.camera.getState().zoom,2);
});
