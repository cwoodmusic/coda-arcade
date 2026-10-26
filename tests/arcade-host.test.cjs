'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const host=require('../arcade-host.js');
test('only the configured production hostnames enable profile services',()=>{
 for(const name of ['cwoodmusic.github.io','www.coda-arcade.com'])assert.equal(host.supports(name),true);
 for(const name of ['coda-arcade.com','www.coda-arcade.com.evil.test','evilwww.coda-arcade.com','localhost',''])assert.equal(host.supports(name),false);
});
test('custom-domain cabinets retain the exact secure parent origin',()=>{
 for(const [game,path]of [['pitch','Pitch-Race'],['triad','musictriad'],['rhythm','rhythmroom']]){
  const url=new URL(host.gameURL(game,{hostname:'www.coda-arcade.com',origin:'https://untrusted.test'},'domains-71'));
  assert.equal(url.origin,'https://www.coda-arcade.com');assert.equal(url.pathname,'/'+path+'/');
  assert.equal(url.searchParams.get('v'),'domains-71');
 }
});
test('existing GitHub and local previews retain their existing cabinet destinations',()=>{
 for(const hostname of ['cwoodmusic.github.io','127.0.0.1','localhost','www.coda-arcade.com.evil.test'])
  assert.equal(new URL(host.gameURL('pitch',{hostname})).origin,'https://cwoodmusic.github.io');
});
test('cabinet paths cannot be replaced with arbitrary URLs or prototype properties',()=>{
 for(const game of ['https://untrusted.test/','../musictriad','constructor','__proto__',''])assert.throws(()=>host.gameURL(game,{hostname:host.CUSTOM_HOST}),TypeError);
});
