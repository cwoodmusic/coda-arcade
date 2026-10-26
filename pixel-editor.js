/* Sparse, reversible pixel details for the JavaScript character renderer. */
(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;if(root)root.CodaPixelEditor=value;})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const WIDTH=80,HEIGHT=96,ORIGIN={x:40,y:80},DIRECTIONS=['down','left','up','right'];
 const TARGETS=['player','bach','mozart','beethoven','clara','joplin','ellington','ella','nina','miles','dj','chopin','captain-cadence','haydn','riff','pip','vee-jay','zizi','metronome'];
 const copy=value=>JSON.parse(JSON.stringify(value));
 const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
 const normalizedColor=value=>value===null||value?.length===9&&value.slice(-2).toLowerCase()==='00'?null:value?.length===9&&value.slice(-2).toLowerCase()==='ff'?value.slice(0,7).toLowerCase():value?.toLowerCase();
 function validate(data){
  if(!object(data)||Object.keys(data).some(id=>!TARGETS.includes(id)))return false;
  return Object.entries(data).every(([,views])=>object(views)&&Object.keys(views).every(direction=>DIRECTIONS.includes(direction))&&Object.values(views).every(points=>{
   if(!Array.isArray(points)||points.length>WIDTH*HEIGHT)return false;const seen=new Set();
   return points.every(point=>Array.isArray(point)&&point.length===3&&Number.isInteger(point[0])&&point[0]>=0&&point[0]<WIDTH&&Number.isInteger(point[1])&&point[1]>=0&&point[1]<HEIGHT&&(point[2]===null||typeof point[2]==='string'&&/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(point[2]))&&!seen.has(point[1]*WIDTH+point[0])&&!!seen.add(point[1]*WIDTH+point[0]));
  }));
 }
 function normalize(data){if(!validate(data))return null;const result={};for(const id of TARGETS){if(!data[id])continue;const views={};for(const direction of DIRECTIONS){const points=data[id][direction];if(points?.length)views[direction]=points.map(([x,y,color])=>[x,y,normalizedColor(color)]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);}if(Object.keys(views).length)result[id]=views;}return result;}
 function changePixels(data,id,direction,points,color){
  if(!validate(data)||!TARGETS.includes(id)||!DIRECTIONS.includes(direction)||!(color===undefined||color===null||typeof color==='string'&&/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(color)))return null;
  const next=copy(data),values=new Map((next[id]?.[direction]||[]).map(point=>[point[1]*WIDTH+point[0],point]));
  for(const point of points){const [x,y]=point;if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=WIDTH||y<0||y>=HEIGHT)continue;const key=y*WIDTH+x;if(color===undefined)values.delete(key);else values.set(key,[x,y,normalizedColor(color)]);}
  next[id]??={};next[id][direction]=Array.from(values.values());return normalize(next);
 }
 function linePoints(a,b){let [x,y]=a;const [tx,ty]=b,dx=Math.abs(tx-x),dy=-Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1,result=[];let error=dx+dy;while(true){result.push([x,y]);if(x===tx&&y===ty)break;const twice=2*error;if(twice>=dy){error+=dy;x+=sx;}if(twice<=dx){error+=dx;y+=sy;}}return result;}
 function floodPixels(rgba,x,y){
  if(!rgba||rgba.length!==WIDTH*HEIGHT*4||!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=WIDTH||y<0||y>=HEIGHT)return [];
  const origin=(y*WIDTH+x)*4,color=Array.from(rgba.slice(origin,origin+4)),visited=new Uint8Array(WIDTH*HEIGHT),pending=[y*WIDTH+x],result=[];
  while(pending.length){const at=pending.pop();if(visited[at])continue;visited[at]=1;const offset=at*4;if(!color.every((value,index)=>rgba[offset+index]===value))continue;const xx=at%WIDTH,yy=Math.floor(at/WIDTH);result.push([xx,yy]);if(xx)pending.push(at-1);if(xx<WIDTH-1)pending.push(at+1);if(yy)pending.push(at-WIDTH);if(yy<HEIGHT-1)pending.push(at+WIDTH);}
  return result;
 }
 function mount(api={}){
  const host=api.host,renderer=api.renderer;if(!host||!renderer?.renderPixelFrame)throw Error('Pixel editing needs a host and character renderer.');
  const doc=host.ownerDocument,win=doc.defaultView;let target='player',facing='down',tool='pencil',color='#ff5f97',zoom=4,mode='walk',showGrid=true,animated=true,working=null,stroke=null,frame=0,destroyed=false,lastTime=0,source=null;
  const el=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const button=(text,action)=>{const node=el('button','',text);node.type='button';node.onclick=action;return node;};
  const field=(label,node)=>{const wrapper=el('label','pixel-field');wrapper.append(doc.createTextNode(label),node);return wrapper;};
  const select=(label,values)=>{const node=el('select');node.setAttribute('aria-label',label);for(const value of values){const option=el('option','',value.label||value.name||value.id);option.value=value.id;node.append(option);}return node;};
  host.classList.add('pixel-editor');host.replaceChildren();
  host.append(el('h3','dev-heading','Pixel sprite details'),el('p','dev-note','Paint one pixel at a time. Each direction has its own details. The character keeps its walking, jumping, clothing, and emotes. Erase makes the character pixel transparent; Restore brings back the original pixel. Choose Pan canvas to move around at high zoom.'));
  const targets=(api.getTargets?.()||TARGETS.map(id=>({id,name:id}))).filter(item=>TARGETS.includes(item.id));if(!targets.length)targets.push({id:'player',name:'Your avatar'});target=targets[0].id;
  const targetSelect=select('Sprite character',targets),facingSelect=select('Sprite direction',[{id:'down',label:'Front'},{id:'left',label:'Left'},{id:'up',label:'Back'},{id:'right',label:'Right'}]);
  const toolbar=el('div','pixel-fields');toolbar.append(field('Character',targetSelect),field('Facing',facingSelect));host.append(toolbar);
  const toolSelect=select('Pixel tool',[{id:'pencil',label:'Pencil'},{id:'erase',label:'Eraser'},{id:'picker',label:'Pick colour'},{id:'fill',label:'Fill connected colour'},{id:'restore',label:'Restore original pixel'},{id:'pan',label:'Pan canvas'}]);
  const colorInput=el('input');colorInput.type='color';colorInput.value=color;colorInput.setAttribute('aria-label','Pixel colour');
  const tools=el('div','pixel-fields');tools.append(field('Tool',toolSelect),field('Colour',colorInput));host.append(tools);
  const palette=el('div','pixel-palette');palette.setAttribute('role','group');palette.setAttribute('aria-label','Pixel colour palette');
  for(const swatch of ['#171424','#ffffff','#999ca6','#626875','#e5ad75','#704633','#ff5f97','#6ce4da','#f4d77e','#7756a5','#3e6baf','#58a369']){const choose=button('',()=>setColor(swatch));choose.className='pixel-swatch';choose.style.background=swatch;choose.setAttribute('aria-label','Use colour '+swatch);palette.append(choose);}host.append(palette);
  const zoomSelect=select('Pixel zoom',[1,2,3,4,6,8,12].map(value=>({id:String(value),label:value+'×'})));zoomSelect.value=String(zoom);
  const gridToggle=el('input');gridToggle.type='checkbox';gridToggle.checked=true;gridToggle.setAttribute('aria-label','Show pixel grid');const gridLabel=field('Show grid',gridToggle);gridLabel.classList.add('pixel-check');
  const viewTools=el('div','pixel-fields');viewTools.append(field('Zoom',zoomSelect),gridLabel);host.append(viewTools);
  const scroller=el('div','pixel-grid-scroll'),canvas=el('canvas','pixel-grid');canvas.id='pixelEditCanvas';canvas.tabIndex=0;canvas.setAttribute('aria-label','Editable pixel grid. Use arrow keys to move the cursor and Space to paint.');scroller.append(canvas);host.append(scroller);
  const status=el('p','pixel-status','Choose a pixel to edit.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');host.append(status);
  const resets=el('div','pixel-actions');resets.append(button('Reset this direction',()=>reset(false)),button('Reset this character',()=>reset(true)));host.append(resets);
  const previewHeading=el('h4','','Live preview'),preview=el('canvas','pixel-preview');preview.id='pixelLivePreview';preview.width=160;preview.height=192;preview.setAttribute('aria-label','Animated sprite preview');
  const modeSelect=select('Sprite preview movement',[{id:'idle',label:'Idle'},{id:'walk',label:'Walk'},{id:'emote',label:'Equipped emote'}]);modeSelect.value=mode;
  const animateToggle=el('input');animateToggle.type='checkbox';animateToggle.checked=true;animateToggle.setAttribute('aria-label','Animate sprite preview');const animateLabel=field('Animate preview',animateToggle);animateLabel.classList.add('pixel-check');
  const motionTools=el('div','pixel-fields');motionTools.append(field('Movement',modeSelect),animateLabel);host.append(previewHeading,motionTools,preview,button('Export facing as PNG',exportPNG),el('p','studioTip','Sprite edits are included in Save project, Export JSON, and the console Undo / Redo controls. Boutique choices still work under your pixel details.'));
  let cursor={x:40,y:45};
  function data(){return working||normalize(api.getData?.()||{})||{};}
  function profile(){return api.getProfile?.(target)|| (target==='player'?{}:renderer.appearanceFor(target));}
  function setColor(value){color=value;colorInput.value=value;status.textContent='Colour '+value+'.';}
  function pixels(options={}){return renderer.renderPixelFrame(target,profile(),{facing,walking:false},0,{pixelEdits:data(),...options});}
  function drawGrid(){
   source=pixels();if(!source)return;canvas.width=WIDTH*zoom;canvas.height=HEIGHT*zoom;canvas.style.width=canvas.width+'px';canvas.style.height=canvas.height+'px';const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;
   const tile=Math.max(4,zoom*4);for(let y=0;y<canvas.height;y+=tile)for(let x=0;x<canvas.width;x+=tile){g.fillStyle=((x/tile+y/tile)%2)?'#293246':'#39445b';g.fillRect(x,y,tile,tile);}g.drawImage(source,0,0,canvas.width,canvas.height);
   if(showGrid&&zoom>=3){g.strokeStyle='#d9e5ff24';g.lineWidth=1;g.beginPath();for(let x=0;x<=WIDTH;x++){g.moveTo(x*zoom+.5,0);g.lineTo(x*zoom+.5,canvas.height);}for(let y=0;y<=HEIGHT;y++){g.moveTo(0,y*zoom+.5);g.lineTo(canvas.width,y*zoom+.5);}g.stroke();}
   g.strokeStyle='#a7ffde';g.lineWidth=1;g.strokeRect(cursor.x*zoom+.5,cursor.y*zoom+.5,Math.max(1,zoom-1),Math.max(1,zoom-1));
  }
  function drawPreview(time){const motion={facing,walking:mode==='walk',phase:time*7,emote:mode==='emote'?(profile().emote||'wave'):null,emoteTime:time};const image=renderer.renderPixelFrame(target,profile(),motion,time,{pixelEdits:data()});if(!image)return;const g=preview.getContext('2d');g.clearRect(0,0,preview.width,preview.height);g.imageSmoothingEnabled=false;g.drawImage(image,0,0,preview.width,preview.height);}
  function tick(time){frame=0;if(destroyed||!host.isConnected||!host.getClientRects().length)return;lastTime=time/1000;drawPreview(animated?lastTime:0);if(animated)frame=win.requestAnimationFrame(tick);}
  function start(){if(frame)win.cancelAnimationFrame(frame);frame=0;drawPreview(animated?lastTime:0);if(animated&&host.isConnected&&host.getClientRects().length)frame=win.requestAnimationFrame(tick);}
  function refresh(){if(destroyed)return;drawGrid();start();}
  function commit(){const next=working;working=null;stroke=null;if(!next)return;const previous=normalize(api.getData?.()||{})||{};if(JSON.stringify(previous)!==JSON.stringify(next)){try{api.onChange?.(next);status.textContent='Pixel details applied. Undo is available.';}catch{status.textContent='Pixel details could not be saved. Try again.';}}refresh();}
  function locate(event){const box=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(WIDTH-1,Math.floor((event.clientX-box.left)*canvas.width/box.width/zoom))),y:Math.max(0,Math.min(HEIGHT-1,Math.floor((event.clientY-box.top)*canvas.height/box.height/zoom)))};}
  function paint(point,last){cursor=point;if(tool==='picker'){const sample=source.getContext('2d').getImageData(point.x,point.y,1,1).data;if(sample[3])setColor('#'+Array.from(sample.slice(0,3),value=>value.toString(16).padStart(2,'0')).join(''));else status.textContent='This pixel is transparent.';return;}
   let points=last?linePoints([last.x,last.y],[point.x,point.y]):[[point.x,point.y]];
   if(tool==='fill')points=floodPixels(source.getContext('2d').getImageData(0,0,WIDTH,HEIGHT).data,point.x,point.y);
   working=changePixels(data(),target,facing,points,tool==='erase'?null:tool==='restore'?undefined:color);drawGrid();drawPreview(lastTime);status.textContent='Pixel '+point.x+', '+point.y+' · '+(tool==='erase'?'transparent':tool==='restore'?'original':color);
  }
  function down(event){if(event.button!==0)return;if(tool==='pan'){if(event.pointerType!=='touch'){event.preventDefault();stroke={id:event.pointerId,pan:true,x:event.clientX,y:event.clientY,left:scroller.scrollLeft,top:scroller.scrollTop};canvas.setPointerCapture?.(event.pointerId);}return;}event.preventDefault();canvas.focus({preventScroll:true});working=copy(normalize(api.getData?.()||{})||{});const point=locate(event);stroke={id:event.pointerId,last:point};canvas.setPointerCapture?.(event.pointerId);paint(point);if(tool==='picker'||tool==='fill')commit();}
  function move(event){if(!stroke||event.pointerId!==stroke.id)return;event.preventDefault();if(stroke.pan){scroller.scrollLeft=stroke.left+stroke.x-event.clientX;scroller.scrollTop=stroke.top+stroke.y-event.clientY;return;}const point=locate(event);paint(point,stroke.last);stroke.last=point;}
  function up(event){if(!stroke||event.pointerId!==stroke.id)return;event.preventDefault();commit();}
  function cancel(event){if(stroke&&event.pointerId===stroke.id){working=null;stroke=null;refresh();status.textContent='Stroke cancelled.';}}
  function reset(all){const next=copy(data());if(all)delete next[target];else if(next[target])delete next[target][facing];working=normalize(next);commit();}
  function exportPNG(){const image=pixels();if(!image)return;const link=doc.createElement('a');link.download='coda-'+target+'-'+facing+'.png';link.href=image.toDataURL('image/png');link.click();}
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',event=>{if(stroke?.id===event.pointerId)commit();});
  canvas.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopPropagation();cursor={x:Math.max(0,Math.min(WIDTH-1,cursor.x+(event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0))),y:Math.max(0,Math.min(HEIGHT-1,cursor.y+(event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0)))};drawGrid();status.textContent='Pixel '+cursor.x+', '+cursor.y;}else if(event.code==='Space'||event.key==='Enter'){event.preventDefault();event.stopPropagation();if(tool==='pan'){status.textContent='Drag to pan the canvas, then choose a painting tool.';return;}working=copy(data());paint(cursor);commit();}});
  for(const [control,action]of [[targetSelect,()=>{target=targetSelect.value;}],[facingSelect,()=>{facing=facingSelect.value;}],[toolSelect,()=>{tool=toolSelect.value;canvas.style.touchAction=tool==='pan'?'pan-x pan-y':'none';}],[zoomSelect,()=>{zoom=Number(zoomSelect.value);}],[gridToggle,()=>{showGrid=gridToggle.checked;}],[modeSelect,()=>{mode=modeSelect.value;}],[animateToggle,()=>{animated=animateToggle.checked;}]])control.addEventListener('change',()=>{if(stroke)commit();action();refresh();});
  colorInput.addEventListener('input',()=>setColor(colorInput.value));refresh();
  function cancelGesture(){if(stroke){working=null;stroke=null;refresh();status.textContent='Stroke cancelled.';}}
  const hidden=()=>{if(doc.hidden)cancelGesture();};win.addEventListener('blur',cancelGesture);doc.addEventListener('visibilitychange',hidden);
  return {refresh,finishGesture:commit,cancelGesture,getState:()=>({target,facing,tool,color,zoom,mode,animated,grid:showGrid,stroke:!!stroke,edits:copy(data()),cursor:{...cursor}}),dispose(){if(destroyed)return;destroyed=true;win.removeEventListener('blur',cancelGesture);doc.removeEventListener('visibilitychange',hidden);if(frame)win.cancelAnimationFrame(frame);host.replaceChildren();}};
 }
 return {WIDTH,HEIGHT,ORIGIN,DIRECTIONS,TARGETS,validate,normalize,changePixels,linePoints,floodPixels,mount};
});
