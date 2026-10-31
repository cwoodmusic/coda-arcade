'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const meta=require('../scripts/cosmic-floor-regions.json');
const {floorMask,rebaseArtwork,repairPoints,recolorRepairs}=require('../scripts/build-cosmic-floor.cjs');
const mask=floorMask(meta),width=meta.worldSize[0];

test('cosmic palette reaches exposed floor while protecting the existing architecture and dance tiles',()=>{
 for(const [x,y]of [[1000,500],[450,450],[425,440],[790,600],[110,740]])
  assert.equal(mask[y*width+x],1,`Exposed floor ${x},${y} must receive the new palette`);
 for(const [x,y]of [[250,250],[400,750],[500,350],[850,60],[840,600],[1460,780]])
  assert.equal(mask[y*width+x],0,`Protected carpet, tile, wall or sign ${x},${y} must stay intact`);
 assert.equal(mask.length,1672*941);
});

test('recoloring an authored repair preserves its exact coverage, original alpha and every other pixel',()=>{
 const project={assets:[{id:'wall',x:123}],artwork:{'background.world':{width:1672,height:941,
  tiles:{'6,7':[[1728,3,'#3601f180'],[1800,2,'#001122ff']]}}}};
 // Tile6,7 pixel1728 is world384,475; the second run is outside this repair.
 const points=repairPoints(project,{bounds:[384,475,3,1]}),before=structuredClone(project);
 assert.deepEqual(points,[[384,475],[385,475],[386,475]]);
 const samples=points.map(([x,y])=>[x,y,'#ddaa55']),result=recolorRepairs(project,samples);
 assert.deepEqual(result.project.artwork['background.world'].tiles['6,7'],[[1728,3,'#ddaa5580'],[1800,2,'#001122ff']]);
 assert.deepEqual(result.project.assets,project.assets);assert.deepEqual(project,before);
 assert.deepEqual(repairPoints(result.project,{bounds:[384,475,3,1]}),points,'Painted silhouette remains exact');
 const repeat=recolorRepairs(result.project,samples);
 assert.equal(repeat.changed,0);assert.deepEqual(repeat.project,result.project);
});

test('rebasing splits a journal run at the floor-wall boundary without changing retained colors or layout',()=>{
 const color='#aabbccff',wall='#112233ff',project={
  format:'CodaArcadeWorldProject',version:1,world:{width:1672,height:941},scenery:'environment-v1',
  assets:[{id:'keep-this-prop',x:42,y:123}],collision:[[431,0]],strokes:[{tool:'erase',size:1,points:[[4,5]]}],
  characters:{riff:{x:1353,y:467}},rooms:{piano:{collision:[[33,0]]}},
  artwork:{'background.world':{width:1672,height:941,tiles:{'12,9':[[1536,64,color]],'13,9':[[1536,10,wall]]}},
   'object.dance_north_wall_west':{width:127,height:64,tiles:{'0,0':[[0,2,'#00000000']]}}}
 };
 const before=structuredClone(project),result=rebaseArtwork(project,mask,width);
 assert.deepEqual(project,before,'The input export is never mutated');
 assert.deepEqual(result.project.artwork['background.world'].tiles,{
  '12,9':[[1536,10,color],[1595,5,color]],'13,9':[[1536,10,wall]]
 });
 assert.equal(result.removed,49);assert.equal(result.retained,25);
 for(const key of ['assets','collision','strokes','characters','rooms'])assert.deepEqual(result.project[key],before[key]);
 assert.deepEqual(result.project.artwork['object.dance_north_wall_west'],before.artwork['object.dance_north_wall_west']);
 const repeat=rebaseArtwork(result.project,mask,width);
 assert.equal(repeat.removed,0);assert.deepEqual(repeat.project,result.project,'Rebuilding is idempotent');
});
