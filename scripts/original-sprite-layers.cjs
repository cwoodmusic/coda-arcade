/* Browser-safe raster extraction. The exported function is serialized by the baker.
 * Every visible pixel comes from the shipped atlas; extensions only clone pixels. */
module.exports = function buildOriginalSpriteLayers(options) {
  'use strict';
  const atlas=options.atlas,cell=options.cell||[80,96],anchor=options.anchor||[40,88];
  const directions=['down','left','up','right'];
  const defaults=[{x:16,y:5,w:47,h:69},{x:816,y:5,w:47,h:69},{x:416,y:6,w:47,h:67},{x:256,y:85,w:47,h:69}];
  const frames=directions.map((direction,index)=>options.heroFrames?.[index]||options.heroFrames?.[direction]||options.heroFrames?.['hero_'+direction+'_0']||defaults[index]);
  const capEnds=[27,22,27,15],faceRows=[31,26,31,20];
  const make=(w=cell[0],h=cell[1])=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const context=c=>c.getContext('2d',{willReadFrequently:true});
  const copy=source=>{const out=make(source.width,source.height);context(out).drawImage(source,0,0);return out;};
  const hsv=(r,g,b)=>{const hi=Math.max(r,g,b),lo=Math.min(r,g,b),delta=hi-lo;let h=delta?hi===r?((g-b)/delta)%6:hi===g?(b-r)/delta+2:(r-g)/delta+4:0;return {h:(h*60+360)%360,s:hi?delta/hi:0,v:hi/255};};
  const crop=rect=>{const c=make(rect.w,rect.h);context(c).drawImage(atlas,rect.x,rect.y,rect.w,rect.h,0,0,rect.w,rect.h);return c;};
  const masked=(source,keep)=>{const c=copy(source),g=context(c),p=g.getImageData(0,0,c.width,c.height);for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const at=(y*c.width+x)*4;if(!keep(x,y,p.data,at))p.data[at+3]=0;}g.putImageData(p,0,0);return c;};
  const placeHero=(source,index)=>{const out=make(),f=frames[index];context(out).drawImage(source,Math.round(anchor[0]-f.w/2),anchor[1]-f.h);return out;};
  const warm=(r,g,b)=>r>g*1.13&&g>b*1.15&&g>50&&r<g*1.8;
  const cap=[],short=[];
  for(let index=0;index<4;index++){
    const f=frames[index],source=crop(f),end=capEnds[index],face=f.faceY??faceRows[index];
    const hat=masked(source,(x,y,p,at)=>y<end&&!(y>=end-4&&warm(p[at],p[at+1],p[at+2])));
    cap.push(placeHero(hat,index));
    // Keep the actual under-brim fringe. The central eye/mouth opening is never
    // copied into a dyeable hair layer, so hair colors cannot recolor the eyes.
    const fringe=masked(source,(x,y,p,at)=>{
      if(y<end+1||y>face+9||!p[at+3])return false;
      if(index!==2&&y>=face-1&&x>f.w*.18&&x<f.w*.8)return false;
      const color=hsv(p[at],p[at+1],p[at+2]);return color.v<.44||p[at+2]>p[at]*1.25&&p[at+2]>p[at+1]*1.05;
    });
    short.push(placeHero(fringe,index));
  }
  const sourceSets={
    blue:[{x:12,y:164,w:55,h:47,faceY:32},{x:172,y:166,w:55,h:47,faceY:33},{x:94,y:166,w:52,h:45,faceY:32},null],
    pink:[{x:652,y:84,w:55,h:49,faceY:32},null,{x:735,y:86,w:50,h:47,faceY:32},null],
    green:[{x:12,y:244,w:55,h:47,faceY:31},null,null,null],
    brown:[{x:334,y:164,w:72,h:48,faceY:33},null,null,null]
  };
  const ranges={blue:[175,265,.38],pink:[280,355,.35],green:[65,170,.35],brown:[0,45,.22]};
  function extract(name,index){
    let rect=sourceSets[name][index],mirror=false;
    if(!rect){if(index===3&&sourceSets[name][1]){rect=sourceSets[name][1];mirror=true;}else if(index===1||index===3){rect=sourceSets.blue[1];name='blue';mirror=index===3;}else rect=sourceSets[name][0];}
    const source=crop(rect),g=context(source),pixels=g.getImageData(0,0,source.width,source.height),w=source.width,h=source.height;
    const [low,high,saturation]=ranges[name],candidate=new Uint8Array(w*h),seen=new Uint8Array(w*h),groups=[];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const at=(y*w+x)*4,color=hsv(...pixels.data.slice(at,at+3));
      const faceOpening=index!==2&&y>rect.faceY-2&&x>w*.2&&x<w*.79;
      if(pixels.data[at+3]&&color.h>=low&&color.h<=high&&color.s>saturation&&color.v>.2&&!(name==='brown'&&color.v>.65)&&!faceOpening)candidate[y*w+x]=1;
    }
    // Hair and eyes may share blue. Retain the connected scalp, leaving isolated
    // eye irises out of the cosmetic. Small detached glints are restored below.
    for(let seed=0;seed<candidate.length;seed++)if(candidate[seed]&&!seen[seed]){
      const group=[],queue=[seed];seen[seed]=1;
      for(let i=0;i<queue.length;i++){const at=queue[i],x=at%w,y=Math.floor(at/w);group.push(at);for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){const next=yy*w+xx;if(candidate[next]&&!seen[next]){seen[next]=1;queue.push(next);}}}
      groups.push(group);
    }
    groups.sort((a,b)=>b.length-a.length);const mask=new Uint8Array(w*h);
    // Small blue divider lines also exist in the original atlas. They are
    // disconnected from the scalp and must never become floating hair pixels.
    for(const at of groups[0]||[])mask[at]=1;
    // Flood the outside to recover only enclosed highlight/ink holes. The face
    // opening reaches the bottom edge and therefore remains transparent.
    const outside=new Uint8Array(w*h),queue=[];
    const visit=at=>{if(!mask[at]&&!outside[at]){outside[at]=1;queue.push(at);}};
    for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
    for(let i=0;i<queue.length;i++){const at=queue[i],x=at%w,y=Math.floor(at/w);if(x)visit(at-1);if(x<w-1)visit(at+1);if(y)visit(at-w);if(y<h-1)visit(at+w);}
    for(let at=0;at<mask.length;at++)if(!outside[at]&&pixels.data[at*4+3])mask[at]=1;
    const outline=mask.slice();
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x])for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){
      const at=(yy*w+xx)*4,color=hsv(...pixels.data.slice(at,at+3));if(pixels.data[at+3]&&color.v<.3)outline[yy*w+xx]=1;
    }
    for(let at=0;at<outline.length;at++)if(!outline[at])pixels.data[at*4+3]=0;
    g.putImageData(pixels,0,0);
    const out=make(),og=context(out),targetFace=frames[index].faceY??faceRows[index],dy=anchor[1]-frames[index].h+targetFace-rect.faceY,dx=Math.round(anchor[0]-w/2);
    if(mirror){og.translate(cell[0],0);og.scale(-1,1);}og.drawImage(source,dx,dy);return out;
  }
  const blue=directions.map((_,i)=>extract('blue',i)),pink=directions.map((_,i)=>extract('pink',i));
  for(let index=0;index<4;index++){
    const f=frames[index],face=f.faceY??faceRows[index],bottom=anchor[1]-f.h+(index===2?40:face-1);
    // Restore a hatless scalp using existing NPC hair, keeping all source pixels
    // at their native size. The hero's original fringe stays above this layer.
    const scalp=masked(index===0?extract('green',index):blue[index],(x,y)=>y<bottom);
    context(scalp).drawImage(short[index],0,0);short[index]=scalp;
  }
  const clonePatch=(out,source,sx,sy,w,h,dx,dy)=>context(out).drawImage(source,sx,sy,w,h,dx,dy,w,h);
  function extended(base,kind,index){
    const out=copy(base),f=frames[index],top=anchor[1]-f.h,face=f.faceY??faceRows[index];
    if(kind==='long'){
      for(const x of [15,55])for(let dy=4;dy<=12;dy+=4)clonePatch(out,base,x,top+face-8,10,12,x,top+face-8+dy);
      if(index===2)for(const dy of [5,10])clonePatch(out,base,20,top+face-8,40,12,20,top+face-8+dy);
    }else if(kind==='curly'){
      // Original blue waves already carry rounded side locks. Two small native
      // offsets increase volume without introducing a new face or pixel scale.
      clonePatch(out,base,14,top+10,9,16,12,top+11);clonePatch(out,base,57,top+10,9,16,59,top+11);
    }else if(kind==='ponytail'){
      // The original side sprite already has its ponytail. A rear tail clones
      // the original lower locks; the front view leaves the face unobstructed.
      if(index===2)clonePatch(out,base,28,top+face-5,24,15,28,top+face+3);
    }else if(kind==='buns'){
      // Puffy paired upper locks use the source's complete curved outside
      // edges, with the rectangular crop boundaries hidden inside the scalp.
      clonePatch(out,base,13,top,27,20,11,top-3);clonePatch(out,base,40,top,27,20,42,top-3);
    }
    return out;
  }
  const hair={short,bob:blue,long:pink.map((base,i)=>extended(base,'long',i)),curly:blue.map((base,i)=>extended(base,'curly',i)),ponytail:blue.map((base,i)=>extended(base,'ponytail',i)),spiky:directions.map((_,i)=>i===0?extract('green',i):copy(blue[i])),bald:directions.map(()=>make()),buns:pink.map((base,i)=>extended(base,'buns',i))};
  return {hair,headwear:{cap},metadata:{source:'coda_arcade_phase73_characters.png',method:'native atlas extraction and pixel clones',cell,anchor,directions}};
};
