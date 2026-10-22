// Coda Arcade: Neon Nights. No network calls; dialogue is prewritten and kid-friendly.
const neonPeople=[
 {name:'Ziggy',x:230,y:345,color:'#ffb46f',lines:["I've been here all day. Don't tell anyone!","That high score was almost mine.","I came for one game. That was three hours ago."]},
 {name:'Nova',x:415,y:395,color:'#9edcff',lines:["This couch is officially my favorite spot.","The lights in here are so cool.","I like the arcade best when it's busy."]},
 {name:'Byte',x:680,y:355,color:'#bda1ff',lines:["I almost beat my high score. Almost.","Do you think the vending machine takes pixels?","My controller skills are legendary. In theory."]},
 {name:'Mochi',x:800,y:450,color:'#ffa6c7',lines:["Do arcade machines dream?","I think that plant is judging me.","I've made a new friend. It's the snack machine."]},
 {name:'Pip',x:500,y:253,color:'#ffe28a',shop:true,lines:["Welcome to the Pixel Boutique!","Looking for a fresh look?"]}
];
const neonDancers=[{name:'Riff',x:320,y:380,color:'#e5a8ff'},{name:'Fizz',x:670,y:390,color:'#95e6e2'},{name:'Dot',x:505,y:460,color:'#ffd48c'}];
let neonChatCount=0;
function neonClosest(){const people=currentRoom==='lounge'?neonPeople:currentRoom==='dance'?neonDancers:[];return people.find(p=>Math.hypot(pos.x-p.x,pos.y-p.y)<90)||null}
function neonPrompt(){const p=neonClosest();if(p)return p.shop?'E · Talk to Pip / Customize':'E · Talk to '+p.name;if(currentRoom==='lounge')return 'Explore the lounge';if(currentRoom==='dance')return 'Dance with Q';return ''}
function neonStatus(){const p=neonClosest();if(p)return 'Press E to talk to '+p.name;if(currentRoom==='lounge')return 'Social Lounge · Chat with visitors or visit Pip';if(currentRoom==='dance')return 'Dance Floor · Press Q to emote';return ''}
function neonInteract(){if(currentRoom==='arcade'){
 if(Math.hypot(pos.x-185,pos.y-300)<75){enterRoom('lounge');return true}
 if(Math.hypot(pos.x-500,pos.y-565)<70){enterRoom('dance');return true}
 return false;
 }
 if(currentRoom==='lounge'||currentRoom==='dance'){
 if(Math.hypot(pos.x-500,pos.y-555)<66){enterRoom('arcade');return true}
 const p=neonClosest();if(!p)return true;
 if(p.shop){show('<p class="eyebrow">THE PIXEL BOUTIQUE</p><h2>Pip ✦ Shopkeeper</h2><p>Hey there! Welcome to the Pixel Boutique. Looking for a new look?</p><button id="neonshop">Show me what you’ve got!</button> <button id="neonbye">Just looking!</button>');$('neonshop').onclick=()=>{modal.close();wardrobe()};$('neonbye').onclick=()=>modal.close();return true}
 const line=p.lines? p.lines[neonChatCount++%p.lines.length] : 'Great moves! The floor is yours!';show('<p class="eyebrow">ARCADE CHAT</p><h2>'+p.name+'</h2><p>'+line+'</p><button id="neonbye">See you around!</button>');$('neonbye').onclick=()=>modal.close();return true;
 }return false}
function neonClick(x,y){if(currentRoom==='arcade'){
 if(Math.hypot(x-185,y-300)<65){enterRoom('lounge');return true}
 if(Math.hypot(x-500,y-565)<65){enterRoom('dance');return true}
 return false;
 }if(currentRoom==='lounge'||currentRoom==='dance'){
 if(y>535&&Math.abs(x-500)<95){enterRoom('arcade');return true}
 const p=(currentRoom==='lounge'?neonPeople:neonDancers).find(p=>Math.hypot(x-p.x,y-p.y)<60);
 if(p){target={x:p.x,y:Math.min(565,p.y+57)};return true}
 target={x:Math.max(70,Math.min(930,x)),y:Math.max(155,Math.min(565,y))};return true;
 }return false}
