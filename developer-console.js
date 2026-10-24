/* Versioned data editor for the connected world. No eval, remote code or server writes. */
window.createCodaDeveloperConsole = function (api) {
  'use strict';
  const {W, H, c, studio, layer, parts, worldArt, foregroundArt} = api;
  // Explicit catalog entries can expand an old foreground-only object while
  // retaining its stable name, so its original atlas pixels stay suppressed.
  const explicitCatalog=api.catalog||[];
  const catalog = [...explicitCatalog,...parts.filter(part=>!explicitCatalog.some(original=>original.name===part.name))];
  const FORMAT = 'CodaArcadeWorldProject', VERSION = 1, STORE = 'codaWorldProjectV1';
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const makeCanvas = (w,h) => Object.assign(document.createElement('canvas'), {width:w,height:h});
  let tab = 'objects', playtest = false, loading = true, strokeBefore = null, saveTimer;
  let pickSample = false, baseCache = null, baseKey = '', cleanupCache = null, loadFailed = false, pan = null;
  let publishedProject = null, publishedError = null, loadError = null, projectSource = 'base';
  let dialogue={}, sprites={}, dialogueEditor=null, pixelEditor=null;
  const dialogueDefaults=api.dialogueDefaults||window.CodaNPCDialogueDefaults||{};
  const TABS=['objects','collision','layers','dialogue','pixels','project'];
  const pictures = new Map();
  const maskedLayers = new WeakMap();
  const panel = $('assetStudio');
  panel.classList.add('dev-console');
  const head = panel.querySelector('.studioHead');
  head.querySelector('strong').textContent = '⌘ DEVELOPER CONSOLE';
  $('assetToggle').textContent = '⌘ Developer';
  $('assetToggle').title = 'Open developer console (F2 or Shift+A)';
  const objects = document.createElement('section');
  objects.className = 'dev-pane'; objects.id = 'devObjects';
  while (head.nextSibling) objects.append(head.nextSibling);
  panel.append(objects);
  const dock=document.createElement('button');dock.type='button';dock.textContent='⇄';dock.title='Move console to the other side';dock.setAttribute('aria-label','Move console to the other side');
  head.insertBefore(dock,$('assetClose'));
  dock.onclick=()=>{const right=panel.style.right!=='12px';panel.style.left=right?'auto':'12px';panel.style.right=right?'12px':'auto';};
  const nav = document.createElement('div'); nav.className = 'dev-tabs'; nav.setAttribute('role','tablist'); nav.setAttribute('aria-label','Developer tools');
  nav.innerHTML = TABS.map(name => `<button type="button" role="tab" id="devTab-${name}" aria-controls="dev-${name}">${name==='pixels'?'Sprites':name[0].toUpperCase()+name.slice(1)}</button>`).join('');
  head.after(nav);
  objects.id = 'dev-objects';
  objects.querySelector('.studioTip').textContent = 'Select an existing object, lift a region, or add artwork. Drag objects and gold handles to move, resize and rotate.';
  const catalogUI = document.createElement('div'); catalogUI.className = 'dev-original';
  catalogUI.innerHTML = `<label class="studioField">Existing world objects<select id="devCatalog" aria-label="Existing world objects"></select></label>
    <canvas id="devCatalogPreview" class="dev-preview" width="320" height="85" aria-label="Selected existing object preview"></canvas>
    <div class="dev-toolbar"><button type="button" id="devLift">Edit existing object</button><button type="button" id="devLiftRegion">Lift a region</button></div>
    <p class="studioTip">Click an original object on the map to select it, or choose its name here. Lift a region for artwork outside this catalog.</p>`;
  objects.children[0].after(catalogUI);
  const groups = new Map();
  for (const part of catalog) {
    const label=part.group || 'Furniture, plants & walls';
    if(!groups.has(label)){const group=document.createElement('optgroup');group.label=label;groups.set(label,group);$('devCatalog').append(group);}
    groups.get(label).append(new Option(part.label || part.name.replaceAll('_',' '),part.name));
  }
  const extra = document.createElement('details'); extra.className = 'studioCollapsible'; extra.open = true;
  extra.innerHTML = `<summary>Artwork, source patch & collision</summary>
    <div class="dev-toolbar"><button id="devReplace" type="button">Replace image</button><button id="devRestore" type="button">Restore original</button></div>
    <input type="file" id="devReplaceFile" accept="image/png,image/jpeg,image/webp,image/gif,image/apng" hidden>
    <div id="devDisco" hidden><label class="studioField">Disco ball spin speed<input id="devDiscoSpin" type="number" min="0" max="4" step="0.05"></label><label class="studioCheck"><input id="devDiscoRays" type="checkbox">Project disco light rays</label></div>
    <div id="devSource" hidden><p class="studioTip">The room is a flattened PNG. A clone patch covers the old silhouette. Pick a clean floor sample to improve the patch; hidden artwork cannot be recovered automatically.</p>
      <div class="studioGrid"><label class="studioField">Floor sample X<input type="number" id="devSampleX" min="0" step="1"></label><label class="studioField">Floor sample Y<input type="number" id="devSampleY" min="0" step="1"></label></div>
      <button type="button" id="devPickSample">Pick floor sample on map</button>
      <label class="studioCheck"><input id="devRelease" type="checkbox">Open collision at original position</label>
    </div>
    <label class="studioCheck"><input id="devSolid" type="checkbox">Solid collision footprint</label>
    <div id="devCollider" hidden><p class="studioTip">Footprint uses the asset’s local coordinates and follows movement, resizing and rotation. Manual collision paint takes priority.</p><div class="studioGrid">
      <label class="studioField">Left %<input id="devColX" type="number" min="-100" max="100"></label><label class="studioField">Top %<input id="devColY" type="number" min="-100" max="100"></label>
      <label class="studioField">Width %<input id="devColW" type="number" min="1" max="200"></label><label class="studioField">Height %<input id="devColH" type="number" min="1" max="200"></label></div></div>`;
  $('assetSelection').append(extra);
  pane('collision', '<h3 class="dev-heading">Walking & collision</h3><p class="dev-note">Drag to block or open cells. Restore returns cells to the original map. Changes affect player movement and NPC routes, including original walls.</p><div id="devCollisionTools"></div>');
  pane('layers', `<h3 class="dev-heading">Foreground & background</h3><p class="dev-note">Paint promotes existing room pixels in front of actors. Erase sends them behind actors. For moved objects, choose Background, Actor depth, or Foreground in Objects.</p>
    <label class="studioField">Brush tool<select id="devLayerTool"><option value="paint">Paint foreground</option><option value="erase">Send to background / erase mask</option></select></label>
    <label class="studioField">Brush size<select id="devLayerSize"><option>1</option><option>2</option><option selected>4</option><option>8</option><option>16</option></select></label>
    <label class="studioField">Depth offset (px)<input id="devLayerDepth" type="number" min="-120" max="120" step="5" value="0"></label>
    <label class="studioCheck"><input id="devMasks" type="checkbox">Show foreground masks</label>`);
  const dialoguePane=pane('dialogue','');
  if(window.CodaDialogueEditor)dialogueEditor=window.CodaDialogueEditor.mount({host:dialoguePane,defaults:dialogueDefaults,people:window.CodaMusicianCast||[],getData:()=>dialogue,
    onApply:(id,entry)=>{const before=snapshot();dialogue[id]=clone(entry);changed(before);message('Applied musician dialogue. Save or export the project to keep a backup.');return true;},
    onReset:id=>{const before=snapshot();delete dialogue[id];changed(before);message('Restored default musician dialogue.');return true;}});
  else dialoguePane.textContent='Dialogue tools could not load. Reload the page to try again.';
  const pixelPane=pane('pixels','');
  if(window.CodaPixelEditor&&api.renderer)pixelEditor=window.CodaPixelEditor.mount({host:pixelPane,renderer:api.renderer,getData:()=>sprites,getProfile:api.getPixelProfile,getTargets:api.getPixelTargets,
    onChange:next=>{if(!window.CodaPixelEditor.validate(next))return false;const before=snapshot();sprites=clone(next);api.renderer.setPixelEdits(sprites);changed(before);message('Applied pixel edits. Save or export the project to keep a backup.');return true;}});
  else pixelPane.textContent='Sprite tools could not load. Reload the page to try again.';
  pane('project', `<h3 class="dev-heading">Complete world project</h3><p class="dev-note">Save or export objects, embedded images, floor patches, collision, foreground brush edits, musician dialogue and character sprite edits together. Edits are local to this browser until you export and publish them.</p>
    <div class="dev-toolbar"><button id="devSave" type="button">Save project</button><button id="devExport" type="button">Export project JSON</button></div>
    <div class="dev-toolbar"><button id="devImport" type="button">Import project JSON</button><button id="devReset" type="button">Reset project</button></div>
    <input id="devImportFile" type="file" accept="application/json,.json" hidden>
    <p class="studioTip">F2 opens/closes · Ctrl/Cmd+Z undo · Ctrl/Cmd+Shift+Z redo · arrows nudge · Shift bypasses snap · right-drag pans when zoomed · Escape cancels or closes. Playtest resumes movement and hides editing overlays. No live site files are changed by this console.</p>`);
  const bottom = document.createElement('div');
  bottom.innerHTML = `<div class="dev-toolbar"><button id="devUndo" type="button">↶ Undo</button><button id="devRedo" type="button">↷ Redo</button><button id="devPlaytest" type="button" aria-pressed="false">▶ Playtest</button></div><p class="dev-status" id="devStatus" role="status">Loading saved world project…</p>`;
  panel.append(bottom);
  // Existing buttons now save and exchange the complete document, not just copies.
  $('assetExport').textContent = '↓ Export project JSON'; $('assetImport').textContent = '↑ Import project JSON';
  $('assetLayer').options[0].textContent = 'Background / behind actors';
  $('assetLayer').options[2].textContent = 'Foreground / above actors';
  $('assetHelp').parentElement.querySelector('p').textContent = 'Use Project for complete JSON backups. Images are embedded. Scene edits stay in this browser until exported and published. F2 opens/closes; Ctrl/Cmd+Z undoes; Shift bypasses snapping.';
  const collision = window.createCodaCollisionEditor({W,H,cell:api.cell,gridWidth:api.gridWidth,gridHeight:api.gridHeight,navGrid:api.navGrid,baseGrid:api.baseGrid,toWorld:api.toWorld,invalidateRoutes:api.invalidateRoutes});
  let collisionBefore;
  collision.mount($('devCollisionTools'),{beforeChange:()=>{collisionBefore=snapshot();},afterChange:()=>{api.record(collisionBefore);}});

  function pane(name, html) { const el=document.createElement('section'); el.id='dev-'+name; el.className='dev-pane'; el.hidden=true; el.setAttribute('role','tabpanel');el.setAttribute('aria-labelledby','devTab-'+name);el.innerHTML=html; panel.append(el); return el; }
  function message(text) { $('devStatus').textContent=text; }
  function snapshot() { return JSON.stringify({assets:studio.assets,collision:collision.get(),strokes:layer.actions,...(Object.keys(dialogue).length?{dialogue}:{}),...(Object.keys(sprites).length?{sprites}:{})}); }
  function documentData() { return {format:FORMAT,version:VERSION,world:{width:W,height:H},...JSON.parse(snapshot())}; }
  function changed(before) { api.record(before); }
  function invalidate(layersChanged=true) { if(layersChanged)api.invalidateArtwork(); syncNavigation(); }
  function recordChange(before) {
    if (before !== snapshot()) { studio.undo.push(before); if(studio.undo.length>40)studio.undo.shift();studio.redo=[];projectSource='local'; }
    let layersChanged=true;
    try {layersChanged=JSON.stringify(JSON.parse(before).strokes)!==JSON.stringify(layer.actions);}catch{}
    studio.dirty=true; invalidate(layersChanged); api.refresh(); refresh(); scheduleSave();
  }
  function undoRedo(undo) {
    finishGesture();
    const from=undo?studio.undo:studio.redo, to=undo?studio.redo:studio.undo;
    if(!from.length)return; to.push(snapshot()); applyState(JSON.parse(from.pop()));
    studio.dirty=true; scheduleSave(); message(undo?'Undid last edit.':'Redid last edit.');
  }
  function applyState(data) {
    pixelEditor?.cancelGesture?.();
    dialogue=clone(data.dialogue||{});sprites=clone(data.sprites||{});api.renderer?.setPixelEdits?.(sprites);
    studio.assets=clone(data.assets); layer.actions=clone(data.strokes); layer.redo=[]; layer.drawing=null; layer.dirty=true;
    collision.apply(data.collision); studio.nextId=Math.max(1,...studio.assets.map(a=>Number(a.id.match(/^asset-(\d+)$/)?.[1]||0)+1));
    if(!studio.assets.some(a=>a.id===studio.selected))studio.selected=studio.assets.at(-1)?.id||null;
    invalidate(); api.refresh(); refresh();
  }
  function setTab(name) {
    name=name==='sprites'?'pixels':TABS.includes(name)?name:'objects';
    finishGesture(); tab=name; pickSample=false; studio.capturing=null;
    for(const name of TABS) { $('dev-'+name).hidden=name!==tab; $('devTab-'+name).setAttribute('aria-selected',String(name===tab)); }
    layer.active=studio.active&&tab==='layers'&&!playtest; layer.preview=false;
    collision.setActive(studio.active&&tab==='collision'&&!playtest);
    studio.showGuides=tab==='objects'&&!playtest&&$('assetGuides').checked;
    c.classList.toggle('layer-editing',layer.active);panel.scrollTop=0; refresh();
  }
  function open(name='objects') { api.toggle(true); setTab(name); c.focus(); }
  function onToggle() {
    if(!studio.active) { playtest=false; panel.classList.remove('dev-playtest'); $('devPlaytest').textContent='▶ Playtest'; $('devPlaytest').setAttribute('aria-pressed','false'); }
    setTab(tab); if(studio.active)message(loadFailed&&loadError?loadError:'Developer console active. Changes save locally; export a project backup.'+(publishedError?' '+publishedError:''));
  }
  function togglePlaytest() {
    finishGesture(); playtest=!playtest; panel.classList.toggle('dev-playtest',playtest); $('devPlaytest').setAttribute('aria-pressed',String(playtest)); $('devPlaytest').textContent=playtest?'■ Stop playtest':'▶ Playtest';
    api.invalidateRoutes(); setTab(tab); message(playtest?'Playtest: WASD or click the world to walk. Stop playtest to continue editing.':'Editing resumed.'); c.focus();
  }
  function defaultSample(bounds) {
    const [x,y,w,h]=bounds;
    // Nearby walkable floor is a sensible first clone source; the user can tune it.
    for(let r=24;r<180;r+=12)for(const [dx,dy]of [[0,r],[r,0],[-r,0],[0,-r]]){
      const sx=Math.round(Math.max(0,Math.min(W-16,x+w/2+dx))),sy=Math.round(Math.max(0,Math.min(H-16,y+h+dy)));
      if(api.baseGrid[Math.floor((sy+8)/api.cell)*api.gridWidth+Math.floor((sx+8)/api.cell)])return [sx,sy];
    }
    return [Math.min(W-16,Math.max(0,x)),Math.min(H-16,y+h+8)];
  }
  function picture(origin) {
    const key=JSON.stringify([origin.name,origin.bounds]); if(pictures.has(key))return pictures.get(key);
    const native=api.getObjectPicture?.(origin.name);if(native){pictures.set(key,native);return native;}
    // PNG headers expose naturalWidth before loading and pixel decoding finish.
    if(!worldArt.complete||!worldArt.naturalWidth||!foregroundArt.complete||!foregroundArt.naturalWidth)return null;
    const [x,y,w,h]=origin.bounds,out=makeCanvas(w,h),ctx=out.getContext('2d'); ctx.imageSmoothingEnabled=false;
    let part=catalog.find(p=>p.name===origin.name);
    // Retain legacy project keys without letting an old visible plant asset
    // repaint floor pixels over its permanently repaired source location.
    if(part?.permanentlyRemoved){pictures.set(key,out);return out;}
    if(part?.legacyBounds?.some(bounds=>JSON.stringify(bounds)===JSON.stringify(origin.bounds)))
      part=parts.find(p=>p.name===origin.name&&JSON.stringify(p.bounds)===JSON.stringify(origin.bounds))||part;
    if(part?.source==='world'){
      ctx.save();ctx.translate(-x,-y);ctx.beginPath();
      const polygons=[part.polygon || [[x,y],[x+w,y],[x+w,y+h],[x,y+h]],...(part.holes||[])];
      for(const polygon of polygons){ctx.moveTo(...polygon[0]);for(const point of polygon.slice(1))ctx.lineTo(...point);ctx.closePath();}
      ctx.clip('evenodd');ctx.drawImage(worldArt,0,0);ctx.restore();
    } else if(part)ctx.drawImage(foregroundArt,...part.atlas,0,0,w,h); else ctx.drawImage(worldArt,x,y,w,h,0,0,w,h);
    pictures.set(key,out); return out;
  }
  function catalogPreview() {
    const part=catalog.find(p=>p.name===$('devCatalog').value); if(!part)return;
    const ctx=$('devCatalogPreview').getContext('2d');ctx.clearRect(0,0,320,85);
    const img=picture({name:part.name,bounds:part.bounds}); if(!img)return;
    const scale=Math.min(300/img.width,80/img.height); ctx.imageSmoothingEnabled=false; ctx.drawImage(img,(320-img.width*scale)/2,(85-img.height*scale)/2,img.width*scale,img.height*scale);
  }
  worldArt.addEventListener('load',catalogPreview);
  foregroundArt.addEventListener('load',catalogPreview);
  function lift(origin, focus=true) {
    const existing=studio.assets.find(a=>a.origin?.name===origin.name);
    if(existing) { studio.selected=existing.id;api.refresh();refresh();message('Selected '+existing.name);return existing; }
    const part=catalog.find(p=>p.name===origin.name);
    const [x,y,w,h]=origin.bounds,a=api.prototype(part?.label || origin.name.replaceAll('_',' '),'builtin');
    a.ref='foreground'; a.crop=[0,0,w,h]; a.origin={...origin,sample:defaultSample(origin.bounds)};
    a.x=x+w/2;a.y=y+h/2;a.w=w;a.h=h;a.anim='none';a.depthOffset=(part?.sortY??y+h)-(y+h);a.layer=part?.layer || 'world';
    if(part?.sample)a.origin.sample=part.sample.slice();
    if(part?.collision){const [cx,cy,cw,ch]=part.collision;a.releaseCollision=true;a.collider={x:(cx-a.x)/w*100,y:(cy-a.y)/h*100,w:cw/w*100,h:ch/h*100};}
    if(part?.ballIndex!==undefined){a.discoSpin=part.spin;a.discoRays=true;}
    if(api.add(a)) { if(focus)api.focusWorld(a.x,a.y);refresh();message('Original object lifted. Tune the floor sample if its old position needs cleanup.');return a; }
  }
  function suppressOriginal(name) { return studio.assets.some(a=>a.origin?.name===name); }
  function drawUnliftedPixels(g, image, x, y) {
    const originals=studio.assets.filter(a=>a.origin&&!catalog.find(part=>part.name===a.origin.name)?.procedural&&a.origin.bounds[0]<x+image.width&&a.origin.bounds[0]+a.origin.bounds[2]>x&&a.origin.bounds[1]<y+image.height&&a.origin.bounds[1]+a.origin.bounds[3]>y);
    if(!originals.length){g.drawImage(image,x,y);return;}
    const key=JSON.stringify(originals.map(a=>[a.origin.name,a.origin.bounds]));
    let cached=maskedLayers.get(image);
    if(!cached||cached.key!==key){
      const canvas=makeCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);ctx.globalCompositeOperation='destination-out';
      let complete=true;
      for(const a of originals){const img=picture(a.origin);if(img)ctx.drawImage(img,a.origin.bounds[0]-x,a.origin.bounds[1]-y);else complete=false;}
      cached={key,canvas};if(complete)maskedLayers.set(image,cached);
    }
    g.drawImage(cached.canvas,x,y);
  }
  function renderBase(g) {
    if(!worldArt.complete||!worldArt.naturalWidth)return;
    const originals=studio.assets.filter(a=>a.origin&&!catalog.find(part=>part.name===a.origin.name)?.procedural);
    if(!originals.length) {g.drawImage(worldArt,0,0,W,H);return;}
    // Images load independently. Do not memoize an incomplete cleanup surface.
    if(!foregroundArt.complete||!foregroundArt.naturalWidth){g.drawImage(worldArt,0,0,W,H);return;}
    const key=JSON.stringify(originals.map(a=>a.origin));
    if(key!==baseKey||!baseCache) {
      const sourcePictures=originals.map(a=>picture(a.origin));
      if(sourcePictures.some(img=>!img)){g.drawImage(worldArt,0,0,W,H);return;}
      baseCache=makeCanvas(W,H); const bg=baseCache.getContext('2d');bg.drawImage(worldArt,0,0,W,H);
      cleanupCache=makeCanvas(W,H);const cleanup=cleanupCache.getContext('2d');
      for(const [index,a] of originals.entries()) {
        const o=a.origin,[x,y,w,h]=o.bounds,img=sourcePictures[index];
        const patch=makeCanvas(w,h),p=patch.getContext('2d'); p.imageSmoothingEnabled=false;
        const part=catalog.find(part=>part.name===o.name),repair=part?.cleanup;
        if(part?.permanentlyRemoved)continue;
        if(repair?.kind==='dance-passage'&&JSON.stringify(part.bounds)===JSON.stringify(o.bounds)){
          // Clone the unoccupied right-hand floor strip at the same world Y.
          // Its 12px half-tiles preserve the corridor's 24px grid; repeating a
          // square 16px sample here would add broken horizontal grid lines.
          const fw=repair.floorWidth,sx=Math.min(W-fw,o.sample[0]),sy=Math.min(H-h,o.sample[1]);
          for(let xx=repair.floorOffsetX-fw;xx<w;xx+=fw)p.drawImage(worldArt,sx,sy,fw,h,xx,0,fw,h);
          // The left leaves cover a blue wall column and its pink reflection.
          // Restore those from a clean 24px section directly above the plant.
          const [lx,ly,lw,lh]=repair.left;
          for(let yy=repair.leftOffsetY;yy<h;yy+=lh)p.drawImage(worldArt,lx,ly,lw,lh,0,yy,lw,lh);
        }else{
          for(let yy=0;yy<h;yy+=16)for(let xx=0;xx<w;xx+=16)p.drawImage(worldArt,o.sample[0],o.sample[1],16,16,xx,yy,16,16);
        }
        p.globalCompositeOperation='destination-in';p.drawImage(img,0,0);bg.drawImage(patch,x,y);cleanup.drawImage(patch,x,y);
      }
      baseKey=key;
    }
    g.drawImage(baseCache,0,0);
  }
  function renderCleanup(g) {if(cleanupCache&&studio.assets.some(a=>a.origin))g.drawImage(cleanupCache,0,0);}
  function validateOrigin(o) {
    if(!o||typeof o.name!=='string'||!Array.isArray(o.bounds)||o.bounds.length!==4||!o.bounds.every(Number.isInteger))return false;
    const [x,y,w,h]=o.bounds;if(x<0||y<0||w<3||h<3||x+w>W||y+h>H)return false;
    const part=catalog.find(p=>p.name===o.name);
    if(part&&JSON.stringify(part.bounds)!==JSON.stringify(o.bounds)&&!part.legacyBounds?.some(bounds=>JSON.stringify(bounds)===JSON.stringify(o.bounds)))return false;
    if(!part&&!/^region-[a-z0-9-]+$/.test(o.name))return false;
    return Array.isArray(o.sample)&&o.sample.length===2&&o.sample.every(Number.isInteger)&&o.sample[0]>=0&&o.sample[0]<=W-16&&o.sample[1]>=0&&o.sample[1]<=H-16;
  }
  function validateAssetExtension(a) {
    if(a.origin!==undefined&&!validateOrigin(a.origin))return false;
    if(a.releaseCollision!==undefined&&typeof a.releaseCollision!=='boolean')return false;
    if(a.discoSpin!==undefined&&(!Number.isFinite(a.discoSpin)||a.discoSpin<0||a.discoSpin>4))return false;
    if(a.discoRays!==undefined&&typeof a.discoRays!=='boolean')return false;
    if(a.depthOffset!==undefined&&(!Number.isFinite(a.depthOffset)||Math.abs(a.depthOffset)>H))return false;
    if(a.collider!==undefined) { const b=a.collider;if(!b||!['x','y','w','h'].every(k=>Number.isFinite(b[k])))return false;if(b.x< -100||b.x>100||b.y< -100||b.y>100||b.w<1||b.w>200||b.h<1||b.h>200)return false; }
    return true;
  }
  function validate(data) {
    return data?.format===FORMAT&&data.version===VERSION&&data.world?.width===W&&data.world?.height===H&&Array.isArray(data.assets)&&data.assets.length<=api.maxAssets&&data.assets.every(a=>api.validAsset(a)&&validateAssetExtension(a))&&new Set(data.assets.map(a=>a.id)).size===data.assets.length&&new Set(data.assets.filter(a=>a.origin).map(a=>a.origin.name)).size===data.assets.filter(a=>a.origin).length&&collision.validate(data.collision)&&Array.isArray(data.strokes)&&data.strokes.length<=1000&&data.strokes.every(api.validStroke)&&(data.dialogue===undefined||window.CodaDialogueEditor?.validate(data.dialogue,dialogueDefaults))&&(data.sprites===undefined||window.CodaPixelEditor?.validate(data.sprites));
  }
  // Movement and A* share conservative collision cells. A footprint thinner than
  // one navigation cell must still block every cell its rotated rectangle enters.
  let colliderCells = new Uint8Array(api.navGrid.length);
  function rasterizeColliders() {
    const blocked = new Uint8Array(api.navGrid.length);
    for (const a of studio.assets) {
      if (!a.collider || !a.visible) continue;
      const b=a.collider, angle=a.rotation*Math.PI/180, cs=Math.cos(angle), sn=Math.sin(angle);
      const absC=Math.abs(cs), absS=Math.abs(sn);
      const halfW=b.w*a.w/200, halfH=b.h*a.h/200;
      const localX=(b.x+b.w/2)*a.w/100, localY=(b.y+b.h/2)*a.h/100;
      const centerX=a.x+localX*cs-localY*sn, centerY=a.y+localX*sn+localY*cs;
      const extentX=absC*halfW+absS*halfH, extentY=absS*halfW+absC*halfH;
      const minX=Math.max(0,Math.floor((centerX-extentX)/api.cell));
      const maxX=Math.min(api.gridWidth-1,Math.floor((centerX+extentX)/api.cell));
      const minY=Math.max(0,Math.floor((centerY-extentY)/api.cell));
      const maxY=Math.min(api.gridHeight-1,Math.floor((centerY+extentY)/api.cell));
      for (let gy=minY;gy<=maxY;gy++) for (let gx=minX;gx<=maxX;gx++) {
        const id=gy*api.gridWidth+gx;
        if (blocked[id]) continue;
        const left=gx*api.cell, top=gy*api.cell;
        const cellHalfW=Math.min(api.cell,W-left)/2, cellHalfH=Math.min(api.cell,H-top)/2;
        const dx=left+cellHalfW-centerX, dy=top+cellHalfH-centerY;
        // Separating-axis test on world X/Y and the two local collider axes.
        // Edge contact alone does not occupy the neighboring cell.
        const epsilon=1e-7;
        if (Math.abs(dx)>=cellHalfW+extentX-epsilon || Math.abs(dy)>=cellHalfH+extentY-epsilon) continue;
        if (Math.abs(dx*cs+dy*sn)>=halfW+cellHalfW*absC+cellHalfH*absS-epsilon) continue;
        if (Math.abs(-dx*sn+dy*cs)>=halfH+cellHalfW*absS+cellHalfH*absC-epsilon) continue;
        blocked[id]=1;
      }
    }
    colliderCells=blocked;
  }
  function dynamicOverride(x,y) {
    if (x>=0&&y>=0&&x<W&&y<H&&colliderCells[Math.floor(y/api.cell)*api.gridWidth+Math.floor(x/api.cell)]) return false;
    for(const a of studio.assets)if(a.origin&&a.releaseCollision){
      const part=catalog.find(p=>p.name===a.origin.name),box=part?.collision;
      const [bx,by,bw,bh]=box?[box[0]-8,box[1]-8,box[2]+16,box[3]+16]:a.origin.bounds;
      if(x>=bx&&x<bx+bw&&y>=by&&y<by+bh)return true;
    }
    return undefined;
  }
  function walkableOverride(x,y) { const manual=collision.overrideAt(x,y);return manual===undefined?dynamicOverride(x,y):manual; }
  function syncNavigation() {
    collision.apply(collision.get());
    rasterizeColliders();
    for(let gy=0;gy<api.gridHeight;gy++)for(let gx=0;gx<api.gridWidth;gx++){
      const x=(gx+.5)*api.cell,y=(gy+.5)*api.cell;
      if(collision.overrideAt(x,y)!==undefined)continue;
      const v=dynamicOverride(x,y);if(v!==undefined)api.navGrid[gy*api.gridWidth+gx]=v?1:0;
    }
    api.invalidateRoutes();
  }
  async function save(options={}) {
    if(loading||loadFailed){message('Project loading failed or is incomplete. Export your current work before replacing storage.');return false;}
    if(options.finishGesture!==false){finishGesture();clearTimeout(saveTimer);}
    const payload={...documentData(),savedAt:Date.now()};
    if(!validate(payload)){message('Project contains unsupported data. Export a backup before changing storage.');return false;}
    try { const db=await api.db();await new Promise((resolve,reject)=>{const tx=db.transaction('layouts','readwrite');tx.objectStore('layouts').put(payload,STORE);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});studio.dirty=false;projectSource='local';message('Complete world project saved in this browser. Export JSON for a portable backup.');return true; }
    catch(err) { try {localStorage.setItem(STORE,JSON.stringify(payload));studio.dirty=false;projectSource='local';message('Project saved in local storage. Export a backup.');return true;}catch{message('Storage unavailable or full. Export project JSON now to keep your work.');return false;} }
  }
  function scheduleSave() {clearTimeout(saveTimer);saveTimer=setTimeout(()=>save({finishGesture:false}),450);}
  async function stored(key) {
    let databaseValue=null, localValue=null;
    try {const db=await api.db();databaseValue=await new Promise((resolve,reject)=>{const req=db.transaction('layouts','readonly').objectStore('layouts').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}catch{}
    try {localValue=JSON.parse(localStorage.getItem(key)||'null');}catch{}
    // A newer fallback must win over a stale IndexedDB save after quota failures.
    return localValue&&(!databaseValue||(localValue.savedAt||0)>(databaseValue.savedAt||0))?localValue:databaseValue;
  }
  async function decodeProjectImages(data) {
    for(const a of data.assets)if(a.kind==='image') {
      const [w,h]=await api.imageDimensions(a.data);
      if(w<1||h<1||w>8192||h>8192)throw Error('Invalid embedded image dimensions.');
    }
  }
  async function published() {
    if(!api.publishedProjectUrl)return {project:null,error:null};
    const request=new AbortController(),timeout=setTimeout(()=>request.abort(),10000);
    try {
      const response=await fetch(api.publishedProjectUrl,{cache:'no-cache',signal:request.signal});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(!validate(data))throw Error('Unsupported project data');
      await decodeProjectImages(data);
      return {project:clone(data),error:null};
    }catch(error){return {project:null,error:'Published layout could not load: '+(error.name==='AbortError'?'request timed out':error.message)+'.'};}
    finally{clearTimeout(timeout);}
  }
  async function load() {
    try {
      const [publication,data]=await Promise.all([published(),stored(STORE)]);
      publishedProject=publication.project;publishedError=publication.error;
      if(data) {
        if(!validate(data))throw Error('Saved project is invalid; it has been preserved. Import a valid backup.');
        await decodeProjectImages(data);applyState(data);projectSource='local';
        message('Restored complete world project.'+(publication.error?' '+publication.error+' Your saved edits are intact.':''));
      }else {
        const legacy=await stored(api.legacyStore),hasLegacy=legacy&&api.validLegacy(legacy);
        const hasLocalEdits=hasLegacy||studio.assets.length>0||layer.actions.length>0||(api.legacyCollision?.length||0)>0;
        if(hasLocalEdits){
          if(hasLegacy)studio.assets=clone(legacy.assets);
          collision.apply(api.legacyCollision||[]);invalidate();api.refresh();projectSource='legacy';
          message('Ready. Existing assets, collision and foreground edits preserved.'+(publication.error?' '+publication.error:''));
        }else if(publishedProject){
          applyState(publishedProject);projectSource='published';
          message('Loaded the published world layout. New edits save only in this browser.');
        }else{
          collision.apply([]);invalidate();api.refresh();
          loadFailed=!!publication.error;
          loadError=publication.error?publication.error+' Showing the original map; export edits before reloading.':null;
          message(loadError||'Ready. Existing assets, collision and foreground edits preserved.');
        }
      }
    }catch(err){loadFailed=true;loadError=err.message;message(loadError);}
    loading=false;studio.ready=true; refresh();catalogPreview();
  }
  function exportProject() {
    finishGesture(); const blob=new Blob([JSON.stringify(documentData(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='coda-world-project.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);message('Exported the complete world, musician dialogue and character sprite edits.');
  }
  async function importFile(file) {
    if(!file)return;
    try {
      if(file.size>70*1024*1024)throw Error('Project exceeds the 70 MB limit.');
      const data=JSON.parse(await file.text());if(!validate(data))throw Error('Invalid world project. Current edits are unchanged.');
      // Decode all embedded artwork before committing, so a broken image cannot replace a working project.
      await decodeProjectImages(data);
      if(!confirm('Replace the current complete world project? You can undo this import.'))return;
      finishGesture();const before=snapshot();applyState(data);loadFailed=false;loadError=null;changed(before);message('Imported complete project. Undo is available.');
    }catch(err){message('Import failed: '+err.message);}
  }
  function refresh() {
    dialogueEditor?.refresh();pixelEditor?.refresh();
    const a=api.selected(); $('devUndo').disabled=!studio.undo.length;$('devRedo').disabled=!studio.redo.length;
    const part=catalog.find(p=>p.name===a?.origin?.name);$('devDisco').hidden=part?.ballIndex===undefined;
    if(part?.ballIndex!==undefined){$('devDiscoSpin').value=a.discoSpin??part.spin;$('devDiscoRays').checked=a.discoRays!==false;}
    $('devSource').hidden=!a?.origin;$('devRestore').disabled=!a?.origin;
    if(a?.origin){$('devSampleX').value=a.origin.sample[0];$('devSampleY').value=a.origin.sample[1];$('devRelease').checked=!!a.releaseCollision;}
    $('devSolid').checked=!!a?.collider; $('devCollider').hidden=!a?.collider;
    if(a?.collider)for(const [field,key]of [['X','x'],['Y','y'],['W','w'],['H','h']])$('devCol'+field).value=a.collider[key];
  }
  function editSelected(fn) {const a=api.selected();if(!a)return;const before=snapshot();fn(a);changed(before);api.refresh();refresh();}
  function finishGesture() {
    pixelEditor?.finishGesture?.();
    pan=null;
    if(studio.drag||studio.capturing?.start)api.assetPointerEnd();
    if(strokeBefore!==null){api.layerPointerEnd();const before=strokeBefore;strokeBefore=null;changed(before);}
    collision.pointerEnd();
  }
  function pointerDown(e) {
    if(!studio.active||playtest)return false;
    if(loading){message('Wait for the saved project to load.');return true;}
    if(e.button===1||e.button===2){e.preventDefault();pan={x:e.clientX,y:e.clientY,id:e.pointerId};c.setPointerCapture(e.pointerId);return true;}
    if(tab==='collision')return collision.pointerDown(e);
    if(tab==='layers'){strokeBefore=snapshot();api.layerPointerDown(e);return true;}
    if(tab!=='objects')return true;
    const p=api.toWorld(e.clientX,e.clientY);
    if(pickSample) {pickSample=false;editSelected(a=>{if(a.origin)a.origin.sample=[Math.max(0,Math.min(W-16,Math.floor(p.x))),Math.max(0,Math.min(H-16,Math.floor(p.y)))];});message('Floor sample updated.');return true;}
    if(studio.capturing?.which==='lift')return false;
    if(!studio.capturing) {
      // Preserve control-handle priority and placed-object selection.
      if(api.selected()&&api.nearHandle(api.selected(),p))return false;
      if(!api.assetAt(p.x,p.y)) {
        const part=catalog.slice().reverse().find(part=>{if(suppressOriginal(part.name))return false;const [x,y,w,h]=part.bounds; if(p.x<x||p.x>=x+w||p.y<y||p.y>=y+h)return false;const image=picture({name:part.name,bounds:part.bounds});return image?.getContext('2d').getImageData(Math.floor(p.x-x),Math.floor(p.y-y),1,1).data[3]>30;});
        if(part){$('devCatalog').value=part.name;catalogPreview();lift({name:part.name,bounds:part.bounds.slice()},false);}
      }
    }
    return false;
  }
  function pointerMove(e) {if(!studio.active||playtest)return; if(pan){api.panByScreen(pan.x-e.clientX,pan.y-e.clientY);pan.x=e.clientX;pan.y=e.clientY;return;}if(tab==='collision')collision.pointerMove(e);if(tab==='layers')api.layerPointerMove(e);}
  function pointerEnd() {pan=null;if(!studio.active||playtest)return; if(tab==='collision')collision.pointerEnd();if(tab==='layers'&&strokeBefore!==null){api.layerPointerEnd();const before=strokeBefore;strokeBefore=null;changed(before);}}
  function drawOverlay(g,cam) {
    if(!studio.active||playtest)return;collision.draw(g,cam);
    if(tab==='objects'){const a=api.selected();if(a?.collider){const b=a.collider;g.save();g.translate(a.x,a.y);g.rotate(a.rotation*Math.PI/180);g.fillStyle='#ff56764d';g.strokeStyle='#ff8aab';g.lineWidth=2/cam.zoom;g.fillRect(b.x*a.w/100,b.y*a.h/100,b.w*a.w/100,b.h*a.h/100);g.strokeRect(b.x*a.w/100,b.y*a.h/100,b.w*a.w/100,b.h*a.h/100);g.restore();}}
  }
  function liftedRegion(bounds) { return lift({name:'region-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),bounds}); }
  for(const name of TABS)$('devTab-'+name).onclick=()=>setTab(name);
  $('devCatalog').onchange=catalogPreview;$('devLift').onclick=()=>{const part=catalog.find(p=>p.name===$('devCatalog').value);lift({name:part.name,bounds:part.bounds.slice()});};
  $('devDiscoSpin').onchange=()=>editSelected(a=>{a.discoSpin=api.bound($('devDiscoSpin').value,0,4,1);});
  $('devDiscoRays').onchange=()=>editSelected(a=>{a.discoRays=$('devDiscoRays').checked;});
  $('devLiftRegion').onclick=()=>{studio.capturing={which:'lift',start:null,end:null};message('Drag a rectangle around existing artwork to lift it. Its old position receives a floor patch.');c.focus();};
  $('devSampleX').max=W-16;$('devSampleY').max=H-16;
  for(const [id,index]of [['devSampleX',0],['devSampleY',1]])$(id).onchange=()=>editSelected(a=>{if(a.origin)a.origin.sample[index]=Math.round(api.bound($(id).value,0,index?H-16:W-16,a.origin.sample[index]));});
  $('devPickSample').onclick=()=>{pickSample=true;message('Click a clean floor area on the map to use as the source patch.');c.focus();};
  $('devRelease').onchange=()=>editSelected(a=>{a.releaseCollision=$('devRelease').checked;});
  $('devSolid').onchange=()=>editSelected(a=>{if($('devSolid').checked)a.collider={x:-35,y:30,w:70,h:20};else delete a.collider;});
  for(const [suffix,key]of [['X','x'],['Y','y'],['W','w'],['H','h']])$('devCol'+suffix).onchange=()=>editSelected(a=>{if(a.collider)a.collider[key]=api.bound($('devCol'+suffix).value,key==='w'||key==='h'?1:-100,key==='w'||key==='h'?200:100,a.collider[key]);});
  $('devRestore').onclick=()=>{const a=api.selected();if(!a?.origin)return;const before=snapshot();studio.assets=studio.assets.filter(q=>q!==a);studio.selected=null;changed(before);api.refresh();message('Restored the original artwork and source collision.');};
  $('devReplace').onclick=()=>$('devReplaceFile').click();
  $('devReplaceFile').onchange=async e=>{const file=e.target.files?.[0],id=studio.selected;e.target.value='';if(!file)return;try{if(!/^image\/(png|jpeg|webp|gif|apng)$/.test(file.type)||file.size>8*1024*1024)throw Error('Choose a supported image up to 8 MB.');const data=await api.fileData(file),[w,h]=await api.imageDimensions(data);if(w>8192||h>8192)throw Error('Image exceeds 8192 pixels.');if(studio.selected!==id)throw Error('Selection changed. Select the object and try again.');editSelected(a=>{a.kind='image';a.data=data;a.ref=null;a.crop=null;a.cols=a.rows=a.frames=1;a.fps=0;});message('Replaced selected artwork; size, placement and source cleanup preserved.');}catch(err){message(err.message);}};
  $('devLayerTool').onchange=e=>{layer.tool=e.target.value;};$('devLayerSize').onchange=e=>{layer.size=Number(e.target.value);};$('devLayerDepth').onchange=e=>{layer.offset=api.bound(e.target.value,-120,120,0);};$('devMasks').onchange=e=>{layer.maskView=e.target.checked;};
  $('devUndo').onclick=()=>undoRedo(true);$('devRedo').onclick=()=>undoRedo(false);$('devPlaytest').onclick=togglePlaytest;
  $('devSave').onclick=save;$('devExport').onclick=exportProject;$('assetExport').onclick=exportProject;
  $('devImport').onclick=$('assetImport').onclick=()=>$('devImportFile').click();
  $('devImportFile').onchange=e=>{const file=e.target.files?.[0];e.target.value='';importFile(file);};
  $('devReset').onclick=()=>{
    if(api.publishedProjectUrl&&!publishedProject){message('The published layout is unavailable. Your current project has been kept. Reload to retry before resetting.');return;}
    if(!confirm(publishedProject?'Reset your local project to the published world layout? Undo is available.':'Reset all objects, collision and local foreground edits? Published artwork stays intact. Undo is available.'))return;
    const before=snapshot();applyState(publishedProject||{assets:[],collision:[],strokes:[]});loadFailed=false;loadError=null;changed(before);
    message(publishedProject?'Restored the published world layout. Undo is available.':'Restored the original world layout. Undo is available.');
  };
  $('editorToggle').onclick=()=>open('layers');
  window.addEventListener('keydown',e=>{
    const typing=['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)||e.target?.isContentEditable;
    if(e.key==='F2'&&!typing){e.preventDefault();e.stopImmediatePropagation();api.toggle(!studio.active);return;}
    if(!studio.active)return;
    if(typing){e.stopImmediatePropagation();return;}
    if(!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
      const key=e.key.toLowerCase(),destination=key==='c'?'collision':key==='l'&&e.shiftKey?'layers':null;
      if(destination){
        e.preventDefault();e.stopImmediatePropagation();
        if(playtest)togglePlaytest();
        open(destination);return;
      }
    }
    if(e.key==='Escape'&&(pickSample||studio.capturing)){e.preventDefault();e.stopImmediatePropagation();pickSample=false;studio.capturing=null;message('Selection cancelled.');return;}
    if(playtest){
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();togglePlaytest();}
      return;
    }
    if(tab!=='objects'&&!['Escape','F2'].includes(e.key)){
      e.preventDefault();e.stopImmediatePropagation();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z')undoRedo(!e.shiftKey);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y')undoRedo(false);
    }
  },true);
  c.addEventListener('contextmenu',e=>{if(studio.active&&!playtest)e.preventDefault();});
  panel.addEventListener('click',e=>{if(loading){e.preventDefault();e.stopImmediatePropagation();message('Wait for project restoration to finish.');}},true);
  setTab('objects');load();
  return {snapshot,recordChange,undoRedo,save,refresh,onToggle,open,renderBase,renderCleanup,suppressOriginal,drawUnliftedPixels,originalPicture:a=>a.origin?picture(a.origin):null,validateAssetExtension,walkableOverride,pointerDown,pointerMove,pointerEnd,drawOverlay,liftedRegion,finishGesture,isPlaytest:()=>playtest,isEditing:()=>studio.active&&!playtest,exportProject,loadReady:()=>!loading,validate,
    // Data-only inspection supports repeatable browser integration checks.
    getProject:()=>clone(documentData()),getPublishedProject:()=>publishedProject?clone(publishedProject):null,getProjectSource:()=>projectSource,
    getDialogue:id=>id===undefined?clone(dialogue):dialogue[id]?clone(dialogue[id]):null,getSprites:()=>clone(sprites)};
};
