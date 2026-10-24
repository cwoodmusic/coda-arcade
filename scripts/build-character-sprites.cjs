/* Bake real, image-generated raster artwork into aligned animation layers.
 * Runtime characters only select, tint and blit these PNG frames. */
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn}=require('node:child_process');
async function main(){
 const root=path.resolve(__dirname,'../assets/characters');await fs.mkdir(root,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{
  if(req.method==='POST'&&/^\/output\/[a-z0-9-]+\.png$/.test(req.url)){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);await fs.writeFile(path.join(root,path.basename(req.url)),Buffer.concat(chunks));res.end('ok');return;
  }
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
  const result=await send('Runtime.evaluate',{expression:'('+bake.toString()+')()',awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  const manifest=result.result.value;await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({frames:112,cell:manifest.cell,atlases:manifest.artifacts.length,variants:manifest.layers,source:'Original image-generated artwork; no procedural character shapes'},null,2));
 }finally{socket?.close();chrome.kill('SIGTERM');server.close();await new Promise(resolve=>chrome.once('exit',resolve));await fs.rm(profile,{recursive:true,force:true});}
}
async function bake(){
 const W=80,H=96,COLS=8,PERDIR=28;
 const make=(w=W,h=H)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
 const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Cannot load '+src));img.src='/source/'+src+'.png';});
 const [bodySource,hairSource,outfitSource,hatSource,extrasSource,propsSource]=await Promise.all(['body-poses','hair','outfits','headwear','accessories','shoes-props'].map(load));
 const clips={idle:{offset:0,frames:2,fps:2},walk:{offset:2,frames:6,fps:8},wave:{offset:8,frames:4,fps:8},dance:{offset:12,frames:6,fps:8},interact:{offset:18,frames:4,fps:6},talk:{offset:22,frames:4,fps:6},sit:{offset:26,frames:2,fps:2}};
 const manifest={version:1,cell:[W,H],anchor:[40,88],columns:COLS,framesPerDirection:PERDIR,directions:['down','left','up','right'],clips,layers:{body:{url:'body.png',layout:'animated',material:'skin'},hair:{},outfit:{},headwear:{},eyewear:{},accessory:{},shoes:{}},frameData:[],artifacts:[]};
 const ctx=canvas=>canvas.getContext('2d',{willReadFrequently:true});
 function bounds(canvas){const p=ctx(canvas).getImageData(0,0,canvas.width,canvas.height).data;let x1=canvas.width,y1=canvas.height,x2=-1,y2=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(p[(y*canvas.width+x)*4+3]){x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);}return x2<0?null:{x:x1,y:y1,w:x2-x1+1,h:y2-y1+1};}
 function cell(image,row,col,rows){const cw=image.naturalWidth/4,ch=image.naturalHeight/rows,c=make(Math.ceil(cw),Math.ceil(ch)),g=ctx(c);g.drawImage(image,col*cw,row*ch,cw,ch,0,0,c.width,c.height);const data=g.getImageData(0,0,c.width,c.height);for(let i=0;i<data.data.length;i+=4)data.data[i+3]=data.data[i+3]>=170?255:0;g.putImageData(data,0,0);return c;}
 function place(source,rect){const c=make(),g=ctx(c),b=bounds(source);if(!b)return c;g.imageSmoothingEnabled=false;g.drawImage(source,b.x,b.y,b.w,b.h,rect.x,rect.y,rect.w,rect.h);return c;}
 const copy=c=>{const out=make(c.width,c.height);ctx(out).drawImage(c,0,0);return out;};
 function bodyCell(row,dir){const source=cell(bodySource,row,dir,4),b=bounds(source),out=make(),g=ctx(out);if(!b)throw Error('Empty body cell');
  const data=ctx(source).getImageData(0,0,source.width,source.height).data,centers=[];
  for(let y=b.y+2;y<b.y+b.h*.075;y++){let min=source.width,max=-1;for(let x=b.x;x<b.x+b.w;x++)if(data[(y*source.width+x)*4+3]){min=Math.min(min,x);max=Math.max(max,x);}if(max-min>8)centers.push((min+max)/2);}
  centers.sort((a,b)=>a-b);const head=centers.length?centers[Math.floor(centers.length/2)]:b.x+b.w/2,scale=68/b.h;
  g.imageSmoothingEnabled=false;g.drawImage(source,b.x,b.y,b.w,b.h,40+(b.x-head)*scale,20,b.w*scale,68);return out;
 }
 const base=Array.from({length:4},(_,dir)=>Array.from({length:4},(_,row)=>bodyCell(row,dir)));
 function pose(clip,frame){
  if(clip==='walk')return [0,1,1,0,2,2][frame];
  if(clip==='wave')return [0,3,3,3][frame];
  if(clip==='dance')return [3,1,3,3,2,3][frame];
  if(clip==='talk')return [0,3,0,0][frame];
  return 0;
 }
 const frames=[],rig=[];
 for(let dir=0;dir<4;dir++)for(const [clip,definition]of Object.entries(clips))for(let frame=0;frame<definition.frames;frame++){
  const sourcePose=pose(clip,frame),bob=clip==='walk'?[0,-1,-1,0,-1,-1][frame]:clip==='idle'&&frame===1?-1:clip==='dance'?-Math.round(Math.abs(Math.sin(frame/6*Math.PI*2))*2):0;
  const dx=clip==='dance'?Math.round(Math.sin(frame/6*Math.PI*2)*2):0,out=make(),g=ctx(out);
  g.imageSmoothingEnabled=false;g.drawImage(base[dir][sourcePose],dx,bob);
  if(clip==='interact'){
   // Reuse raster forearms at new action positions; no geometric body painting.
   const arm=make(),ag=ctx(arm);ag.drawImage(out,0,0);const pieces=[[19,48,12,20,31,49,-.65],[49,48,12,20,49,49,.65]];
   for(const [sx,sy,sw,sh,px,py,angle]of pieces){g.clearRect(sx,sy,sw,sh);g.save();g.translate(px,py+(frame%2));g.rotate(angle);g.drawImage(arm,sx,sy,sw,sh,-sw/2,0,sw,sh);g.restore();}
  }
  if(clip==='sit'){const upper=make();ctx(upper).drawImage(out,0,0);g.clearRect(0,0,W,H);g.drawImage(upper,0,0,W,70,0,10,W,70);g.drawImage(upper,0,70,W,18,0,78,W,10);}
  const upperY=bob+(clip==='sit'?10:0);
  frames.push(out);rig.push({dir,clip,frame,sourcePose,bob,dx});manifest.frameData.push({headX:dx,headY:upperY,bodyX:dx,bodyY:upperY,handX:dx+(sourcePose===3?-17:0),handY:upperY+(sourcePose===3?-20:0)});
 }
 async function write(name,canvas){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const response=await fetch('/output/'+name+'.png',{method:'POST',body:blob});if(!response.ok)throw Error('Cannot save '+name);manifest.artifacts.push({file:name+'.png',width:canvas.width,height:canvas.height});}
 async function animated(name,cells){const atlas=make(W*COLS,H*14),g=ctx(atlas);cells.forEach((cell,index)=>g.drawImage(cell,index%COLS*W,Math.floor(index/COLS)*H));await write(name,atlas);}
 async function directional(name,cells){const atlas=make(W*4,H),g=ctx(atlas);cells.forEach((cell,index)=>g.drawImage(cell,index*W,0));await write(name,atlas);}
 await animated('body',frames);
 const hairIds=['short','bob','long','curly','ponytail','spiky','bald','buns'];
 const hairSizes=[[33,24],[35,30],[37,42],[38,30],[38,40],[39,29],[0,0],[41,32]];
 for(let row=0;row<hairIds.length;row++){
  const id=hairIds[row],cells=[];
  for(let dir=0;dir<4;dir++){const [w,h]=hairSizes[row],anchor=dir===1?.42:dir===3?.58:.5;cells.push(id==='bald'?make():place(cell(hairSource,row,dir,8),{x:40-w*anchor,y:14,w,h}));}
  manifest.layers.hair[id]={url:'hair-'+id+'.png',layout:'directional',material:'hair'};await directional('hair-'+id,cells);
 }
 const isBlue=(r,g,b)=>b>r*1.23&&b>g*1.07&&b>45;
 const outfitIds=['pants','shorts','dress','overalls','suit','coat'];
 for(let row=0;row<outfitIds.length;row++){
  const id=outfitIds[row],neutral=Array.from({length:4},(_,dir)=>{const w=(id==='coat'?42:id==='dress'?42:35)*(dir%2?.72:1),h=id==='shorts'?29:id==='dress'?38:41;return place(cell(outfitSource,row,dir,6),{x:40-w/2,y:44,w,h});});
  const cells=rig.map((r,index)=>{
   const result=copy(neutral[r.dir]),g=ctx(result),p=g.getImageData(0,0,W,H),material=p.data.slice(),basePixels=ctx(base[r.dir][r.sourcePose]).getImageData(0,0,W,H).data;
   if(id!=='dress')for(let y=67;y<86;y++)for(let x=0;x<W;x++){
    const at=(y*W+x)*4;
    // Fit the source trouser texture to each authored leg silhouette. Remove
    // the neutral pose's detached outlines rather than leaving them in a stride.
    if(id!=='coat'||x>28&&x<52||isBlue(p.data[at],p.data[at+1],p.data[at+2]))p.data[at+3]=0;
    if(basePixels[at+3]&&y<81&&(id!=='shorts'||y<74)){
     let sample=-1,best=Infinity;
     for(let sy=67;sy<83;sy++)for(let sx=x<40?27:40;sx<(x<40?40:54);sx++){
      const k=(sy*W+sx)*4;if(!material[k+3]||!isBlue(material[k],material[k+1],material[k+2]))continue;
      const distance=Math.abs(sx-x)+Math.abs(sy-y)*.7;if(distance<best){sample=k;best=distance;}
     }
     if(sample>=0){for(let channel=0;channel<3;channel++)p.data[at+channel]=material[sample+channel];p.data[at+3]=basePixels[at+3];}
    }
   }
   g.putImageData(p,0,0);
   if(r.sourcePose===3){const sleeve=copy(result),sg=ctx(result);sg.clearRect(17,44,14,20);sg.save();sg.translate(27,45);sg.rotate(-1.35);sg.drawImage(sleeve,17,44,14,20,-7,0,14,20);sg.restore();}
   if(r.clip==='interact'){const sleeve=copy(result);for(const [x,angle,px]of [[18,-.65,31],[49,.65,49]]){g.clearRect(x,44,12,20);g.save();g.translate(px,45);g.rotate(angle);g.drawImage(sleeve,x,44,12,20,-6,0,12,20);g.restore();}}
   if(r.bob||r.dx){const tmp=copy(result);g.clearRect(0,0,W,H);g.drawImage(tmp,r.dx,r.bob);}
   if(r.clip==='sit'){const tmp=copy(result);g.clearRect(0,0,W,H);g.drawImage(tmp,0,0,W,70,0,10,W,70);g.drawImage(tmp,0,70,W,18,0,78,W,10);}
   return result;
  });
  manifest.layers.outfit[id]={url:'outfit-'+id+'.png',layout:'animated',material:'clothes'};await animated('outfit-'+id,cells);
 }
 const hats=[['cap',36,21,10],['beanie',35,25,8],['bucket',40,25,8],['crown',37,25,4],['headwrap',36,27,7]];
 for(let row=0;row<hats.length;row++){const [id,w,h,y]=hats[row],cells=Array.from({length:4},(_,dir)=>place(cell(hatSource,row,dir,6),{x:40-w/2+(id==='cap'?(dir===1?-4:dir===3?4:0):0),y,w,h}));manifest.layers.headwear[id]={url:'headwear-'+id+'.png',layout:'directional',material:'none'};await directional('headwear-'+id,cells);}
 const eyewearIds=['glasses','sunglasses','partyglasses'];
 for(let row=0;row<3;row++){const id=eyewearIds[row],cells=Array.from({length:4},(_,dir)=>place(cell(extrasSource,row,dir,8),{x:40-13+(dir===1?3:dir===3?-3:0),y:29,w:26,h:9}));manifest.layers.eyewear[id]={url:'eyewear-'+id+'.png',layout:'directional',material:'none'};await directional('eyewear-'+id,cells);}
 const accessories=[['bow',extrasSource,3,14,12,49,15],['bowtie',extrasSource,4,12,7,34,47],['starclip',extrasSource,5,9,9,49,19],['halo',extrasSource,6,37,11,22,2],['headphones',hatSource,5,40,33,20,14],['pixelheadphones',propsSource,7,41,34,19,14],['trumpet',propsSource,5,24,10,45,55],['microphone',propsSource,6,7,20,53,51]];
 for(const [id,image,row,w,h,x,y]of accessories){const rows=image===hatSource?6:8,cells=Array.from({length:4},(_,dir)=>place(cell(image,row,dir,rows),{x,y,w,h}));manifest.layers.accessory[id]={url:'accessory-'+id+'.png',layout:'directional',material:'none'};await directional('accessory-'+id,cells);}
 const earrings=Array.from({length:4},(_,dir)=>{
  const source=cell(extrasSource,7,dir,8),out=make(),g=ctx(out);
  for(const x of dir===1?[43]:dir===3?[33]:[26,50])g.drawImage(place(source,{x,y:35,w:4,h:10}),0,0);
  return out;
 });
 manifest.layers.accessory.earrings={url:'accessory-earrings.png',layout:'directional',material:'none'};await directional('accessory-earrings',earrings);
 const shoeIds=['sneakers','boots','hightops','neon','gold'];
 for(let row=0;row<shoeIds.length;row++){
  const neutral=Array.from({length:4},(_,dir)=>{const source=cell(propsSource,row,dir,8),b=bounds(source);return {source,b};});
  const cells=rig.map((r,index)=>{const out=make(),g=ctx(out),src=neutral[r.dir],bodyPixels=ctx(frames[index]).getImageData(0,0,W,H).data;
   const feet=[];for(let y=79+r.bob;y<90;y++)for(let x=8;x<72;x++)if(bodyPixels[(y*W+x)*4+3])feet.push([x,y]);
   if(!feet.length)return out;
   const left=Math.min(...feet.map(p=>p[0])),right=Math.max(...feet.map(p=>p[0])),top=Math.min(...feet.map(p=>p[1])),bottom=Math.max(...feet.map(p=>p[1]));
   g.imageSmoothingEnabled=false;g.drawImage(src.source,src.b.x,src.b.y,src.b.w,src.b.h,left,Math.max(top,bottom-10),right-left+1,Math.min(11,bottom-top+1));return out;});
  const id=shoeIds[row];manifest.layers.shoes[id]={url:'shoes-'+id+'.png',layout:'animated',material:'none'};await animated('shoes-'+id,cells);
 }
 return manifest;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
