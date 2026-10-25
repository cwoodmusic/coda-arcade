/* A quiet front door. No Firebase SDK, audio, or gameplay starts on this page. */
(function(win){
 'use strict';
 const doc=win.document,$=id=>doc.getElementById(id),config=win.ARCADE_ACCOUNTS_CONFIG||{};
 const world=new URL('world-preview.html?v=profiles-57',win.location.href);
 const incoming=win.CodaClassroom?.consumeFragment(win.location,win.history);
 if(incoming!==null&&incoming!==undefined){world.hash=new URLSearchParams({'classroom-pass':incoming}).toString();win.location.replace(world.href);return;}
 let scope=null,storage=null;
 try{scope=win.CodaClassroomStorage.create({window:win,keys:win.CodaClassroomProfileData.SCOPED_KEYS});storage=scope.install();}catch{}
 const profile=$('titleProfile'),guest=$('titleGuest'),hint=$('titleProfileHint'),motion=$('titleMotion');
 function renderIdentity(){
   const state=scope?.getState(),owned=state?.owned===true,blocked=state?.blocked===true,enabled=config.classroom?.enabled===true;
   profile.classList.toggle('is-primary',owned||enabled);guest.classList.toggle('is-primary',!owned&&!enabled);
   profile.classList.toggle('is-unavailable',!owned&&!enabled);profile.removeAttribute('aria-disabled');
   if(owned){
     $('startTitle').textContent='Welcome back.';$('titleGreeting').textContent='Ready for more music?';
     profile.querySelector('strong').textContent='Continue profile';profile.querySelector('small').textContent='Pick up your adventure';profile.href=world.href;
     guest.querySelector('strong').textContent='Change player';guest.querySelector('small').textContent='Open your profile options';
     const change=new URL(world);change.searchParams.set('profile','student');guest.href=change.href;
     hint.textContent='To play as a guest, open your profile options and leave this device.';
   }else{
     $('startTitle').textContent='Let’s play.';$('titleGreeting').textContent='Your adventure starts here.';
     profile.querySelector('strong').textContent='Open my profile';profile.querySelector('small').textContent='Use your picture card';
     const open=new URL(world);open.searchParams.set('profile','student');profile.href=open.href;
     guest.querySelector('strong').textContent='Play as guest';guest.querySelector('small').textContent='Jump in and explore';guest.href=world.href;
     hint.textContent=blocked?'Another arcade tab is open. Close it before changing players.':enabled?'No card yet? Your teacher can help.':'Profiles are being set up. Guest play is ready.';
     if(!enabled){profile.setAttribute('aria-disabled','true');profile.querySelector('small').textContent='Cards coming soon';}
   }
 }
 profile.addEventListener('click',event=>{if(profile.getAttribute('aria-disabled')==='true')event.preventDefault();});
 function readMotion(){try{return storage?.getItem('arcadeAnimations')!=='off';}catch{return true;}}
 const reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)');let animate=readMotion();
 function renderMotion(){const limited=reduced?.matches===true,on=animate&&!limited;doc.body.classList.toggle('motion-off',!on);motion.hidden=false;motion.disabled=limited;motion.setAttribute('aria-pressed',String(on));motion.textContent=limited?'Motion: Reduced':'✧ Motion: '+(on?'On':'Off');}
 motion.onclick=()=>{animate=!animate;try{storage?.setItem('arcadeAnimations',animate?'on':'off');}catch{}renderMotion();};
 reduced?.addEventListener?.('change',renderMotion);
 win.addEventListener('storage',event=>{if(event.key==='arcadeAnimations'){animate=readMotion();renderMotion();}});
 scope?.subscribe(renderIdentity);renderIdentity();renderMotion();
})(window);
