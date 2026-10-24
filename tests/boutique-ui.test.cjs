const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.style={};this.classList={add(){}};this.value='';this.textContent='';}
  setAttribute(name,value){this.attributes[name]=String(value);}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
  replaceChildren(...nodes){for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes);}
  dispatchEvent(){}
}
const defaults={name:'Guest',hairstyle:'short',outfit:'pants',skin:'#d49a76',hair:'#463145',shirt:'#a7f66f',lowerColor:'#424258',headwear:'none',eyewear:'none',accessory:'none',shoes:'sneakers',emote:'wave'};
function setup(options={}){
  const body=new Element('div'),profiles={player:{name:'Guest',collectedTokens:7,...options.player},miles:{name:'Miles Davis',skin:'#875b40',outfit:'suit'}};
  const calls=[];let preview,closed=0;
  const sandbox={window:{},document:{createElement:tag=>new Element(tag)},Event:class{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../boutique-ui.js'),'utf8'),sandbox);
  const ui=sandbox.window.createCodaBoutiqueUI({
    panelBody:body,renderer:{normalizeProfile:p=>({...defaults,...p})},
    openPanel(){body.replaceChildren();},closePanel(){closed++;},
    getTargets:()=>[{id:'player',label:'Your avatar'},{id:'miles',label:'Miles Davis'}],getProfile:id=>profiles[id],
    applyProfile(id,draft){calls.push({id,draft});if(options.failure)return false;profiles[id]={...profiles[id],...draft};return true;},
    getPreviewUI:()=>({addPreview:getter=>{preview=getter;}}),unlocked:options.unlocked||(()=>true)
  });
  const all=()=>{const nodes=[];function visit(node){nodes.push(node);node.children.forEach(visit);}visit(body);return nodes;};
  return {ui,body,profiles,calls,all,label:name=>all().find(node=>node.attributes['aria-label']===name),button:name=>all().find(node=>node.tagName==='button'&&node.textContent===name),get preview(){return preview();},get closed(){return closed;}};
}

test('legacy single-slot equipment migrates only when modern slots are absent',()=>{
  const env=setup();
  assert.equal(env.ui.migrateProfile({accessory:'cap'}).headwear,'cap');
  assert.equal(env.ui.migrateProfile({accessory:'cap'}).accessory,'none');
  assert.equal(env.ui.migrateProfile({accessory:'partyglasses'}).eyewear,'partyglasses');
  assert.equal(env.ui.migrateProfile({accessory:'partyglasses'}).accessory,'none');
  assert.equal(env.ui.migrateProfile({accessory:'cap',headwear:'none'}).headwear,'none');
  const raw={accessory:'sunglasses'},before=JSON.stringify(raw);env.ui.migrateProfile(raw);assert.equal(JSON.stringify(raw),before);
});

test('player preview combines independent hats, glasses, accessories and colors without committing a draft',()=>{
  const env=setup();env.ui.open();
  env.label('Hats').value='cap';env.label('Glasses').value='sunglasses';env.label('Accessories').value='headphones';env.label('Lower clothing color').value='#112233';
  assert.equal(env.preview.headwear,'cap');assert.equal(env.preview.eyewear,'sunglasses');assert.equal(env.preview.accessory,'headphones');assert.equal(env.preview.lowerColor,'#112233');
  assert.equal(env.calls.length,0);assert.equal(env.profiles.player.headwear,undefined);
  env.button('Save my look').onclick();
  assert.equal(env.calls.length,1);assert.equal(env.calls[0].id,'player');assert.equal(env.profiles.player.headwear,'cap');assert.equal(env.profiles.player.eyewear,'sunglasses');assert.equal(env.profiles.player.accessory,'headphones');assert.equal(env.profiles.player.collectedTokens,7);assert.equal(env.closed,1);
});

test('locked player equipment can be previewed but cannot be saved from any slot',()=>{
  const env=setup({unlocked:id=>!['partyglasses','halo'].includes(id)});env.ui.open();
  env.label('Glasses').value='partyglasses';assert.equal(env.preview.eyewear,'partyglasses');env.button('Save my look').onclick();
  assert.equal(env.calls.length,0);assert.match(env.all().find(node=>node.className==='panelMsg').textContent,/still locked/);
  env.label('Glasses').value='none';env.label('Accessories').value='halo';env.button('Save my look').onclick();assert.equal(env.calls.length,0);
  env.label('Accessories').value='none';env.button('Save my look').onclick();assert.equal(env.calls.length,1);
});

test('NPC costumes use their own target and retain musician identity while allowing all equipment',()=>{
  const env=setup({unlocked:()=>false});env.ui.open('miles');
  const name=env.label('Arcade nickname');assert.equal(name.readOnly,true);name.value='Different person';
  env.label('Hats').value='crown';env.label('Glasses').value='partyglasses';env.label('Accessories').value='halo';env.button('Save NPC look').onclick();
  assert.equal(env.calls.length,1);assert.equal(env.calls[0].id,'miles');assert.equal(env.calls[0].draft.name,'Miles Davis');assert.equal(env.profiles.miles.headwear,'crown');assert.equal(env.profiles.player.headwear,undefined);
});

test('switching targets and cancelling discard unsaved drafts rather than changing another character',()=>{
  const env=setup();env.ui.open();env.label('Hair color').value='#ffffff';
  const target=env.label('Customize');target.value='miles';target.onchange();assert.equal(env.ui.getTarget(),'miles');assert.equal(env.calls.length,0);assert.equal(env.profiles.player.hair,undefined);
  env.button('Cancel').onclick();assert.equal(env.closed,1);assert.equal(env.calls.length,0);
  env.ui.open();assert.equal(env.preview.hair,defaults.hair);
});

test('a failed save keeps the draft available and does not close the boutique',()=>{
  const env=setup({failure:true});env.ui.open();env.label('Hats').value='beanie';env.button('Save my look').onclick();
  assert.equal(env.closed,0);assert.equal(env.ui.getDraft().headwear,'beanie');assert.match(env.all().find(node=>node.className==='panelMsg').textContent,/could not be saved/);
});
