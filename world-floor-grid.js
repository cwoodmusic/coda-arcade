/* Cached main-arcade ground. Source artwork remains available for lifted props. */
(function(root){
 'use strict';
 const MINOR=12,MAJOR=24,ORIGIN=Object.freeze({x:0,y:0});
 const FLOOR=[[648,119],[1217,119],[1217,155],[1395,155],[1395,282],[1593,282],[1593,814],[854,814],[854,466],[665,466],[665,311],[648,311]];
 // These baked fixtures extend beyond their collision footprints or have no
 // foreground-atlas entry. Their original pixels must remain untouched.
 const FIXTURES=[[577,110,73,128],[641,138,38,70],[1142,110,73,128],
  [1241,76,103,92],[1380,136,181,172],[1416,766,124,50],
  [643,317,40,149],[806,435,52,408]];
 root.createCodaArcadeFloorGrid=function({worldArt,parts=[],catalog=[]}){
  let source=null,key='',plate=null,mask=null,emissives=0;
  const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
  function polygon(ctx,points){ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fill();}
  function isReady(){return !!plate;}
  function render(base,suppressed=[]){
   if(!worldArt.complete||!worldArt.naturalWidth)return base;
   const names=new Set(suppressed),nextKey=[...names].sort().join('|');
   if(source===base&&key===nextKey&&plate)return plate;
   const width=worldArt.naturalWidth,height=worldArt.naturalHeight;
   mask=make(width,height);const mg=mask.getContext('2d',{willReadFrequently:true});mg.fillStyle='#fff';polygon(mg,FLOOR);
   mg.globalCompositeOperation='destination-out';
   for(const [x,y,w,h]of FIXTURES)mg.fillRect(x,y,w,h);
   for(const part of [...parts,...catalog]){
    if(names.has(part.name)||part.permanentlyRemoved||part.procedural)continue;
    if(part.poly||part.polygon)polygon(mg,part.poly||part.polygon);
    else if(part.bounds)mg.fillRect(...part.bounds);
   }
   mg.globalCompositeOperation='source-over';
   const floor=make(width,height),fg=floor.getContext('2d',{willReadFrequently:true});
   // The old grout is hand drawn and drifts by a few pixels. Keep its broad
   // blue/purple lighting, then replace the fine lines with one shared lattice.
   fg.filter='blur(6px)';fg.drawImage(base,0,0);fg.filter='none';
   for(let x=0;x<width;x+=MINOR){fg.fillStyle=x%MAJOR===0?'#71baff52':'#61b4ff2e';fg.fillRect(x,0,1,height);}
   for(let y=0;y<height;y+=MINOR){fg.fillStyle=y%MAJOR===0?'#71baff52':'#61b4ff2e';fg.fillRect(0,y,width,1);}
   const raw=make(width,height),rg=raw.getContext('2d',{willReadFrequently:true});rg.drawImage(base,0,0);
   const original=rg.getImageData(0,0,width,height).data,alpha=mg.getImageData(0,0,width,height).data;
   const result=fg.getImageData(0,0,width,height),pixels=result.data,seen=new Uint8Array(width*height);
   const hot=id=>alpha[id*4+3]>240&&(original[id*4]>170||original[id*4+1]>190)&&Math.max(original[id*4],original[id*4+1],original[id*4+2])>220;
   emissives=0;
   // Keep the existing small colored floor stars, but not long grout lines or
   // large reflected signs. Detection uses the already-cleaned ground surface.
   for(let id=0;id<seen.length;id++){
    if(seen[id]||!hot(id))continue;
    const queue=[id];seen[id]=1;let minX=id%width,maxX=minX,minY=(id/width)|0,maxY=minY;
    for(let at=0;at<queue.length;at++){
     const current=queue[at],x=current%width,y=(current/width)|0;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height)continue;
      const next=yy*width+xx;if(!seen[next]&&hot(next)){seen[next]=1;queue.push(next);}
     }
    }
    if(queue.length>160||maxX-minX>22||maxY-minY>22)continue;
    emissives++;
    for(let y=Math.max(0,minY-4);y<=Math.min(height-1,maxY+4);y++)for(let x=Math.max(0,minX-4);x<=Math.min(width-1,maxX+4);x++){
     const p=(y*width+x)*4;if(alpha[p+3]<240)continue;
     const glow=Math.max(0,Math.min(1,Math.max((original[p]-70)/130,(original[p+1]-135)/100)));
     if(!glow)continue;for(let c=0;c<3;c++)pixels[p+c]=Math.round(pixels[p+c]*(1-glow)+original[p+c]*glow);
    }
   }
   fg.putImageData(result,0,0);fg.globalCompositeOperation='destination-in';fg.drawImage(mask,0,0);fg.globalCompositeOperation='source-over';
   plate=make(width,height);const out=plate.getContext('2d',{willReadFrequently:true});out.drawImage(base,0,0);out.drawImage(floor,0,0);
   floor.width=floor.height=raw.width=raw.height=1;
   source=base;key=nextKey;return plate;
  }
  function point(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&plate&&x>=0&&y>=0&&x<plate.width&&y<plate.height?[Math.floor(x),Math.floor(y)]:null;}
  function snapshot(){return {ready:isReady(),origin:{...ORIGIN},minor:MINOR,major:MAJOR,emissives,
   maskAt(x,y){const p=point(x,y);return p?mask.getContext('2d').getImageData(...p,1,1).data[3]:0;},
   pixelAt(x,y){const p=point(x,y);return p?Array.from(plate.getContext('2d').getImageData(...p,1,1).data):null;}};}
  return {render,snapshot};
 };
})(window);
