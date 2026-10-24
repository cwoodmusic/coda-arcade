/* Draft-only layered wardrobe controls shared by players and editable NPC looks. */
window.createCodaBoutiqueUI=function(api){
  'use strict';
  const DEFAULT_CATALOG={
    hairstyles:[['short','Short'],['bob','Bob'],['long','Long'],['curly','Curly'],['ponytail','Ponytail'],['spiky','Spiky'],['bald','No hair'],['buns','Space buns']],
    outfits:[['pants','Shirt and pants'],['shorts','Shirt and shorts'],['dress','Dress'],['overalls','Overalls'],['suit','Suit'],['coat','Long coat']],
    headwear:[['none','No hat'],['cap','Baseball cap'],['beanie','Beanie'],['bucket','Bucket hat'],['crown','Crown'],['headwrap','Headwrap']],
    eyewear:[['none','No glasses'],['glasses','Everyday glasses'],['sunglasses','Sunglasses'],['partyglasses','Party glasses']],
    accessories:[['none','None'],['bow','Bow'],['headphones','Headphones'],['bowtie','Bow tie'],['starclip','Neon star clip'],['halo','Neon halo'],['pixelheadphones','Pixel headphones']],
    shoes:[['sneakers','Sneakers'],['boots','Boots'],['hightops','High tops'],['neon','Neon trainers'],['gold','Gold shoes']],
    emotes:[['wave','Wave'],['dance','Dance'],['spin','Spin'],['robot','Robot'],['disco','Disco point']]
  };
  const ORIGINAL_LOOK={hairstyle:'short',hair:'#171424',skin:'#e5ad75',outfit:'pants',shirt:'#e94038',lowerColor:'#235cb9',headwear:'cap',eyewear:'none',accessory:'none',shoes:'sneakers',emote:'wave'};
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
  const canEquip=(id,isPlayer)=>id==='none'||!isPlayer||!api.unlocked||!!api.unlocked(id);
  function message(text){if(current?.status)current.status.textContent=text;}
  function field(label,key,type,value,choices,isPlayer){
    const wrapper=document.createElement('label');wrapper.className='formRow boutique-field';wrapper.textContent=label;
    const control=document.createElement(type==='select'?'select':'input');control.id='boutique-'+key;control.setAttribute('aria-label',label);
    if(type==='select'){
      for(const item of choices){const option=document.createElement('option');option.value=item.id;option.textContent=(canEquip(item.id,isPlayer)?'':'🔒 ')+item.label;control.append(option);}
    }else control.type=type;
    control.value=value;wrapper.append(control);body.append(wrapper);return control;
  }
  function color(label,key,value,presets){
    const control=field(label,key,'color',value,null,true);
    const swatches=document.createElement('div');swatches.className='boutique-swatches';swatches.setAttribute('role','group');swatches.setAttribute('aria-label',label+' presets');
    for(const shade of presets){const button=document.createElement('button');button.type='button';button.style.backgroundColor=shade;button.title=shade;button.setAttribute('aria-label',label+' '+shade);button.onclick=()=>{control.value=shade;control.dispatchEvent(new Event('input',{bubbles:true}));};swatches.append(button);}
    control.parentElement.append(swatches);return control;
  }
  function open(id='player'){
    const available=targets();targetId=available.some(item=>item.id===id)?id:available[0].id;
    const target=available.find(item=>item.id===targetId),isPlayer=targetId==='player';
    const source=getProfile(targetId)||{},profile=migrateProfile(source);
    api.openPanel(isPlayer?'Pip · Pixel Boutique':'Boutique · '+target.label);
    body.classList.add('boutique-panel');
    const intro=document.createElement('p');intro.className='muted';intro.textContent=isPlayer?'Build your layered sprite look. Hats, glasses, and accessories can be worn together.':'Customize '+target.label+'’s costume. Their name, musical identity, and behavior stay the same.';body.append(intro);
    const targetControl=field('Customize','target','select',targetId,available.map(item=>({id:item.id,label:item.label})),false);
    targetControl.onchange=()=>open(targetControl.value);
    const name=field('Arcade nickname','name','text',isPlayer?profile.name:(source.name||target.label),null,isPlayer);name.maxLength=18;name.readOnly=!isPlayer;
    const hairstyle=field('Hairstyle','hairstyle','select',profile.hairstyle,catalog('hairstyles'),isPlayer);
    const outfit=field('Outfit','outfit','select',profile.outfit,catalog('outfits'),isPlayer);
    const skin=color('Skin color','skin',profile.skin,['#f4ccb0','#d49a76','#bd825b','#a56b48','#704633','#462c29']);
    const hair=color('Hair color','hair',profile.hair,['#171424','#463145','#713c29','#bb7f43','#e4c183','#ece4d6','#a15ccc','#3d9ba7']);
    const shirt=color('Outfit color','shirt',profile.shirt,['#a7f66f','#69e0ff','#d69cff','#ff9c71','#f472ad','#32486f','#a94655','#e7d6aa']);
    const lowerColor=color('Lower clothing color','lowerColor',profile.lowerColor||'#424258',['#424258','#263347','#5e4a6a','#45688a','#ad793d','#e4ddca','#34313a','#8a4f65']);
    const headwear=field('Hats','headwear','select',profile.headwear||'none',catalog('headwear'),isPlayer);
    const eyewear=field('Glasses','eyewear','select',profile.eyewear||'none',catalog('eyewear'),isPlayer);
    const accessory=field('Accessories','accessory','select',profile.accessory||'none',catalog('accessories'),isPlayer);
    const shoes=field('Shoes','shoes','select',profile.shoes,catalog('shoes'),isPlayer);
    const emote=field('Emote','emote','select',profile.emote,catalog('emotes'),isPlayer);
    const draft=()=>{
      const normalized=api.renderer.normalizeProfile({name:name.value,hairstyle:hairstyle.value,outfit:outfit.value,skin:skin.value,hair:hair.value,shirt:shirt.value,lowerColor:lowerColor.value,headwear:headwear.value,eyewear:eyewear.value,accessory:accessory.value,shoes:shoes.value,emote:emote.value,hat:false});
      return {...normalized,name:isPlayer?normalized.name:(source.name||target.label),hat:false};
    };
    api.getPreviewUI().addPreview(draft);
    const note=document.createElement('p');note.className='muted boutique-note';note.textContent=isPlayer?'Preview as much as you like. Save applies the complete look; closing leaves your saved look unchanged. Locked rewards unlock through arcade achievements.':'NPC costume changes are saved separately from your avatar. All clothing is available for NPC styling.';body.append(note);
    const actions=document.createElement('div');actions.className='boutique-actions';
    if(isPlayer){
      const original=document.createElement('button');original.type='button';original.textContent='Original arcade look';original.id='boutiqueOriginalLook';
      const controls={hairstyle,hair,skin,outfit,shirt,lowerColor,headwear,eyewear,accessory,shoes,emote};
      original.onclick=()=>{for(const [key,value] of Object.entries(ORIGINAL_LOOK))controls[key].value=value;message('');};
      actions.append(original);
    }
    const save=document.createElement('button');save.type='button';save.textContent=isPlayer?'Save my look':'Save NPC look';save.id='boutiqueSave';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.onclick=api.closePanel;
    actions.append(save,cancel);body.append(actions);
    const status=document.createElement('p');status.className='panelMsg';status.setAttribute('role','status');actions.append(status);
    current={targetId,source,draft,status};
    save.onclick=()=>{
      const next=draft();
      if([next.headwear,next.eyewear,next.accessory].some(item=>!canEquip(item,isPlayer))){message('That item is still locked. Choose an unlocked item before saving.');return;}
      try{const result=api.applyProfile?api.applyProfile(targetId,next):api.applyAvatar(next);if(result!==false)api.closePanel();else if(!status.textContent)message('The look could not be saved. Your draft is still here.');}
      catch(error){message('The look could not be saved. '+(error?.message||'Please try again.'));}
    };
    return {targetId,draft};
  }
  return {open,getDraft:()=>current?.draft()||null,getTarget:()=>current?.targetId||targetId,migrateProfile};
};
