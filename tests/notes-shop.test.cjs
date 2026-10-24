const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {createWallet,createShopUI,STOCK,KEY,STARTER_NOTES,denominationBreakdown,coinSVG,gameReward}=require('../notes-shop.js');

function storage(){
  const records=new Map();
  return {records,fail:false,getItem(key){if(this.fail)throw new Error('denied');return records.get(key)||null;},setItem(key,value){if(this.fail)throw new Error('quota');records.set(key,value);}};
}
test('completed games provide repeatable income without paying twice for a run',()=>{
  assert.equal(gameReward('triad',{mode:'computer',won:true}),16);
  assert.equal(gameReward('triad',{mode:'computer',won:false}),4);
  assert.equal(gameReward('pitch',{correct:10,won:false}),8);
  assert.equal(gameReward('pitch',{correct:0,won:true}),0);
  assert.equal(gameReward('rhythm',{total:10,hits:10,extra:0}),16);
  assert.equal(gameReward('rhythm',{total:10,hits:10,extra:10}),8);
  assert.equal(gameReward('rhythm',{total:10,hits:11,extra:0}),0);
  const wallet=createWallet({storage:storage()});
  wallet.grantReward('game:triad:run-1',16);wallet.grantReward('game:triad:run-1',16);
  wallet.grantReward('game:triad:run-2',16);assert.equal(wallet.snapshot().balance,182);
});
test('a guest gets a durable starter wallet and purchases debit once across reloads',()=>{
  const disk=storage(),wallet=createWallet({storage:disk});
  assert.equal(wallet.snapshot().balance,STARTER_NOTES);assert.equal(wallet.snapshot().persistent,true);
  assert.equal(wallet.buy('witch').ok,true);assert.equal(wallet.snapshot().balance,70);
  assert.equal(wallet.owns('witch'),true);assert.equal(wallet.buy('witch').alreadyOwned,true);
  assert.equal(wallet.snapshot().balance,70,'A double click cannot charge for the same item twice');
  const loaded=createWallet({storage:disk});assert.equal(loaded.owns('witch'),true);assert.equal(loaded.snapshot().balance,70);
  assert.equal(loaded.buy('wizard').ok,false);assert.equal(loaded.snapshot().balance,70);
  assert.equal(loaded.owns('wizard'),false);assert.equal(loaded.buy('missing').ok,false);
});
test('a failing write never debits Notes, grants an item, or consumes a lesson reward',()=>{
  const disk=storage(),wallet=createWallet({storage:disk}),saved=disk.getItem(KEY);disk.fail=true;
  assert.equal(wallet.buy('witch').ok,false);assert.equal(wallet.snapshot().balance,150);
  assert.equal(wallet.owns('witch'),false);assert.equal(wallet.snapshot().persistent,false);
  assert.equal(wallet.grantReward('piano:ode',75).ok,false);assert.equal(wallet.snapshot().balance,150);
  assert.deepEqual(wallet.snapshot().rewards,[]);assert.equal(disk.records.get(KEY),saved);
  disk.fail=false;assert.equal(wallet.grantReward('piano:ode',75).ok,true);
  assert.equal(wallet.snapshot().balance,225);assert.equal(wallet.snapshot().persistent,true);
});
test('lesson rewards are awarded once per persistent ID and reject malformed values',()=>{
  const disk=storage(),wallet=createWallet({storage:disk});
  assert.deepEqual(wallet.grantReward('piano:scale',60),{ok:true,alreadyClaimed:false,amount:60,balance:210});
  assert.deepEqual(wallet.grantReward('piano:scale',60),{ok:true,alreadyClaimed:true,amount:0,balance:210});
  const loaded=createWallet({storage:disk});assert.equal(loaded.grantReward('piano:scale',60).amount,0);
  for(const [id,amount] of [['',60],['<script>',60],['valid',-1],['valid',NaN],['valid',2.5],['valid',1001]])assert.equal(loaded.grantReward(id,amount).ok,false);
  assert.equal(loaded.snapshot().balance,210);
});
test('already equipped cosmetics are grandfathered without changing the profile or balance',()=>{
  const disk=storage(),profile={name:'Collector',headwear:'wizard',eyewear:'cybervisor',accessory:'wand',shoes:'rollerskates',emote:'moonwalk',walked:900};
  const before=JSON.stringify(profile),wallet=createWallet({storage:disk,getAvatar:()=>profile});
  for(const id of ['wizard','cybervisor','wand','rollerskates','moonwalk'])assert.equal(wallet.owns(id),true,id);
  assert.equal(wallet.snapshot().balance,150);assert.equal(JSON.stringify(profile),before);
  assert.equal(wallet.owns('witch'),false);assert.equal(wallet.isStock('headphones'),false);
  assert.equal(wallet.preserveEquipped({headwear:'witch'}).ok,true);
  assert.equal(wallet.owns('witch'),true,'A profile loaded later from cloud can retain its saved cosmetic');
  assert.equal(wallet.snapshot().balance,150);assert.equal(wallet.preserveEquipped({headwear:'witch'}).changed,false);
});
test('independent wallets refresh the same ledger before spending or rewarding',()=>{
  const disk=storage(),a=createWallet({storage:disk}),b=createWallet({storage:disk});
  assert.equal(a.buy('wizard').balance,60);
  assert.equal(b.buy('cowboy').balance,0,'A second tab cannot spend a stale starter balance');
  assert.equal(a.buy('witch').ok,false);
  assert.equal(a.grantReward('piano:ode',75).balance,75);
  assert.equal(b.grantReward('piano:ode',75).alreadyClaimed,true);
  assert.equal(b.snapshot().balance,75);
});
test('wallet snapshots cannot mutate saved state and subscriber failures do not undo transactions',()=>{
  const wallet=createWallet({storage:storage()});let updates=0;
  wallet.subscribe(()=>{updates++;throw new Error('unrelated UI failure');});
  const stop=wallet.subscribe(value=>{value.owned.push('wizard');value.rewards.push('fake');});
  assert.equal(wallet.buy('witch').ok,true);assert.equal(updates,1);assert.equal(wallet.owns('wizard'),false);
  assert.deepEqual(wallet.snapshot().rewards,[]);stop();
  const view=wallet.snapshot();view.owned.length=0;view.balance=10000;
  assert.equal(wallet.owns('witch'),true);assert.equal(wallet.snapshot().balance,70);
});
test('every shop item is an actual renderer choice in its equipment slot',()=>{
  const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../character-renderer.js'),'utf8'),sandbox);
  const renderer=sandbox.window.createCodaCharacterRenderer(),slots={headwear:'headwear',eyewear:'eyewear',accessory:'accessories',shoes:'shoes',emote:'emotes'};
  assert.equal(new Set(STOCK.map(item=>item.id)).size,STOCK.length);
  for(const item of STOCK){assert.ok(renderer.catalog[slots[item.slot]].some(choice=>choice.id===item.id),item.id);assert.ok(item.price>0&&item.price<=150);}
});
test('coin denominations make exact change in sixteenth-note units',()=>{
  for(const value of [0,1,2,3,4,8,15,16,35,70,150,999999]){
    const coins=denominationBreakdown(value);assert.deepEqual(coins.map(coin=>coin.value),[16,8,4,2,1]);
    assert.equal(coins.reduce((sum,coin)=>sum+coin.count*coin.value,0),value);
    for(const coin of coins){assert.ok(Number.isSafeInteger(coin.count)&&coin.count>=0);assert.match(coinSVG(coin.id),/^<svg/);}
  }
  assert.deepEqual(denominationBreakdown(150).map(coin=>coin.count),[9,0,1,1,0]);
  assert.equal(coinSVG('not-a-note'),'');
});
test('the live catalog locks about ninety percent of cosmetics and stocks newly rendered props',()=>{
  const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../character-renderer.js'),'utf8'),sandbox);
  const renderer=sandbox.window.createCodaCharacterRenderer(),catalog=renderer.catalog;
  const all=['headwear','eyewear','accessories','shoes','emotes'].flatMap(group=>Array.from(catalog[group]).filter(item=>item.id!=='none'));
  const disk=storage(),wallet=createWallet({storage:disk,catalog});
  const locked=all.filter(item=>wallet.isStock(item.id)||['bowtie','starclip','partyglasses','halo'].includes(item.id)).length;
  assert.ok(locked/all.length>=.88&&locked/all.length<.96,'Premium/achievement percentage should be about ninety: '+locked+'/'+all.length);
  for(const id of ['cap','beanie','glasses','sunglasses','bow','headphones','sneakers','boots','wave','dance'])assert.equal(wallet.isStock(id),false,id);
  const newWallet=createWallet({storage:disk,catalog:{...catalog,accessories:[...catalog.accessories,{id:'new-prop',label:'A new drawn prop'}]}});
  assert.equal(newWallet.isStock('new-prop'),true);
  assert.equal(newWallet.buy('new-prop').ok,true);
  assert.equal(createWallet({storage:disk,catalog:{...catalog,accessories:[...catalog.accessories,{id:'new-prop',label:'A new drawn prop'}]}}).owns('new-prop'),true);
});

