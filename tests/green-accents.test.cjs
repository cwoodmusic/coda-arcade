'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const meta=require('../scripts/green-accents-regions.json'),{wallMask,preserveCounterGold}=require('../scripts/build-green-accents.cjs');

test('green masonry flanks the existing Coda sign without touching lamps, signs or any floor',()=>{
 const mask=wallMask(meta),[width,height]=meta.worldSize;
 for(const [x,y]of [[550,75],[650,65],[1110,80],[1175,85]])assert.equal(mask[y*width+x],1,'Masonry receives the green source');
 for(const [x,y]of [[850,65],[605,65],[1145,70],[550,35],[1000,200],[350,750]])assert.equal(mask[y*width+x],0,'The sign, lamps, caps and floors remain exact');
 for(let y=124;y<height;y++)for(let x=0;x<width;x++)assert.equal(mask[y*width+x],0,'Every floor and dance tile pixel is outside the accent mask');
});

test('existing warm gold counter trim remains original while jade/purple faces can take generated RGB',()=>{
 assert.equal(preserveCounterGold(255,170,35),true);
 assert.equal(preserveCounterGold(255,240,25),true);
 assert.equal(preserveCounterGold(205,95,25),true);
 assert.equal(preserveCounterGold(30,165,95),false);
 assert.equal(preserveCounterGold(165,10,190),false);
 assert.equal(preserveCounterGold(4,7,11),false);
});
