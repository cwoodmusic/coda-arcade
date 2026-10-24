/* Bake the original arcade atlas into aligned, customizable animation layers.
 * Runtime characters only select, tint and blit these PNG frames. */
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn}=require('node:child_process');
async function main(){
 const root=path.resolve(__dirname,'../assets/characters');await fs.mkdir(root,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{
  if(req.method==='POST'&&/^\/output\/[a-z0-9-]+\.png$/.test(req.url)){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);await fs.writeFile(path.join(root,path.basename(req.url)),Buffer.concat(chunks));res.end('ok');return;
  }
  if(req.url==='/original.png'){res.setHeader('Content-Type','image/png');res.end(await fs.readFile(path.resolve(root,'../../coda_arcade_phase73_characters.png')));return;}
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Sprite asset baker</title>');return;}
  res.writeHead(404);res.end();
 }catch(error){res.writeHead(500);res.end(error.message);}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,profile=await fs.mkdtemp(path.join(os.tmpdir(),'coda-sprite-baker-'));
 const chrome=spawn('/usr/bin/chromium',['--headless','--no-sandbox','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});let socket;
 try{
  let port;for(let attempt=0;attempt<100;attempt++){try{port=(await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}
  if(!port)throw Error('Chromium did not start');
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;const jobs=new Map(),events=new Map();
  socket.addEventListener('message',event=>{const value=JSON.parse(event.data);if(value.id){const job=jobs.get(value.id);if(!job)return;jobs.delete(value.id);clearTimeout(job.timer);value.error?job.reject(Error(value.error.message)):job.resolve(value.result);}else events.get(value.method)?.(value.params);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id,timer=setTimeout(()=>reject(Error('Timed out: '+method)),120000);jobs.set(requestId,{resolve,reject,timer});socket.send(JSON.stringify({id:requestId,method,params}));});
  await send('Page.enable');const loaded=new Promise(resolve=>events.set('Page.loadEventFired',resolve));await send('Page.navigate',{url:origin});await loaded;
  const result=await send('Runtime.evaluate',{expression:'window.buildOriginalSpriteLayers='+require('./original-sprite-layers.cjs').toString()+';window.buildOriginalWardrobeLayers='+require('./original-wardrobe-layers.cjs').toString()+';window.buildOriginalAccessoryLayers='+require('./original-accessory-layers.cjs').toString()+';('+bake.toString()+')()',awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  const manifest=result.result.value;await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({frames:112,cell:manifest.cell,atlases:manifest.artifacts.length,variants:manifest.layers,source:'One original arcade atlas for every character and wardrobe layer'},null,2));
 }finally{socket?.close();chrome.kill('SIGTERM');server.close();await new Promise(resolve=>chrome.once('exit',resolve));await fs.rm(profile,{recursive:true,force:true});}
}
async function bake(){
 const W=80,H=96,COLS=8,PERDIR=28,anchor=[40,88],directions=['down','left','up','right'];
 const make=(w=W,h=H)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
 const ctx=c=>c.getContext('2d',{willReadFrequently:true});
 const copy=c=>{const out=make(c.width,c.height);ctx(out).drawImage(c,0,0);return out;};
 const original=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Original atlas could not load'));image.src='/original.png';});
 const originalRects={down:[[16,5,47,69],[97,5,45,69],[178,5,44,69],[259,5,42,69],[338,5,44,69]],left:[[816,5,47,69],[896,5,47,69],[16,85,47,69],[96,85,47,69],[176,85,47,69]],up:[[416,6,47,67],[497,6,45,67],[578,6,44,67],[658,6,43,67],[739,6,42,67]],right:[[256,85,47,69],[336,85,47,69],[416,85,47,69],[496,85,47,69],[576,85,47,69]]},heroFrames={};
 for(const direction of directions)originalRects[direction].forEach(([x,y,w,h],index)=>heroFrames['hero_'+direction+'_'+index]={x,y,w,h});
 const head=window.buildOriginalSpriteLayers({atlas:original,cell:[W,H],anchor,heroFrames});
 const wardrobe=Array.from({length:5},(_,frameIndex)=>window.buildOriginalWardrobeLayers({atlas:original,cell:[W,H],anchor,heroFrames,frameIndex}));
 const props=window.buildOriginalAccessoryLayers({atlas:original,cell:[W,H],anchor,heroFrames,headLayers:head});
 const clips={idle:{offset:0,frames:2,fps:2},walk:{offset:2,frames:6,fps:8},wave:{offset:8,frames:4,fps:8},dance:{offset:12,frames:6,fps:8},interact:{offset:18,frames:4,fps:6},talk:{offset:22,frames:4,fps:6},sit:{offset:26,frames:2,fps:2}};
 const manifest={version:1,cell:[W,H],anchor,columns:COLS,framesPerDirection:PERDIR,directions,clips,artStyle:'original-atlas',sourcePolicy:'original-atlas-only',targetHeight:53,originalHero:{url:'../../coda_arcade_phase73_characters.png',frames:heroFrames},styleReference:'coda_arcade_phase73_characters.png',sharedHead:head.metadata,sourceArtwork:['coda_arcade_phase73_characters.png'],layers:{body:{url:'body.png',layout:'animated',material:'skin',source:'original-atlas'},hair:{},outfit:{},headwear:{},eyewear:{},accessory:{},shoes:{},original:{hero:{url:'original-hero.png',layout:'animated',material:'none',source:'original-atlas'}}},frameData:[],artifacts:[]};
 function nativeFrame(index,dir){const f=heroFrames['hero_'+directions[dir]+'_'+index],out=make();ctx(out).drawImage(original,f.x,f.y,f.w,f.h,Math.round(40-f.w/2),88-f.h,f.w,f.h);return out;}
 function fitInfo(info){const [left,top]=info.placement,height=info.bottom-top+1,width=Math.min(39,53*info.source.w/height),sx=Math.round(width)/info.source.w,sy=53/height;return {sx,sy,tx:Math.round(40-width/2)-left*sx,ty:35-top*sy,width:Math.round(width)};}
 const idleFits=wardrobe[0].metadata.frames.map(fitInfo);
 function fit(native,info){const out=make(),g=ctx(out),matrix=fitInfo(info);g.imageSmoothingEnabled=false;g.setTransform(matrix.sx,0,0,matrix.sy,matrix.tx,matrix.ty);g.drawImage(native,0,0);return out;}
 const capEnds=[27,22,27,15],faceEnds=[42,35,41,29];
 const referenceSkin=ctx(nativeFrame(0,0)).getImageData(0,0,W,H).data,defaultSkinPalette=[];
 for(let y=45;y<62;y++)for(let x=26;x<55;x++){const at=(y*W+x)*4,r=referenceSkin[at],green=referenceSkin[at+1],b=referenceSkin[at+2];if(referenceSkin[at+3]&&r>green*1.15&&green>b*1.12&&green>70&&r<green*1.9)defaultSkinPalette.push([r,green,b]);}
 defaultSkinPalette.sort((a,b)=>Math.max(...a)-Math.max(...b));
 const rawBodies=Array.from({length:5},(_,index)=>directions.map((_,dir)=>{
  const info=wardrobe[index].metadata.frames[dir],f=info.source,source=nativeFrame(index,dir),out=copy(source),g=ctx(out),top=info.placement[1];
  if(info.groundStart!==null)g.clearRect(0,info.groundStart,W,H-info.groundStart);
  g.clearRect(0,0,W,top+capEnds[dir]);
  // Missing scalp pixels use the original cap's rounded mask and an actual
  // original-face palette. Eyes, mouth, arms and body remain source pixels.
  const dome=make(31,22),dg=ctx(dome),idle=heroFrames.hero_down_0;
  dg.imageSmoothingEnabled=false;dg.drawImage(original,idle.x,idle.y,idle.w,20,0,0,31,22);
  const skin=dg.getImageData(0,0,31,22),face=ctx(source).getImageData(0,0,W,H).data,palette=[];
  for(let y=top+capEnds[dir];y<=top+faceEnds[dir];y++)for(let x=25;x<56;x++){const at=(y*W+x)*4,r=face[at],green=face[at+1],b=face[at+2];if(face[at+3]&&r>green*1.15&&green>b*1.12&&green>70&&r<green*1.9)palette.push([r,green,b]);}
  if(!palette.length)palette.push(...defaultSkinPalette);
  palette.sort((a,b)=>Math.max(...a)-Math.max(...b));
  for(let at=0;at<skin.data.length;at+=4){if(!skin.data[at+3])continue;const value=Math.max(skin.data[at],skin.data[at+1],skin.data[at+2])/255;if(value<.15)continue;const shade=palette[Math.min(palette.length-1,Math.floor((.25+value*.7)*palette.length))];for(let channel=0;channel<3;channel++)skin.data[at+channel]=shade[channel];}
  dg.putImageData(skin,0,0);const headWindow=head.metadata.headWindows[dir];g.save();g.beginPath();g.rect(info.placement[0],top,f.w,headWindow.h);g.clip();g.drawImage(dome,25,Math.max(top,top+capEnds[dir]-18));g.restore();
  const faceTop=top+capEnds[dir];g.drawImage(source,0,faceTop,W,H-faceTop,0,faceTop,W,H-faceTop);
  // The base is bald: old blue hair outside the protected original face is
  // replaced with original skin samples. Every hairstyle is a separate layer.
  const basePixels=g.getImageData(0,0,W,H),baseAlpha=basePixels.data.slice(),faceWindow=head.metadata.faceWindows[dir];
  for(let y=top;y<Math.min(H,top+headWindow.h+1);y++)for(let x=info.placement[0];x<Math.min(W,info.placement[0]+f.w);x++){
   const at=(y*W+x)*4;if(!basePixels.data[at+3])continue;
   if(faceWindow&&x>=faceWindow.x&&x<=faceWindow.right&&y>=faceWindow.y&&y<=faceWindow.bottom)continue;
   const r=basePixels.data[at],green=basePixels.data[at+1],b=basePixels.data[at+2];if(!(b>r*1.1&&b>green*1.05))continue;
   const value=Math.max(r,green,b)/255;let edge=false;
   for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy;if(xx<0||xx>=W||yy<0||yy>=H||!baseAlpha[(yy*W+xx)*4+3])edge=true;}
   if(edge&&value<.15)continue;
   const shade=palette[Math.min(palette.length-1,Math.floor((.12+value*.78)*palette.length))];for(let c=0;c<3;c++)basePixels.data[at+c]=shade[c];
  }
  g.putImageData(basePixels,0,0);
  if(info.groundStart!==null)g.clearRect(0,info.groundStart,W,H-info.groundStart);return out;
 }));
 const sourcePose={idle:[0,0],walk:[0,1,2,3,4,1],wave:[0,3,4,3],talk:[0,3,0,4],dance:[1,3,2,4,1,3],interact:[0,1,0,2],sit:[0,0]},rig=[];
 for(let dir=0;dir<4;dir++)for(const [clip,definition]of Object.entries(clips))for(let frame=0;frame<definition.frames;frame++){
  const sourceIndex=sourcePose[clip][frame],info=wardrobe[sourceIndex].metadata.frames[dir],matrix=fitInfo(info),idle=wardrobe[0].metadata.frames[dir],idleMatrix=idleFits[dir];
  const dx=clip==='dance'?Math.round(Math.sin(frame/6*Math.PI*2)):0,dy=clip==='dance'?-Math.round(Math.abs(Math.sin(frame/6*Math.PI*2))):clip==='idle'&&frame===1?-1:0;
  const ratioX=info.source.w/idle.source.w,ratioY=info.source.h/idle.source.h,sx=matrix.sx*ratioX/idleMatrix.sx,sy=matrix.sy*ratioY/idleMatrix.sy;
  const tx=matrix.sx*(info.placement[0]-idle.placement[0]*ratioX)+matrix.tx-sx*idleMatrix.tx+dx;
  const ty=matrix.sy*(info.placement[1]-idle.placement[1]*ratioY)+matrix.ty-sy*idleMatrix.ty+dy;
  const offsetX=tx+40*(sx-1),offsetY=ty+88*(sy-1)+(clip==='sit'?3:0);
  manifest.frameData.push({headX:offsetX,headY:offsetY,headScaleX:sx,headScaleY:sy,bodyX:offsetX,bodyY:offsetY,bodyScaleX:sx,bodyScaleY:sy,handX:offsetX,handY:offsetY+(sourceIndex%2?-1:0),handScaleX:sx,handScaleY:sy});
  rig.push({dir,clip,frame,sourceIndex,info,matrix,dx,dy});
 }
 function posed(native,r){const source=fit(native,r.info),out=make(),g=ctx(out);g.imageSmoothingEnabled=false;
  if(r.clip==='sit'){const split=Math.min(82,Math.round(r.info.waist*r.matrix.sy+r.matrix.ty)+2);g.drawImage(source,0,0,W,split,0,3,W,split);g.drawImage(source,0,split,W,88-split,0,split+3,W,85-split);}
  else g.drawImage(source,r.dx,r.dy);return out;
 }
 async function write(name,canvas){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png')),response=await fetch('/output/'+name+'.png',{method:'POST',body:blob});if(!response.ok)throw Error('Cannot save '+name);manifest.artifacts.push({file:name+'.png',width:canvas.width,height:canvas.height});}
 async function animated(name,cells){const out=make(W*COLS,H*14),g=ctx(out);cells.forEach((cell,index)=>g.drawImage(cell,index%COLS*W,Math.floor(index/COLS)*H));await write(name,out);}
 async function directional(name,cells){const out=make(W*4,H),g=ctx(out);cells.forEach((cell,dir)=>g.drawImage(fit(cell,wardrobe[0].metadata.frames[dir]),dir*W,0));await write(name,out);}
 await animated('body',rig.map(r=>posed(rawBodies[r.sourceIndex][r.dir],r)));
 const originalActions=rig.map(r=>{const f=heroFrames['hero_'+directions[r.dir]+'_'+r.sourceIndex],out=make(),g=ctx(out),width=Math.min(39,53*f.w/f.h);g.imageSmoothingEnabled=false;g.drawImage(original,f.x,f.y,f.w,f.h,Math.round(40-width/2)+r.dx,35+r.dy,Math.round(width),53);return out;});
 await animated('original-hero',originalActions);
 for(const [id,views]of Object.entries(head.hair)){manifest.layers.hair[id]={url:'hair-'+id+'.png',layout:'directional',material:'hair',source:'original-atlas'};await directional('hair-'+id,views);}
 for(const id of Object.keys(wardrobe[0].outfit)){manifest.layers.outfit[id]={url:'outfit-'+id+'.png',layout:'animated',material:id==='pants'?'original-clothes':'clothes',source:'original-atlas'};await animated('outfit-'+id,rig.map(r=>posed(wardrobe[r.sourceIndex].outfit[id][r.dir],r)));}
 for(const id of Object.keys(wardrobe[0].shoes)){manifest.layers.shoes[id]={url:'shoes-'+id+'.png',layout:'animated',material:'none',source:'original-atlas'};await animated('shoes-'+id,rig.map(r=>posed(wardrobe[r.sourceIndex].shoes[id][r.dir],r)));}
 for(const category of ['headwear','eyewear','accessory'])for(const [id,views]of Object.entries(props[category])){manifest.layers[category][id]={url:category+'-'+id+'.png',layout:'directional',material:'none',source:'original-atlas'};await directional(category+'-'+id,views);}
 return manifest;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