class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.style={};this.value='';this.textContent='';this.isConnected=true;this.classList={toggle(){}};}
  setAttribute(key,value){this.attributes[key]=String(value);}
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  replaceChildren(...children){this.children=[];this.append(...children);}
  getContext(){return {};}
  focus(){}
  querySelector(selector){if(selector.startsWith('[data-shop-item=')){const id=selector.split('"')[1];return this.children.find(child=>child.attributes['data-shop-item']===id)?.children.find(child=>child.tagName==='button');}return null;}
}
test('the shop buys without changing the avatar, then explicitly equips the owned item',()=>{
  const oldDocument=global.document;global.document={createElement:tag=>new Element(tag)};
  try{
    const wallet=createWallet({storage:storage()}),body=new Element('div'),avatar={headwear:'none',name:'Guest'};let saved=0,wardrobe=0;
    const ui=createShopUI({wallet,panelBody:body,renderer:{drawPlayer(){}},getAvatar:()=>avatar,
      openPanel(){body.replaceChildren();},openWardrobe(){wardrobe++;},applyAvatar(next){Object.assign(avatar,next);saved++;return true;}});
    const all=()=>{const result=[];function visit(node){result.push(node);node.children.forEach(visit);}visit(body);return result;};
    const label=name=>all().find(node=>node.attributes['aria-label']===name);
    ui.open();label('Search shop').value='witch';label('Search shop').oninput();
    label('Buy Crooked witch hat for 80 Notes').onclick();assert.equal(wallet.snapshot().balance,70);
    assert.equal(avatar.headwear,'none');assert.equal(saved,0);
    label('Wear Crooked witch hat').onclick();assert.equal(avatar.headwear,'witch');assert.equal(saved,1);
    const status=all().find(node=>node.attributes.role==='status');assert.match(status.textContent,/Now wearing/);
    all().find(node=>node.textContent==='Open my wardrobe').onclick();assert.equal(wardrobe,1);
  }finally{global.document=oldDocument;}
});