function neonFloor(name){rect(0,0,1000,640,'#12152b');for(let y=88;y<605;y+=32)for(let x=35;x<965;x+=32){rect(x,y,31,31,((x+y)/32)%2?'#242440':'#2c2a4a');rect(x,y,31,1,'#40375d')}rect(18,15,964,75,'#49395f');rect(20,16,960,6,'#e79cda');rect(18,90,18,515,'#5d4b73');rect(964,90,18,515,'#5d4b73');rect(18,605,964,18,'#8b6d98');text(name,500,61,26,'#f6b9ea')}
function neonNPC(p,t){const bob=reducedMotion.matches?0:Math.sin(animationTime/420+t)*2;ctx.save();ctx.globalAlpha=.3;rect(p.x-16,p.y+8,32,6,'#050715');ctx.restore();rect(p.x-10,p.y-31+bob,20,18,p.color);rect(p.x-12,p.y-13+bob,24,21,p.color);rect(p.x-11,p.y-35+bob,22,7,'#39283e');rect(p.x-6,p.y-26+bob,4,4,'#26304c');rect(p.x+4,p.y-26+bob,4,4,'#26304c');rect(p.x-10,p.y+8+bob,8,12,'#24273d');rect(p.x+2,p.y+8+bob,8,12,'#24273d');text(p.name.toUpperCase(),p.x,p.y+33,11,'#e7d9f3');if(neonClosest()===p){text('E · TALK',p.x,p.y-52,11,'#fff4a9')}}
function drawNeonRoom(){if(currentRoom==='arcade'){
 // The main room retains all four cabinets and the disco ball; portals lead to larger dedicated areas.
 return false;
 }if(currentRoom==='piano')return false;
 if(currentRoom==='lounge'){
 neonFloor('THE SOCIAL LOUNGE');
 text('CHAT · CHILL · CUSTOMIZE',500,83,12,'#a7dbec');
 // Boutique and counter
 rect(320,114,360,96,'#272039');rect(329,121,342,82,'#7b4b80');rect(338,129,324,66,'#272640');text('✦ PIXEL BOUTIQUE ✦',500,159,20,'#ffdd9e');
 rect(335,273,330,28,'#b37b9e');rect(341,278,318,20,'#583956');for(let i=0;i<9;i++)rect(352+i*35,282,20,6,i%2?'#f5b7d7':'#9edfe7');
 for(const x of [105,770]){rect(x,335,125,55,'#523b72');rect(x+8,338,109,22,'#a17bc1');rect(x+8,372,109,9,'#28223f')}
 rect(745,170,150,100,'#24213a');rect(753,179,134,80,'#493c60');text('SNACKS',820,195,13,'#ffce92');for(let i=0;i<4;i++)rect(767+i*29,215,19,28,['#e899b7','#9bdccf','#ffcf84','#a3b6e7'][i]);
 rect(110,170,130,80,'#3a3858');rect(120,181,110,62,'#1a2035');text('ARCADE',175,203,12,'#a6e4f0');text('LOUNGE',175,224,12,'#d9b4f4');
 for(const p of neonPeople)neonNPC(p,neonPeople.indexOf(p));
 }else if(currentRoom==='dance'){
 neonFloor('THE NEON DANCE FLOOR');text('MOVE · GROOVE · PRESS Q TO DANCE',500,83,12,'#b8d6ee');
 const cols=['#39c5d8','#d16bc8','#8b7de7','#e6b46f'];for(let r=0;r<9;r++)for(let j=0;j<17;j++){const v=reducedMotion.matches?.35:.28+.28*(.5+.5*Math.sin(animationTime/400+r*.9+j*.6));ctx.save();ctx.globalAlpha=v;rect(118+j*45,142+r*44,41,40,cols[(r+j)%4]);ctx.restore()}
 rect(498,88,4,60,'#8793a8');for(let yy=-19;yy<20;yy+=5)for(let xx=-19;xx<20;xx+=5)if(xx*xx+yy*yy<370)rect(500+xx,153+yy,4,4,(xx+yy+Math.floor(animationTime/250))%3?'#a9e4ef':'#f9c4ee');
 for(const p of neonDancers)neonNPC(p,neonDancers.indexOf(p));
 }
 rect(420,560,160,40,'#433350');rect(426,566,148,28,'#1a2238');text('← MAIN ARCADE',500,585,12,'#f8d2ee');
 paintAvatarTrail();person(pos.x,pos.y,1,ctx,jumpHeight,avatarMotion.facing,avatarMotion.walking,avatarMotion.phase);text(data.name.toUpperCase().slice(0,18),pos.x,pos.y+28,10,'#f0e7cb');text('▼ YOU',pos.x,pos.y-52,10,'#d7efa9');return true}
$('loungeswitch').onclick=()=>enterRoom(currentRoom==='lounge'?'arcade':'lounge');
$('danceswitch').onclick=()=>enterRoom(currentRoom==='dance'?'arcade':'dance');
const originalEnterRoom=enterRoom;enterRoom=function(room){originalEnterRoom(room);$('loungeswitch').textContent=room==='lounge'?'← Arcade':'☕ Lounge';$('danceswitch').textContent=room==='dance'?'← Arcade':'✦ Dance Floor'};
