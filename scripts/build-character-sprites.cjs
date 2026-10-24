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
  if(!/^\/source\/[a-z0-9-]+\.png$/.test(req.url)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type','image/png');res.end(await fs.readFile(path.join(root,req.url.slice(1))));
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
  const result=await send('Runtime.evaluate',{expression:'window.buildOriginalSpriteLayers='+require('./original-sprite-layers.cjs').toString()+';('+bake.toString()+')()',awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  const manifest=result.result.value;await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({frames:112,cell:manifest.cell,atlases:manifest.artifacts.length,variants:manifest.layers,source:'Original arcade atlas pixels, with layered wardrobe pieces'},null,2));
 }finally{socket?.close();chrome.kill('SIGTERM');server.close();await new Promise(resolve=>chrome.once('exit',resolve));await fs.rm(profile,{recursive:true,force:true});}
}
async function bake(){
 const W=80,H=96,COLS=8,PERDIR=28;
 const make=(w=W,h=H)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
 const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Cannot load '+src));img.src='/source/'+src+'.png';});
 const [outfitSource,hatSource,extrasSource,propsSource]=await Promise.all(['outfits','headwear','accessories','shoes-props'].map(load));
 const original=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Original atlas could not load'));image.src='/original.png';});
 const originalRects={down:[[16,5,47,69],[97,5,45,69],[178,5,44,69],[259,5,42,69],[338,5,44,69]],left:[[816,5,47,69],[896,5,47,69],[16,85,47,69],[96,85,47,69],[176,85,47,69]],up:[[416,6,47,67],[497,6,45,67],[578,6,44,67],[658,6,43,67],[739,6,42,67]],right:[[256,85,47,69],[336,85,47,69],[416,85,47,69],[496,85,47,69],[576,85,47,69]]};
 const directions=['down','left','up','right'],heroFrames={};
 for(const direction of directions)originalRects[direction].forEach(([x,y,w,h],index)=>heroFrames['hero_'+direction+'_'+index]={x,y,w,h});
 const headLayers=window.buildOriginalSpriteLayers({atlas:original,cell:[80,96],anchor:[40,88],heroFrames});
 const clips={idle:{offset:0,frames:2,fps:2},walk:{offset:2,frames:6,fps:8},wave:{offset:8,frames:4,fps:8},dance:{offset:12,frames:6,fps:8},interact:{offset:18,frames:4,fps:6},talk:{offset:22,frames:4,fps:6},sit:{offset:26,frames:2,fps:2}};
 const manifest={version:1,cell:[W,H],anchor:[40,88],columns:COLS,framesPerDirection:PERDIR,directions:['down','left','up','right'],artStyle:'original-atlas',targetHeight:53,originalHero:{url:'../../coda_arcade_phase73_characters.png',frames:heroFrames},styleReference:'coda_arcade_phase73_characters.png',clips,layers:{body:{url:'body.png',layout:'animated',material:'skin'},hair:{},outfit:{},headwear:{},eyewear:{},accessory:{},shoes:{}},frameData:[],artifacts:[]};
 const ctx=canvas=>canvas.getContext('2d',{willReadFrequently:true});
 function bounds(canvas){const p=ctx(canvas).getImageData(0,0,canvas.width,canvas.height).data;let x1=canvas.width,y1=canvas.height,x2=-1,y2=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(p[(y*canvas.width+x)*4+3]){x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);}return x2<0?null:{x:x1,y:y1,w:x2-x1+1,h:y2-y1+1};}
 const plates=new Map();
 function plate(image,rows){
  if(plates.has(image))return plates.get(image);
  const c=make(image.naturalWidth,image.naturalHeight),g=ctx(c);g.drawImage(image,0,0);
  const pixels=g.getImageData(0,0,c.width,c.height),xs=new Uint32Array(c.width),ys=new Uint32Array(c.height);
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
   const at=(y*c.width+x)*4+3,opaque=pixels.data[at]>=170;pixels.data[at]=opaque?255:0;
   if(opaque){xs[x]++;ys[y]++;}
  }
  g.putImageData(pixels,0,0);
  function bands(counts,expected){
   const runs=[];let start=-1;
   for(let at=0;at<=counts.length;at++){
    if(counts[at]>=3){if(start<0)start=at;}
    else if(start>=0){if(at-start>=3)runs.push([start,at]);start=-1;}
   }
   const merged=[];
   for(const run of runs){const previous=merged.at(-1);if(previous&&run[0]-previous[1]<=8)previous[1]=run[1];else merged.push(run);}
   if(merged.length!==expected)throw Error('Source plate has '+merged.length+' content bands; expected '+expected+'.');
   return merged.map(([lo,hi])=>[Math.max(0,lo-2),Math.min(counts.length,hi+2)]);
  }
  // Generated sheets have clear gutters but not perfectly uniform grid spacing.
  // Segment actual opaque content so a neighboring row cannot enter a cutout.
  const value={canvas:c,columns:bands(xs,4),rows:bands(ys,rows)};plates.set(image,value);return value;
 }
 function cell(image,row,col,rows){const source=plate(image,rows),[x,x2]=source.columns[col],[y,y2]=source.rows[row],c=make(x2-x,y2-y);ctx(c).drawImage(source.canvas,x,y,c.width,c.height,0,0,c.width,c.height);return c;}
 function place(source,rect){const c=make(),g=ctx(c),b=bounds(source);if(!b)return c;g.imageSmoothingEnabled=false;g.drawImage(source,b.x,b.y,b.w,b.h,rect.x,rect.y,rect.w,rect.h);return c;}
 const copy=c=>{const out=make(c.width,c.height);ctx(out).drawImage(c,0,0);return out;};
 const capEnds=[27,22,27,15],faceEnds=[42,35,41,29];
 function originalCell(row,dir){const f=heroFrames['hero_'+directions[dir]+'_'+row],out=make();ctx(out).drawImage(original,f.x,f.y,f.w,f.h,Math.round(40-f.w/2),88-f.h,f.w,f.h);return out;}
 function bodyCell(row,dir){
  const index=[0,1,3,0][row],f=heroFrames['hero_'+directions[dir]+'_'+index],source=originalCell(index,dir),out=copy(source),g=ctx(out),top=88-f.h;
  g.clearRect(0,0,W,top+capEnds[dir]);
  // Clone the original cap dome into a shaded bare scalp. The lower face,
  // small eyes, mouth, arms and body remain actual original atlas pixels.
  const dome=make(31,22),dg=ctx(dome),idle=heroFrames['hero_'+directions[dir]+'_0'];
  dg.imageSmoothingEnabled=false;dg.drawImage(original,idle.x,idle.y,idle.w,Math.max(9,capEnds[dir]-7),0,0,31,22);
  const skin=dg.getImageData(0,0,31,22);
  for(let at=0;at<skin.data.length;at+=4){if(!skin.data[at+3])continue;const v=Math.max(skin.data[at],skin.data[at+1],skin.data[at+2])/255;
   if(v<.15)continue;const shade=.68+v*.32;skin.data[at]=Math.round(231*shade);skin.data[at+1]=Math.round(173*shade);skin.data[at+2]=Math.round(111*shade);
  }
  dg.putImageData(skin,0,0);const scalpY=top+capEnds[dir]-18;
  g.drawImage(dome,25,scalpY);
  g.drawImage(source,0,top+capEnds[dir],W,H-(top+capEnds[dir]),0,top+capEnds[dir],W,H-(top+capEnds[dir]));
  if(row===3){
   // Friendly gestures reuse the original hand/forearm pixels, not a new face.
   const side=dir%2,sideRight=dir>=2,sx=side?(sideRight?27:43):(sideRight?50:20),px=side?(sideRight?36:44):(sideRight?52:28),py=top+faceEnds[dir]+4;
   const arm=copy(out);g.clearRect(sx,py,10,15);g.save();g.translate(px,py+2);g.rotate(sideRight?-2.05:2.05);g.drawImage(arm,sx,py,10,15,-5,0,10,15);g.restore();
  }
  return out;
 }
 const base=Array.from({length:4},(_,dir)=>Array.from({length:4},(_,row)=>bodyCell(row,dir)));
 function fitOriginal(native,dir){
  const f=heroFrames['hero_'+directions[dir]+'_0'],width=Math.min(39,53*f.w/f.h),out=make(),g=ctx(out),sx=Math.round(width)/f.w,sy=53/f.h;
  g.imageSmoothingEnabled=false;g.setTransform(sx,0,0,sy,Math.round(40-width/2)-Math.round(40-f.w/2)*sx,35-(88-f.h)*sy);g.drawImage(native,0,0);return out;
 }
 function pose(clip,frame){
  if(clip==='walk')return [0,1,1,0,2,2][frame];
  if(clip==='wave')return [0,3,3,3][frame];
  if(clip==='dance')return [3,1,3,3,2,3][frame];
  if(clip==='talk')return [0,3,0,0][frame];
  return 0;
 }
 const frames=[],rig=[],originalActions=[];
 for(let dir=0;dir<4;dir++)for(const [clip,definition]of Object.entries(clips))for(let frame=0;frame<definition.frames;frame++){
  // Profile interactions reuse the authored reaching arm instead of cutting the torso.
  const sourcePose=clip==='interact'&&dir%2?[0,3,0,3][frame]:pose(clip,frame),bob=clip==='walk'?[0,-1,-1,0,-1,-1][frame]:clip==='idle'&&frame===1?-1:clip==='dance'?-Math.round(Math.abs(Math.sin(frame/6*Math.PI*2))*2):0;
  const dx=clip==='dance'?Math.round(Math.sin(frame/6*Math.PI*2)*2):0,out=make(),g=ctx(out);
  g.imageSmoothingEnabled=false;g.drawImage(base[dir][sourcePose],dx,bob);
  if(clip==='interact'&&!(dir%2)){
   // Reuse raster forearms at new action positions; no geometric body painting.
   const arm=make(),ag=ctx(arm);ag.drawImage(out,0,0);const pieces=[[20,64,10,13,29,63,.85],[50,64,10,13,51,63,-.85]];
   for(const [sx,sy,sw,sh,px,py,angle]of pieces){g.clearRect(sx,sy,sw,sh);g.save();g.translate(px,py+(frame%2));g.rotate(angle);g.drawImage(arm,sx,sy,sw,sh,-sw/2,0,sw,sh);g.restore();}
  }
  if(clip==='sit'){const upper=make();ctx(upper).drawImage(out,0,0);g.clearRect(0,0,W,H);g.drawImage(upper,0,0,W,76,0,6,W,76);g.drawImage(upper,0,76,W,12,0,82,W,6);}
  const upperY=bob+(clip==='sit'?6:0);
  const actionFrames={walk:[0,1,2,3,4,1],wave:[0,3,4,3],talk:[0,3,0,4],dance:[1,3,2,4,1,3],interact:[0,1,0,2]};
  const originalIndex=actionFrames[clip]?.[frame]??0,f=heroFrames['hero_'+directions[dir]+'_'+originalIndex],classic=make(),cg=ctx(classic),displayWidth=Math.min(39,53*f.w/f.h);
  // Whole original poses preserve every body pixel. Cutting an arm out of a
  // finished sprite can erase its shirt, so canonical emotes never do that.
  cg.imageSmoothingEnabled=false;cg.drawImage(original,f.x,f.y,f.w,f.h,Math.round(40-displayWidth/2)+Math.round(dx*53/69),35+Math.round(bob*53/69),Math.round(displayWidth),53);
  originalActions.push(classic);
  frames.push(out);rig.push({dir,clip,frame,sourcePose,bob,dx});manifest.frameData.push({headX:dx*53/69,headY:upperY*53/69,bodyX:dx*53/69,bodyY:upperY*53/69,handX:(dx+(sourcePose===3?(dir<2?-16:12):0))*53/69,handY:(upperY+(sourcePose===3?-14:0))*53/69});
 }
 async function write(name,canvas){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const response=await fetch('/output/'+name+'.png',{method:'POST',body:blob});if(!response.ok)throw Error('Cannot save '+name);manifest.artifacts.push({file:name+'.png',width:canvas.width,height:canvas.height});}
 async function animated(name,cells,fit=true){const atlas=make(W*COLS,H*14),g=ctx(atlas);cells.forEach((cell,index)=>g.drawImage(fit?fitOriginal(cell,Math.floor(index/PERDIR)):cell,index%COLS*W,Math.floor(index/COLS)*H));await write(name,atlas);}
 async function directional(name,cells){const atlas=make(W*4,H),g=ctx(atlas);cells.forEach((cell,index)=>g.drawImage(fitOriginal(cell,index),index*W,0));await write(name,atlas);}
 await animated('body',frames);
 manifest.layers.original={hero:{url:'original-hero.png',layout:'animated',material:'none'}};
 await animated('original-hero',originalActions,false);
 const hairIds=['short','bob','long','curly','ponytail','spiky','bald','buns'];
 for(const id of hairIds){
  manifest.layers.hair[id]={url:'hair-'+id+'.png',layout:'directional',material:'hair'};
  await directional('hair-'+id,headLayers.hair[id]);
 }
 const isBlue=(r,g,b)=>b>r*1.23&&b>g*1.07&&b>45;
 const outfitIds=['pants','shorts','dress','overalls','suit','coat'];
 for(let row=0;row<outfitIds.length;row++){
  const id=outfitIds[row],neutral=Array.from({length:4},(_,dir)=>{const w=(id==='coat'?42:id==='dress'?43:38)*(dir%2?.72:1),h=id==='shorts'?19:id==='dress'?24:25;return place(cell(outfitSource,row,dir,6),{x:40-w/2,y:60,w,h});});
  const cells=rig.map((r,index)=>{
   if(id==='pants'){
    // The starter shirt, blue braces and trousers retain the original cut.
    // Switching skin/hair must not swap this garment for a generated vest.
    const index=[0,1,3,0][r.sourcePose],f=heroFrames['hero_'+directions[r.dir]+'_'+index],out=originalCell(index,r.dir),og=ctx(out),pixels=og.getImageData(0,0,W,H);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
     const at=(y*W+x)*4,red=pixels.data[at],green=pixels.data[at+1],blue=pixels.data[at+2];
     const skin=red>green*1.13&&green>blue*1.15&&green>45&&red<green*1.9;
     if(y<=88-f.h+faceEnds[r.dir]||y>=83||skin)pixels.data[at+3]=0;
    }
    og.putImageData(pixels,0,0);if(r.bob||r.dx){const saved=copy(out);og.clearRect(0,0,W,H);og.drawImage(saved,r.dx,r.bob);}return out;
   }
   const result=copy(neutral[r.dir]),g=ctx(result),p=g.getImageData(0,0,W,H),material=p.data.slice(),basePixels=ctx(base[r.dir][r.sourcePose]).getImageData(0,0,W,H).data;
   if(id!=='dress')for(let y=75;y<85;y++)for(let x=0;x<W;x++){
    const at=(y*W+x)*4;
    // Fit the source trouser texture to each authored leg silhouette. Remove
    // the neutral pose's detached outlines rather than leaving them in a stride.
    if(id!=='coat'||x>29&&x<51||isBlue(p.data[at],p.data[at+1],p.data[at+2]))p.data[at+3]=0;
    if(basePixels[at+3]&&x>=28&&x<=52&&y<83&&(id!=='shorts'||y<79)){
     let sample=-1,best=Infinity;
     for(let sy=75;sy<85;sy++)for(let sx=x<40?27:40;sx<(x<40?40:54);sx++){
      const k=(sy*W+sx)*4;if(!material[k+3]||!isBlue(material[k],material[k+1],material[k+2]))continue;
      const distance=Math.abs(sx-x)+Math.abs(sy-y)*.7;if(distance<best){sample=k;best=distance;}
     }
     if(sample>=0){for(let channel=0;channel<3;channel++)p.data[at+channel]=material[sample+channel];p.data[at+3]=basePixels[at+3];}
    }
   }
   g.putImageData(p,0,0);
   if(r.sourcePose===3){const sleeve=copy(result),sg=ctx(result),right=r.dir>=2;
    if(r.dir%2){
     // The authored profile pose raises the far arm; keep the near sleeve and
     // torso intact and attach a small copy of its raster cuff to the far arm.
     sg.save();sg.translate(right?46:34,63);sg.rotate(right?-2.1:2.1);sg.drawImage(sleeve,right?30:42,61,7,8,-3,0,7,8);sg.restore();
    }else{const sx=right?50:18;sg.clearRect(sx,60,12,15);sg.save();sg.translate(right?52:27,63);sg.rotate(right?-2.1:2.1);sg.drawImage(sleeve,sx,60,12,10,-6,0,12,10);sg.restore();}
   }
   if(r.clip==='interact'&&!(r.dir%2)){const sleeve=copy(result);for(const [x,angle,px]of [[18,.85,29],[50,-.85,51]]){g.clearRect(x,60,12,16);g.save();g.translate(px,63);g.rotate(angle);g.drawImage(sleeve,x,60,12,13,-6,0,12,13);g.restore();}}
   if(r.bob||r.dx){const tmp=copy(result);g.clearRect(0,0,W,H);g.drawImage(tmp,r.dx,r.bob);}
   if(r.clip==='sit'){const tmp=copy(result);g.clearRect(0,0,W,H);g.drawImage(tmp,0,0,W,76,0,6,W,76);g.drawImage(tmp,0,76,W,12,0,82,W,6);}
   return result;
  });
  manifest.layers.outfit[id]={url:'outfit-'+id+'.png',layout:'animated',material:id==='pants'?'original-clothes':'clothes'};await animated('outfit-'+id,cells);
 }
 const hats=[['cap',48,27,17],['beanie',48,29,15],['bucket',52,29,15],['crown',48,27,10],['headwrap',49,33,14]];
 for(let row=0;row<hats.length;row++){const [id,w,h,y]=hats[row],cells=id==='cap'?headLayers.headwear.cap:Array.from({length:4},(_,dir)=>place(cell(hatSource,row,dir,6),{x:40-w/2,y,w,h}));manifest.layers.headwear[id]={url:'headwear-'+id+'.png',layout:'directional',material:'none'};await directional('headwear-'+id,cells);}
 const eyewearIds=['glasses','sunglasses','partyglasses'];
 for(let row=0;row<3;row++){const id=eyewearIds[row],cells=Array.from({length:4},(_,dir)=>place(cell(extrasSource,row,dir,8),{x:40-16+(dir===1?-2:dir===3?2:0),y:49,w:30,h:9}));manifest.layers.eyewear[id]={url:'eyewear-'+id+'.png',layout:'directional',material:'none'};await directional('eyewear-'+id,cells);}
 const accessories=[['bow',extrasSource,3,15,13,54,18],['bowtie',extrasSource,4,12,7,34,62],['starclip',extrasSource,5,10,10,54,22],['halo',extrasSource,6,48,11,16,2],['headphones',hatSource,5,49,44,16,16],['pixelheadphones',propsSource,7,50,44,15,16],['trumpet',propsSource,5,24,10,47,69],['microphone',propsSource,6,7,17,57,64]];
 for(const [id,image,row,w,h,x,y]of accessories){const rows=image===hatSource?6:8,cells=Array.from({length:4},(_,dir)=>place(cell(image,row,dir,rows),id==='trumpet'?{x:[56,18,16,43][dir],y:65,w:dir%2?24:9,h:dir%2?14:18}:id==='microphone'?{x:[57,24,17,51][dir],y:64,w,h}:{x,y,w,h}));manifest.layers.accessory[id]={url:'accessory-'+id+'.png',layout:'directional',material:'none'};await directional('accessory-'+id,cells);}
 const earrings=Array.from({length:4},(_,dir)=>{
  const source=cell(extrasSource,7,dir,8),out=make(),g=ctx(out);
  for(const x of dir===1?[47]:dir===3?[29]:[18,58])g.drawImage(place(source,{x,y:55,w:4,h:8}),0,0);
  return out;
 });
 manifest.layers.accessory.earrings={url:'accessory-earrings.png',layout:'directional',material:'none'};await directional('accessory-earrings',earrings);
 const shoeIds=['sneakers','boots','hightops','neon','gold'];
 for(let row=0;row<shoeIds.length;row++){
  const neutral=Array.from({length:4},(_,dir)=>{const source=cell(propsSource,row,dir,8),b=bounds(source);return {source,b};});
  const cells=rig.map((r,index)=>{const out=make(),g=ctx(out),src=neutral[r.dir],bodyPixels=ctx(frames[index]).getImageData(0,0,W,H).data;
   if(row===0){
    const originalPose=originalCell([0,1,3,0][r.sourcePose],r.dir),pixels=ctx(originalPose).getImageData(0,0,W,H).data,seen=new Uint8Array(W*H);let largest=[],bottom=87;
    for(let seed=0;seed<W*H;seed++)if(pixels[seed*4+3]&&!seen[seed]){
     const group=[seed];seen[seed]=1;
     for(let i=0;i<group.length;i++){const at=group[i],x=at%W,y=Math.floor(at/W);for(let yy=Math.max(0,y-1);yy<=Math.min(H-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(W-1,x+1);xx++){const next=yy*W+xx;if(pixels[next*4+3]&&!seen[next]){seen[next]=1;group.push(next);}}}
     if(group.length>largest.length)largest=group;
    }
    if(largest.length)bottom=Math.max(...largest.map(at=>Math.floor(at/W)));
    // Preserve the actual old footwear and its padding, including profiles
    // that change only hair/skin. Do not silently swap it for new blue shoes.
    g.drawImage(originalPose,0,Math.max(0,bottom-4),W,H-Math.max(0,bottom-4),r.dx,Math.max(0,bottom-4)+r.bob,W,H-Math.max(0,bottom-4));
    if(r.clip==='sit'){const saved=copy(out);g.clearRect(0,0,W,H);g.drawImage(saved,0,76,W,12,0,82,W,6);}
    return out;
   }
   const feet=[];for(let y=82+r.bob;y<90;y++)for(let x=8;x<72;x++)if(bodyPixels[(y*W+x)*4+3])feet.push([x,y]);
   if(!feet.length)return out;
   const left=Math.min(...feet.map(p=>p[0])),right=Math.max(...feet.map(p=>p[0])),top=Math.min(...feet.map(p=>p[1])),bottom=Math.max(...feet.map(p=>p[1]));
   g.imageSmoothingEnabled=false;g.drawImage(src.source,src.b.x,src.b.y,src.b.w,src.b.h,left,Math.max(top,bottom-6),right-left+1,Math.min(7,bottom-top+1));return out;});
  const id=shoeIds[row];manifest.layers.shoes[id]={url:'shoes-'+id+'.png',layout:'animated',material:'none'};await animated('shoes-'+id,cells);
 }
 return manifest;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
