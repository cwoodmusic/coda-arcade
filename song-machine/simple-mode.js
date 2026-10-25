/* A smaller view of the existing Song Machine state and playback engine. */
(function(root){
 'use strict';
 const LENGTHS=[{steps:16,label:'Whole'},{steps:8,label:'Half'},{steps:4,label:'Quarter'},{steps:2,label:'Eighth'},{steps:1,label:'Sixteenth'}];
 const PITCHES=Array.from({length:36},(_,index)=>83-index),DRUM_NAMES=['Kick','Snare','Hi-hat'];
 const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 function create(api){
  const doc=root.document,$=id=>doc.getElementById(id),main=doc.querySelector('main'),editorTitle=doc.querySelector('body>header h1'),advancedTitle=editorTitle.textContent;
  let mode='simple',selectedTrack=null,rendering=false,gridMode='scroll';
  try{if(root.localStorage.getItem('codaSongEditorModeV1')==='advanced')mode='advanced';}catch{}
  const toggle=doc.createElement('button');toggle.id='songEditorMode';toggle.type='button';toggle.className='song-editor-mode';doc.querySelector('header').append(toggle);
  const host=doc.createElement('section');host.id='simpleSongEditor';host.setAttribute('aria-label','Simple song composer');
  host.innerHTML=`<div class="simple-song-toolbar"><div class="simple-song-transport" role="group" aria-label="Simple playback controls"><button type="button" id="simplePlay" class="primary">▶ Play</button><button type="button" id="simpleStop">■ Stop</button><button type="button" id="simpleUndo" disabled>↶ Undo</button><button type="button" id="simpleLoop" aria-pressed="false">Loop: Off</button></div><label class="simple-tempo">Tempo <output id="simpleBpmValue">110 BPM</output><input id="simpleBpm" type="range" min="40" max="240" step="1" value="110" aria-label="Simple tempo in beats per minute"></label><label class="simple-instrument">Instrument<select id="simpleInstrument" aria-label="Instrument to edit"></select></label><button type="button" id="simpleMenu" aria-haspopup="dialog" aria-controls="settings-panel" aria-expanded="false">Menu</button></div><div id="simpleNotePalette" class="simple-note-palette" role="group" aria-label="Choose a note length">${LENGTHS.map(item=>`<button type="button" data-duration="${item.steps}" aria-label="${item.label} note" aria-pressed="false">${root.CodaMusicNotation.glyphSVG(item.steps/4)}<span>${item.label}</span></button>`).join('')}</div><div class="simple-song-caption"><p id="simpleEditingLabel"></p><span id="simpleLengthHint"></span></div><div class="simple-song-gesture" role="group" aria-label="Simple grid gesture mode"><button type="button" data-simple-grid-mode="scroll" aria-pressed="true">Tap &amp; scroll</button><button type="button" data-simple-grid-mode="draw" aria-pressed="false">Draw note lengths</button></div><p id="simpleSongHelp" class="simple-song-help">Choose a note length, then tap a square. Tap your note again to erase it. Swipe to explore the grid.</p><div id="simpleSongGrid" class="simple-song-grid-wrap" tabindex="-1" aria-label="Three octaves and three drum rows"></div><p id="simpleStatus" class="simple-song-status" role="status" aria-live="polite"></p>`;
  main.prepend(host);
  const close=doc.createElement('button');close.id='simpleMenuClose';close.type='button';close.textContent='Back to song';close.dataset.simpleOnly='true';$('settings-panel').prepend(close);
  const soundLabel=doc.createElement('label');soundLabel.id='simpleSoundLabel';soundLabel.dataset.simpleOnly='true';soundLabel.innerHTML='Instrument sound<select id="simpleSound" aria-label="Sound for the selected instrument"></select>';$('settings-panel').querySelector('.settings-fields').before(soundLabel);
  const settings=$('settings-panel'),originalHeading=settings.querySelector('h2'),settingsHelp=settings.querySelector('.help'),advancedHelp=settingsHelp.textContent;
  function state(){return api.getState();}
  function selected(){const current=state();return current.tracks.find(track=>String(track.id)===selectedTrack)||null;}
  function ensureSelected(){const tracks=state().tracks;if(!tracks.some(track=>String(track.id)===selectedTrack))selectedTrack=tracks.length?String(tracks[0].id):null;}
  function syncMenu(){const open=mode==='simple'&&!settings.hidden;$('simpleMenu').setAttribute('aria-expanded',String(open));if(open){settings.setAttribute('role','dialog');settings.setAttribute('aria-modal','true');settings.setAttribute('aria-label','Song menu');}else{settings.removeAttribute('role');settings.removeAttribute('aria-modal');settings.removeAttribute('aria-label');}if(originalHeading)originalHeading.textContent=mode==='simple'?'Song menu':'Song Settings';}
  function closeMenu(focus=true){settings.hidden=true;$('settings-toggle').setAttribute('aria-expanded','false');syncMenu();if(focus&&mode==='simple')$('simpleMenu').focus({preventScroll:true});}
  function setMode(next){
   const value=next==='advanced'?'advanced':'simple';api.cancelGesture();api.cancelClear();closeMenu(false);mode=value;doc.body.dataset.editorMode=mode;
   toggle.textContent=mode==='simple'?'Advanced':'Simple';editorTitle.textContent=mode==='simple'?'♫ Song Machine':advancedTitle;toggle.setAttribute('aria-label','Switch to '+(mode==='simple'?'Advanced':'Simple')+' mode');
   host.hidden=mode!=='simple';try{root.localStorage.setItem('codaSongEditorModeV1',mode);}catch{}
   settingsHelp.textContent=mode==='simple'?'Simple shows all notes. Advanced can hide notes outside your chosen scale. Your song can be up to 16 bars long.':advancedHelp;api.syncSharedPanels();render();return mode;
  }
  function svg(duration){return root.CodaMusicNotation.glyphSVG(duration/4);}
  function label(pitch){const band=pitch<60?'Low':pitch<72?'Middle':'High';return {band,name:api.noteName(pitch),label:band+' '+api.noteName(pitch)};}
  function row(pitch,drumIndex,count,measure){
   const current=state(),drum=drumIndex!==null,track=drum?current.drums[drumIndex]:selected(),id=drum?'d'+drumIndex:selectedTrack||'',pitchInfo=drum?null:label(pitch),title=drum?DRUM_NAMES[drumIndex]:pitchInfo.label;
   let html=`<div class="simple-song-row-label ${drum?'simple-drum-label':pitchInfo.band.toLowerCase()}" ${drum?`data-drum-row="${drumIndex}"`:`data-pitch="${pitch}"`} title="${escape(title)}">${drum?DRUM_NAMES[drumIndex]:pitch%12===0?escape(title):escape(pitchInfo.name)}</div>`;
   for(let step=0;step<count;step++){
    const own=track?.notes.find(note=>(drum||note.p===pitch)&&step>=note.t&&step<note.t+note.d);
    const ghost=!drum&&!own?current.tracks.find(other=>String(other.id)!==selectedTrack&&other.notes.some(note=>note.p===pitch&&step>=note.t&&step<note.t+note.d)):null;
    const other=ghost?.notes.find(note=>note.p===pitch&&step>=note.t&&step<note.t+note.d),note=own||other,start=note&&note.t===step;
    const colour=drum?'#d18bdf':api.pitchColors[pitch%12];
    const description=title+', bar '+(Math.floor(step/measure)+1)+', step '+(step%measure+1)+(own?', note':'')+(ghost?', '+ghost.name+' plays here':'');
    html+=`<div role="button" tabindex="${!drum&&pitch===PITCHES[0]&&step===0?'0':'-1'}" aria-label="${escape(description)}" aria-pressed="${!!own}" class="simple-song-cell cell ${drum?'perc ':''}${step%measure===0?'bar ':step%4===0?'beat ':''}${own?'filled ':ghost?'simple-ghost ':''}${start&&own?'start':''}" style="--pitch:${colour};--track:${colour}" data-track="${id}" data-pitch="${pitch}" data-step="${step}">${start?`<span class="simple-cell-note" aria-hidden="true">${svg(note.d)}</span>`:''}</div>`;
   }
   return html;
  }
  function render(){
   if(rendering)return;rendering=true;
   try{
    ensureSelected();const current=state(),track=selected();
    const instrumentOptions=current.tracks.map(item=>`<option value="${item.id}">${escape(item.name)} · ${escape(api.soundName(item.sound))}</option>`).join('')+(current.tracks.length<12?'<option value="add">+ Add an instrument</option>':'');
    $('simpleInstrument').innerHTML=instrumentOptions||'<option value="">No instruments</option>';if(selectedTrack)$('simpleInstrument').value=selectedTrack;
    $('simpleBpm').value=current.bpm;$('simpleBpmValue').textContent=current.bpm+' BPM';
    $('simpleEditingLabel').textContent=track?'Editing '+track.name+' · Other instruments play along':'Choose “Add an instrument” to write a melody.';
    $('simpleSound').innerHTML=track?api.soundOptions(track.sound):'';$('simpleSound').disabled=!track;
    $('simpleSoundLabel').firstChild.textContent=track?track.name+' sound':'Instrument sound';
    syncStatus();syncDuration();syncGridMode(gridMode);syncMenu();
    if(mode!=='simple')return;
    const wrap=$('simpleSongGrid'),scroll={left:wrap.scrollLeft,top:wrap.scrollTop},focused=doc.activeElement?.closest?.('.simple-song-cell'),focus=focused?{track:focused.dataset.track,pitch:focused.dataset.pitch,step:focused.dataset.step}:null;
    const count=api.total(),measure=api.measure();let html=`<div class="simple-song-pitch-grid" style="grid-template-columns:var(--simple-pitch-size) repeat(${count},var(--simple-step-size))"><div class="simple-bar-label simple-corner">Pitch / drums</div>`;
    for(let step=0;step<count;step++)html+=`<div class="simple-bar-label ${step%measure===0?'is-bar':''}">${step%measure===0?'Bar '+(Math.floor(step/measure)+1):''}</div>`;
    for(const pitch of PITCHES)html+=row(pitch,null,count,measure);
    for(let index=0;index<3;index++)html+=row(0,index,count,measure);
    wrap.innerHTML=html+'</div>';wrap.scrollLeft=scroll.left;wrap.scrollTop=scroll.top;
    if(focus)wrap.querySelector(`.simple-song-cell[data-track="${focus.track}"][data-pitch="${focus.pitch}"][data-step="${focus.step}"]`)?.focus({preventScroll:true});
   }finally{rendering=false;}
  }
  function syncDuration(){const duration=api.getDuration(),name=LENGTHS.find(item=>item.steps===duration)?.label;for(const button of $('simpleNotePalette').querySelectorAll('[data-duration]'))button.setAttribute('aria-pressed',String(+button.dataset.duration===duration));$('simpleLengthHint').textContent=name?name+' note selected':'Custom note length · choose a note above to change it';}
  function syncStatus(){if(!$('simpleStatus'))return;$('simpleStatus').textContent=$('status').textContent;$('simpleUndo').disabled=$('undo').disabled;$('simpleLoop').textContent=$('loop').textContent;$('simpleLoop').setAttribute('aria-pressed',String($('loop').classList.contains('active')));}
  function syncGridMode(next){gridMode=next==='draw'?'draw':'scroll';host.dataset.gridMode=gridMode;for(const button of doc.querySelectorAll('[data-simple-grid-mode]'))button.setAttribute('aria-pressed',String(button.dataset.simpleGridMode===gridMode));$('simpleSongHelp').textContent=gridMode==='draw'?'Drag sideways to choose note length. Swipe up or down to explore.':'Tap a square to add or erase. Swipe to explore.';}
  function setInstrument(id){if(id==='add'){const before=new Set(state().tracks.map(track=>track.id));$('add').click();const added=state().tracks.find(track=>!before.has(track.id));if(added)selectedTrack=String(added.id);}else if(state().tracks.some(track=>String(track.id)===String(id)))selectedTrack=String(id);render();}
  toggle.onclick=()=>setMode(mode==='simple'?'advanced':'simple');
  for(const [simple,original] of [['simplePlay','play'],['simpleStop','stop'],['simpleUndo','undo'],['simpleLoop','loop']])$(simple).onclick=()=>{$(original).click();syncStatus();};
  $('simpleBpm').oninput=event=>{$('bpm').value=event.target.value;$('bpm').dispatchEvent(new Event('input',{bubbles:true}));$('simpleBpmValue').textContent=state().bpm+' BPM';};
  $('simpleInstrument').onchange=event=>setInstrument(event.target.value);
  $('simpleSound').onchange=event=>{if(selectedTrack)api.setSound(selectedTrack,+event.target.value);};
  $('simpleNotePalette').onclick=event=>{const button=event.target.closest('[data-duration]');if(button){api.setDuration(+button.dataset.duration);syncDuration();}};
  $('duration').addEventListener('change',syncDuration);
  for(const button of doc.querySelectorAll('[data-simple-grid-mode]'))button.onclick=()=>api.setGridMode(button.dataset.simpleGridMode);
  $('simpleMenu').onclick=()=>{api.cancelGesture();api.cancelClear();settings.hidden=false;$('settings-toggle').setAttribute('aria-expanded','true');syncMenu();close.focus({preventScroll:true});};close.onclick=()=>closeMenu();
  settings.addEventListener('keydown',event=>{if(mode!=='simple'||settings.hidden)return;if(event.key==='Escape'){event.preventDefault();closeMenu();return;}if(event.key==='Tab'){const elements=[...settings.querySelectorAll('button,select,input,summary,a[href]')].filter(node=>!node.disabled&&!node.hidden&&node.getClientRects().length),first=elements[0],last=elements.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}}});
  const grid=$('simpleSongGrid');grid.addEventListener('pointerdown',api.onDown);grid.addEventListener('pointermove',api.onMove);
  grid.addEventListener('keydown',event=>{const cell=event.target.closest('.simple-song-cell');if(!cell)return;const cells=[...grid.querySelectorAll('.simple-song-cell')],index=cells.indexOf(cell),columns=api.total(),offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key];if(offset){event.preventDefault();const next=cells[Math.max(0,Math.min(cells.length-1,index+offset))];cell.tabIndex=-1;next.tabIndex=0;next.focus();return;}if(event.key==='Enter'||event.key===' '){event.preventDefault();if(event.repeat)return;const id=cell.dataset.track,pitch=+cell.dataset.pitch,step=+cell.dataset.step,track=api.findTrack(id);if(!track)return;const drum=id.startsWith('d'),exists=track.notes.some(note=>(drum||note.p===pitch)&&step>=note.t&&step<note.t+note.d);api.putNote(id,pitch,step,api.getDuration(),exists);}});
  for(const name of ['contextmenu','selectstart','dragstart'])grid.addEventListener(name,event=>{if(event.target.closest('.simple-song-cell'))event.preventDefault();});
  const observer=new MutationObserver(syncStatus);observer.observe($('status'),{subtree:true,childList:true,characterData:true});observer.observe($('undo'),{attributes:true,attributeFilter:['disabled']});observer.observe($('loop'),{attributes:true,childList:true,subtree:true});
  const gesture=host.querySelector('.simple-song-gesture');gesture.dataset.simpleOnly='true';settings.append(gesture);root.CodaMusicNotation.load(doc);setMode(mode);
  return {render,syncGridMode,getMode:()=>mode,setMode,getState:()=>({mode,selectedTrack,pitches:[...PITCHES],drumRows:3,gridMode,duration:api.getDuration()}),setInstrument};
 }
 root.CodaSongSimpleMode={create};
})(window);
