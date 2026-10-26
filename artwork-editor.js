/* Lossless, reversible artwork pixels. Only source-size images are allocated;
 * the editor viewport stays small even when a room is magnified 64 times. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CodaArtworkEditor=api;})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const TILE=64,MAX_DIMENSION=8192,MAX_AREA=16777216,MAX_RUNS=262144;
 const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
 const safeId=id=>typeof id==='string'&&/^[a-z0-9._:-]{1,120}$/i.test(id)&&!id.split(/[.:]/).some(part=>['__proto__','prototype','constructor'].includes(part));
 const color=value=>typeof value==='string'&&/^#[0-9a-f]{8}$/i.test(value);
 const dimensions=(width,height)=>Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0&&width<=MAX_DIMENSION&&height<=MAX_DIMENSION&&width*height<=MAX_AREA;
 const clone=value=>JSON.parse(JSON.stringify(value));
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const pack=value=>{const text=value.slice(1);return (parseInt(text.slice(0,2),16)|parseInt(text.slice(2,4),16)<<8|parseInt(text.slice(4,6),16)<<16|parseInt(text.slice(6,8),16)<<24)>>>0;};
 const unpack=value=>'#'+[value&255,value>>>8&255,value>>>16&255,value>>>24&255].map(v=>v.toString(16).padStart(2,'0')).join('');
 function validateTexture(texture,width,height){
  if(!object(texture)||Object.keys(texture).some(key=>!['width','height','tiles'].includes(key))||!dimensions(texture.width,texture.height)||!object(texture.tiles))return false;
  if(width!==undefined&&texture.width!==width||height!==undefined&&texture.height!==height)return false;
  const keys=Object.keys(texture.tiles);if(keys.length>Math.ceil(texture.width/TILE)*Math.ceil(texture.height/TILE))return false;
  let count=0;
  for(const key of keys){
   if(!/^(0|[1-9]\d*),(0|[1-9]\d*)$/.test(key))return false;
   const [tx,ty]=key.split(',').map(Number),tw=Math.min(TILE,texture.width-tx*TILE),th=Math.min(TILE,texture.height-ty*TILE),runs=texture.tiles[key];
   if(tw<=0||th<=0||!Array.isArray(runs)||(count+=runs.length)>MAX_RUNS)return false;
   let end=0;
   for(const run of runs){
    if(!Array.isArray(run)||run.length!==3||!Number.isInteger(run[0])||!Number.isInteger(run[1])||run[0]<end||run[1]<1||run[0]+run[1]>th*TILE||!color(run[2]))return false;
    const last=run[0]+run[1]-1;
    if(tw<TILE&&(Math.floor(run[0]/TILE)!==Math.floor(last/TILE)||run[0]%TILE+run[1]>tw))return false;
    end=run[0]+run[1];
   }
  }
  return true;
 }
 function normalizeTexture(texture){
  if(!validateTexture(texture))return null;
  const result={width:texture.width,height:texture.height,tiles:{}};
  for(const key of Object.keys(texture.tiles).sort((a,b)=>{const [ax,ay]=a.split(',').map(Number),[bx,by]=b.split(',').map(Number);return ay-by||ax-bx;})){
   const runs=[];
   for(const [start,length,raw]of texture.tiles[key]){
    const value=raw.toLowerCase(),last=runs.at(-1);
    if(last&&last[0]+last[1]===start&&last[2]===value)last[1]+=length;
    else runs.push([start,length,value]);
   }
   if(runs.length)result.tiles[key]=runs;
  }
  return result;
 }
 function validate(data){
  if(!object(data)||Object.keys(data).length>1024)return false;
  let count=0;
  for(const [id,texture]of Object.entries(data)){
   if(!safeId(id)||!validateTexture(texture))return false;
   for(const runs of Object.values(texture.tiles))if((count+=runs.length)>MAX_RUNS)return false;
  }
  return true;
 }
 function normalize(data){
  if(!validate(data))return null;
  const result={};for(const id of Object.keys(data).sort()){const texture=normalizeTexture(data[id]);if(Object.keys(texture.tiles).length)result[id]=texture;}return result;
 }
 function dense(texture,width,height){
  const mask=new Uint8Array(width*height),values=new Uint32Array(width*height);
  if(texture)for(const [key,runs]of Object.entries(texture.tiles)){
   const [tx,ty]=key.split(',').map(Number);
   for(const [start,length,value]of runs){const rgba=pack(value);for(let i=start;i<start+length;i++){const at=(ty*TILE+Math.floor(i/TILE))*width+tx*TILE+i%TILE;mask[at]=1;values[at]=rgba;}}
  }
  return {mask,values};
 }
 function fromDense(width,height,mask,values){
  const texture={width,height,tiles:{}},colors=new Map();
  for(let ty=0;ty<Math.ceil(height/TILE);ty++)for(let tx=0;tx<Math.ceil(width/TILE);tx++){
   const runs=[],tw=Math.min(TILE,width-tx*TILE),th=Math.min(TILE,height-ty*TILE);
   for(let yy=0;yy<th;yy++)for(let xx=0;xx<tw;xx++){
    const at=(ty*TILE+yy)*width+tx*TILE+xx;if(!mask[at])continue;
    const value=values[at];if(!colors.has(value))colors.set(value,unpack(value));const text=colors.get(value),index=yy*TILE+xx,last=runs.at(-1);
    if(last&&last[0]+last[1]===index&&last[2]===text)last[1]++;else runs.push([index,1,text]);
   }
   if(runs.length)texture.tiles[tx+','+ty]=runs;
  }
  return texture;
 }
 function changePixels(data,id,width,height,points,value){
  if(!validate(data)||!safeId(id)||!dimensions(width,height)||data[id]&&!validateTexture(data[id],width,height)||!(value===undefined||value===null||color(value)))return null;
  const next=clone(data),{mask,values}=dense(data[id],width,height),rgba=value===undefined?0:pack(value===null?'#00000000':value);
  for(const point of points){if(!Array.isArray(point)||point.length!==2)continue;const [x,y]=point;if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=width||y>=height)continue;const at=y*width+x;mask[at]=value===undefined?0:1;values[at]=rgba;}
  const texture=fromDense(width,height,mask,values);if(Object.keys(texture.tiles).length)next[id]=texture;else delete next[id];return normalize(next);
 }
 function composePixels(original,texture){
  if(!validateTexture(texture)||!original||original.length!==texture.width*texture.height*4)throw Error('Artwork dimensions do not match its original pixels.');
  const result=new Uint8ClampedArray(original);
  for(const [key,runs]of Object.entries(texture.tiles)){
   const [tx,ty]=key.split(',').map(Number);
   for(const [start,length,value]of runs){const rgba=pack(value);for(let i=start;i<start+length;i++){const at=((ty*TILE+Math.floor(i/TILE))*texture.width+tx*TILE+i%TILE)*4;result[at]=rgba&255;result[at+1]=rgba>>>8&255;result[at+2]=rgba>>>16&255;result[at+3]=rgba>>>24&255;}}
  }
  return result;
 }
 function compose(source,texture){
  const width=source?.naturalWidth||source?.width,height=source?.naturalHeight||source?.height;
  if(!dimensions(width,height)||!validateTexture(texture,width,height))throw Error('Artwork dimensions do not match its original image.');
  const doc=source.ownerDocument||(typeof document==='undefined'?null:document);if(!doc)throw Error('Artwork composition requires a document.');
  const canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
  const image=ctx.getImageData(0,0,width,height);image.data.set(composePixels(image.data,texture));ctx.putImageData(image,0,0);return canvas;
 }
 function linePoints(a,b){let [x,y]=a;const [tx,ty]=b,dx=Math.abs(tx-x),dy=-Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1,result=[];let error=dx+dy;while(true){result.push([x,y]);if(x===tx&&y===ty)break;const twice=2*error;if(twice>=dy){error+=dy;x+=sx;}if(twice<=dx){error+=dx;y+=sy;}}return result;}
 function mount(api={}){
  const host=api.host;if(!host?.ownerDocument||typeof api.getSource!=='function')throw Error('Artwork editing needs a host and original image sources.');
  const doc=host.ownerDocument,win=doc.defaultView;let target=api.initialId||'',tool='pencil',rgba='#ff5f97ff',zoom=4,showGrid=true,spaceHeld=false,spacePanned=false,gesture=null,cursor=null,width=0,height=0,panX=0,panY=0,original=null,composite=null,imageData=null,mask=null,values=null,sourceImage=null,sourceStamp=null,loading=false,destroyed=false,loadToken=0,drawFrame=0,expanded=false,placeholder=null,returnFocus=null,nativeFullscreen=false,expansionVersion=0;
  const el=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const button=(text,action,key)=>{const node=el('button','',text);node.type='button';node.onclick=action;if(key)node.dataset[key]='';return node;};
  const field=(text,node)=>{const label=el('label','artwork-field');label.append(doc.createTextNode(text),node);return label;};
  const select=(label,items,key)=>{const node=el('select');node.setAttribute('aria-label',label);if(key)node.dataset[key]='';for(const [value,text]of items){const option=el('option','',text);option.value=String(value);node.append(option);}return node;};
  host.classList.add('artwork-editor');host.dataset.artworkEditor='';host.replaceChildren();
  const heading=el('div','artwork-heading'),title=el('h3','dev-heading','Pixel artwork'),expand=button('⛶ Full screen',()=>setExpanded(!expanded),'artworkExpand');expand.setAttribute('aria-expanded','false');heading.append(title,expand);host.append(heading);
  host.append(el('p','artwork-help','Paint exact pixels. Drag Line for a straight line. Pick colour copies the pixel you click. Right-drag or hold Space to pan; use the wheel to zoom.'));
  const targetSelect=select('Artwork to edit',[],'artworkTarget');host.append(field('Background, asset or character',targetSelect));
  const tools=el('div','artwork-controls'),toolSelect=select('Artwork tool',[['pencil','Pencil'],['line','Straight line'],['erase','Eraser'],['restore','Restore original'],['picker','Pick colour'],['fill','Fill connected colour'],['pan','Pan']],'artworkTool');
  const colorInput=el('input');colorInput.type='color';colorInput.value=rgba.slice(0,7);colorInput.setAttribute('aria-label','Artwork colour');colorInput.dataset.artworkColor='';
  const hexInput=el('input');hexInput.type='text';hexInput.value=rgba;hexInput.maxLength=9;hexInput.spellcheck=false;hexInput.setAttribute('aria-label','Artwork exact hex colour');hexInput.dataset.artworkHex='';
  const colorGroup=el('div','artwork-colour');colorGroup.append(colorInput,hexInput);tools.append(field('Tool',toolSelect),field('Colour · #RRGGBBAA',colorGroup));host.append(tools);
  const viewTools=el('div','artwork-view-tools'),zoomSelect=select('Artwork zoom',[.25,.5,1,2,4,8,12,16,24,32,48,64].map(value=>[value,value+'×']),'artworkZoom');zoomSelect.value=String(zoom);
  const grid=el('input');grid.type='checkbox';grid.checked=true;grid.setAttribute('aria-label','Show artwork pixel grid');grid.dataset.artworkGrid='';const gridLabel=field('Pixel grid',grid);gridLabel.classList.add('artwork-check');
  const fit=button('Fit image',fitView,'artworkFit');viewTools.append(field('Zoom',zoomSelect),fit,gridLabel);host.append(viewTools);
  const stage=el('div','artwork-stage'),canvas=el('canvas','artwork-canvas');canvas.dataset.artworkCanvas='';canvas.tabIndex=0;canvas.setAttribute('aria-label','Pixel artwork canvas. Arrow keys move the pixel cursor; Space paints. Hold Space and drag to pan.');stage.append(canvas);host.append(stage);
  const status=el('p','artwork-status','Choose artwork to begin.');status.dataset.artworkStatus='';status.setAttribute('role','status');host.append(status);
  const actions=el('div','artwork-actions');
  const undoButton=typeof api.onUndo==='function'?button('↶ Undo',()=>history('undo'),'artworkUndo'):null,redoButton=typeof api.onRedo==='function'?button('↷ Redo',()=>history('redo'),'artworkRedo'):null;
  if(undoButton)actions.append(undoButton);if(redoButton)actions.append(redoButton);
  actions.append(button('Export PNG',exportPNG,'artworkExport'),button('Reset artwork',reset,'artworkReset'));host.append(actions);
  const palette=el('div','artwork-palette');palette.setAttribute('aria-label','Artwork colour palette');for(const value of ['#000000ff','#ffffffff','#808080ff','#ff5599ff','#53d9ffff','#ffe177ff','#7755aaff','#58a369ff']){const b=button('',()=>setColor(value));b.style.background=value.slice(0,7);b.setAttribute('aria-label','Use colour '+value.slice(0,7));palette.append(b);}host.append(palette);
  function editable(){return !destroyed&&!loading&&!!composite&&api.canEdit?.()!==false;}
  function currentData(){return normalize(api.getData?.()||{})||{};}
  function setStatus(text){status.textContent=text;}
  function syncHistory(){const state=api.getHistory?.();if(undoButton)undoButton.disabled=api.canEdit?.()===false||!!state&&!state.undo;if(redoButton)redoButton.disabled=api.canEdit?.()===false||!!state&&!state.redo;}
  function history(which){if(api.canEdit?.()===false)return;finishGesture();const callback=which==='undo'?api.onUndo:api.onRedo;try{callback?.();refresh();}catch(error){setStatus(error.message||'History could not be changed.');}}

  function setColor(value){if(/^#[0-9a-f]{6}$/i.test(value))value+='ff';if(!color(value))return false;rgba=value.toLowerCase();hexInput.value=rgba;colorInput.value=rgba.slice(0,7);hexInput.removeAttribute('aria-invalid');return true;}
  function targets(){return (api.getTargets?.()||[]).filter(item=>item&&safeId(item.id));}
  function syncTargets(){const list=targets();targetSelect.replaceChildren();for(const item of list){const option=el('option','',item.name||item.label||item.id);option.value=item.id;targetSelect.append(option);}if(!list.some(item=>item.id===target))target=list[0]?.id||'';targetSelect.value=target;return list;}
  function resize(){if(destroyed)return;const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;requestDraw();}}
  function requestDraw(){if(!drawFrame&&!destroyed)drawFrame=win.requestAnimationFrame(()=>{drawFrame=0;draw();});}
  function draw(){
   const g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);g.imageSmoothingEnabled=false;
   const checker=12;for(let yy=0;yy<canvas.height;yy+=checker)for(let xx=0;xx<canvas.width;xx+=checker){g.fillStyle=((xx/checker+yy/checker)&1)?'#253047':'#35415b';g.fillRect(xx,yy,checker,checker);}
   if(!composite)return;
   const sx=Math.max(0,Math.floor(-panX/zoom)),sy=Math.max(0,Math.floor(-panY/zoom)),ex=Math.min(width,Math.ceil((canvas.width-panX)/zoom)),ey=Math.min(height,Math.ceil((canvas.height-panY)/zoom));
   if(ex>sx&&ey>sy)g.drawImage(composite,sx,sy,ex-sx,ey-sy,panX+sx*zoom,panY+sy*zoom,(ex-sx)*zoom,(ey-sy)*zoom);
   if(showGrid&&zoom>=8&&ex>sx&&ey>sy){g.strokeStyle='#d7eaff38';g.lineWidth=1;g.beginPath();for(let xx=sx;xx<=ex;xx++){const x=Math.round(panX+xx*zoom)+.5;g.moveTo(x,Math.max(0,panY));g.lineTo(x,Math.min(canvas.height,panY+height*zoom));}for(let yy=sy;yy<=ey;yy++){const y=Math.round(panY+yy*zoom)+.5;g.moveTo(Math.max(0,panX),y);g.lineTo(Math.min(canvas.width,panX+width*zoom),y);}g.stroke();}
   if(cursor){g.strokeStyle='#ffffff';g.lineWidth=1;g.strokeRect(Math.round(panX+cursor.x*zoom)+.5,Math.round(panY+cursor.y*zoom)+.5,Math.max(1,zoom-1),Math.max(1,zoom-1));g.strokeStyle='#111827';g.strokeRect(Math.round(panX+cursor.x*zoom)-.5,Math.round(panY+cursor.y*zoom)-.5,Math.max(2,zoom+1),Math.max(2,zoom+1));}
  }
  function keepVisible(){panX=clamp(panX,Math.min(20,canvas.width-width*zoom-20),Math.max(20,canvas.width-width*zoom-20));panY=clamp(panY,Math.min(20,canvas.height-height*zoom-20),Math.max(20,canvas.height-height*zoom-20));}
  function setZoom(next,anchor){if(!Number.isFinite(next)||next<.125||next>64)return;finishGesture();const a=anchor||{x:canvas.width/2,y:canvas.height/2},wx=(a.x-panX)/zoom,wy=(a.y-panY)/zoom;zoom=next;panX=a.x-wx*zoom;panY=a.y-wy*zoom;zoomSelect.value=String(zoom);keepVisible();requestDraw();setStatus('Zoom '+Math.round(zoom*100)+'% · '+width+' × '+height+' pixels.');}
  function fitView(){if(!composite)return;finishGesture();zoom=Math.min(64,Math.max(.125,Math.min((canvas.width-24)/width,(canvas.height-24)/height)));panX=Math.round((canvas.width-width*zoom)/2);panY=Math.round((canvas.height-height*zoom)/2);zoomSelect.value='';requestDraw();setStatus(width+' × '+height+' pixels · Fit view.');}
  function loadBuffers(){
   const texture=currentData()[target];if(texture&&!validateTexture(texture,width,height))throw Error('Saved artwork dimensions no longer match this image.');
   ({mask,values}=dense(texture,width,height));imageData=original.getContext('2d',{willReadFrequently:true}).getImageData(0,0,width,height);
   if(texture)imageData.data.set(composePixels(imageData.data,texture));composite.getContext('2d').putImageData(imageData,0,0);
  }
  async function refresh(){
   if(destroyed)return;syncHistory();const list=syncTargets();if(!target||!list.length){setStatus('There is no editable artwork in this room.');return;}
   if(gesture)cancelGesture();const token=++loadToken;loading=true;
   try{
    const source=await api.getSource(target);if(token!==loadToken||destroyed)return;
    if(source?.decode&&source.complete===false)await source.decode();if(token!==loadToken||destroyed)return;
    const w=source?.naturalWidth||source?.width,h=source?.naturalHeight||source?.height;if(!dimensions(w,h))throw Error('This image is too large to edit. Maximum: 8192 pixels per side and 16 million pixels.');
    const viewChanged=sourceStamp!==target||width!==w||height!==h,changed=sourceImage!==source||viewChanged;sourceImage=source;sourceStamp=target;width=w;height=h;
    if(changed){original=doc.createElement('canvas');original.width=width;original.height=height;original.getContext('2d',{willReadFrequently:true}).drawImage(source,0,0);composite=doc.createElement('canvas');composite.width=width;composite.height=height;cursor=null;}
    loadBuffers();loading=false;resize();if(viewChanged)fitView();else requestDraw();setStatus(width+' × '+height+' pixels · Edits save with the project.');
   }catch(error){if(token!==loadToken||destroyed)return;loading=false;composite=null;setStatus(error.message||'This artwork could not be loaded.');requestDraw();}
  }
  function local(event){const box=canvas.getBoundingClientRect();return {x:(event.clientX-box.left)*canvas.width/Math.max(1,box.width),y:(event.clientY-box.top)*canvas.height/Math.max(1,box.height)};}
  function locate(event,limit=false){const point=local(event),x=Math.floor((point.x-panX)/zoom),y=Math.floor((point.y-panY)/zoom);if(!limit&&(x<0||y<0||x>=width||y>=height))return null;return {x:clamp(x,0,width-1),y:clamp(y,0,height-1)};}
  function renderPixel(at){const offset=at*4;if(mask[at]){const value=values[at];imageData.data[offset]=value&255;imageData.data[offset+1]=value>>>8&255;imageData.data[offset+2]=value>>>16&255;imageData.data[offset+3]=value>>>24&255;}else{const data=gesture?.originalRGBA||original.getContext('2d').getImageData(0,0,width,height).data;for(let c=0;c<4;c++)imageData.data[offset+c]=data[offset+c];}}
  function upload(bounds){if(!bounds)return;const ctx=composite.getContext('2d');ctx.putImageData(imageData,0,0,bounds.x,bounds.y,bounds.right-bounds.x+1,bounds.bottom-bounds.y+1);requestDraw();}
  function applyPoints(points,value){let box=null;const indices=[];for(const [x,y]of points){const at=y*width+x;indices.push(at);mask[at]=value===undefined?0:1;values[at]=value===undefined?0:pack(value);renderPixel(at);if(!box)box={x,y,right:x,bottom:y};else{box.x=Math.min(box.x,x);box.y=Math.min(box.y,y);box.right=Math.max(box.right,x);box.bottom=Math.max(box.bottom,y);}}upload(box);return indices;}
  function sample(point){const at=(point.y*width+point.x)*4;setColor('#'+Array.from(imageData.data.slice(at,at+4),v=>v.toString(16).padStart(2,'0')).join(''));setStatus('Copied '+rgba+' from pixel '+point.x+', '+point.y+'. Choose Pencil or Line to paint it.');}
  function begin(point,event){gesture={id:event.pointerId,anchor:point,last:point,line:tool==='line'||event.shiftKey,mask:mask.slice(),values:values.slice(),originalRGBA:original.getContext('2d',{willReadFrequently:true}).getImageData(0,0,width,height).data,preview:[],tool,value:tool==='erase'?'#00000000':tool==='restore'?undefined:rgba};}
  function strokeTo(point){if(!gesture||gesture.pan)return;cursor=point;if(gesture.line){const old=gesture.preview;for(const at of old){mask[at]=gesture.mask[at];values[at]=gesture.values[at];renderPixel(at);}if(old.length)composite.getContext('2d').putImageData(imageData,0,0);gesture.preview=applyPoints(linePoints([gesture.anchor.x,gesture.anchor.y],[point.x,point.y]),gesture.value);}else applyPoints(linePoints([gesture.last.x,gesture.last.y],[point.x,point.y]),gesture.value);gesture.last=point;setStatus('Pixel '+point.x+', '+point.y+' · '+(gesture.line?'Line preview · release to apply':gesture.tool==='restore'?'original':gesture.value));}
  function fill(point){
   const at=(point.y*width+point.x)*4,source=Array.from(imageData.data.slice(at,at+4)),seen=new Uint8Array(width*height),pending=new Uint32Array(width*height);let head=0,tail=1;pending[0]=point.y*width+point.x;seen[pending[0]]=1;const value=pack(rgba);let minX=width,minY=height,maxX=0,maxY=0;
   while(head<tail){const index=pending[head++],offset=index*4;if(!source.every((channel,c)=>imageData.data[offset+c]===channel))continue;const x=index%width,y=Math.floor(index/width);mask[index]=1;values[index]=value;renderPixel(index);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    for(const next of [x?index-1:-1,x<width-1?index+1:-1,y?index-width:-1,y<height-1?index+width:-1])if(next>=0&&!seen[next]){seen[next]=1;pending[tail++]=next;}
   }
   if(minX<width)upload({x:minX,y:minY,right:maxX,bottom:maxY});
  }
  function finishGesture(){
   if(!gesture)return;const previous=gesture;gesture=null;if(previous.pan){canvas.classList.remove('is-panning');return;}
   const next=currentData(),texture=fromDense(width,height,mask,values);if(Object.keys(texture.tiles).length)next[target]=texture;else delete next[target];
   if(JSON.stringify(next)===JSON.stringify(currentData())){requestDraw();return;}
   if(api.canEdit?.()===false){loadBuffers();requestDraw();setStatus('Editing is not available for this profile.');return;}
   try{if(api.onChange?.(next)===false)throw Error('This edit could not be saved. Export or undo other edits to make room.');syncHistory();setStatus('Pixels applied · Undo is available in the console.');}catch(error){loadBuffers();requestDraw();setStatus(error.message||'The pixels could not be saved.');}
  }
  function cancelGesture(){if(!gesture)return;gesture=null;spaceHeld=false;canvas.classList.remove('is-panning');if(composite)loadBuffers();requestDraw();setStatus('Stroke cancelled.');}
  function down(event){
   if(!editable()||gesture||![0,2].includes(event.button))return;const pan=event.button===2||tool==='pan'||spaceHeld;if(!pan&&!locate(event))return;event.preventDefault();event.stopPropagation();canvas.focus({preventScroll:true});canvas.setPointerCapture?.(event.pointerId);
   if(pan){if(spaceHeld)spacePanned=true;const point=local(event);gesture={id:event.pointerId,pan:true,x:point.x,y:point.y,panX,panY};canvas.classList.add('is-panning');return;}
   const point=locate(event);cursor=point;if(tool==='picker'){sample(point);requestDraw();return;}begin(point,event);if(tool==='fill'){fill(point);finishGesture();}else strokeTo(point);
  }
  function move(event){if(!composite)return;if(!gesture){cursor=locate(event);requestDraw();return;}if(gesture.id!==event.pointerId)return;event.preventDefault();event.stopPropagation();if(gesture.pan){const point=local(event);panX=gesture.panX+point.x-gesture.x;panY=gesture.panY+point.y-gesture.y;keepVisible();requestDraw();return;}if(api.canEdit?.()===false){cancelGesture();return;}strokeTo(locate(event,true));}
  function up(event){if(gesture?.id!==event.pointerId)return;event.preventDefault();event.stopPropagation();if(!gesture.pan)strokeTo(locate(event,true));finishGesture();}
  function keydown(event){
   if(destroyed)return;if(expanded&&event.key==='Escape'){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(gesture)cancelGesture();setExpanded(false);return;}
   if(event.target!==canvas)return;
   if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopPropagation();if(!composite)return;cursor=cursor||{x:clamp(Math.floor((canvas.width/2-panX)/zoom),0,width-1),y:clamp(Math.floor((canvas.height/2-panY)/zoom),0,height-1)};cursor={x:clamp(cursor.x+(event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0),0,width-1),y:clamp(cursor.y+(event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0),0,height-1)};const px=panX+cursor.x*zoom,py=panY+cursor.y*zoom;if(px<0||px+zoom>canvas.width)panX=canvas.width/2-cursor.x*zoom;if(py<0||py+zoom>canvas.height)panY=canvas.height/2-cursor.y*zoom;requestDraw();setStatus('Pixel '+cursor.x+', '+cursor.y+'.');return;}
   if(event.code==='Space'){event.preventDefault();event.stopPropagation();if(!event.repeat)spacePanned=false;spaceHeld=true;return;}
   if(event.key==='Enter'){event.preventDefault();event.stopPropagation();if(!editable()||!cursor)return;if(tool==='picker')sample(cursor);else if(tool!=='pan'){begin(cursor,{pointerId:-1,shiftKey:false});if(tool==='fill')fill(cursor);else strokeTo(cursor);finishGesture();}return;}
   if(event.key==='Escape'&&gesture){event.preventDefault();event.stopPropagation();cancelGesture();return;}
   if(['+','=','-','_'].includes(event.key)){event.preventDefault();event.stopPropagation();setZoom(clamp(zoom*(event.key==='-'||event.key==='_'?.5:2),.125,64));}
  }
  function keyup(event){if(event.code!=='Space'||!spaceHeld)return;event.preventDefault();event.stopPropagation();if(!spacePanned&&!gesture&&event.target===canvas&&editable()&&cursor&&tool!=='pan'){if(tool==='picker')sample(cursor);else{begin(cursor,{pointerId:-1,shiftKey:false});if(tool==='fill')fill(cursor);else strokeTo(cursor);finishGesture();}}spaceHeld=false;spacePanned=false;}
  function wheel(event){if(!composite)return;event.preventDefault();event.stopPropagation();const levels=[.125,.25,.5,1,2,4,8,12,16,24,32,48,64],next=event.deltaY<0?levels.find(value=>value>zoom):[...levels].reverse().find(value=>value<zoom);if(next)setZoom(next,local(event));}
  function exportPNG(){if(!composite)return;finishGesture();const link=doc.createElement('a');link.download='coda-'+target.replace(/[^a-z0-9_-]/gi,'-')+'.png';link.href=composite.toDataURL('image/png');link.click();}
  function reset(){if(!editable())return;finishGesture();const next=currentData();delete next[target];try{if(api.onChange?.(next)===false)throw Error('Reset could not be saved.');loadBuffers();requestDraw();setStatus('Original artwork restored · Undo is available.');}catch(error){setStatus(error.message);}}
  function restorePortal(){const focus=returnFocus;returnFocus=null;if(placeholder?.parentNode)placeholder.parentNode.insertBefore(host,placeholder);placeholder?.remove();placeholder=null;host.classList.remove('is-expanded');expand.textContent='⛶ Full screen';expand.setAttribute('aria-expanded','false');requestDraw();win.requestAnimationFrame(()=>{resize();focus?.focus?.({preventScroll:true});});}
  function setExpanded(value){
   value=!!value;if(destroyed||value===expanded)return;finishGesture();expanded=value;const version=++expansionVersion;
   if(value){returnFocus=doc.activeElement;placeholder=doc.createComment('Artwork editor position');host.before(placeholder);const fullscreenRoot=doc.fullscreenElement; (fullscreenRoot||doc.body).append(host);host.classList.add('is-expanded');expand.textContent='↙ Return to console';expand.setAttribute('aria-expanded','true');resize();canvas.focus({preventScroll:true});if(!fullscreenRoot&&typeof host.requestFullscreen==='function'){nativeFullscreen=true;Promise.resolve(host.requestFullscreen()).then(()=>{if(destroyed||!expanded||version!==expansionVersion){if(doc.fullscreenElement===host)Promise.resolve(doc.exitFullscreen()).catch(()=>{});}}).catch(()=>{if(version===expansionVersion)nativeFullscreen=false;resize();});}}
   else{nativeFullscreen=false;if(doc.fullscreenElement===host)Promise.resolve(doc.exitFullscreen()).catch(()=>{});restorePortal();}
   api.onExpandedChange?.(expanded);
  }
  function fullscreenChanged(){if(destroyed)return;if(nativeFullscreen&&doc.fullscreenElement!==host){nativeFullscreen=false;if(expanded){expanded=false;restorePortal();api.onExpandedChange?.(false);}}resize();}
  function hidden(){if(doc.hidden)cancelGesture();}
  function blur(){spaceHeld=false;cancelGesture();}
  function selectTarget(id){if(!targets().some(item=>item.id===id))return false;finishGesture();target=id;targetSelect.value=id;refresh();return true;}
  targetSelect.onchange=()=>selectTarget(targetSelect.value);toolSelect.onchange=()=>{finishGesture();tool=toolSelect.value;canvas.classList.toggle('is-pan-tool',tool==='pan');setStatus(tool==='line'?'Drag from the first pixel to the last, then release.':tool==='picker'?'Click an artwork pixel to copy its exact colour.':'Tool: '+tool+'.');};colorInput.oninput=()=>setColor(colorInput.value+rgba.slice(7));hexInput.onchange=()=>{if(!setColor(hexInput.value)){hexInput.setAttribute('aria-invalid','true');setStatus('Enter #RRGGBB or #RRGGBBAA, for example #53d9ffff.');}};zoomSelect.onchange=()=>setZoom(Number(zoomSelect.value));grid.onchange=()=>{showGrid=grid.checked;requestDraw();};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',event=>{if(gesture?.id===event.pointerId)cancelGesture();});canvas.addEventListener('lostpointercapture',event=>{if(gesture?.id===event.pointerId)cancelGesture();});canvas.addEventListener('contextmenu',event=>event.preventDefault());canvas.addEventListener('wheel',wheel,{passive:false});
  doc.addEventListener('keydown',keydown,true);doc.addEventListener('keyup',keyup,true);doc.addEventListener('visibilitychange',hidden);doc.addEventListener('fullscreenchange',fullscreenChanged);win.addEventListener('blur',blur);win.addEventListener('resize',resize);
  const observer=typeof win.ResizeObserver==='function'?new win.ResizeObserver(resize):null;observer?.observe(stage);resize();refresh();
  return {refresh,selectTarget,finishGesture,cancelGesture,setExpanded,getState:()=>({target,tool,color:rgba,rgba,zoom,grid:showGrid,expanded,loading,width,height,pan:{x:panX,y:panY},cursor:cursor?{...cursor}:null,stroke:!!gesture,viewport:{width:canvas.width,height:canvas.height},edits:currentData()}),dispose(){if(destroyed)return;cancelGesture();if(expanded)setExpanded(false);destroyed=true;++loadToken;observer?.disconnect();if(drawFrame)win.cancelAnimationFrame(drawFrame);doc.removeEventListener('keydown',keydown,true);doc.removeEventListener('keyup',keyup,true);doc.removeEventListener('visibilitychange',hidden);doc.removeEventListener('fullscreenchange',fullscreenChanged);win.removeEventListener('blur',blur);win.removeEventListener('resize',resize);host.classList.remove('artwork-editor','is-expanded');delete host.dataset.artworkEditor;host.replaceChildren();}};
 }
 return {TILE,MAX_DIMENSION,MAX_AREA,MAX_RUNS,validateTexture,normalizeTexture,validate,normalize,changePixels,composePixels,compose,linePoints,mount};
});
