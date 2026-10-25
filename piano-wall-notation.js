/* Pitch-only challenge scores for the Piano Lab's back wall. Bravura is bundled. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CodaPianoWallNotation=api;})(typeof window==='undefined'?null:window,function(root){
 'use strict';
 const LETTERS=['C','D','E','F','G','A','B'],NATURALS={C:0,D:2,E:4,F:5,G:7,A:9,B:11},DEFAULTS=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
 const CODES={gClef:0xe050,fClef:0xe062,noteQuarterUp:0xe1d5,noteQuarterDown:0xe1d6,sharp:0xe262,flat:0xe260,natural:0xe261};
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n)),finite=(n,fallback)=>Number.isFinite(n)?n:fallback;
 function pitch(midi,spelling){
  const fallback=DEFAULTS[((midi%12)+12)%12],match=typeof spelling==='string'?/^([A-G])([♭b♯#]?)$/.exec(spelling):null;
  const name=match?match[1]+(match[2]==='b'?'♭':match[2]==='#'?'♯':match[2]):fallback,letter=name[0],delta=name.includes('♯')?1:name.includes('♭')?-1:0;
  const octave=Math.round((midi-12-NATURALS[letter]-delta)/12);
  // Discard an incompatible spelling rather than moving a note to a false line.
  if(12*(octave+1)+NATURALS[letter]+delta!==midi)return pitch(midi);
  return {midi,label:name,letter,diatonic:octave*7+LETTERS.indexOf(letter),accidental:delta===1?'sharp':delta===-1?'flat':null};
 }
 function ledgerLines(position){const lines=[];if(position<0)for(let at=-2;at>=position;at-=2)lines.push(at);if(position>8)for(let at=10;at<=position;at+=2)lines.push(at);return lines;}
 function createScore(options={}){
  const source=Array.isArray(options.notes)?options.notes:[],notes=source.filter(midi=>Number.isInteger(midi)&&midi>=0&&midi<=127),total=notes.length,step=clamp(Math.floor(finite(options.step,0)),0,total),memory=options.mode==='memory';
  const end=memory?step:Math.min(total,(Math.floor(Math.min(step,Math.max(0,total-1))/6)+1)*6),start=memory?Math.max(0,end-6):Math.floor(Math.min(step,Math.max(0,total-1))/6)*6;
  const visible=notes.slice(start,end).map((midi,at)=>({...pitch(midi,options.spellings?.[start+at]),index:start+at}));
  const sorted=visible.map(note=>note.midi).sort((a,b)=>a-b),clef=sorted.length&&sorted[Math.floor(sorted.length/2)]<60?'bass':'treble',base=clef==='bass'?18:30,accidentals=new Map();
  // Natural signs cancel an earlier accidental on the same staff pitch. Keeping
  // this context across pages preserves the exact pitch when the window moves.
  for(let index=0;index<start;index++){const note=pitch(notes[index],options.spellings?.[index]);accidentals.set(note.diatonic,note.accidental);}
  const prepared=visible.map(note=>{const previous=accidentals.get(note.diatonic),accidental=note.accidental||previous?'natural':null;accidentals.set(note.diatonic,note.accidental);const position=note.diatonic-base;return {...note,accidental:note.accidental||accidental,position,ledgerLines:ledgerLines(position),status:note.index<step?'done':note.index===step?'current':'upcoming'};});
  return {mode:memory?'memory':options.mode||'melody',label:memory?'From memory':typeof options.label==='string'?options.label.slice(0,90):'Play these notes',clef,notes:prepared,step,total,start,end,complete:step>=total&&total>0,answerHidden:memory};
 }
 function draw(ctx,options={}){
  if(!ctx||!options.score)return null;const score=options.score,x=finite(options.x,286),y=finite(options.y,72),width=Math.max(120,finite(options.width,428)),height=Math.max(80,finite(options.height,120)),notation=root?.CodaMusicNotation,family=notation?.FAMILY||'CodaBravura';
  const symbol=name=>notation?.glyph?.(name)||String.fromCodePoint(CODES[name]);
  ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();ctx.fillStyle='#102938';ctx.fillRect(x,y,width,height);ctx.strokeStyle='#86ecd9';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,width-2,height-2);
  const scale=Math.min(1,width/428,height/120);ctx.translate(x,y);ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='bold '+Math.max(10,12*scale)+'px system-ui';ctx.fillStyle='#e9ffe8';
  const title=score.label||'Play these notes',maxTitle=Math.max(12,Math.floor(width/(7*scale)));ctx.fillText(title.length>maxTitle?title.slice(0,maxTitle-1)+'…':title,10,height*.16);
  const topLimit=height*.30,bottomLimit=height*.77,positions=score.notes.map(note=>note.position),topExtent=Math.max(8,...positions.map(position=>position+(position<4?7:1))),bottomExtent=Math.min(0,...positions.map(position=>position-(position>=4?7:1)));
  const space=Math.min(9*scale,(bottomLimit-topLimit)*2/Math.max(8,topExtent-bottomExtent)),baseline=topLimit+topExtent*space/2,staffLeft=12,staffRight=width-12;
  ctx.strokeStyle='#83a2b2';ctx.lineWidth=Math.max(.7,scale);ctx.beginPath();for(let line=0;line<5;line++){const yy=baseline-line*space;ctx.moveTo(staffLeft,yy);ctx.lineTo(staffRight,yy);}ctx.stroke();
  const fontSize=4*space;ctx.font=fontSize+'px "'+family+'"';ctx.fillStyle='#e7f6ff';ctx.fillText(symbol(score.clef==='bass'?'fClef':'gClef'),15,baseline-(score.clef==='bass'?3:1)*space);
  const left=Math.max(56*scale,43),right=width-24*scale,spacing=(right-left)/Math.max(1,score.notes.length-1),points=[];
  for(let at=0;at<score.notes.length;at++){
   const note=score.notes[at],xx=score.notes.length===1?(left+right)/2:left+at*spacing,yy=baseline-note.position*space/2,current=note.status==='current',color=note.status==='done'?'#9ae8b4':current?'#fff2a2':'#dce8f7';
   if(current){ctx.save();ctx.globalAlpha=options.reducedMotion?1:.8+Math.sin(finite(options.time,0)*4)*.2;ctx.fillStyle='#206d78';ctx.beginPath();ctx.arc(xx,yy,space*.95,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f9df7d';ctx.lineWidth=1.6;ctx.stroke();ctx.restore();}
   ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,scale);ctx.beginPath();for(const line of note.ledgerLines){const lineY=baseline-line*space/2;ctx.moveTo(xx-space,lineY);ctx.lineTo(xx+space,lineY);}ctx.stroke();
   ctx.font=fontSize+'px "'+family+'"';ctx.fillStyle=color;ctx.fillText(symbol(note.position>=4?'noteQuarterDown':'noteQuarterUp'),xx-fontSize*.166,yy);
   if(note.accidental)ctx.fillText(symbol(note.accidental),xx-space*2.0,yy);
   if(options.showNames===true){ctx.font='bold '+Math.max(9,10*scale)+'px system-ui';ctx.textAlign='center';ctx.fillText(note.label,xx,height-16*scale);ctx.textAlign='left';}
   points.push({index:note.index,midi:note.midi,x:x+xx,y:y+yy,status:note.status});
  }
  if(!score.notes.length){ctx.font='bold '+Math.max(10,12*scale)+'px system-ui';ctx.fillStyle='#b5dfdf';ctx.textAlign='center';ctx.fillText(score.answerHidden?'Play the melody from memory':'Choose a challenge with Chopin',width*.58,height*.54);ctx.textAlign='left';}
  ctx.font=Math.max(9,10*scale)+'px system-ui';ctx.fillStyle='#c7dce7';ctx.fillText(score.answerHidden?'Your played notes':score.complete?'Beautifully played!':'Play at your own speed',10,height-5*scale);ctx.textAlign='right';ctx.fillText(score.step+' / '+score.total,width-10,height-5*scale);ctx.restore();
  return {x,y,width,height,clef:score.clef,notes:points};
 }
 return Object.freeze({createScore,draw,pitch,ledgerLines});
});
