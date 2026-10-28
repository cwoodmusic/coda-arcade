/* A real piano-key map for the classroom's pitch and key-step examples. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CodaClassroomKeyboard=api;})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const LETTERS=Object.freeze(['C','D','E','F','G','A','B','C']);
 const BLACK=Object.freeze([{note:'C-sharp',boundary:1,pitch:1},{note:'D-sharp',boundary:2,pitch:3},{note:'F-sharp',boundary:4,pitch:6},{note:'G-sharp',boundary:5,pitch:8},{note:'A-sharp',boundary:6,pitch:10}].map(Object.freeze));
 const PITCH=Object.freeze({C:0,D:2,E:4,F:5,G:7,A:9,B:11});
 const DESCRIPTION='Piano keyboard: white keys C D E F G A B C. Black keys repeat in groups of two and three. Lower sounds are to the left; higher sounds are to the right.';
 const xml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
 const printed=note=>note.replace('-sharp','♯').replace('-flat','♭');
 const pitch=note=>(PITCH[note[0]]+(note.endsWith('-sharp')?1:note.endsWith('-flat')?-1:0)+12)%12;
 function validateVisual(value){
  const fail=error=>({ok:false,error});
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['kind','notes','label'].includes(key))||value.kind!=='keyboard')return fail('Choose a piano keyboard picture.');
  const notes=value.notes===undefined?[]:value.notes;
  if(!Array.isArray(notes)||notes.length>16||notes.some(note=>typeof note!=='string'||!/^[A-G](?:-sharp|-flat)?$/.test(note)))return fail('Keyboard notes use letters A–G with an optional -sharp or -flat.');
  if(value.label!==undefined&&(typeof value.label!=='string'||!value.label.trim()||value.label.length>300))return fail('Give the keyboard a short picture description.');
  return {ok:true,data:{kind:'keyboard',notes:[...new Set(notes)],...(value.label!==undefined?{label:value.label}:{})}};
 }
 function toSVG(input){
  const checked=validateVisual(input);if(!checked.ok)return '';
  const value=checked.data,highlight=new Set(value.notes.map(pitch)),label=(value.label?value.label+' ':'' )+DESCRIPTION+(value.notes.length?' Highlighted keys: '+value.notes.map(printed).join(', ')+'.':''),left=32,keyWidth=80,keyTop=82,keyHeight=196;
  let svg='<svg xmlns="http://www.w3.org/2000/svg" class="lesson-piano-keyboard" viewBox="0 0 704 344" width="704" height="344" role="img" aria-label="'+xml(label)+'" style="display:block;width:100%;height:auto"><title>'+xml(label)+'</title><g font-family="system-ui,sans-serif" text-anchor="middle">';
  svg+='<rect x="1" y="1" width="702" height="342" rx="16" fill="#eaf0ed"/>';
  for(const [count,start,end]of [[2,87,217],[3,327,537]]){
   const middle=(start+end)/2;
   svg+='<text data-piano-group="'+count+'" data-keyboard-group="'+count+'" x="'+middle+'" y="32" font-size="25" font-weight="700" fill="#244e48">'+count+' black keys</text><path d="M'+start+' 64V49H'+end+'V64" fill="none" stroke="#39756c" stroke-width="3"/>';
  }
  LETTERS.forEach((letter,index)=>{
   const x=left+index*keyWidth,selected=highlight.has(PITCH[letter]);
   svg+='<rect data-piano-white="'+letter+'"'+(selected?' data-piano-highlight="true"':'')+' x="'+x+'" y="'+keyTop+'" width="'+keyWidth+'" height="'+keyHeight+'" rx="3" fill="'+(selected?'#b4ebd2':'#fffdf6')+'" stroke="#273a45" stroke-width="2"/><text data-keyboard-white-label="'+letter+'" x="'+(x+keyWidth/2)+'" y="257" font-size="36" font-weight="750" fill="#183f39">'+letter+'</text>';
  });
  for(const key of BLACK){
   const x=left+key.boundary*keyWidth-25,selected=highlight.has(key.pitch),name=value.notes.find(note=>pitch(note)===key.pitch);
   svg+='<rect data-piano-black="'+key.note+'" data-keyboard-black-key="'+key.note+'"'+(selected?' data-piano-highlight="true"':'')+' x="'+x+'" y="'+keyTop+'" width="50" height="119" rx="4" fill="'+(selected?'#70458d':'#233442')+'" stroke="#182735" stroke-width="2"/>';
   if(selected)svg+='<text x="'+(x+25)+'" y="177" font-size="22" font-weight="700" fill="#fff4d6">'+xml(printed(name))+'</text>';
  }
  svg+='<g fill="#244e48" font-size="25" font-weight="700"><path d="M31 314L43 307V321Z"/><text x="153" y="323">Lower sounds</text><path d="M673 314L661 307V321Z"/><text x="551" y="323">Higher sounds</text></g></g></svg>';
  return svg;
 }
 return Object.freeze({validateVisual,toSVG});
});
