/* Original, imagined arcade conversations inspired by musical history.
 * The state machine shares the game's navigation map; it never bypasses walls. */
(function () {
  'use strict';
  const PROFILES = [
    {id:'bach',name:'J. S. Bach',description:'Baroque composer and keyboard player, known for counterpoint: independent melodies sounding together.',favorite:1,speed:65,sequence:['cabinet','lounge','wander','dance'],greetings:['A room full of independent musical ideas. Let us see how they fit together.','Every voice has something to contribute, even in an arcade.'],music:'In counterpoint, each melody has its own shape while listening to the others. Try following one line at a time.',advice:'Build a short melody, then answer it with another. Keep both lines singable.',games:'Music Triad has caught my attention. Relationships between notes can make a lovely puzzle.'},
    {id:'mozart',name:'Mozart',description:'Classical-era composer and pianist whose music includes operas, symphonies, concertos, and chamber works.',favorite:3,speed:78,sequence:['cabinet','dance','lounge','wander'],greetings:['Shall we turn a tiny musical idea into a grand adventure?','I have a new tune in mind. The difficult part is choosing just one!'],music:'A variation changes an idea while keeping something recognizable. Rhythm, register, and accompaniment all offer possibilities.',advice:'Write a small phrase, repeat it, and surprise yourself with a different ending.',games:'Song Machine looks like an excellent place to test a playful musical idea.'},
    {id:'beethoven',name:'Beethoven',description:'Composer and pianist whose symphonies, sonatas, and chamber music develop powerful ideas from small motifs.',favorite:0,speed:71,sequence:['cabinet','wander','lounge','dance'],greetings:['A small idea can carry a great deal of energy. What shall we try?','One more thoughtful attempt can reveal something new.'],music:'A motif is a short musical idea. Repeating, reshaping, and combining motifs can give a piece a strong identity.',advice:'Choose a short rhythm and see how many different musical phrases you can build from it.',games:'Pitch Race is good practice for recognizing notes. I prefer progress to a perfect first attempt.'},
    {id:'clara',name:'Clara Schumann',description:'Nineteenth-century pianist and composer celebrated for her performing career, piano works, songs, and chamber music.',favorite:3,speed:67,sequence:['lounge','cabinet','wander','dance'],greetings:['Hello. Have you found a phrase you would like to shape?','A little patient practice can make room for a beautiful performance.'],music:'Playing a phrase involves more than finding its notes: listen for where it grows, rests, and responds.',advice:'Practice a short passage slowly enough to hear every connection. Then give it a clear musical direction.',games:'I am interested in Song Machine. A melody can reveal a different character with a new accompaniment.'},
    {id:'joplin',name:'Scott Joplin',description:'Ragtime composer and pianist whose music pairs a steady accompaniment with syncopated melodies.',favorite:2,speed:73,sequence:['dance','cabinet','lounge','wander'],greetings:['A steady pulse makes a fine home for a lively melody.','Can you hear the little surprises between the beats?'],music:'Syncopation places accents where you may not expect them. In ragtime, a steady accompaniment helps those accents stand out.',advice:'Keep one hand tapping a regular beat while the other tries a rhythm between those beats.',games:'Rhythm Room is my next stop. A clear pulse matters more to me than rushing.'},
    {id:'ellington',name:'Duke Ellington',description:'Jazz composer, pianist, and bandleader who wrote for the distinctive sounds of his orchestra.',favorite:1,speed:64,sequence:['lounge','cabinet','dance','wander'],greetings:['This place could use an orchestra of its own. Which sound would you bring?','An interesting sound deserves a little room to be heard.'],music:'An arrangement gives musical ideas to particular instruments or voices. Their tone colors help tell the story.',advice:'Try giving the same melody to two different sounds. Listen to what changes before adding more notes.',games:'Music Triad offers some intriguing combinations. After that, I may try arranging a tune in Song Machine.'},
    {id:'ella',name:'Ella Fitzgerald',description:'Jazz singer renowned for her vocal agility, interpretation, and improvised scat singing.',favorite:2,speed:76,sequence:['dance','wander','cabinet','lounge'],greetings:['A little rhythm and a little imagination can start a whole conversation.','Would you like to trade a musical idea?'],music:'Scat singing uses invented syllables to improvise musical phrases. The voice can play with rhythm and melody like an instrument.',advice:'Sing a short phrase on any syllable, leave a pause, and answer it with a new phrase.',games:'Rhythm Room has a groove worth exploring. I might sing a little response while I wait.'},
    {id:'nina',name:'Nina Simone',description:'Classically trained pianist, singer, and arranger whose work crossed jazz, blues, folk, and soul.',favorite:3,speed:66,sequence:['wander','lounge','cabinet','dance'],greetings:['What would you like your music to say today?','Give a phrase some attention. Its meaning may surprise you.'],music:'An interpretation can transform a song through pacing, touch, harmony, and the space around a phrase.',advice:'Choose a feeling for your phrase. Change one musical detail and listen to whether that feeling becomes clearer.',games:'Song Machine gives an idea room to develop. I am listening for a melody with something to say.'},
    {id:'miles',name:'Miles Davis',description:'Jazz trumpeter and bandleader whose work explored changing approaches to improvisation, including modal jazz.',favorite:1,speed:62,sequence:['lounge','wander','cabinet','dance'],greetings:['There is plenty of sound in here. I am listening for an opening.','Try a phrase. Then give it a little space.'],music:'Modal jazz can build improvisation around a scale or mode. Kind of Blue, released in 1959, is a landmark example.',advice:'Play a few notes, pause, and listen. Let the next phrase answer what you just heard.',games:'I may stop by Music Triad. A small change in the notes can open a different direction.'}
  ];
  const SEEDS=[[1150,365],[350,280],[1050,430],[250,300],[410,740],[550,735],[1340,650],[1340,725],[970,650]];
  const DESTINATIONS={
    lounge:[[225,250],[350,278],[260,316],[360,315]],
    dance:[[300,720],[405,744],[535,735],[650,745],[215,780],[585,790]],
    wander:[[1065,405],[1180,620],[1340,655],[1100,720],[925,450],[1435,665]]
  };
  const ACTIVITY={cabinet:'playing',lounge:'relaxing',dance:'dancing',wander:'waiting'};
  const ARRIVAL=12,PERSON_SPACE=19;
  window.CodaMusicianCast=Object.freeze(PROFILES.map(profile=>Object.freeze({id:profile.id,name:profile.name})));

  window.createCodaNPCBehavior=function (api) {
    const npcs=api.npcs,states=new Map();
    let conversation=null,routeBudget=0,tick=0;
    const find=value=>typeof value==='object'?npcs.find(p=>p===value||p.id&&p.id===value?.id):npcs.find(p=>p.id===value||p.name===value);
    const profileFor=(p,index)=>PROFILES.find(profile=>profile.id===p.id||profile.name===p.name)||PROFILES[index%PROFILES.length];
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const player=()=>api.getPlayer?.()||{x:-9999,y:-9999};
    function facing(p,dx,dy){if(Math.hypot(dx,dy)<.01)return;p.facing=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
    function occupied(x,y,p,space=PERSON_SPACE){
      const user=player();if(Math.hypot(x-user.x,y-user.y)<space)return true;
      return npcs.some(other=>other!==p&&!other.hidden&&Number.isFinite(other.x)&&Number.isFinite(other.y)&&Math.hypot(x-other.x,y-other.y)<space);
    }
    function safePoint(x,y,p,radius=60,avoidPeople=false){
      const safe=(xx,yy)=>api.inside(xx,yy)&&(!avoidPeople||!occupied(xx,yy,p));
      if(safe(x,y))return {x,y};
      for(let r=10;r<=radius;r+=10)for(let dy=-r;dy<=r;dy+=10)for(let dx=-r;dx<=r;dx+=10){if(Math.abs(dx)!==r&&Math.abs(dy)!==r)continue;if(safe(x+dx,y+dy))return {x:x+dx,y:y+dy};}
      return null;
    }
    const duplicateStart=npcs.length>1&&npcs.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&distance(p,npcs[0])<1);
    npcs.forEach((p,index)=>{
      const profile=profileFor(p,index),state={profile,index,next:0,target:null,replanIn:index*.09,retries:0,blocked:0,chat:false,lastLine:'',greetings:0,wasActivity:'waiting',targetSerial:0};states.set(p,state);
      p.id=p.id||profile.id;p.name=profile.name;p.personality=profile.description;p.facing=p.facing||'down';p.walking=false;p.conversation=false;p.phase=Number.isFinite(p.phase)?p.phase:0;
      p.route=[];p.routeKey='';p.arrived=false;p.mode='wander';p.activity='waiting';p.wait=0;p.goal=profile.favorite;
      const [sx,sy]=SEEDS[index%SEEDS.length],initial=duplicateStart||!Number.isFinite(p.x)||!Number.isFinite(p.y)?{x:sx,y:sy}:p;
      const point=safePoint(initial.x,initial.y,p,100,true)||safePoint(sx,sy,p,150,true);
      if(point){p.x=point.x;p.y=point.y;p.hidden=false;}else{p.hidden=true;state.replanIn=2;}
    });

    function games(){return (api.getGames?.()||[]).filter(g=>Number.isFinite(g.npcX??g.x)&&Number.isFinite(g.npcY??g.y));}
    function chooseTarget(p,available){
      const state=states.get(p),profile=state.profile;
      for(let attempt=0;attempt<profile.sequence.length+1;attempt++){
        const mode=profile.sequence[state.next++%profile.sequence.length];
        if(mode==='cabinet'){
          const candidates=available.slice().sort((a,b)=>(a.index===profile.favorite?-1:b.index===profile.favorite?1:0));
          for(const game of candidates){
            if(npcs.some(other=>other!==p&&states.get(other)?.target?.mode==='cabinet'&&states.get(other).target.gameIndex===game.index))continue;
            const point=safePoint(game.npcX??game.x,game.npcY??game.y,p,30);
            if(!point||occupied(point.x,point.y,p))continue;
            state.target={...point,mode,gameIndex:game.index,label:game.name};p.goal=game.index;break;
          }
        }else{
          const points=DESTINATIONS[mode];
          for(let j=0;j<points.length;j++){
            const raw=points[(state.index+state.targetSerial+j)%points.length],point=safePoint(raw[0],raw[1],p,40);
            if(!point)continue;
            if(npcs.some(other=>other!==p&&states.get(other)?.target&&distance(states.get(other).target,point)<PERSON_SPACE))continue;
            state.target={...point,mode};break;
          }
        }
        if(state.target){p.mode=state.target.mode;p.arrived=false;p.wait=0;p.route=[];p.routeKey='';state.targetSerial++;state.retries=0;state.blocked=0;return true;}
      }
      p.walking=false;p.activity='waiting';state.replanIn=1.5;return false;
    }
    function releaseTarget(p,delay=.2){const state=states.get(p);state.target=null;p.route=[];p.routeKey='';p.arrived=false;p.walking=false;p.activity='waiting';p.wait=0;state.replanIn=delay;}
    function despawnBlocked(p){
      const state=states.get(p);
      if(state.chat)endConversation();
      p.hidden=true;p.conversation=false;releaseTarget(p,.6+state.index*.03);state.retries=0;state.blocked=0;
    }
    function entryPoint(p,state){
      const seeds=[SEEDS[state.index%SEEDS.length],[1450,752],...SEEDS];
      for(const [x,y]of seeds){const point=safePoint(x,y,p,100,true);if(point)return point;}
      return null;
    }
    function arrive(p){
      const state=states.get(p);p.route=[];p.arrived=true;p.walking=false;p.activity=ACTIVITY[p.mode]||'waiting';state.blocked=0;
      p.wait=p.mode==='cabinet'?7+state.index%4:p.mode==='lounge'?8+state.index%5:p.mode==='dance'?9+state.index%5:2+state.index%3;
      if(p.mode==='cabinet')p.facing='up';else if(p.mode==='dance')p.facing='down';
    }
    function failedRoute(p){
      const state=states.get(p);p.route=[];p.routeKey='';p.walking=false;p.activity='waiting';state.retries++;state.replanIn=.7+state.index*.12;
      if(state.retries>=2)releaseTarget(p,1+state.index*.1);
    }
    function refreshCabinet(p,available){
      const state=states.get(p),target=state.target;if(target?.mode!=='cabinet')return;
      const game=available.find(g=>g.index===target.gameIndex);
      if(!game){releaseTarget(p,.1);return;}
      const desired={x:game.npcX??game.x,y:game.npcY??game.y};
      if(distance(target,desired)>6){
        const point=safePoint(desired.x,desired.y,p,30);if(!point){releaseTarget(p,.5);return;}
        state.target={...target,...point,label:game.name};p.route=[];p.routeKey='';p.arrived=false;p.wait=0;state.replanIn=Math.min(state.replanIn,.25);state.retries=0;
      }
    }
    function tryStep(p,dx,dy){
      const x=p.x+dx,y=p.y+dy;
      if(!api.inside(x,y)||occupied(x,y,p))return false;
      p.x=x;p.y=y;return true;
    }
    function walk(p,dt){
      const state=states.get(p),target=state.target;
      if(distance(p,target)<=ARRIVAL){arrive(p);return;}
      if(!p.route.length){
        if(state.replanIn>0||routeBudget<=0)return;
        routeBudget--;
        const route=api.route(p.x,p.y,target.x,target.y);
        p.route=Array.isArray(route)?route.filter(point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y)).map(point=>({x:point.x,y:point.y})):[];
        p.routeKey=target.mode+':'+(target.gameIndex??'')+':'+target.x.toFixed(1)+':'+target.y.toFixed(1);
        if(!p.route.length){if(distance(p,target)<=ARRIVAL)arrive(p);else failedRoute(p);return;}
      }
      while(p.route.length&&distance(p,p.route[0])<1)p.route.shift();
      if(!p.route.length){if(distance(p,target)<=ARRIVAL)arrive(p);else failedRoute(p);return;}
      const point=p.route[0],dx=point.x-p.x,dy=point.y-p.y,dist=Math.hypot(dx,dy),step=Math.min(state.profile.speed*dt,dist),steps=Math.max(1,Math.ceil(step/3)),before={x:p.x,y:p.y};
      let wall=false;
      for(let i=0;i<steps;i++){
        const mx=dx/dist*step/steps,my=dy/dist*step/steps;
        if(tryStep(p,mx,my))continue;
        wall=!api.inside(p.x+mx,p.y+my);break;
      }
      let moved=distance(before,p);
      if(moved<.01){
        state.blocked+=dt;
        // A patient sidestep can let another visitor or the player pass.
        if(!wall&&state.blocked>.4){const side=state.index%2?1:-1,amount=Math.min(2,state.profile.speed*dt);if(!tryStep(p,-dy/dist*amount*side,dx/dist*amount*side))tryStep(p,dy/dist*amount*side,-dx/dist*amount*side);moved=distance(before,p);}
        if(wall||state.blocked>1.6){p.route=[];p.routeKey='';state.replanIn=.45+state.index*.09;state.blocked=0;state.retries++;if(state.retries>=3)releaseTarget(p,1);}
      }else state.blocked=0;
      p.walking=moved>.01;p.activity=p.walking?'walking':'waiting';
      if(p.walking){facing(p,p.x-before.x,p.y-before.y);p.phase+=moved/7;p.walked=(p.walked||0)+moved;}
      if(p.route.length&&distance(p,p.route[0])<1)p.route.shift();
      if(distance(p,target)<=ARRIVAL)arrive(p);
    }
    function update(dt){
      if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.25);routeBudget=2;tick++;
      const available=games(),start=tick%npcs.length;
      for(let i=0;i<npcs.length;i++){
        const p=npcs[(start+i)%npcs.length],state=states.get(p);p.walking=false;state.replanIn=Math.max(0,state.replanIn-dt);
        if(!p.hidden&&!api.inside(p.x,p.y)){despawnBlocked(p);continue;}
        if(p.hidden){if(!state.replanIn){const point=entryPoint(p,state);if(point){p.x=point.x;p.y=point.y;p.hidden=false;}else state.replanIn=2;}continue;}
        if(state.chat){p.activity='chatting';const user=player();facing(p,user.x-p.x,user.y-p.y);continue;}
        refreshCabinet(p,available);
        if(state.target&&p.arrived){
          if(!api.inside(p.x,p.y)){releaseTarget(p,.5);continue;}
          p.wait=Math.max(0,p.wait-dt);p.activity=ACTIVITY[p.mode]||'waiting';if(p.wait>0)continue;releaseTarget(p,0);
        }
        if(!state.target){if(state.replanIn>0)continue;if(!chooseTarget(p,available))continue;}
        walk(p,dt);
      }
    }

    function getConversation(value){
      const p=find(value);if(!p)return null;const state=states.get(p),profile=state.profile;
      return {id:p.id,name:p.name,description:profile.description,activity:p.activity,fictional:true,line:state.lastLine||profile.greetings[0],choices:[{id:'music',label:'Tell me about your music'},{id:'activity',label:'What are you doing?'},{id:'advice',label:'Give me a musical tip'},{id:'games',label:'Which game do you like?'}]};
    }
    function say(value,topic='greeting'){
      const p=find(value);if(!p)return '';const state=states.get(p),profile=state.profile;
      if(topic==='greeting')state.lastLine=profile.greetings[state.greetings++%profile.greetings.length];
      else if(topic==='activity'){
        const activity=state.chat?state.wasActivity:p.activity;
        state.lastLine=activity==='playing'?'I am exploring '+(state.target?.label||'an arcade game')+'. '+profile.games:activity==='dancing'?'I am trying out a rhythm on the dance floor. '+profile.advice:activity==='relaxing'?'I am taking a moment in the lounge to listen and think. '+profile.music:state.target?.mode==='cabinet'?'I am on my way to '+state.target.label+'. '+profile.games:'I am exploring the arcade and listening for a new idea. '+profile.advice;
      }else state.lastLine=profile[topic]||profile.advice;
      return state.lastLine;
    }
    function endConversation(){
      if(!conversation)return;const p=conversation,state=states.get(p);state.chat=false;p.conversation=false;p.activity=p.arrived?(ACTIVITY[p.mode]||'waiting'):'waiting';p.walking=false;conversation=null;
    }
    function beginConversation(value){
      const p=find(value);if(!p||p.hidden)return null;if(conversation&&conversation!==p)endConversation();
      const state=states.get(p);if(!state.chat)state.wasActivity=p.activity;state.chat=true;p.conversation=true;conversation=p;p.walking=false;p.activity='chatting';const user=player();facing(p,user.x-p.x,user.y-p.y);say(p);return getConversation(p);
    }
    function invalidateRoutes(){
      for(const p of npcs){const state=states.get(p);if(!p.hidden&&!api.inside(p.x,p.y)){despawnBlocked(p);continue;}p.route=[];p.routeKey='';p.walking=false;if(!p.hidden)state.replanIn=state.index*.05;state.blocked=0;state.retries=0;if(p.arrived&&state.target){p.arrived=false;p.wait=0;p.activity=state.chat?'chatting':'waiting';}}
    }
    function snapshot(){return npcs.map(p=>{const state=states.get(p);return {id:p.id,name:p.name,description:state.profile.description,x:p.x,y:p.y,facing:p.facing,walking:p.walking,phase:p.phase,activity:p.activity,mode:p.mode,arrived:p.arrived,hidden:p.hidden,wait:p.wait,conversation:state.chat,target:state.target?{...state.target}:null,routeLength:p.route.length};});}
    return {update,beginConversation,endConversation,say,getConversation,invalidateRoutes,snapshot};
  };
})();
