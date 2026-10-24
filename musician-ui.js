/* Local, authored conversations and a live four-direction wardrobe preview. */
window.createCodaMusicianUI=function(api){
  'use strict';
  const $=id=>document.getElementById(id),dialog=$('dialog');
  const details=document.createElement('p');details.className='musician-description';
  const choices=document.createElement('div');choices.className='musician-choices';
  const credit=document.createElement('small');credit.className='muted';credit.textContent='Imagined dialogue inspired by music history.';
  $('who').after(details);$('words').after(choices,credit);
  let selected=null,preview=null;
  function closeConversation(){api.getBrain()?.endConversation();selected=null;dialog.style.display='none';api.clearInput();api.canvas.focus();}
  function talk(npc){
    const data=api.getBrain()?.beginConversation(npc);if(!data)return;
    const person=api.npcs.find(person=>person.id===data.id);if(person)api.faceTo?.(person);
    selected=data.id;api.clearInput();dialog.style.display='block';$('who').textContent=data.name;details.textContent=data.description;$('words').textContent=data.line;
    choices.replaceChildren();
    for(const choice of data.choices){const button=document.createElement('button');button.type='button';button.textContent=choice.label;button.onclick=()=>{$('words').textContent=api.getBrain().say(selected,choice.id);};choices.append(button);}
    $('close').textContent='See you around · E';$('close').focus();
  }
  $('close').onclick=closeConversation;
  function openRoster(){
    closeConversation();api.openPanel('Meet the musicians');
    const intro=document.createElement('p');intro.className='muted';intro.textContent='Historic musicians reimagined as arcade regulars. Find them on the map to chat, get a music tip, or hear what they are playing.';api.panelBody.append(intro);
    for(const person of api.npcs){
      const data=api.getBrain().getConversation(person),card=document.createElement('article');card.className='musician-card';
      const portrait=document.createElement('canvas');portrait.width=80;portrait.height=100;portrait.setAttribute('aria-label',person.name+' portrait');
      const portraitContext=portrait.getContext('2d');portraitContext.save();portraitContext.translate(40,93);portraitContext.scale(1.35,1.35);api.renderer.drawNPC(portraitContext,{...person,x:0,y:0,facing:'down',walking:false,activity:'idle'},0);portraitContext.restore();
      const body=document.createElement('div'),name=document.createElement('strong'),bio=document.createElement('p'),activity=document.createElement('small');
      name.textContent=person.name;bio.textContent=data.description;activity.textContent='Now: '+data.activity;body.append(name,bio,activity);
      const button=document.createElement('button');button.type='button';const near=api.distance(person)<100;button.textContent=near?'Chat':'Find on map';button.setAttribute('aria-label',(near?'Chat with ':'Find ')+person.name);
      button.onclick=()=>{api.closePanel();if(api.distance(person)<100)talk(person);else api.walkTo(person);};
      card.append(portrait,body,button);api.panelBody.append(card);
    }
  }
  const roster=document.createElement('button');roster.type='button';roster.id='musiciansBtn';roster.textContent='♫ Meet musicians';roster.onclick=openRoster;
  const wardrobe=document.createElement('button');wardrobe.type='button';wardrobe.id='avatarBtn';wardrobe.textContent='Your avatar';wardrobe.onclick=()=>{closeConversation();api.openWardrobe();};
  $('accountBtn').before(wardrobe,roster);
  function addPreview(getProfile){
    const section=document.createElement('section');section.className='avatar-live-preview';section.setAttribute('aria-label','Live avatar preview');
    const row=document.createElement('div');row.className='avatar-preview-views';const views=[];
    for(const [facing,label]of [['down','Front'],['left','Left'],['up','Back'],['right','Right']]){
      const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');canvas.width=100;canvas.height=104;canvas.setAttribute('aria-label',label+' avatar preview');caption.textContent=label;figure.append(canvas,caption);row.append(figure);views.push({facing,canvas});
    }
    const label=document.createElement('label');label.className='formRow';label.textContent='Preview animation';const mode=document.createElement('select');mode.id='avatarPreviewMode';mode.setAttribute('aria-label','Preview animation');for(const [value,text]of [['walk','Walk'],['idle','Idle'],['emote','Selected emote']])mode.append(new Option(text,value));label.append(mode);section.append(row,label);api.panelBody.insertBefore(section,api.panelBody.children[1]||null);preview={section,views,getProfile,mode,startedAt:null};mode.onchange=()=>{preview.startedAt=null;drawPreview(0);};drawPreview(0);
  }
  function drawPreview(time){
    if(!preview?.section.isConnected||api.panelBody.parentElement.hidden)return;
    if(time>0&&preview.startedAt===null)preview.startedAt=time;
    const elapsed=preview.startedAt===null?0:Math.max(0,time-preview.startedAt),profile=preview.getProfile();
    for(const {facing,canvas}of preview.views){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,100,104);ctx.save();api.renderer.drawPlayer(ctx,profile,{x:50,y:94,scale:1.5,facing,walking:preview.mode.value==='walk',phase:elapsed*8,emote:preview.mode.value==='emote'?profile.emote:null,emoteTime:elapsed},elapsed);ctx.restore();}
  }
  function update(time){
    if(selected&&!api.npcs.some(person=>person.id===selected&&!person.hidden&&person.conversation))closeConversation();
    drawPreview(time);
  }
  return {talk,closeConversation,openRoster,addPreview,drawPreview,update,selected:()=>selected};
};
