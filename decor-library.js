/* Reusable source decor; adding an item creates an independent embedded image. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CodaDecorLibrary=api;})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const records=[
  ['neon-jukebox','Neon jukebox','floor',64,96],
  ['rocket-statue','Rocket statue','floor',58,100],
  ['gumball-machine','Gumball machine','floor',58,90],
  ['star-pedestal','Neon star pedestal','floor',70,94],
  ['mini-cabinet','Mini arcade cabinet','tabletop',26,30],
  ['cube-lamp','Neon cube lamp','tabletop',26,26],
  ['succulent','Potted succulent','tabletop',26,28],
  ['vinyl-headphones','Vinyl and headphones','tabletop',36,24],
  ['alien-statue','Alien statue','floor',60,96],
  ['prize-capsule-machine','Prize capsule machine','floor',64,96],
  ['record-pedestal','Record display pedestal','floor',64,94],
  ['neon-cactus','Neon cactus','floor',70,94],
  ['arcade-trophy-pedestal','Arcade trophy pedestal','floor',60,100],
  ['neon-arrow-sign','Neon arrow stand','floor',76,90],
  ['planet-sculpture','Planet sculpture','floor',78,94],
  ['pixel-heart-totem','Pixel heart totem','floor',62,100],
  ['ticket-dispenser','Ticket dispenser','floor',58,94],
  ['prize-display','Prize display','floor',76,100],
  ['checker-flag-stand','Checkered flag stand','floor',72,96],
  ['boombox-tower','Boombox tower','floor',64,96],
  ['soda-cup','Arcade soda cup','tabletop',18,28],
  ['popcorn-tub','Popcorn tub','tabletop',24,26],
  ['token-jar','Token jar','tabletop',24,28],
  ['mini-rocket','Mini rocket','tabletop',18,30],
  ['plasma-orb','Plasma orb','tabletop',28,30],
  ['trophy','Arcade trophy','tabletop',24,30],
  ['gamepad','Game controller','tabletop',32,20],
  ['headphone-stand','Headphone stand','tabletop',26,32],
  ['boombox','Mini boombox','tabletop',34,24],
  ['stacked-cassettes','Stacked cassettes','tabletop',30,20],
  ['desk-mushroom-lamp','Mushroom desk lamp','tabletop',28,30],
  ['lucky-cat','Lucky cat','tabletop',24,30],
  ['neon-game-over-sign','Game Over neon sign','wall',86,36],
  ['neon-high-score-sign','High Score neon sign','wall',90,38],
  ['neon-space-invader','Pixel alien neon sign','wall',64,44],
  ['neon-lightning-bolt','Lightning bolt neon sign','wall',40,54],
  ['neon-music-note','Music note neon sign','wall',48,54],
  ['wall-vinyl-record','Wall vinyl record','wall',48,48],
  ['neon-rainbow','Neon rainbow','wall',78,44],
  ['neon-controller-sign','Controller neon sign','wall',78,46],
  ['rug-notes-rectangle','Notes shop arcade rug','rug',360,140],
  ['rug-neon-oval','Sunset oval rug','rug',180,90],
  ['rug-pixel-round','Pixel maze round rug','rug',120,100],
  ['rug-checker-square','Neon checker square rug','rug',110,90],
  ['rug-lightning-runner','Lightning runner rug','rug',280,90],
  ['rug-starburst','Arcade starburst rug','rug',130,110],
  ['rug-controller','Game controller rug','rug',160,90],
  ['rug-hex-grid','Synth grid hexagon rug','rug',130,110]
 ];
 const items=Object.freeze(records.map(([id,name,category,width,height])=>Object.freeze({id,name,category,width,height})));
 const categoryNames={floor:'Floor decor',tabletop:'Tabletop',wall:'Wall decor',rug:'Rugs'};
 function mount(api={}){
  const host=api.host;if(!host?.ownerDocument)throw Error('The decor library needs an editor host.');
  const doc=host.ownerDocument,win=doc.defaultView;let selected=null,busy=false,destroyed=false,request=0;
  const baseUrl=String(api.baseUrl||'assets/decor/v1/').replace(/\/?$/,'/');
  const el=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const library=el('details','decor-library');library.dataset.decorLibrary='';
  const summary=el('summary','','Asset library · '+items.length+' decor');summary.dataset.decorLibraryToggle='';library.append(summary);
  library.append(el('p','decor-library-help','Choose decor or a floor rug, then add a copy to your layout. Move, resize, duplicate, replace, or edit its pixels using Objects.'));
  const filters=el('div','decor-library-filters'),category=el('select'),search=el('input');
  category.dataset.decorCategory='';category.setAttribute('aria-label','Decor category');
  for(const [value,label]of [['all','All decor'],...Object.entries(categoryNames)]){const option=el('option','',label);option.value=value;category.append(option);}category.value='all';
  search.type='search';search.placeholder='Search decor';search.dataset.decorSearch='';search.setAttribute('aria-label','Search decor');search.maxLength=80;
  const field=(text,node)=>{const label=el('label','decor-library-field');label.append(doc.createTextNode(text),node);return label;};
  filters.append(field('Category',category),field('Search',search));library.append(filters);
  const count=el('p','decor-library-count'),grid=el('div','decor-library-grid'),empty=el('p','decor-library-empty','No decor matches this search.');
  count.dataset.decorCount='';count.setAttribute('aria-live','polite');grid.dataset.decorGrid='';grid.setAttribute('role','group');grid.setAttribute('aria-label','Decor choices');empty.hidden=true;library.append(count,grid,empty);
  const cards=new Map();
  for(const item of items){
   const card=el('button','decor-library-card');card.type='button';card.dataset.decorItem=item.id;card.setAttribute('aria-label','Select '+item.name);card.setAttribute('aria-pressed','false');
   const picture=el('img');picture.src=baseUrl+item.id+'.png';picture.alt='';picture.loading='lazy';picture.decoding='async';picture.width=80;picture.height=80;
   card.append(picture,el('span','',item.name));card.onclick=()=>select(item.id);cards.set(item.id,card);grid.append(card);
  }
  const preview=el('div','decor-library-preview');preview.hidden=true;preview.dataset.decorPreview='';
  const image=el('img'),description=el('div'),heading=el('strong'),size=el('p');image.alt='';image.width=110;image.height=110;description.append(heading,size);preview.append(image,description);library.append(preview);
  const add=el('button','decor-library-add','Add to layout');add.type='button';add.dataset.decorAdd='';add.disabled=true;library.append(add);
  const status=el('p','decor-library-status','Select an item to preview it.');status.dataset.decorStatus='';status.setAttribute('role','status');status.setAttribute('aria-live','polite');library.append(status);
  host.append(library);
  const editable=()=>!destroyed&&api.canEdit?.()!==false;
  function message(text,error=false){status.textContent=text;status.dataset.error=String(error);}
  function refresh(){
   const allowed=editable();add.disabled=!allowed||busy||!selected;add.textContent=busy?'Adding…':'Add to layout';library.setAttribute('aria-busy',String(busy));
   for(const card of cards.values())card.disabled=!allowed||busy;
   category.disabled=search.disabled=!allowed||busy;
  }
  function select(id){
   const item=items.find(value=>value.id===id);if(!item||!editable()||busy)return false;
   selected=item;for(const [key,card]of cards)card.setAttribute('aria-pressed',String(key===id));
   image.src=baseUrl+id+'.png';image.alt=item.name;heading.textContent=item.name;size.textContent=categoryNames[item.category]+' · fits within '+item.width+' × '+item.height+' pixels';preview.hidden=false;
   message('Ready to add '+item.name+'.');refresh();return true;
  }
  function filter(){
   const query=search.value.trim().toLocaleLowerCase();let visible=0;
   for(const item of items){const matches=(category.value==='all'||category.value===item.category)&&(!query||(item.name+' '+item.id+' '+categoryNames[item.category]).toLocaleLowerCase().includes(query));cards.get(item.id).hidden=!matches;if(matches)visible++;}
   if(selected&&cards.get(selected.id).hidden){cards.get(selected.id).setAttribute('aria-pressed','false');selected=null;preview.hidden=true;message('Select an item to preview it.');}
   count.textContent=visible+' of '+items.length+' decor items';empty.hidden=visible!==0;refresh();
  }
  function load(source){return new Promise((resolve,reject)=>{const picture=new win.Image();let timer;
   const finish=(fn,value)=>{win.clearTimeout(timer);picture.onload=picture.onerror=null;fn(value);};
   picture.onload=()=>finish(resolve,picture);picture.onerror=()=>finish(reject,Error('The decor image could not load. Please try again.'));
   timer=win.setTimeout(()=>finish(reject,Error('The decor image took too long to load. Please try again.')),15000);picture.src=source;
  });}
  async function addSelected(){
   if(!editable()||busy||!selected||typeof api.onAdd!=='function')return false;
   const item=selected,token=++request;busy=true;message('Loading '+item.name+'…');refresh();
   try{
    const picture=await load(baseUrl+item.id+'.png');if(destroyed||token!==request||!editable())return false;
    const width=picture.naturalWidth||picture.width,height=picture.naturalHeight||picture.height;
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192||width*height>16777216)throw Error('The decor image has unsupported dimensions.');
    const canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;context.drawImage(picture,0,0);
    const data=canvas.toDataURL('image/png'),scale=Math.min(item.width/width,item.height/height);
    if(!editable())return false;
    const accepted=await api.onAdd({id:item.id,name:item.name,category:item.category,width:Math.max(2,Math.round(width*scale)),height:Math.max(2,Math.round(height*scale)),data});
    if(destroyed||token!==request)return false;
    if(accepted===false)throw Error('The decor could not be added to this layout.');
    message('Added '+item.name+'. Select the placed copy to change it.');return true;
   }catch(error){if(!destroyed&&token===request)message(error.message||'The decor could not be added.',true);return false;}
   finally{if(!destroyed&&token===request){busy=false;refresh();}}
  }
  category.onchange=filter;search.oninput=filter;add.onclick=addSelected;filter();
  return {refresh,select,addSelected,getState:()=>({selected:selected?.id||null,busy,open:library.open===true,category:category.value,query:search.value,visible:Array.from(cards.values()).filter(card=>!card.hidden).length}),destroy(){if(destroyed)return;destroyed=true;++request;library.remove();}};
 }
 return Object.freeze({items,mount});
});
