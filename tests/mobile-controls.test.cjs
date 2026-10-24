const test=require('node:test'),assert=require('node:assert/strict');
const {createHoldRouter}=require('../mobile-controls.js');
function fixture(){const calls=[];let context={id:'world',enabled:true,key:(key,down)=>calls.push(['world',key,down]),release:()=>calls.push(['release','world'])};return {calls,router:createHoldRouter(()=>context),set:value=>context=value};}
test('diagonal movement and simultaneous jump are independent until every finger releases',()=>{
 const {router,calls}=fixture();router.hold(1,['w','d']);router.hold(2,[' ']);router.release(2);assert.deepEqual(router.snapshot()[0].keys,['w','d']);router.release(1);
 assert.deepEqual(calls,[['world','w',true],['world','d',true],['world',' ',true],['world',' ',false],['world','w',false],['world','d',false]]);
});
test('overlapping fingers cannot release a direction still held by another finger',()=>{
 const {router,calls}=fixture();router.hold(1,['d']);router.hold(2,['w','d']);router.release(1);assert.equal(calls.filter(row=>row[1]==='d'&&row[2]===false).length,0);router.release(2);assert.equal(calls.filter(row=>row[1]==='d'&&row[2]===false).length,1);
});
test('cancel and context changes release the original room without leaking inputs into the next one',()=>{
 const {router,calls,set}=fixture();router.hold(1,['d']);set({id:'piano',enabled:true,key:(key,down)=>calls.push(['piano',key,down])});router.hold(1,['e']);router.releaseAll();assert.deepEqual(calls.slice(0,4),[['world','d',true],['world','d',false],['piano','e',true],['piano','e',false]]);assert.deepEqual(router.snapshot(),[]);
});
test('disabled menus reject input and repeated pointer moves never repeat an action',()=>{
 const {router,calls,set}=fixture();router.hold(1,['e']);router.hold(1,['e']);assert.equal(calls.length,1);set({id:'world',enabled:false});router.hold(1,['e']);assert.deepEqual(calls,[['world','e',true],['world','e',false]]);assert.deepEqual(router.snapshot(),[]);
});
