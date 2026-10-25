/* Shared player defaults and draft-only wardrobe controls. */
window.CodaAvatarDefaults=(()=>{
  const plain=Object.freeze({form:'human',pet:'none',hairstyle:'bald',hair:'#171424',skin:'#e5ad75',outfit:'pants',shirt:'#999ca6',lowerColor:'#626875',headwear:'none',eyewear:'none',accessory:'none',shoes:'sneakers',emote:'wave'});
  const classic=Object.freeze({...plain,hairstyle:'short',shirt:'#e94038',lowerColor:'#235cb9',headwear:'cap'});
  const matches=(profile,look)=>Object.entries(look).every(([key,value])=>profile[key]===undefined||(typeof value==='string'&&value.startsWith('#')?typeof profile[key]==='string'&&profile[key].toLowerCase()===value:profile[key]===value));
  function migrate(raw){
    const profile=raw&&typeof raw==='object'&&!Array.isArray(raw)?{...raw}:{};
    // An explicit customized look is never a default, even when it happens to
    // match the old preset. Old single-slot caps are deliberate equipment too.
    const oldSystemCap=profile.customized===false&&profile.headwear==='cap'&&matches(profile,classic);
    const oldGuest=profile.customized!==true&&profile.headwear===undefined&&
      profile.hairstyle==='short'&&profile.outfit==='pants'&&
      profile.skin==='#d49a76'&&profile.hair==='#463145'&&profile.shirt==='#a7f66f'&&
      matches(profile,{lowerColor:'#424258',accessory:'none',eyewear:'none',shoes:'sneakers',emote:'wave'});
    if(oldSystemCap||oldGuest)return {...profile,...plain,hat:false};
    // Preserve explicit legacy equipment when a partial cloud profile is
    // merged into a local profile that already has modern empty slots.
    if(profile.headwear===undefined&&profile.accessory==='cap')profile.headwear='cap';
    if(profile.eyewear===undefined&&['glasses','sunglasses','partyglasses'].includes(profile.accessory))profile.eyewear=profile.accessory;
    return profile;
  }
  return Object.freeze({plain,classic,migrate});
})();
window.createCodaBoutiqueUI=function(api){
  'use strict';
  const DEFAULT_CATALOG={
    forms:[['human','Human form'],['alien','Alien transformation'],['starlight','Starlight transformation']],pets:[['none','No companion'],['cosmiccat','Cosmic cat companion'],['neondragon','Neon dragon companion'],['lakeotter','Lake otter companion'],['rhythmfox','Rhythm fox companion'],['pianophoenix','Piano phoenix companion']],
    hairstyles:[['short','Short'],['bob','Bob'],['long','Long'],['curly','Curly'],['ponytail','Ponytail'],['spiky','Spiky'],['bald','No hair'],['buns','Space buns']],
    outfits:[['pants','Shirt and pants'],['shorts','Shirt and shorts'],['dress','Dress'],['overalls','Overalls'],['suit','Suit'],['coat','Long coat']],
    headwear:[['none','No hat'],['cap','Baseball cap'],['beanie','Beanie'],['bucket','Bucket hat'],['crown','Crown'],['headwrap','Headwrap']],
    eyewear:[['none','No glasses'],['glasses','Everyday glasses'],['sunglasses','Sunglasses'],['partyglasses','Party glasses']],
    accessories:[['none','None'],['bow','Bow'],['headphones','Headphones'],['bowtie','Bow tie'],['starclip','Neon star clip'],['halo','Neon halo'],['pixelheadphones','Pixel headphones']],
    shoes:[['sneakers','Sneakers'],['boots','Boots'],['hightops','High tops'],['neon','Neon trainers'],['gold','Gold shoes']],
    emotes:[['wave','Wave'],['dance','Dance'],['spin','Spin'],['robot','Robot'],['disco','Disco point']]
  };
  let targetId='player',current=null;
  const body=api.panelBody;
  const has=(object,key)=>Object.prototype.hasOwnProperty.call(object,key)&&typeof object[key]==='string';
  const catalog=name=>{
    const custom=api.renderer.catalog?.[name];
    const values=Array.isArray(custom)&&custom.length?custom:DEFAULT_CATALOG[name].map(([id,label])=>({id,label}));
    return values.filter(item=>item&&typeof item.id==='string'&&typeof item.label==='string');
  };
  function targets(){
    const entries=api.getTargets?.();
    return Array.isArray(entries)&&entries.length?entries:[{id:'player',label:'Your avatar'}];
  }
  const getProfile=id=>api.getProfile?api.getProfile(id):api.getAvatar();
  function migrateProfile(raw){
    const profile={...(raw||{})},old=profile.accessory;
    // Explicit modern slots always win. Older saves used a single accessory slot.
    if(!has(profile,'headwear')&&old!=='none'&&catalog('headwear').some(item=>item.id===old)){profile.headwear=old;profile.accessory='none';}
    if(!has(profile,'eyewear')&&old!=='none'&&catalog('eyewear').some(item=>item.id===old)){profile.eyewear=old;profile.accessory='none';}
    return api.renderer.normalizeProfile(profile);
  }
  const canEquip=(id,isPlayer)=>id==='human'||id==='none'||!isPlayer||!api.unlocked||!!api.unlocked(id);
  const lockedReason=id=>{
    const reason=api.lockedReason?.(id);
    return typeof reason==='string'&&reason.trim()?reason.trim():'Locked reward';
  };
  const browseGroups=[
    {key:'headwear',catalog:'headwear',label:'Hats'},
    {key:'eyewear',catalog:'eyewear',label:'Glasses'},
    {key:'accessory',catalog:'accessories',label:'Accessories'},
    {key:'shoes',catalog:'shoes',label:'Shoes'},
    {key:'emote',catalog:'emotes',label:'Emotes'},
    {key:'outfit',catalog:'outfits',label:'Outfits'},
    {key:'hairstyle',catalog:'hairstyles',label:'Hair'},
    {key:'form',catalog:'forms',label:'Transformations'},
    {key:'pet',catalog:'pets',label:'Pets'}
  ];
  function message(text){if(current?.status)current.status.textContent=text;}
  function field(label,key,type,value,choices,isPlayer){
    const wrapper=document.createElement('label');wrapper.className='formRow boutique-field';wrapper.textContent=label;
    const control=document.createElement(type==='select'?'select':'input');control.id='boutique-'+key;control.setAttribute('aria-label',label);
    if(type==='select'){
      for(const item of choices){
        const option=document.createElement('option'),locked=!canEquip(item.id,isPlayer);option.value=item.id;
        option.textContent=(locked?'🔒 ':'')+item.label+(locked&&api.lockedReason?' · '+lockedReason(item.id):'');
        if(locked)option.title=lockedReason(item.id);control.append(option);
      }
    }else control.type=type;
    control.value=value;wrapper.append(control);body.append(wrapper);return control;
  }
  function color(label,key,value,presets){
    const control=field(label,key,'color',value,null,true);
    const swatches=document.createElement('div');swatches.className='boutique-swatches';swatches.setAttribute('role','group');swatches.setAttribute('aria-label',label+' presets');
    for(const shade of presets){const button=document.createElement('button');button.type='button';button.style.backgroundColor=shade;button.title=shade;button.setAttribute('aria-label',label+' '+shade);button.onclick=()=>{control.value=shade;control.dispatchEvent(new Event('input',{bubbles:true}));};swatches.append(button);}
    control.parentElement.append(swatches);return control;
  }
  function wardrobeBrowser(controls,draft,isPlayer){
    const section=document.createElement('section');section.className='boutique-catalog';section.setAttribute('aria-label','Wardrobe collection');
    const title=document.createElement('h3');title.textContent='Find your next look';
    const intro=document.createElement('p');intro.className='muted';intro.textContent='Pick a category, search, and try an item. Save when you like the complete look.';
    const categories=document.createElement('div');categories.className='boutique-categories';categories.setAttribute('role','group');categories.setAttribute('aria-label','Browse wardrobe categories');
    const searchLabel=document.createElement('label');searchLabel.className='formRow';searchLabel.textContent='Search wardrobe';
    const search=document.createElement('input');search.type='search';search.id='boutiqueSearch';search.setAttribute('aria-label','Search wardrobe');searchLabel.append(search);
    const count=document.createElement('p');count.className='boutique-catalog-count';count.setAttribute('role','status');
    const results=document.createElement('div');results.className='boutique-catalog-results';results.setAttribute('aria-label','Wardrobe items');
    let group=browseGroups[0];const groupButtons=[];
    const previewEmote=()=>{
      const mode=document.getElementById?.('avatarPreviewMode');
      if(mode){mode.value='emote';mode.dispatchEvent(new Event('change',{bubbles:true}));}
    };
    function render(){
      const query=search.value.trim().toLocaleLowerCase(),all=catalog(group.catalog);
      const matches=all.filter(item=>(item.label+' '+item.id).toLocaleLowerCase().includes(query));
      search.placeholder='Search '+group.label.toLowerCase();
      for(const entry of groupButtons)entry.button.setAttribute('aria-pressed',String(entry.group===group));
      count.textContent=matches.length+' of '+all.length+' '+group.label.toLowerCase()+(matches.length?' · click to preview':' · try another search');
      results.replaceChildren();
      for(const item of matches){
        const button=document.createElement('button');button.type='button';button.className='boutique-item';
        button.setAttribute('data-item-id',item.id);
        button.setAttribute('aria-label','Try '+item.label+(canEquip(item.id,isPlayer)?'':' ('+lockedReason(item.id).toLocaleLowerCase()+')'));button.setAttribute('aria-pressed',String(controls[group.key].value===item.id));
        if(typeof api.renderer.drawPlayer==='function'){
          const canvas=document.createElement('canvas');canvas.width=72;canvas.height=80;canvas.setAttribute('aria-hidden','true');
          const appearance={...draft(),[group.key]:item.id},ctx=canvas.getContext('2d');
          api.renderer.drawPlayer(ctx,appearance,{x:36,y:74,scale:1,facing:'down',walking:false,
            emote:group.key==='emote'?item.id:null,emoteTime:.45,previewPet:true},.45);
          button.append(canvas);
        }
        const name=document.createElement('span');name.textContent=item.label;button.append(name);
        if(!canEquip(item.id,isPlayer)){
          const locked=document.createElement('small');locked.textContent=lockedReason(item.id);button.append(locked);
        }
        button.onclick=()=>{
          controls[group.key].value=item.id;if(group.key==='emote')previewEmote();render();
          message(canEquip(item.id,isPlayer)?'':lockedReason(item.id));
          results.querySelector?.('[data-item-id="'+item.id+'"]')?.focus?.({preventScroll:true});
        };
        results.append(button);
      }
    }
    for(const candidate of browseGroups){
      const button=document.createElement('button');button.type='button';button.textContent=candidate.label;
      button.setAttribute('aria-label','Browse '+candidate.label);button.onclick=()=>{group=candidate;search.value='';render();};
      categories.append(button);groupButtons.push({group:candidate,button});
    }
    for(const [key,control]of Object.entries(controls)){
      const previous=control.onchange;
      control.onchange=event=>{previous?.(event);if(key==='emote')previewEmote();render();};
    }
    search.oninput=render;
    section.append(title,intro,categories,searchLabel,count,results);render();
    return {section,refresh:render};
  }
  function open(id='player'){
    const available=targets();targetId=available.some(item=>item.id===id)?id:available[0].id;
    const target=available.find(item=>item.id===targetId),isPlayer=targetId==='player';
    const source=getProfile(targetId)||{},profile=migrateProfile(isPlayer?window.CodaAvatarDefaults.migrate(source):source);
    api.openPanel(isPlayer?'Pip · Pixel Boutique':'Boutique · '+target.label);
    body.classList.add('boutique-panel');
    const intro=document.createElement('p');intro.className='muted';intro.textContent=isPlayer?
      (api.openShop?'Mix hats, glasses, accessories, shoes, and moves into your own look. Try any style here; buy shop items with Notes before saving. Achievement rewards are marked.':'Mix hats, glasses, accessories, shoes, and moves into your own look. Everyday and fantasy styles are available to guests; achievement rewards are marked.'):
      'Customize '+target.label+'’s costume. Their name, musical identity, and behavior stay the same.';body.append(intro);
    if(isPlayer&&typeof api.openShop==='function'){
      const shop=document.createElement('button');shop.type='button';shop.id='boutiqueOpenShop';shop.textContent='♫ Shop with Notes';
      shop.setAttribute('aria-label','Shop accessories with Notes');shop.onclick=()=>api.openShop();body.append(shop);
    }
    const targetControl=field('Customize','target','select',targetId,available.map(item=>({id:item.id,label:item.label})),false);
    targetControl.onchange=()=>open(targetControl.value);
    const name=field('Arcade nickname','name','text',isPlayer?profile.name:(source.name||target.label),null,isPlayer);name.maxLength=18;name.readOnly=!isPlayer;
    const form=field('Transformation','form','select',profile.form||'human',catalog('forms'),isPlayer);
    const pet=field('Companion','pet','select',profile.pet||'none',catalog('pets'),isPlayer);
    const hairstyle=field('Hairstyle','hairstyle','select',profile.hairstyle,catalog('hairstyles'),isPlayer);
    const outfit=field('Outfit','outfit','select',profile.outfit,catalog('outfits'),isPlayer);
    const skin=color('Skin color','skin',profile.skin,['#f4ccb0','#d49a76','#bd825b','#a56b48','#704633','#462c29']);
    const hair=color('Hair color','hair',profile.hair,['#171424','#463145','#713c29','#bb7f43','#e4c183','#ece4d6','#a15ccc','#3d9ba7']);
    const shirt=color('Outfit color','shirt',profile.shirt,['#a7f66f','#69e0ff','#d69cff','#ff9c71','#f472ad','#32486f','#a94655','#e7d6aa']);
    const lowerColor=color('Lower clothing color','lowerColor',profile.lowerColor||'#424258',['#424258','#263347','#5e4a6a','#45688a','#ad793d','#e4ddca','#34313a','#8a4f65']);
    const headwear=field('Hats','headwear','select',profile.headwear||'none',catalog('headwear'),isPlayer);
    const headwearColor=color('Hat color','headwearColor',profile.headwearColor||'#db687f',['#34254c','#3862a0','#b04666','#72b7ad','#e9bf63','#191e2b','#ece4d6','#a46cd1']);
    const eyewear=field('Glasses','eyewear','select',profile.eyewear||'none',catalog('eyewear'),isPlayer);
    const eyewearColor=color('Glasses color','eyewearColor',profile.eyewearColor||'#30374b',['#30374b','#dd6cab','#e9bf63','#65c9df','#ece4d6','#a973cb']);
    const accessory=field('Accessories','accessory','select',profile.accessory||'none',catalog('accessories'),isPlayer);
    const shoes=field('Shoes','shoes','select',profile.shoes,catalog('shoes'),isPlayer);
    const emote=field('Emote','emote','select',profile.emote,catalog('emotes'),isPlayer);
    const draft=()=>{
      const normalized=api.renderer.normalizeProfile({form:form.value,pet:pet.value,name:name.value,hairstyle:hairstyle.value,outfit:outfit.value,skin:skin.value,hair:hair.value,shirt:shirt.value,lowerColor:lowerColor.value,headwear:headwear.value,headwearColor:headwearColor.value,eyewear:eyewear.value,eyewearColor:eyewearColor.value,accessory:accessory.value,shoes:shoes.value,emote:emote.value,hat:false});
      return {...normalized,name:isPlayer?normalized.name:(source.name||target.label),hat:false,
        ...(!isPlayer?{characterId:targetId}:{})};
    };
    const controls={form,pet,hairstyle,hair,skin,outfit,shirt,lowerColor,headwear,headwearColor,eyewear,eyewearColor,accessory,shoes,emote};
    const browser=wardrobeBrowser(controls,draft,isPlayer);body.insertBefore(browser.section,hairstyle.parentElement);
    api.getPreviewUI().addPreview(draft);
    const livePreview=body.querySelector?.('.avatar-live-preview');
    if(livePreview){body.insertBefore(targetControl.parentElement,livePreview);livePreview.after(browser.section);browser.section.after(name.parentElement);}
    const note=document.createElement('p');note.className='muted boutique-note';note.textContent=isPlayer?
      'Preview as much as you like. Save applies the complete look; closing leaves your saved look unchanged. '+(api.openShop?'Buy marked shop items with Notes. Other rewards unlock through arcade achievements.':'Locked rewards unlock through arcade achievements.'):
      'NPC costume changes are saved separately from your avatar. All clothing is available for NPC styling.';body.append(note);
    const actions=document.createElement('div');actions.className='boutique-actions';
    if(isPlayer){
      for(const [text,id,look]of [['Plain base avatar','boutiqueBaseLook',window.CodaAvatarDefaults.plain],['Classic cap look','boutiqueOriginalLook',window.CodaAvatarDefaults.classic]]){
        const preset=document.createElement('button');preset.type='button';preset.textContent=text;preset.id=id;
        preset.onclick=()=>{for(const [key,value]of Object.entries(look))controls[key].value=value;browser.refresh();message('');};
        actions.append(preset);
      }
    }
    const save=document.createElement('button');save.type='button';save.textContent=isPlayer?'Save my look':'Save NPC look';save.id='boutiqueSave';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.onclick=api.closePanel;
    actions.append(save,cancel);body.append(actions);
    const status=document.createElement('p');status.className='panelMsg';status.setAttribute('role','status');actions.append(status);
    current={targetId,source,draft,status};
    save.onclick=()=>{
      const next=draft();
      const locked=[next.form,next.pet,next.hairstyle,next.outfit,next.headwear,next.eyewear,next.accessory,next.shoes,next.emote].filter(item=>!canEquip(item,isPlayer));
      if(locked.length){
        message(api.lockedReason?'That item is still locked. '+[...new Set(locked.map(lockedReason))].join(' · ')+'. Choose an owned or unlocked item before saving.':'That item is still locked. Choose an unlocked item before saving.');return;
      }
      try{const result=api.applyProfile?api.applyProfile(targetId,next):api.applyAvatar(next);if(result!==false)api.closePanel();else if(!status.textContent)message('The look could not be saved. Your draft is still here.');}
      catch(error){message('The look could not be saved. '+(error?.message||'Please try again.'));}
    };
    return {targetId,draft};
  }
  return {open,getDraft:()=>current?.draft()||null,getTarget:()=>current?.targetId||targetId,migrateProfile};
};
