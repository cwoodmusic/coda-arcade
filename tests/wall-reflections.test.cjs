'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {isGlassFloor,create,STRIPS}=require('../wall-reflections.js');
test('wall reflections reach reviewed glass while protecting carpet, tiles and rectangular walls',()=>{
 for(const [x,y]of [[800,210],[1110,280],[1480,390],[400,475],[755,690],[110,780]])assert.equal(isGlassFloor(x,y),true,`${x},${y}`);
 for(const [x,y]of [[250,250],[500,350],[650,580],[400,750],[835,650],[1610,500]])assert.equal(isGlassFloor(x,y),false,`${x},${y}`);
 assert.equal(new Set(STRIPS.map(s=>s.id)).size,STRIPS.length);
});
test('off and unavailable sources skip reflection generation',()=>{
 const document={createElement(){throw Error('Off must not allocate a canvas');}},reflections=create({document,getQuality:()=>'off'});
 assert.equal(reflections.draw({}, {width:1672,height:941}),false);assert.equal(reflections.getState().builds,0);
 assert.equal(create().draw({}, {width:100,height:100}),false);
});
