/* Keep custom-domain cabinets on the same origin as their classroom profile. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.CodaArcadeHost=api;
})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const CUSTOM_HOST='www.coda-aracde.com',CUSTOM_ORIGIN='https://'+CUSTOM_HOST;
 const GITHUB_ORIGIN='https://cwoodmusic.github.io';
 const paths=Object.freeze({pitch:'Pitch-Race',triad:'musictriad',rhythm:'rhythmroom'});
 function supports(hostname){return hostname==='cwoodmusic.github.io'||hostname===CUSTOM_HOST;}
 function gameURL(game,location,version='domains-73'){
  if(!Object.prototype.hasOwnProperty.call(paths,game))throw new TypeError('Unknown arcade game.');
  const origin=location?.hostname===CUSTOM_HOST?CUSTOM_ORIGIN:GITHUB_ORIGIN;
  const url=new URL('/'+paths[game]+'/',origin);
  url.searchParams.set('v',version);return url.href;
 }
 return Object.freeze({CUSTOM_HOST,CUSTOM_ORIGIN,supports,gameURL});
});
