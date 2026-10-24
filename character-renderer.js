/* Original raster artwork, shared joints, and independent cosmetics. */
window.createCodaCharacterRenderer=function(api){
  'use strict';
  api=api||{};
  const animation=window.CodaSpriteAnimation;
  if(!animation)throw Error('Load sprite-animation.js before character-renderer.js.');
  const HAIR=['short','bob','long','curly','ponytail','spiky','bald','buns'];
  const OUTFITS=['pants','shorts','dress','overalls','suit','coat'];
  const HEADWEAR=['none','cap','beanie','bucket','crown','headwrap'];
  const EYEWEAR=['none','glasses','sunglasses','partyglasses'];
  const ACCESSORIES=['none','bow','headphones','bowtie','starclip','halo','earrings','pixelheadphones','trumpet','microphone'];
  const SHOES=['sneakers','boots','hightops','neon','gold'];
  const EMOTES=['wave','dance','spin','robot','disco'];
  const DEFAULTS={name:'Guest',skin:'#e5ad75',hair:'#171424',shirt:'#999ca6',lowerColor:'#626875',hairstyle:'bald',outfit:'pants',headwear:'none',eyewear:'none',accessory:'none',shoes:'sneakers',emote:'wave',headwearColor:'#db687f',eyewearColor:'#30374b'};
  const CLASSIC_LOOK={...DEFAULTS,shirt:'#e94038',lowerColor:'#235cb9',hairstyle:'short',headwear:'cap'};
  const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
  const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
  const choose=(value,choices,fallback)=>choices.includes(value)?value:fallback;
  const color=(value,fallback)=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():fallback;
  const reduced=()=>typeof api.reducedMotion==='function'&&!!api.reducedMotion();
  function normalizeProfile(raw){
    const p=raw&&typeof raw==='object'?raw:{};
    const headwear=own(p,'headwear')?choose(p.headwear,HEADWEAR,'none'):p.accessory==='cap'?'cap':p.customized===true?'none':DEFAULTS.headwear;
    const eyewear=own(p,'eyewear')?choose(p.eyewear,EYEWEAR,'none'):choose(p.accessory,EYEWEAR,'none');
    let accessory=choose(p.accessory,ACCESSORIES,'none');
    return {name:typeof p.name==='string'?p.name.trim().slice(0,18)||DEFAULTS.name:DEFAULTS.name,
      skin:color(p.skin,DEFAULTS.skin),hair:color(p.hair,DEFAULTS.hair),shirt:color(p.shirt,DEFAULTS.shirt),lowerColor:color(p.lowerColor,DEFAULTS.lowerColor),headwearColor:color(p.headwearColor,DEFAULTS.headwearColor),eyewearColor:color(p.eyewearColor,DEFAULTS.eyewearColor),
      hairstyle:choose(p.hairstyle,HAIR,DEFAULTS.hairstyle),outfit:choose(p.outfit,OUTFITS,DEFAULTS.outfit),headwear,eyewear,accessory,shoes:choose(p.shoes,SHOES,DEFAULTS.shoes),emote:choose(p.emote,EMOTES,DEFAULTS.emote)};
  }
  const historical={
    bach:{name:'J. S. Bach',skin:'#e5b88f',hair:'#e6dfd2',shirt:'#283a52',lowerColor:'#33384c',hairstyle:'curly',outfit:'coat',shoes:'boots'},
    mozart:{name:'Mozart',skin:'#efc2a0',hair:'#ece4d6',shirt:'#a94655',lowerColor:'#e0d3b8',hairstyle:'curly',outfit:'coat',shoes:'boots'},
    beethoven:{name:'Beethoven',skin:'#d7aa87',hair:'#7f7d80',shirt:'#393d4d',lowerColor:'#353448',hairstyle:'spiky',outfit:'coat',shoes:'boots'},
    clara:{name:'Clara Schumann',skin:'#edc3a6',hair:'#493331',shirt:'#596687',hairstyle:'buns',outfit:'dress',shoes:'boots'},
    joplin:{name:'Scott Joplin',skin:'#9e6749',hair:'#241d27',shirt:'#74637c',lowerColor:'#423d52',hairstyle:'short',outfit:'suit',shoes:'boots'},
    ellington:{name:'Duke Ellington',skin:'#875c44',hair:'#28222b',shirt:'#355879',lowerColor:'#333a51',hairstyle:'short',outfit:'suit',shoes:'boots',accessory:'bowtie'},
    ella:{name:'Ella Fitzgerald',skin:'#986144',hair:'#342333',shirt:'#885693',hairstyle:'curly',outfit:'dress',shoes:'gold',accessory:'microphone',instrument:'microphone'},
    nina:{name:'Nina Simone',skin:'#754a35',hair:'#221c26',shirt:'#ad793d',hairstyle:'bald',outfit:'dress',shoes:'gold',headwear:'headwrap',headwearColor:'#3c7b87'},
    miles:{name:'Miles Davis',skin:'#875b40',hair:'#211e28',shirt:'#2a3e5a',lowerColor:'#293343',hairstyle:'short',outfit:'suit',shoes:'boots',eyewear:'sunglasses',accessory:'trumpet',instrument:'trumpet'}
  };
  const appearances=Object.fromEntries(Object.entries(historical).map(([id,p])=>[id,Object.freeze({...normalizeProfile({headwear:'none',...p}),id,...(p.instrument?{instrument:p.instrument}:{})})]));
  const aliases={'j. s. bach':'bach','johann sebastian bach':'bach','wolfgang amadeus mozart':'mozart','ludwig van beethoven':'beethoven','clara schumann':'clara','scott joplin':'joplin','duke ellington':'ellington','ella fitzgerald':'ella','nina simone':'nina','miles davis':'miles'};
  const fallback=Object.freeze({...normalizeProfile({}),id:'guest'});
  function appearanceFor(id){const key=String(id||'').toLowerCase();return appearances[aliases[key]||key]||fallback;}
  const labels={none:'None',short:'Short',bob:'Bob',long:'Long',curly:'Curly',ponytail:'Ponytail',spiky:'Spiky',bald:'No hair',buns:'Space buns',pants:'Shirt and pants',shorts:'Shirt and shorts',dress:'Dress',overalls:'Overalls',suit:'Suit',coat:'Long coat',cap:'Baseball cap',beanie:'Beanie',bucket:'Bucket hat',crown:'Crown',headwrap:'Headwrap',glasses:'Everyday glasses',sunglasses:'Sunglasses',partyglasses:'Party glasses',bow:'Bow',headphones:'Headphones',bowtie:'Bow tie',starclip:'Neon star clip',halo:'Neon halo',earrings:'Earrings',pixelheadphones:'Pixel headphones',trumpet:'Trumpet',microphone:'Microphone',sneakers:'Sneakers',boots:'Boots',hightops:'High tops',neon:'Neon trainers',gold:'Gold shoes',wave:'Wave',dance:'Dance',spin:'Spin',robot:'Robot',disco:'Disco point'};
  const choices=ids=>Object.freeze(ids.map(id=>Object.freeze({id,label:labels[id]})));
  const catalog=Object.freeze({hairstyles:choices(HAIR),outfits:choices(OUTFITS),headwear:choices(HEADWEAR),eyewear:choices(EYEWEAR),accessories:choices(ACCESSORIES),shoes:choices(SHOES),emotes:choices(EMOTES)});
  let manifest=null,loaded=false,loadError=null,originalHero=null;
  const entries=new Map(),imagePromises=new Map(),tinted=new Map(),rigged=new Map();
  const cacheLimit=Math.max(32,Math.min(1024,Math.round(finite(api.cacheLimit,256))));
  const worldScale=Math.max(.125,Math.min(4,finite(api.worldScale,1)));
  const locationURL=()=>window.location?.href||'http://localhost/';
  const url=(value,base)=>new URL(value,base).href;
  const artVersion=api.artVersion===false?'':typeof api.artVersion==='string'?api.artVersion:'plain-base-20';
  function artURL(value,base){
    const resolved=new URL(value,base);
    // A new art revision refreshes the manifest and every raster layer together.
    // Preserve caller-supplied versions and leave data/blob sources unchanged.
    if(artVersion&&['http:','https:'].includes(resolved.protocol)&&!resolved.searchParams.has('v'))resolved.searchParams.set('v',artVersion);
    return resolved.href;
  }
  const baseURL=()=>url(api.basePath?(api.basePath.endsWith('/')?api.basePath:api.basePath+'/'):'assets/characters/',locationURL());
  async function image(source){
    if(!imagePromises.has(source))imagePromises.set(source,api.loadImage?Promise.resolve(api.loadImage(source)):new Promise((resolve,reject)=>{const value=new Image();value.onload=()=>resolve(value);value.onerror=()=>reject(Error('Could not load sprite asset: '+source));value.src=source;}));
    return imagePromises.get(source);
  }
  function validateManifest(data){
    if(!data||data.version!==1||!Array.isArray(data.cell)||data.cell.length!==2||!data.cell.every(n=>Number.isInteger(n)&&n>0&&n<=512)||!Array.isArray(data.anchor)||data.anchor.length!==2||!data.anchor.every(Number.isFinite)||!Number.isInteger(data.columns)||data.columns<1||data.framesPerDirection!==28||!data.layers?.body?.url)throw Error('Invalid character sprite manifest.');
    for(const [name,clip]of Object.entries(animation.clips))if(data.clips?.[name]?.offset!==clip.offset||data.clips[name].frames!==clip.frames)throw Error('Sprite clip layout mismatch: '+name);
    for(const [category,variant]of [['hair','short'],['outfit','pants'],['shoes','sneakers']]){
      const layer=data.layers[category],options=layer?.variants||layer;
      if(!layer?.url&&!options?.[variant]?.url&&!options?.default?.url)throw Error('Missing default sprite layer: '+category+'/'+variant);
    }
  }
  async function load(){
    let base=baseURL(),data=api.manifest;
    if(!data){
      const source=api.manifestUrl?artURL(api.manifestUrl,locationURL()):artURL('manifest.json',base),fetcher=api.fetch||(typeof fetch==='function'?fetch:null);
      if(!fetcher)throw Error('Sprite loading requires fetch.');
      const response=await fetcher(source);if(!response.ok)throw Error('Sprite manifest request failed: '+response.status);
      data=await response.json();base=url('.',source);
    }
    validateManifest(data);manifest=data;
    const descriptors=[];
    for(const [category,definition]of Object.entries(data.layers)){
      if(definition?.url)descriptors.push([category+'/default',definition]);
      else for(const [variant,descriptor]of Object.entries(definition?.variants||definition||{}))if(descriptor?.url)descriptors.push([category+'/'+variant,descriptor]);
    }
    await Promise.all(descriptors.map(async([key,descriptor])=>{
      const layout=descriptor.layout||'directional';if(!['animated','directional'].includes(layout))throw Error('Invalid sprite layer layout: '+key);
      const source=artURL(descriptor.url,base),bitmap=await image(source),columns=descriptor.columns||(layout==='animated'?data.columns:4),count=layout==='animated'?112:4;
      const width=bitmap.naturalWidth||bitmap.width,height=bitmap.naturalHeight||bitmap.height;
      if(!Number.isInteger(columns)||columns<1||width<columns*data.cell[0]||height<Math.ceil(count/columns)*data.cell[1])throw Error('Sprite sheet is too small for '+key);
      const entry={...descriptor,key,layout,columns,image:bitmap};
      if(descriptor.backUrl)entry.back={...entry,key:key+'/back',image:await image(artURL(descriptor.backUrl,base))};
      entries.set(key,entry);
    }));
    if(!data.baseAvatar&&data.originalHero?.url&&data.originalHero.frames){
      originalHero={...data.originalHero,image:await image(artURL(data.originalHero.url,base))};
    }
    loaded=true;
    if(data.motionRig?.version===1&&animation.rigPose&&api.prewarm!==false){
      for(const profile of [normalizeProfile({}),...Object.values(appearances)])for(let direction=0;direction<4;direction++)buildRig(profile,direction);
    }
    return data;
  }
  const ready=load().catch(error=>{loadError=error;throw error;});
  ready.catch(()=>{});
  function entry(category,variant){
    if(category==='body')return entries.get('body/default');
    if(variant==='none'||category==='hair'&&variant==='bald')return null;
    return entries.get(category+'/'+variant)||entries.get(category+'/default')||null;
  }
  const hsv=(r,g,b)=>{
    r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
    let h=delta?max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4:0;
    return {h:(h*60+360)%360,s:max?delta/max:0,v:max};
  };
  function rgb(h,s,v){
    const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
    const values=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
    return values.map(n=>Math.round(Math.max(0,Math.min(1,n+m))*255));
  }
  const paletteCache=new Map();
  function target(hex){if(!paletteCache.has(hex)){if(paletteCache.size>=128)paletteCache.delete(paletteCache.keys().next().value);paletteCache.set(hex,hsv(...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))));}return paletteCache.get(hex);}
  function tintKey(layer,p){
    const material=layer.material;
    if(material==='skin')return p.skin;
    if(material==='hair')return p.hair;
    if(material==='clothes'||material==='original-clothes'||material==='gray-clothes')return p.shirt+':'+p.lowerColor+':'+p.skin;
    if(material==='headwear')return p.headwearColor;
    if(material==='eyewear')return p.eyewearColor;
    if(material==='shoes')return {sneakers:'#e8e4ef',boots:'#765342',hightops:'#c4789c',neon:'#78d9c4',gold:'#e2bc60'}[p.shoes];
    return '';
  }
  function createCanvas(w,h){
    if(api.createCanvas)return api.createCanvas(w,h);
    if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(w,h);
    const value=document.createElement('canvas');value.width=w;value.height=h;return value;
  }
  function tintPixels(data,material,p,dyeRegions){
    for(let i=0;i<data.length;i+=4){
      if(!data[i+3])continue;
      const source=hsv(data[i],data[i+1],data[i+2]);
      if(material==='gray-clothes'){
        if(source.v<.15)continue;
        const row=Math.floor(i/4/manifest.cell[0]),key=row>=dyeRegions?.waist?'lowerColor':'shirt';
        if(p[key]===DEFAULTS[key])continue;
        const destination=target(p[key]),neutral=target(DEFAULTS[key]);
        const result=rgb(destination.h,destination.s,Math.min(1,source.v*destination.v/neutral.v));
        data[i]=result[0];data[i+1]=result[1];data[i+2]=result[2];continue;
      }
      if(source.v<.15||source.s<.12)continue;
      let hex=null,base=.75;
      if(material==='skin'&&source.h>=5&&source.h<=58){if((manifest?.artStyle==='original-atlas'||manifest?.baseAvatar)&&p.skin===DEFAULTS.skin)continue;hex=p.skin;base=.8;}
      else if(material==='hair'){hex=p.hair;base=(manifest?.artStyle==='original-atlas'||manifest?.baseAvatar) ? .95 : .53;}
      else if(material==='clothes'){
        if(source.h>=275&&source.h<=335){hex=p.shirt;base=.8;}
        else if(source.h>=185&&source.h<=265){hex=p.lowerColor;base=.68;}
        else if(source.h>=85&&source.h<=145){hex=p.skin;base=.9;}
      }else if(material==='original-clothes'){
        if((source.h<=18||source.h>=330)&&p.shirt!==DEFAULTS.shirt){hex=p.shirt;base=.95;}
        else if(source.h>=185&&source.h<=265&&p.lowerColor!==DEFAULTS.lowerColor){hex=p.lowerColor;base=.95;}
      }else if(material==='headwear'){hex=p.headwearColor;base=.8;}
      else if(material==='eyewear'){hex=p.eyewearColor;base=.65;}
      else if(material==='shoes'){hex=tintKey({material:'shoes'},p);base=.72;}
      if(!hex)continue;
      const destination=target(hex),value=Math.max(.02,Math.min(1,Math.max(.12,destination.v)*source.v/base));
      const result=rgb(destination.h,destination.s,value);data[i]=result[0];data[i+1]=result[1];data[i+2]=result[2];
    }
  }
  function sprite(layer,pose,p){
    const index=layer.layout==='animated'?pose.index:pose.directionIndex,[w,h]=manifest.cell;
    const sx=(index%layer.columns)*w,sy=Math.floor(index/layer.columns)*h,key=tintKey(layer,p);
    if(!key)return {source:layer.image,sx,sy};
    const cacheKey=layer.key+':'+index+':'+key;
    if(tinted.has(cacheKey)){const cached=tinted.get(cacheKey);tinted.delete(cacheKey);tinted.set(cacheKey,cached);return {source:cached,sx:0,sy:0};}
    const canvas=createCanvas(w,h),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
    ctx.drawImage(layer.image,sx,sy,w,h,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h);tintPixels(pixels.data,layer.material,p,layer.dyeRegions?.[pose.directionIndex]);ctx.putImageData(pixels,0,0);
    if(tinted.size>=cacheLimit)tinted.delete(tinted.keys().next().value);tinted.set(cacheKey,canvas);
    return {source:canvas,sx:0,sy:0};
  }
  function offset(layer,category,variant,pose){
    if(layer.layout==='animated')return [0,0];
    const frame=manifest.frameData?.[pose.index]||{};
    const bone=layer.bone||(category==='hair'||category==='headwear'||category==='eyewear'||category==='accessory'&&['bow','headphones','starclip','halo','earrings','pixelheadphones'].includes(variant)?'head':category==='accessory'&&['trumpet','microphone'].includes(variant)?'hand':'body');
    return [finite(frame[bone+'X']),finite(frame[bone+'Y']),finite(frame[bone+'ScaleX'],1),finite(frame[bone+'ScaleY'],1)];
  }
  function originalLook(p){return ['skin','hair','shirt','lowerColor','hairstyle','outfit','headwear','eyewear','accessory','shoes'].every(key=>p[key]===CLASSIC_LOOK[key]);}
  function buildRig(p,direction){
    const key=JSON.stringify([direction,p.skin,p.hair,p.shirt,p.lowerColor,p.hairstyle,p.outfit,p.headwear,p.eyewear,p.accessory,p.shoes,p.headwearColor,p.eyewearColor]);
    if(rigged.has(key)){const cached=rigged.get(key);rigged.delete(key);rigged.set(key,cached);return cached;}
    const [w,h]=manifest.cell,definition=manifest.baseAvatar?.rig?.[direction]||animation.rigDefinition(animation.directions[direction]),pose={index:direction*manifest.framesPerDirection,directionIndex:direction};
    const canvas=()=>createCanvas(w,h),base=canvas(),adorn=canvas(),held=canvas();
    const paint=(destination,layer)=>{if(!layer)return;const frame=sprite(layer,pose,p),g=destination.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(frame.source,frame.sx,frame.sy,w,h,0,0,w,h);};
    const canonical=!manifest.baseAvatar&&originalLook(p)&&entries.has('original/hero');
    if(canonical)paint(base,entries.get('original/hero'));
    else{
      paint(base,entry('body'));paint(base,entry('outfit',p.outfit));paint(base,entry('shoes',p.shoes));
      const head=manifest.baseAvatar,hat=entry('headwear',p.headwear),hair=entry('hair',p.hairstyle);
      if(head){
        const eyeY=head.eyeY[direction],side=direction===1||direction===3;
        const oldBrim={cap:side?53:56,bucket:side?53:56,beanie:side?49:52,headwrap:side?54:53,crown:side?44:46}[p.headwear];
        const desiredBrim=eyeY-2,hatY=oldBrim===undefined?0:desiredBrim-oldBrim;
        if(hair){
          const layer=createCanvas(w,h);paint(layer,hair);const hg=layer.getContext('2d'),face=head.faceWindows[direction];
          if(face)hg.clearRect(face.x,face.y,face.right-face.x+1,face.bottom-face.y+1);
          if(['cap','bucket','beanie','headwrap'].includes(p.headwear))hg.clearRect(0,0,w,desiredBrim);
          adorn.getContext('2d').drawImage(layer,0,0);
        }
        if(hat){const layer=createCanvas(w,h);paint(layer,hat);adorn.getContext('2d').drawImage(layer,0,hatY);}
        // Back-facing glasses sit behind the head; the front lenses are hidden.
        if(direction!==2&&p.eyewear!=='none'){
          const layer=createCanvas(w,h);paint(layer,entry('eyewear',p.eyewear));
          adorn.getContext('2d').drawImage(layer,0,eyeY-(side?56:58));
        }
      }else{
        if(direction===2)paint(adorn,entry('eyewear',p.eyewear));
        paint(adorn,hair);paint(adorn,hat);
        if(direction!==2)paint(adorn,entry('eyewear',p.eyewear));
      }
      paint(['trumpet','microphone'].includes(p.accessory)?held:adorn,entry('accessory',p.accessory));
    }
    const pixels=base.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h),parts=Array.from({length:5},canvas),images=parts.map(c=>c.getContext('2d').createImageData(w,h));
    const inside=(x,y,polygon)=>{let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const [ax,ay]=polygon[i],[bx,by]=polygon[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)hit=!hit;
    }return hit;};
    // Assemble garments, skin and shoes before moving a limb. A single mask
    // prevents clothing ink and old limb pixels from colliding in later layers.
    const coveredLegs=['dress','coat'].includes(p.outfit),hipY=definition.hipY??definition.hips,legY=coveredLegs?83:hipY;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const at=(y*w+x)*4;if(!pixels.data[at+3])continue;let part=0;
      if(y>=definition.neck){
        if(inside(x+.5,y+.5,definition.arms[0].polygon))part=1;
        else if(inside(x+.5,y+.5,definition.arms[1].polygon))part=2;
        else if(y>=legY)part=(x<40)!==definition.mirrored?3:4;
      }
      for(let channel=0;channel<4;channel++)images[part].data[at+channel]=pixels.data[at+channel];
    }
    // Extend the existing shirt pixels underneath the joints, hidden in the
    // neutral pose. These small overlaps keep shoulders and hips connected.
    for(let y=definition.neck;y<legY+2;y++)for(let x=31;x<49;x++){
      const at=(y*w+x)*4;if(images[0].data[at+3])continue;
      const shoulder=y<definition.neck+5&&(x<35||x>45),hip=y>=legY;
      if(!shoulder&&!hip)continue;
      const from=(y*w+(shoulder?Math.max(35,Math.min(44,x)):x))*4;
      if(!pixels.data[from+3])continue;for(let c=0;c<4;c++)images[0].data[at+c]=pixels.data[from+c];
    }
    parts.forEach((part,index)=>part.getContext('2d').putImageData(images[index],0,0));
    const legs=definition.legs.map(leg=>({...leg,pivot:[leg.pivot[0],coveredLegs?83:leg.pivot[1]]}));
    const value={base,adorn,held,parts,definition:{...definition,legs},coveredLegs};
    if(rigged.size>=Math.min(cacheLimit,96))rigged.delete(rigged.keys().next().value);rigged.set(key,value);return value;
  }
  function drawRig(ctx,p,motion,time,pose){
    const rig=buildRig(p,pose.directionIndex),state=animation.rigPose({...motion,facing:pose.direction,...(manifest.baseAvatar?{rig:rig.definition}:{})},time,reduced()),[w,h]=manifest.cell,[ax,ay]=manifest.anchor;
    const scale=Math.max(.25,Math.min(8,finite(motion.scale,1)))*worldScale;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(finite(motion.x),finite(motion.y));ctx.scale(scale,scale);
    ctx.translate(0,state.rootY);ctx.rotate(state.bodyAngle);
    const plain=source=>ctx.drawImage(source,-ax,-ay,w,h);
    if(!state.active){plain(rig.base);plain(rig.adorn);plain(rig.held);ctx.restore();return true;}
    const limb=(source,part,transform)=>{
      const [px,py]=part.pivot;ctx.save();ctx.translate(px-ax+transform.x,py-ay+transform.y);ctx.rotate(transform.angle);ctx.scale(1,transform.scaleY);
      ctx.drawImage(source,-px,-py,w,h);ctx.restore();
    };
    const {definition:d,parts}=rig,farArm=1-d.nearArm,farLeg=1-d.nearLeg;
    limb(parts[3+farLeg],d.legs[farLeg],state.legs[farLeg]);limb(parts[1+farArm],d.arms[farArm],state.arms[farArm]);
    plain(parts[0]);limb(parts[3+d.nearLeg],d.legs[d.nearLeg],state.legs[d.nearLeg]);limb(parts[1+d.nearArm],d.arms[d.nearArm],state.arms[d.nearArm]);
    plain(rig.adorn);limb(rig.held,d.arms[d.handArm],state.arms[d.handArm]);ctx.restore();return true;
  }
  function drawOriginal(ctx,motion,time){
    const action=entries.get('original/hero');if(!action)return false;
    const pose=animation.sample(motion,time,reduced()),scale=Math.max(.25,Math.min(8,finite(motion.scale,1)))*worldScale;
    const [cw,ch]=manifest.cell,[ax,ay]=manifest.anchor,sx=pose.index%action.columns*cw,sy=Math.floor(pose.index/action.columns)*ch;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(finite(motion.x)),Math.round(finite(motion.y)));ctx.scale(scale,scale);
    ctx.drawImage(action.image,sx,sy,cw,ch,-ax,-ay,cw,ch);ctx.restore();return true;
  }
  function render(ctx,p,motion,time){
    if(!loaded)return false;
    if(manifest.motionRig?.version===1&&animation.rigPose)return drawRig(ctx,p,motion,time,animation.sample(motion,time,reduced()));
    if(originalHero&&originalLook(p))return drawOriginal(ctx,motion,time);
    const pose=animation.sample(motion,time,reduced()),[w,h]=manifest.cell,[ax,ay]=manifest.anchor;
    const scale=Math.max(.25,Math.min(8,finite(motion.scale,1)))*worldScale;
    const blit=(layer,category,variant)=>{
      if(!layer)return;const frame=sprite(layer,pose,p),[dx,dy,sx=1,sy=1]=offset(layer,category,variant,pose);
      if(sx!==1||sy!==1){ctx.save();ctx.translate(dx,dy);ctx.scale(sx,sy);ctx.drawImage(frame.source,frame.sx,frame.sy,w,h,-ax,-ay,w,h);ctx.restore();}
      else ctx.drawImage(frame.source,frame.sx,frame.sy,w,h,-ax+dx,-ay+dy,w,h);
    };
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(finite(motion.x)),Math.round(finite(motion.y)));ctx.scale(scale,scale);
    if(manifest.artStyle!=='original-atlas'){ctx.fillStyle='#080b214f';ctx.beginPath();ctx.ellipse(0,1,14,3,0,0,Math.PI*2);ctx.fill();}
    const hair=entry('hair',p.hairstyle);blit(hair?.back,'hair',p.hairstyle);
    blit(entry('body'),'body','default');blit(entry('outfit',p.outfit),'outfit',p.outfit);blit(entry('shoes',p.shoes),'shoes',p.shoes);
    if(pose.direction==='up')blit(entry('eyewear',p.eyewear),'eyewear',p.eyewear);
    blit(hair,'hair',p.hairstyle);blit(entry('headwear',p.headwear),'headwear',p.headwear);
    blit(entry('accessory',p.accessory),'accessory',p.accessory);
    if(pose.direction!=='up')blit(entry('eyewear',p.eyewear),'eyewear',p.eyewear);
    ctx.restore();return true;
  }
  function sampleMotion(motion,time){return animation.sample(motion,time,reduced());}
  function drawPlayer(ctx,profile,motion={},time=0){return render(ctx,normalizeProfile(profile),motion&&typeof motion==='object'?motion:{},time);}
  function drawNPC(ctx,npc,time=0){
    const p=npc&&typeof npc==='object'?npc:{},base=appearanceFor(p.id||p.name),appearance=normalizeProfile({...base,...(p.appearance&&typeof p.appearance==='object'?p.appearance:{})});
    const emote=p.activity==='dancing'?'dance':p.activity==='chatting'||p.conversation?'talk':p.activity==='playing'?'playing':p.activity==='relaxing'?'sit':p.emote;
    return render(ctx,appearance,{x:p.x,y:p.y,facing:p.facing,walking:p.walking,phase:p.phase,emote,emoteTime:p.emoteTime,seed:base.id.length},time);
  }
  return {drawPlayer,drawNPC,normalizeProfile,appearanceFor,sampleMotion,ready,catalog,isReady:()=>loaded,
    get error(){return loadError?.message||null;},getState:()=>({ready:loaded,mode:'raster-sprites',base:manifest?.baseAvatar?'bald-gray':'legacy',motion:manifest?.motionRig?.version===1?'continuous-rig':'raster-frames',riggedLooks:rigged.size,artStyle:manifest?.artStyle||'layered-raster',sourcePolicy:manifest?.sourcePolicy||null,layers:entries.size,tintedFrames:tinted.size,cacheLimit,cell:manifest?.cell||null,totalFrames:112})};
};
