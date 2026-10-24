/* Layered, foot-anchored pixel characters. Cosmetic motion never moves gameplay hitboxes. */
window.createCodaCharacterRenderer = function (api) {
  'use strict';
  api=api||{};
  const DIRECTIONS=['down','left','up','right'];
  const HAIR=['short','bob','long','curly','ponytail','spiky','bald','buns'];
  const OUTFITS=['pants','shorts','dress','overalls'];
  const ACCESSORIES=['none','cap','bow','sunglasses','headphones','bowtie','starclip','partyglasses','halo','pixelheadphones'];
  const SHOES=['sneakers','boots','hightops','neon','gold'];
  const EMOTES=['wave','dance','spin','robot','disco'];
  const DEFAULTS=Object.freeze({name:'Guest',skin:'#d49a76',hair:'#463145',shirt:'#a7f66f',hairstyle:'short',outfit:'pants',accessory:'none',shoes:'sneakers',emote:'wave'});
  const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
  const choose=(value,values,fallback)=>values.includes(value)?value:fallback;
  const color=(value,fallback)=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():fallback;
  const reduced=()=>typeof api.reducedMotion==='function'&&!!api.reducedMotion();
  function normalizeProfile(raw){
    const p=raw&&typeof raw==='object'?raw:{};
    return {name:typeof p.name==='string'?p.name.trim().slice(0,18)||DEFAULTS.name:DEFAULTS.name,
      skin:color(p.skin,DEFAULTS.skin),hair:color(p.hair,DEFAULTS.hair),shirt:color(p.shirt,DEFAULTS.shirt),
      hairstyle:choose(p.hairstyle,HAIR,DEFAULTS.hairstyle),outfit:choose(p.outfit,OUTFITS,DEFAULTS.outfit),
      accessory:p.hat===true&&finite(p.walked)>=450&&(!p.accessory||p.accessory==='none')?'halo':choose(p.accessory,ACCESSORIES,DEFAULTS.accessory),
      shoes:choose(p.shoes,SHOES,DEFAULTS.shoes),emote:choose(p.emote,EMOTES,DEFAULTS.emote)};
  }
  const historical={
    bach:{name:'J. S. Bach',skin:'#e5b88f',hair:'#e6dfd2',shirt:'#283a52',hairstyle:'curly',outfit:'pants',shoes:'boots',accessory:'none',garment:'coat',hairDetail:'wig',neckwear:'cravat'},
    mozart:{name:'Mozart',skin:'#efc2a0',hair:'#ece4d6',shirt:'#a94655',hairstyle:'curly',outfit:'pants',shoes:'boots',accessory:'none',garment:'coat',hairDetail:'wig',neckwear:'cravat'},
    beethoven:{name:'Beethoven',skin:'#d7aa87',hair:'#7f7d80',shirt:'#393d4d',hairstyle:'spiky',outfit:'pants',shoes:'boots',accessory:'none',garment:'coat',hairDetail:'tousled',neckwear:'scarf'},
    clara:{name:'Clara Schumann',skin:'#edc3a6',hair:'#493331',shirt:'#596687',hairstyle:'long',outfit:'dress',shoes:'boots',accessory:'none',hairDetail:'single-bun',neckwear:'collar'},
    joplin:{name:'Scott Joplin',skin:'#9e6749',hair:'#241d27',shirt:'#74637c',hairstyle:'short',outfit:'pants',shoes:'boots',accessory:'none',garment:'suit',neckwear:'tie',moustache:true},
    ellington:{name:'Duke Ellington',skin:'#875c44',hair:'#28222b',shirt:'#355879',hairstyle:'short',outfit:'pants',shoes:'boots',accessory:'bowtie',garment:'suit',neckwear:'collar',moustache:true},
    ella:{name:'Ella Fitzgerald',skin:'#986144',hair:'#342333',shirt:'#885693',hairstyle:'curly',outfit:'dress',shoes:'gold',accessory:'none',neckwear:'necklace',earrings:true,instrument:'microphone'},
    nina:{name:'Nina Simone',skin:'#754a35',hair:'#221c26',shirt:'#ad793d',hairstyle:'buns',outfit:'dress',shoes:'gold',accessory:'none',hairDetail:'headwrap',neckwear:'necklace',earrings:true},
    miles:{name:'Miles Davis',skin:'#875b40',hair:'#211e28',shirt:'#2a3e5a',hairstyle:'short',outfit:'pants',shoes:'boots',accessory:'sunglasses',garment:'suit',neckwear:'tie',instrument:'trumpet'}
  };
  const appearances=Object.fromEntries(Object.entries(historical).map(([id,p])=>[id,Object.freeze({...normalizeProfile(p),...p,id})]));
  const aliases={'j. s. bach':'bach','johann sebastian bach':'bach','wolfgang amadeus mozart':'mozart','ludwig van beethoven':'beethoven','clara schumann':'clara','scott joplin':'joplin','duke ellington':'ellington','ella fitzgerald':'ella','nina simone':'nina','miles davis':'miles'};
  const fallback=Object.freeze({...DEFAULTS,id:'guest'});
  function appearanceFor(id){const key=String(id||'').toLowerCase();return appearances[aliases[key]||key]||fallback;}
  function shade(hex,amount){return '#'+[1,3,5].map(offset=>Math.max(0,Math.min(255,parseInt(hex.slice(offset,offset+2),16)+amount)).toString(16).padStart(2,'0')).join('');}
  const palettes=new Map();
  function palette(p){const key=p.skin+p.hair+p.shirt;if(palettes.has(key))return palettes.get(key);
    const result={skin:p.skin,skinShade:shade(p.skin,-24),skinLight:shade(p.skin,18),hair:p.hair,hairShade:shade(p.hair,-23),hairLight:shade(p.hair,20),shirt:p.shirt,shirtShade:shade(p.shirt,-25),shirtLight:shade(p.shirt,25),ink:'#211d34',pants:'#424258'};
    if(palettes.size>=128)palettes.delete(palettes.keys().next().value);palettes.set(key,result);return result;
  }
  function sampleMotion(raw={},time=0){
    const m=raw&&typeof raw==='object'?raw:{},quiet=reduced(),t=finite(time),phase=finite(m.phase);
    const walking=m.walking===true,emote=typeof m.emote==='string'?m.emote:'';
    const actionTime=finite(m.emoteTime,t),beat=Math.sin(actionTime*7);
    let facing=choose(m.facing,DIRECTIONS,'down');
    if(emote==='spin'&&!quiet)facing=DIRECTIONS[((Math.floor(actionTime*7)%4)+4)%4];
    const stride=!quiet&&walking?Math.round(Math.sin(phase)*3):0;
    let dx=0,lift=0,bob=0,gesture='';
    if(!quiet){
      bob=walking?Math.round(Math.abs(Math.sin(phase))):Math.round(Math.sin(t*1.9+finite(m.seed))*.55);
      if(emote==='dance'){dx=Math.round(beat*2);lift=Math.round(Math.abs(beat)*2);gesture='dance';}
      else if(emote==='wave'||emote==='talk')gesture='wave';
      else if(emote==='robot')gesture='robot';
      else if(emote==='disco')gesture='point';
      else if(emote==='playing')gesture='playing';
    }
    return {facing,walking,phase,stride,dx,lift,bob,gesture,actionTime,blink:!quiet&&((t+finite(m.seed)*.37)%5.3+5.3)%5.3>5.13,quiet};
  }
  function drawHair(r,p,c,side,back){
    if(p.hairstyle==='bald')return;
    if(p.hairDetail==='headwrap'){
      r(-11,-48,22,10,'#3f7b87');r(-13,-43,26,5,'#67a5a1');r(-6,-52,12,7,'#31556f');r(-3,-51,5,5,'#c3a56a');
      if(back)r(-10,-39,20,5,'#31556f');return;
    }
    r(-11,-44,22,7,c.hairShade);r(-9,-47,18,6,c.hair);r(-7,-48,14,2,c.hairLight);
    if(back){r(-11,-40,22,15,c.hair);r(-8,-25,16,3,c.hairShade);}else{r(-11,-40,4,12,c.hair);r(side?1:-7,-40,side?10:14,4,c.hair);if(side)r(-11,-37,5,15,c.hairShade);else r(8,-39,3,9,c.hairShade);}
    const style=p.hairDetail==='single-bun'?'single-bun':p.hairstyle;
    if(style==='bob'){r(-12,-39,side?6:5,16,c.hair);if(!side)r(7,-39,5,16,c.hair);r(-10,-24,side?5:20,3,c.hairShade);}
    if(style==='long'){r(-12,-39,side?7:5,25,c.hair);if(back)r(-9,-25,18,13,c.hair);else if(!side)r(7,-39,5,25,c.hair);}
    if(style==='ponytail'){r(side?-17:-4,-39,side?8:9,21,c.hairShade);r(side?-18:-4,-37,side?8:9,13,c.hair);r(side?-16:-3,-37,6,3,c.shirtLight);}
    if(style==='curly'){for(const [x,y]of [[-13,-44],[-8,-48],[-2,-49],[5,-47],[9,-42],[-13,-36]]){r(x,y,7,7,c.hair);r(x+1,y,3,2,c.hairLight);}if(back)r(-11,-34,22,10,c.hair);}
    if(style==='spiky'){for(const [x,y]of [[-12,-45],[-8,-50],[-2,-52],[5,-49],[10,-44]])r(x,y,5,10,c.hair);r(-8,-46,16,3,c.hairLight);}
    if(style==='buns'){r(-16,-49,9,9,c.hair);r(7,-49,9,9,c.hair);r(-14,-50,5,2,c.hairLight);r(9,-50,5,2,c.hairLight);}
    if(style==='single-bun'){r(side?-16:-5,-46,side?8:10,10,c.hairShade);r(side?-15:-4,-47,side?6:8,8,c.hair);if(back)r(-7,-42,14,10,c.hair);}
    if(p.hairDetail==='wig'){
      for(const x of [-14,10]){r(x,-39,5,5,c.hairLight);r(x,-34,5,5,c.hair);r(x,-29,5,4,c.hairShade);}
      if(back){r(-4,-25,8,8,c.hair);r(-5,-22,10,3,'#28283e');}
    }
    if(p.hairDetail==='tousled'){r(-16,-42,7,5,c.hair);r(10,-45,7,6,c.hair);r(-13,-48,6,7,c.hairShade);}
  }
  function drawGear(r,p,c,pose,side,back){
    const a=p.accessory;
    if(a==='cap'){r(-12,-46,24,10,'#d95c60');r(-9,-48,18,3,'#ed7776');r(-9,-44,15,6,'#f3e7d1');r(side?4:-13,-37,side?14:26,3,'#a44153');if(back)r(-4,-43,8,4,'#49364a');}
    if(a==='bow'){const x=side?1:7;r(x,-46,6,7,'#ec8abd');r(x+8,-46,6,7,'#ec8abd');r(x+5,-43,5,4,'#b94986');}
    if(a==='headphones'||a==='pixelheadphones'){
      const bright=a==='pixelheadphones';r(-12,-46,24,3,bright?'#ecc468':'#63bbc7');r(-15,-42,4,15,bright?'#d49365':'#4c829e');r(11,-42,4,15,bright?'#d49365':'#4c829e');
      r(side?-13:-16,-35,side?6:7,10,'#ad78c7');if(!side)r(10,-35,7,10,'#ad78c7');r(side?-12:-15,-32,3,4,bright?'#a6fff0':'#dfb7eb');
    }
    if((a==='sunglasses'||a==='partyglasses')&&!back){const col=a==='partyglasses'?'#d454ba':'#25273b';if(side){r(3,-36,9,6,col);r(-1,-35,5,2,col);r(6,-35,3,1,'#8da8b5');}else{r(-9,-36,7,6,col);r(2,-36,7,6,col);r(-2,-35,4,2,col);r(-7,-35,3,1,'#8da8b5');r(4,-35,3,1,'#8da8b5');}}
    if(a==='starclip'){const x=side?3:7;r(x,-43,3,9,'#f8dc75');r(x-3,-40,9,3,'#f8dc75');r(x,-40,2,2,'#fff4b9');}
    if(a==='halo'){r(-12,-53,24,2,'#e8e08b');r(-15,-51,3,3,'#c2efb0');r(12,-51,3,3,'#c2efb0');r(-11,-49,22,1,'#d9f5bb');}
    if(a==='bowtie'&&!back){if(side){r(6,-23,4,5,'#e4b5b5');}else{r(-6,-23,5,4,'#e4b5b5');r(1,-23,5,4,'#e4b5b5');r(-1,-22,2,2,'#a96387');}}
    if(p.earrings){r(side?0:-11,-29,2,5,'#efcb71');if(!side)r(10,-29,2,5,'#efcb71');}
    if(p.instrument==='microphone'&&!back&&!pose.walking){r(12,-22,2,14,'#b9c3d1');r(10,-25,6,5,'#5e677f');r(11,-25,3,1,'#e0e6ed');r(10,-14,5,4,c.skin);}
    if(p.instrument==='trumpet'&&!back&&!pose.walking){r(6,-19,14,3,'#dba94e');r(18,-22,6,8,'#f0ce6e');r(22,-21,3,6,'#a87035');r(10,-17,7,4,'#bb873c');r(10,-23,2,5,'#f4d57d');r(14,-23,2,5,'#f4d57d');r(7,-16,4,3,c.skin);}
  }
  function drawShoe(r,x,y,kind,c){
    const shoe={sneakers:'#dbd8e9',boots:'#624c46',hightops:'#bc7e9c',neon:'#77d9c5',gold:'#e7bf5f'}[kind];
    const high=kind==='boots'?4:kind==='hightops'?3:2;r(x,y-high,6,high+2,c.ink);r(x+1,y-high,5,high,shoe);r(x,y+1,7,1,kind==='boots'?'#312c40':'#f1e9df');
    if(kind==='hightops')r(x+2,y-2,2,1,'#f2e4da');if(kind==='gold'||kind==='neon')r(x+2,y-1,2,1,'#f9f4cd');
  }
  function render(ctx,p,motion,time){
    const pose=sampleMotion(motion,time),c=palette(p),side=pose.facing==='left'||pose.facing==='right',back=pose.facing==='up';
    const x=finite(motion.x),y=finite(motion.y),scale=Math.max(.25,Math.min(8,finite(motion.scale,1)));
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
    ctx.fillStyle='#080b214f';ctx.beginPath();ctx.ellipse(0,1,13,3,0,0,Math.PI*2);ctx.fill();
    ctx.translate(pose.dx,-pose.lift);if(pose.facing==='left')ctx.scale(-1,1);
    const r=(x,y,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    const stride=pose.stride,dress=p.outfit==='dress';
    for(let leg=0;leg<2;leg++){
      const xx=side?(leg?-1:-6):(leg?2:-7),lift=Math.max(0,leg?stride:-stride),bottom=-2-lift;
      const legColor=p.outfit==='shorts'||dress?c.skin:p.outfit==='overalls'?'#3f5d83':c.pants;
      r(xx,-10,5,Math.max(4,9-lift),c.ink);r(xx+1,-10,3,Math.max(4,8-lift),legColor);drawShoe(r,xx-1,bottom,p.shoes,c);
    }
    ctx.save();ctx.translate(0,-pose.bob);
    // Back hair is beneath the torso so long styles do not cover the outfit.
    if(p.hairstyle==='long'&&back){r(-10,-42,20,28,c.hairShade);}
    r(side?-8:-10,-25,side?16:20,18,c.ink);r(side?-7:-9,-24,side?14:18,15,c.shirt);r(side?-6:-8,-23,side?3:4,13,c.shirtLight);r(side?4:6,-23,3,14,c.shirtShade);
    if(p.garment==='coat'){r(-10,-10,8,7,c.shirtShade);r(2,-10,8,7,c.shirtShade);if(!back){r(-5,-24,3,13,'#c7b795');r(2,-24,3,13,'#c7b795');for(const yy of [-20,-15,-10])r(0,yy,2,2,'#ddc78e');}}
    if(p.garment==='suit'&&!back){r(-4,-24,8,12,'#e5ddd0');r(-2,-23,4,11,'#38394f');r(-7,-24,3,11,c.shirtShade);r(4,-24,3,11,c.shirtLight);}
    if(p.outfit==='overalls'){r(side?-5:-6,-17,side?10:12,10,'#426891');r(-6,-24,3,14,'#426891');if(!side)r(3,-24,3,14,'#426891');r(-4,-15,8,4,'#304e78');r(-4,-20,2,2,'#e9c779');}
    if(p.outfit==='shorts'){r(side?-7:-8,-11,side?14:16,5,'#656084');r(-6,-7,4,3,c.skin);r(2,-7,4,3,c.skin);}
    if(dress){r(side?-9:-11,-16,side?18:22,11,c.ink);r(side?-8:-10,-16,side?16:20,10,c.shirt);r(side?-10:-12,-7,side?20:24,3,c.shirtShade);r(-7,-15,3,8,c.shirtLight);if(p.neckwear==='necklace')for(const xx of [-4,-2,0,2])r(xx,-22+Math.abs(xx)/2,2,2,'#ebc67b');}
    // Arms swing from the shoulders; raised gestures stay clear of the face.
    const armSwing=Math.round(stride*.6),leftArm=side?-9:-13,rightArm=side?5:9;
    const raised=['wave','point','robot','dance'].includes(pose.gesture);
    r(leftArm,-23,4,8,c.shirtShade);r(leftArm,-16+armSwing,4,10,c.skinShade);r(leftArm+1,-15+armSwing,2,7,c.skin);
    r(rightArm,-23,4,8,c.shirt);r(rightArm,-16-armSwing,4,10,c.skin);
    if(raised){r(rightArm,-16-armSwing,4,10,c.shirtShade);r(rightArm+1,-33,4,16,c.skin);r(rightArm,-37+(Math.round(Math.sin(pose.actionTime*8))),6,5,c.skinLight);if(pose.gesture==='point')r(rightArm+3,-40,2,5,c.skinLight);if(pose.gesture==='dance'||pose.gesture==='robot'){r(leftArm,-16+armSwing,4,10,c.shirt);r(leftArm-1,-30,4,13,c.skinShade);r(leftArm-2,-33,6,4,c.skin);}}
    if(pose.gesture==='playing'){r(leftArm,-16+armSwing,4,10,c.shirtShade);r(rightArm,-16-armSwing,4,10,c.shirtShade);const tap=Math.round(Math.sin(pose.actionTime*10));r(-12,-16+tap,10,4,c.skin);r(3,-16-tap,10,4,c.skinLight);}
    r(-5,-29,10,6,c.skinShade);r(-4,-28,8,5,c.skin);
    if(p.neckwear==='cravat'&&!back){r(-4,-26,8,4,'#f2e9d4');r(-2,-22,4,7,'#ddd1bc');r(-4,-21,8,2,'#f5ecdb');}
    if(p.neckwear==='scarf'){r(-6,-26,12,4,'#b9705b');r(3,-23,4,9,'#935649');}
    if(p.neckwear==='collar'&&!back){r(-6,-25,5,3,'#ece5d8');r(1,-25,5,3,'#ece5d8');}
    if(p.neckwear==='tie'&&!back){r(-5,-25,10,3,'#e4dfd5');r(-1,-23,3,8,'#c29a76');}
    // A stepped outline retains crisp pixel edges at the same 53px world scale.
    r(-9,-44,18,2,c.ink);r(-11,-42,22,16,c.ink);r(-8,-26,16,3,c.ink);
    r(-9,-42,18,16,c.skin);r(-10,-39,2,10,c.skinShade);r(7,-39,3,12,c.skinShade);r(-7,-42,10,2,c.skinLight);r(-7,-26,14,2,c.skinShade);
    if(!back){
      if(side){r(8,-36,3,5,c.skinLight);r(5,-36,2,pose.blink?1:3,'#2c2736');if(!pose.blink)r(5,-36,1,1,'#f2e9da');r(7,-29,3,1,'#915f56');}
      else {for(const xx of [-6,4]){r(xx,-36,3,pose.blink?1:4,'#2c2736');if(!pose.blink)r(xx,-36,1,1,'#f2e9da');}r(-1,-31,2,2,c.skinShade);r(-3,-28,6,1,'#915f56');}
      if(p.moustache){if(side)r(6,-30,5,2,c.hair);else{r(-5,-30,10,2,c.hair);r(-3,-28,6,1,c.hairShade);}}
    }
    drawHair(r,p,c,side,back);drawGear(r,p,c,pose,side,back);
    ctx.restore();ctx.restore();
  }
  function drawPlayer(ctx,profile,motion={},time=0){render(ctx,normalizeProfile(profile),motion||{},time);}
  function drawNPC(ctx,npc,time=0){
    const p=npc&&typeof npc==='object'?npc:{},appearance=appearanceFor(p.id||p.name);
    const activity=p.activity||'',emote=activity==='dancing'?'dance':activity==='chatting'||p.conversation?'talk':activity==='playing'?'playing':p.emote;
    const seed=String(appearance.id).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    render(ctx,appearance,{x:p.x,y:p.y,facing:p.facing,walking:p.walking,phase:p.phase,emote,emoteTime:p.emoteTime,seed},time);
  }
  return {drawPlayer,drawNPC,normalizeProfile,appearanceFor,sampleMotion};
};
