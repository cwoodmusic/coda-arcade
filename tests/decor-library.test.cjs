'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const library=require('../decor-library.js');

test('the library supplies forty distinct portable decor sources at useful world sizes',()=>{
 assert.equal(library.items.length,40);assert.equal(new Set(library.items.map(item=>item.id)).size,40);
 assert.deepEqual(library.items.reduce((counts,item)=>(counts[item.category]=(counts[item.category]||0)+1,counts),{}),{floor:16,tabletop:16,wall:8});
 for(const item of library.items){
  assert.match(item.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.ok(item.name.length>3);
  assert.ok(Number.isInteger(item.width)&&Number.isInteger(item.height)&&item.width>=16&&item.height>=18&&item.width<=100&&item.height<=105);
  if(item.category==='floor')assert.ok(item.height>=80);if(item.category==='tabletop')assert.ok(item.width<=36&&item.height<=32);
  assert.ok(Object.isFrozen(item));
 }
 assert.ok(Object.isFrozen(library.items));
});

class Element{
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.dataset={};this.value='';this.disabled=false;this.hidden=false;}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(key,value){this[key]=value;}
 remove(){this.removed=true;}
}
function fixture(){
 let editable=true,callback=async()=>true;
 const pending=[],calls=[],draws=[];
 const win={setTimeout,clearTimeout,Image:class{
  constructor(){this.naturalWidth=160;this.naturalHeight=240;}
  set src(value){this.url=value;pending.push(this);}
 }};
 const doc={defaultView:win,createTextNode:text=>({textContent:text}),createElement(tag){
  const node=new Element(tag,doc);
  if(tag==='canvas'){node.getContext=()=>({drawImage:image=>draws.push(image)});node.toDataURL=()=> 'data:image/png;base64,AQID';}
  return node;
 }};
 const host=new Element('div',doc),control=library.mount({host,canEdit:()=>editable,onAdd:async item=>{calls.push(item);return callback(item);}});
 const find=key=>{let result;const visit=node=>{if(Object.hasOwn(node.dataset||{},key))result=node;for(const child of node.children||[])visit(child);};visit(host);return result;};
 const resolve=()=>{const image=pending.shift();assert.ok(image,'Expected an explicit Add request');image.onload();};
 return {control,calls,pending,draws,find,resolve,setEditable(value){editable=value;control.refresh();},setCallback(value){callback=value;}};
}

test('browsing never places decor and Add creates one independent source image with proportionate size',async()=>{
 const value=fixture();assert.equal(value.control.getState().selected,null);assert.equal(value.calls.length,0);assert.equal(value.pending.length,0);
 assert.equal(value.control.select('neon-jukebox'),true);assert.equal(value.calls.length,0);assert.equal(value.pending.length,0);
 const adding=value.control.addSelected();assert.equal(value.control.getState().busy,true);assert.equal(await value.control.addSelected(),false);
 value.resolve();assert.equal(await adding,true);assert.equal(value.calls.length,1);assert.equal(value.draws.length,1);
 assert.deepEqual(value.calls[0],{id:'neon-jukebox',name:'Neon jukebox',width:64,height:96,data:'data:image/png;base64,AQID'});
 assert.equal(value.control.getState().busy,false);assert.equal(value.control.getState().selected,'neon-jukebox');value.control.destroy();
});

test('filtering is a preview action and clears a hidden selection instead of placing a stale item',()=>{
 const value=fixture();value.control.select('rocket-statue');
 value.find('decorCategory').value='tabletop';value.find('decorCategory').onchange();
 assert.equal(value.control.getState().visible,16);assert.equal(value.control.getState().selected,null);assert.equal(value.calls.length,0);
 value.find('decorSearch').value='token';value.find('decorSearch').oninput();assert.equal(value.control.getState().visible,1);
 value.find('decorSearch').value='no matching decor';value.find('decorSearch').oninput();assert.equal(value.control.getState().visible,0);assert.equal(value.find('decorAdd').disabled,true);value.control.destroy();
});

test('revoked editing or disposal during image loading cannot add a scene asset',async()=>{
 for(const close of [value=>value.setEditable(false),value=>value.control.destroy()]){
  const value=fixture();value.control.select('mini-cabinet');const adding=value.control.addSelected();close(value);value.resolve();assert.equal(await adding,false);assert.equal(value.calls.length,0);value.control.destroy();
 }
});

test('image and placement failures keep the library usable without duplicate scene mutations',async()=>{
 const value=fixture();value.control.select('succulent');let adding=value.control.addSelected();value.pending.shift().onerror();assert.equal(await adding,false);assert.equal(value.calls.length,0);assert.equal(value.control.getState().busy,false);
 value.setCallback(async()=>false);adding=value.control.addSelected();value.resolve();assert.equal(await adding,false);assert.equal(value.calls.length,1);assert.equal(value.control.getState().busy,false);assert.equal(value.find('decorStatus').dataset.error,'true');
 value.setCallback(async()=>true);adding=value.control.addSelected();value.resolve();assert.equal(await adding,true);assert.equal(value.calls.length,2);value.control.destroy();
});
