'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {cleanupMask,build}=require('../scripts/build-walkway-cleanup.cjs');
const northwest=require('../scripts/five-northwest-cleanup-regions.json');
const front=require('../scripts/front-wall-depth-regions.json');
const green=require('../scripts/sign-green-completion-regions.json');
const hall=require('../scripts/hall-floor-repair-regions.json');
const project=require('../published-world-project.json');
const width=1672,metas=[northwest,front,green,hall],masks=metas.map(cleanupMask);
const owns=(mask,x,y)=>mask[y*width+x];

test('northwest repair removes the obsolete upper wall and lamp while retaining the new inner wall, plaques and left lamp',()=>{
 const mask=masks[0];
 for(const [x,y]of [[50,457],[180,480],[207,499],[207,512],[230,550],[230,620],[80,680],[180,648]])
  assert.equal(owns(mask,x,y),1,`Reviewed negative space, spill or neon ${x},${y}`);
 for(const [x,y]of [[120,512],[235,512],[83,551],[110,565],[190,565],[150,620],[60,680],[180,680],[397,359]])
  assert.equal(owns(mask,x,y),0,`Preserved cap, fixture, plaque, wall, post or tiles ${x},${y}`);
});

test('front depth owns only exterior bodies and the extension below them while retaining caps, rails, stairs and entrance',()=>{
 const mask=masks[1];
 for(const [x,y]of [[55,870],[100,920],[200,935],[470,935],[600,920],[840,900],[900,850],[1500,935]])
  assert.equal(owns(mask,x,y),1,`Reviewed exterior body ${x},${y}`);
 for(const [x,y]of [[55,825],[110,842],[200,877],[290,880],[320,910],[430,935],[480,875],[600,860],[780,850],[900,820],[1450,800],[400,800]])
  assert.equal(owns(mask,x,y),0,`Preserved cap, stair, entrance or interior ${x},${y}`);
});

test('emerald completion reuses approved masonry and cannot change the sign frame, roof or torches',()=>{
 const mask=masks[2];
 for(const [x,y]of [[1058,43],[1065,75],[1080,110]])assert.equal(owns(mask,x,y),1);
 for(const [x,y]of [[1057,75],[1090,75],[1080,30],[1080,120],[1144,60],[1000,60]])assert.equal(owns(mask,x,y),0);
 assert.equal(green.source,'assets/environment/source/green-back-wall.png');
});

test('Hall glass repair owns the entire stale rectangle and lamp ghost but cannot reach the Hall frame',()=>{
 const mask=masks[3];
 for(const [x,y]of [[1345,200],[1365,180],[1374,155],[1393,220],[1374,308],[1374,320]])assert.equal(owns(mask,x,y),1);
 for(const [x,y]of [[1339,200],[1374,154],[1394,220],[1410,200],[1374,325],[1365,100]])assert.equal(owns(mask,x,y),0);
 assert.deepEqual(hall.floorFeather,{right:[1393,1394],bottom:[309,325],leftBelow:[1340,1350,155]});
});

test('all four finishing passes preserve world size, furniture and existing authored background pixels',()=>{
 for(const meta of metas){
  assert.deepEqual(meta.worldSize,[1672,941]);
  assert.equal(meta.output,'assets/environment/v1/empty-arcade.png');
  assert.equal(meta.preserveProject,true);
  const [x,y,w,h]=meta.sourcePlacement||[0,0,...meta.worldSize];
  assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1672&&y+h<=941);
 }
 for(const [tile,runs]of Object.entries(project.artwork?.['background.world']?.tiles||{})){
  const [tx,ty]=tile.split(',').map(Number);
  for(const [start,length]of runs)for(let i=start;i<start+length;i++){
   const x=tx*64+i%64,y=ty*64+Math.floor(i/64);
   for(let pass=0;pass<masks.length;pass++)assert.equal(owns(masks[pass],x,y),0,`Existing authored pixel ${x},${y} in pass ${pass}`);
  }
 }
});

test('a native-only repair rejects authored-pixel overlap before loading artwork or writing files',async()=>{
 const [tile,runs]=Object.entries(project.artwork['background.world'].tiles)[0];
 const [tx,ty]=tile.split(',').map(Number),index=runs[0][0],x=tx*64+index%64,y=ty*64+Math.floor(index/64);
 const meta={...northwest,source:'must-not-load.png',polygons:[[[x,y],[x+1,y],[x+1,y+1],[x,y+1]]],protectedPolygons:[]};
 await assert.rejects(build({meta,dryRun:true}),/Native-only repair overlaps 1 authored background pixels/);
});
