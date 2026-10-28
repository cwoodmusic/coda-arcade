/* Plain-data lesson authoring. Draft fields never execute HTML or JavaScript. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CodaEducationEditor=api;})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const copy=value=>JSON.parse(JSON.stringify(value));
 const CATEGORY_TITLES={'note-naming':'Treble & note names','bass-clef':'Bass clef','grand-staff':'Grand staff & Middle C','rhythm-tree':'Note lengths & rhythm','time-signatures':'Time signatures','major-minor-keys':'Major & minor keys',dynamics:'Dynamics',tempo:'Tempo','accidentals-key-signatures':'Accidentals & key signatures'};
 const textFields=['prompt','teach','guide','example','caption','hint','success','explanation'];
 function mount(api={}){
  const host=api.host;if(!host?.ownerDocument)throw Error('A lesson editor needs a host.');
  const doc=host.ownerDocument,win=doc.defaultView,library=win.CodaEducationContent,store=api.store||library?.getStore?.();
  if(!store?.getDocument||!store?.saveDocument)throw Error('The lesson content store could not load.');
  let data=copy(store.getDocument()),kind='exam',category=Object.keys(CATEGORY_TITLES)[0],selected='',draft=null,notationEditor=null,dirty=false,destroyed=false,expanded=false,previewAnswer=null;
  let priorFocus=null,portal=null,priorOverflow='',serial=0,statusText='',confirmation=null,formPermission=null,coverageSource=null,coverageReport=null;
  const drafts=new Map(),draftBases=new Map(),undo=[],redo=[];
  const node=(tag,className,text)=>{const element=doc.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;};
  const button=(text,action,name)=>{const element=node('button','',text);element.type='button';if(name)element.dataset.educationAction=name;element.onclick=action;return element;};
  const root=node('section','education-editor');root.dataset.educationEditor='';root.setAttribute('aria-label','Lessons and exams editor');host.append(root);
  const heading=node('header','education-editor-heading'),headingCopy=node('div');
  const title=node('h2','','Lessons & exams');title.id='education-editor-heading-'+Math.random().toString(36).slice(2);headingCopy.append(title,node('p','','Change questions, answers, instructions, and staff notation.'));
  const expandButton=button('Full screen',()=>setExpanded(!expanded),'expand'),exitButton=button('Exit editor',exit,'exit');heading.append(headingCopy,expandButton,exitButton);root.append(heading);
  const note=node('p','education-editor-note','Save applies edits in this browser for developer preview. Export a content JSON backup to share or publish your changes. Edited assessments use a separate attempt record, preserving the existing saved results.');root.append(note);
  const toolbar=node('div','education-editor-toolbar'),modeLabel=node('label','','Editing'),mode=node('select');mode.dataset.educationField='mode';mode.setAttribute('aria-label','Content type');
  for(const [value,text]of [['exam','Final exam questions'],['quiz','Lesson quiz questions'],['lesson','Lesson instructions'],['study','Lesson cards']]){const option=node('option','',text);option.value=value;mode.append(option);}modeLabel.append(mode);
  const categoryLabel=node('label','','Topic'),categorySelect=node('select');categorySelect.dataset.educationField='category';categorySelect.setAttribute('aria-label','Lesson or exam category');
  function syncCategories(preferred=category){const topics=Object.entries(CATEGORY_TITLES).filter(([id])=>!['exam','lesson'].includes(kind)||id!=='accidentals-key-signatures');categorySelect.replaceChildren();for(const [value,text]of topics){const option=node('option','',text);option.value=value;categorySelect.append(option);}category=topics.some(([id])=>id===preferred)?preferred:topics[0][0];categorySelect.value=category;}
  syncCategories();categoryLabel.append(categorySelect);
  const searchLabel=node('label','','Find a question or step'),search=node('input');search.type='search';search.placeholder='Search this topic';search.dataset.educationField='search';searchLabel.append(search);toolbar.append(modeLabel,categoryLabel,searchLabel);root.append(toolbar);
  const workspace=node('div','education-editor-workspace'),browser=node('aside','education-editor-browser'),count=node('p','education-editor-count'),list=node('select','education-editor-list');list.size=10;list.setAttribute('aria-label','Questions and lesson steps');list.dataset.educationField='list';
  const listActions=node('div','education-editor-actions'),addButton=button('Add question',addQuestion,'add'),duplicateButton=button('Duplicate',duplicate,'duplicate'),deleteButton=button('Delete question',()=>request(kind==='study'?'Delete this teaching card? It may cover material on the exam.':'Delete this question?',removeQuestion),'delete');listActions.append(addButton,duplicateButton,deleteButton);const coverage=node('p','education-editor-note');coverage.dataset.educationCoverage='';coverage.hidden=true;browser.append(count,coverage,list,listActions);
  const form=node('section','education-editor-form');form.setAttribute('aria-label','Selected content');workspace.append(browser,form);root.append(workspace);
  const footer=node('footer','education-editor-footer'),files=node('div','education-editor-actions');
  const exportButton=button('Export content JSON',exportContent,'export'),importButton=button('Import content JSON',()=>file.click(),'import'),undoButton=button('Undo saved edit',()=>travel(true),'undo'),redoButton=button('Redo saved edit',()=>travel(false),'redo'),defaultsButton=button('Restore all defaults',()=>request('Restore all original questions and lessons?',restoreAll,'Restore defaults'),'reset-all');
  files.append(exportButton,importButton,undoButton,redoButton,defaultsButton);footer.append(files);const file=node('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.dataset.educationField='import-file';footer.append(file);
  const status=node('p','education-editor-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.dataset.educationStatus='';footer.append(status);root.append(footer);
  const confirmBox=node('div','education-editor-confirm');confirmBox.hidden=true;confirmBox.setAttribute('role','alert');const confirmText=node('p'),confirmYes=button('Delete',()=>{const action=confirmation;confirmation=null;confirmBox.hidden=true;action?.();},'confirm'),confirmNo=button('Keep it',()=>{confirmation=null;confirmBox.hidden=true;},'cancel');confirmBox.append(confirmText,confirmYes,confirmNo);root.append(confirmBox);
  function canEdit(){try{return !destroyed&&api.canEdit?.()!==false;}catch{return false;}}
  function message(text){statusText=text;status.textContent=text;}
  function key(){return kind+':'+category+':'+selected;}
  const stable=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(name=>[name,item[name]])):item);
  const same=(first,second)=>stable(first)===stable(second);
  function itemsIn(documentData){if(kind==='exam')return documentData.exam?.questions?.filter(item=>item.category===category)||[];if(kind==='quiz')return documentData.quizzes?.[category]?.questions||[];return documentData.lessons?.[category]?.[kind==='study'?'study':'steps']||[];}
  function itemIn(documentData){const items=itemsIn(documentData);return kind==='lesson'?items[Number(selected)]:items.find(item=>item.id===selected);}
  function collection(){return itemsIn(data);}
  function labelFor(item,index){return kind==='lesson'?'Step '+(index+1)+' · '+(item.prompt||item.guide||item.teach||item.caption||item.kind||'Instruction'):'#'+String(index+1).padStart(3,'0')+' · '+(kind==='study'?item.title||'Untitled teaching card':item.prompt||'Untitled question');}
  function saveDraft(){if(draft&&dirty)drafts.set(key(),copy(draft));}
  function loadDraft(){const items=collection(),index=kind==='lesson'?Number(selected):items.findIndex(item=>item.id===selected),source=items[index];draft=source?copy(drafts.get(key())||source):null;dirty=!!drafts.get(key());previewAnswer=null;}
  function markDirty(){if(!draft)return;if(!draftBases.has(key()))draftBases.set(key(),copy(itemIn(data)));dirty=true;drafts.set(key(),copy(draft));message('Unsaved changes. Use Save question or Save step to apply this draft.');updateSaveState();}
  function selectItem(value){saveDraft();selected=value;loadDraft();renderForm();renderList();}
  function renderList(){
   const items=collection(),term=search.value.trim().toLocaleLowerCase();list.replaceChildren();let visible=0;
   items.forEach((item,index)=>{const value=kind==='lesson'?String(index):item.id,label=labelFor(item,index);if(term&&!label.toLocaleLowerCase().includes(term)&&!String(item.id||'').toLocaleLowerCase().includes(term))return;const option=node('option','',label.slice(0,170));option.value=value;option.selected=value===selected;list.append(option);visible++;});
   count.textContent=(kind==='lesson'?'Steps: ':kind==='study'?'Teaching cards: ':'Questions: ')+items.length+(term?' · '+visible+' match'+(visible===1?'':'es'):'');
   list.value=selected;addButton.hidden=duplicateButton.hidden=deleteButton.hidden=kind==='lesson';addButton.textContent=kind==='study'?'Add teaching card':'Add question';deleteButton.textContent=kind==='study'?'Delete teaching card':'Delete question';
   addButton.disabled=!canEdit()||items.length>=(kind==='study'?100:500);duplicateButton.disabled=!canEdit()||!draft;deleteButton.disabled=!canEdit()||!draft;
   undoButton.disabled=!canEdit()||!undo.length;redoButton.disabled=!canEdit()||!redo.length;importButton.disabled=defaultsButton.disabled=!canEdit();renderCoverage();
  }
  function renderCoverage(){
   const curriculum=win.CodaExamCurriculum;if(!['exam','study'].includes(kind)||typeof curriculum?.getCoverage!=='function'){coverage.hidden=true;return;}
   if(coverageSource!==data){coverageSource=data;try{coverageReport=curriculum.getCoverage(store.getExamBank(),Object.fromEntries(Object.entries(data.lessons).map(([id,value])=>[id,value.study||[]])));}catch{coverageReport=null;}}
   const topic=coverageReport?.byCategory?.[category];if(!topic){coverage.hidden=true;return;}
   coverage.hidden=false;let message='Exam coverage: '+topic.covered+' / '+topic.total+' questions linked to teaching cards.';
   if(topic.missing?.length)message+=' '+topic.missing.length+' question'+(topic.missing.length===1?' needs':'s need')+' a teaching card before publishing.';
   const bank=store.getExamBank(),review=(coverageReport.requiresReview||[]).filter(id=>bank.getQuestion?.(id)?.category===category);if(review.length)message+=' '+review.length+' edited question'+(review.length===1?' needs':'s need')+' a teaching review.';
   coverage.textContent=message;
  }
  function field(label,value,onInput,options={}){
   const wrapper=node('label','education-editor-field',label),input=node(options.multiline?'textarea':'input');if(input.tagName==='INPUT')input.type=options.type||'text';else input.rows=options.rows||3;
   input.value=value??'';input.maxLength=options.maxLength||2000;if(options.name)input.dataset.educationField=options.name;if(options.min!==undefined)input.min=String(options.min);if(options.max!==undefined)input.max=String(options.max);input.disabled=!canEdit();input.oninput=()=>{onInput(input.type==='number'?Number(input.value):input.value);markDirty();renderPreview();};wrapper.append(input);return wrapper;
  }
  function updateSaveState(){const save=form.querySelector('[data-education-action="save"]');if(save)save.disabled=!canEdit()||!dirty;const discard=form.querySelector('[data-education-action="discard"]');if(discard)discard.disabled=!dirty;}
  function renderForm(){
   formPermission=canEdit();notationEditor?.destroy();notationEditor=null;form.replaceChildren();if(!draft){form.append(node('p','education-editor-empty','Choose a question or step to edit.'));return;}
   const top=node('div','education-editor-selected');top.append(node('h3','',kind==='lesson'?'Step '+(Number(selected)+1):kind==='study'?'Teaching card':'Question'),node('small','',kind==='lesson'?CATEGORY_TITLES[category]:draft.id));form.append(top);
   if(kind==='lesson')renderStep();else if(kind==='study')renderStudy();else{
    if(kind==='exam'){const links=(data.lessons?.[category]?.study||[]).filter(card=>card.covers?.includes(draft.id)),linked=node('p','education-editor-note',links.length?'Linked teaching cards: '+links.map(card=>card.title).join('; ')+'. Review these lessons after changing the question or its answers.':'This question still needs teaching coverage. Add its ID to an exam lesson card before publishing.');linked.dataset.educationLinks='';form.append(linked);}
    form.append(field('Question',draft.prompt,value=>draft.prompt=value,{multiline:true,name:'prompt'}));renderAnswers();
    form.append(field('Answer explanation',draft.explanation,value=>draft.explanation=value,{multiline:true,name:'explanation'}));
   }
   renderNotation();
   const actions=node('div','education-editor-actions');actions.append(button(kind==='lesson'?'Save step':kind==='study'?'Save teaching card':'Save question',saveSelected,'save'),button('Discard draft',discard,'discard'),button('Restore default',restoreDefault,'reset'));form.append(actions);
   const preview=node('section','education-editor-preview');preview.setAttribute('aria-label','Question preview');preview.dataset.educationPreview='';form.append(preview);updateSaveState();renderPreview();
  }
  function renderAnswers(correctKey='correct'){
   const group=node('fieldset','education-editor-answers'),legend=node('legend','','Answers · select the correct answer');group.append(legend);
   draft.answers.forEach((answer,index)=>{
    const row=node('div','education-editor-answer'),radio=node('input');radio.type='radio';radio.name='education-correct-'+title.id;radio.checked=draft[correctKey]===index;radio.setAttribute('aria-label','Answer '+(index+1)+' is correct');radio.disabled=!canEdit();radio.onchange=()=>{draft[correctKey]=index;markDirty();renderPreview();};
    const input=node('input');input.type='text';input.value=answer;input.maxLength=500;input.setAttribute('aria-label','Answer '+(index+1));input.disabled=!canEdit();input.oninput=()=>{if(draft.answers[index]!==input.value&&draft.answerNotes)delete draft.answerNotes;draft.answers[index]=input.value;markDirty();renderPreview();};
    const remove=button('×',()=>{if(!canEdit()||draft.answers.length<=2)return;draft.answers.splice(index,1);if(draft[correctKey]===index)draft[correctKey]=0;else if(draft[correctKey]>index)draft[correctKey]--;if(Array.isArray(draft.answerNotes))draft.answerNotes.splice(index,1);markDirty();renderForm();},'remove-answer');remove.setAttribute('aria-label','Remove answer '+(index+1));remove.disabled=!canEdit()||draft.answers.length<=2;row.append(radio,input,remove);group.append(row);
   });
   const add=button('Add answer',()=>{if(!canEdit()||draft.answers.length>=6)return;draft.answers.push('New answer');if(Array.isArray(draft.answerNotes))delete draft.answerNotes;markDirty();renderForm();form.querySelectorAll('.education-editor-answer input[type="text"]')[draft.answers.length-1]?.focus();},'add-answer');add.disabled=!canEdit()||draft.answers.length>=6;group.append(add);form.append(group);
  }
  function renderStep(){
   const summary=node('p','education-editor-step-help','This keeps the existing interactive activity. Edit the teaching text, expected answer, or its notation picture below.');form.append(summary);
   for(const key of textFields){if(key==='explanation'||!(key in draft))continue;form.append(field(key[0].toUpperCase()+key.slice(1),draft[key],value=>draft[key]=value,{multiline:true,name:key}));}
   if(Array.isArray(draft.answers))renderAnswers(Number.isInteger(draft.answer)?'answer':'correct');
   else if(typeof draft.answer==='string')form.append(field('Expected answer',draft.answer,value=>draft.answer=value,{name:'answer',maxLength:100}));
   for(const key of ['position','pitch'])if(typeof draft[key]==='number')form.append(field(key==='position'?'Staff position (bottom line is 0)':'Sounding pitch (MIDI)',draft[key],value=>draft[key]=value,{type:'number',name:key,min:key==='position'?-12:0,max:key==='position'?20:127}));
  }
  function renderStudy(){
   form.append(node('p','education-editor-step-help','Teach one idea, show an example, then let the student try. Removing a covered card can leave exam material untaught.'));
   const path=win.CodaClassroomLearningPathsData?.getCategory?.(category,{content:{getStudyCards:id=>copy(data.lessons?.[id]?.study||[])}}),section=path?.sections?.find(item=>item.cards.some(card=>card.id===draft.id));
   if(section){const location=node('p','education-editor-note',(section.tier==='advanced'?'Advanced':'Basics')+' · '+section.title);location.dataset.educationLessonSection=section.id;form.append(location);}
   for(const [name,label]of [['title','Card title'],['teach','Teaching idea'],['example','Worked example'],['prompt','Practice question']])form.append(field(label,draft[name],value=>draft[name]=value,{multiline:name!=='title',name,maxLength:name==='title'?120:2000}));
   renderAnswers();form.append(field('Hint after a mistake',draft.hint,value=>draft.hint=value,{multiline:true,name:'hint'}));
   form.append(field('Exam question IDs taught by this card',Array.isArray(draft.covers)?draft.covers.join(', '):'',value=>draft.covers=value.split(/[\s,]+/).filter(Boolean),{multiline:true,name:'covers',maxLength:25000}));
   if(draft.covers?.length)form.append(node('p','education-editor-note','This card teaches material used by '+draft.covers.length+' built-in exam question'+(draft.covers.length===1?'':'s')+'. Check coverage after changing or deleting its teaching.'));
  }
  function renderLessonDiagram(){
   const supported=['clef-intro','note-parts','rhythm-tree'],current=draft.visual?.kind;
   if(kind!=='study'&&!supported.includes(current))return;
   const group=node('fieldset','education-editor-answers');group.dataset.educationLessonDiagram='';group.append(node('legend','','Lesson diagram'));
   function select(label,name,value,choices,apply){const wrapper=node('label','education-editor-field',label),input=node('select');input.dataset.educationField=name;input.disabled=!canEdit();for(const [id,text]of choices){const option=node('option','',text);option.value=id;input.append(option);}input.value=String(value);input.onchange=()=>{if(!canEdit())return;apply(input.value);markDirty();renderForm();};wrapper.append(input);group.append(wrapper);}
   select('Picture type','lesson-diagram',supported.includes(current)?current:'existing',[['existing',draft.visual?'Keep current picture':'No picture'],['clef-intro','Staff and clef introduction'],['note-parts','Parts of a note'],['rhythm-tree','Basic rhythm tree']],value=>{
    if(value==='clef-intro')draft.visual={kind:value,clef:category==='bass-clef'?'bass':'treble',page:'staff'};
    else if(value==='note-parts')draft.visual={kind:value,focus:'all',beats:.5};
    else if(value==='rhythm-tree')draft.visual={kind:value,level:3};
   });
   if(current==='clef-intro'){
    select('Clef','diagram-clef',draft.visual.clef,[['treble','Treble clef'],['bass','Bass clef']],value=>draft.visual.clef=value);
    select('Teaching picture','diagram-clef-page',draft.visual.page,[['staff','Five lines and four spaces'],['clef','Clef landmark'],['lines','Line-name reminder'],['spaces','Space-name reminder']],value=>draft.visual.page=value);
   }else if(current==='note-parts'){
    select('Highlight','diagram-note-part',draft.visual.focus,[['head','Notehead'],['stem','Stem'],['flag','Flag'],['all','All note parts']],value=>draft.visual.focus=value);
    select('Note symbol','diagram-note-beats',draft.visual.beats,[['4','Whole note'],['2','Half note'],['1','Quarter note'],['0.5','Eighth note']],value=>draft.visual.beats=Number(value));
   }else if(current==='rhythm-tree')select('Show tree through','diagram-tree-level',draft.visual.level,[['0','Whole note'],['1','Half notes'],['2','Quarter notes'],['3','Eighth notes']],value=>draft.visual.level=Number(value));
   form.append(group);
  }
  function renderSignature(){
   const model=draft.visual,group=node('fieldset','education-editor-answers');group.dataset.educationSignature='';group.append(node('legend','','Key-signature diagram'));
   function select(label,name,value,choices,apply){const wrapper=node('label','education-editor-field',label),input=node('select');input.dataset.educationField=name;input.disabled=!canEdit();for(const [id,text]of choices){const option=node('option','',text);option.value=id;input.append(option);}input.value=value;input.onchange=()=>{if(!canEdit())return;apply(input.value);markDirty();renderPreview();};wrapper.append(input);group.append(wrapper);}
   select('Key signature','signature',model.signature,[['none','No key signature'],['G','G major · F-sharp'],['F','F major · B-flat'],['D','D major · F-sharp and C-sharp']],value=>model.signature=value);
   select('Time signature','signature-meter',model.meter||'',[['','None'],['4/4','4/4']],value=>model.meter=value||null);
   model.items.forEach((item,index)=>{
    if(item.type==='note'){group.append(field('Note '+(index+1)+' position (bottom line is 0)',item.position,value=>item.position=value,{type:'number',name:'signature-note-'+index+'-position',min:-4,max:12}));select('Note '+(index+1)+' accidental','signature-note-'+index+'-accidental',item.accidental,[['none','No written accidental'],['sharp','Sharp ♯'],['flat','Flat ♭'],['natural','Natural ♮']],value=>item.accidental=value);}
    else group.append(node('p','education-editor-step-help','Bar line '+(index+1)));
    const remove=button('Remove '+(item.type==='bar'?'bar line':'note')+' '+(index+1),()=>{if(!canEdit())return;model.items.splice(index,1);markDirty();renderForm();},'signature-remove-item');remove.disabled=!canEdit();group.append(remove);
   });
   const tools=node('div','education-editor-actions');for(const [type,label]of [['note','Add note'],['bar','Add bar line']]){const add=button(label,()=>{if(!canEdit()||model.items.length>=16)return;model.items.push(type==='note'?{type:'note',position:0,accidental:'none'}:{type:'bar'});markDirty();renderForm();},'signature-add-'+type);add.disabled=!canEdit()||model.items.length>=16;tools.append(add);}group.append(tools);form.append(group);
  }
  function renderNotation(){
   renderLessonDiagram();const component=win.CodaEducationNotation,hasNotation=draft.visual?.kind==='notation',hasSignature=draft.visual?.kind==='key-signature';if(hasSignature)renderSignature();
   const label=node('label','education-editor-check'),toggle=node('input');toggle.type='checkbox';toggle.checked=hasNotation;toggle.disabled=!canEdit()||!component;toggle.dataset.educationField='notation';label.append(toggle,doc.createTextNode(hasSignature?'Replace diagram with a general music staff':'Use an editable music staff'));form.append(label);
   if(!component){form.append(node('p','education-editor-note','The notation tools could not load. Reload to try again.'));return;}
   toggle.onchange=()=>{if(!canEdit())return;if(toggle.checked){draft.visual={kind:'notation',score:component.fromVisual(draft.visual||((draft.kind==='staff')?{kind:'staff',position:draft.position,clef:draft.clef,grand:draft.grand}:null))};}else draft.visual=null;markDirty();renderForm();};
   if(hasNotation){const notationHost=node('div','education-editor-notation');form.append(notationHost);notationEditor=component.mount({host:notationHost,value:draft.visual.score,canEdit,onChange:value=>{if(!canEdit())return;draft.visual={kind:'notation',score:copy(value)};markDirty();renderPreview();}});}
   else if(draft.visual){const clear=button('Remove existing picture',()=>{if(!canEdit())return;draft.visual=null;markDirty();renderForm();},'remove-visual');clear.disabled=!canEdit();form.append(clear);}
  }
  function renderPreview(){
   const preview=form.querySelector('[data-education-preview]');if(!preview||!draft)return;preview.replaceChildren();preview.append(node('h4','','Preview'),node('p','education-editor-preview-prompt',draft.prompt||draft.guide||draft.teach||''));
   if(kind==='lesson'||kind==='study')for(const key of ['teach','guide','example','caption','hint','success'])if(draft[key])preview.append(node('p','education-editor-preview-caption',key[0].toUpperCase()+key.slice(1)+': '+draft[key]));
   const visual=draft.visual||(kind==='lesson'&&draft.kind==='staff'?{kind:'staff',position:draft.position,clef:draft.clef,grand:draft.grand}:null);
   if(visual&&['keyboard','clef-intro','note-parts','rhythm-tree'].includes(visual.kind)&&win.CodaClassroomLearningPaths?.renderVisual){const figure=node('div','education-editor-preview-staff');if(win.CodaClassroomLearningPaths.renderVisual(figure,visual))preview.append(figure);}
   else if(visual?.kind==='key-signature'&&win.CodaAccidentalsLesson){const checked=win.CodaAccidentalsLesson.validateVisual(visual);if(checked.ok){const figure=node('div','education-editor-preview-staff');figure.innerHTML=win.CodaAccidentalsLesson.signatureSVG(checked.data);preview.append(figure);}}
   else if(visual?.kind==='notation'&&win.CodaEducationNotation){const figure=node('div','education-editor-preview-staff');figure.innerHTML=win.CodaEducationNotation.toSVG(visual.score);preview.append(figure);}
   else if(visual?.kind==='staff'&&win.CodaClassroomQuiz){const figure=node('div','education-editor-preview-staff');figure.innerHTML=win.CodaClassroomQuiz.staffSVG(visual.position,visual);preview.append(figure);}
   else if(visual)preview.append(node('p','education-editor-preview-caption','Existing '+String(visual.kind||'lesson')+' picture will appear with this question.'));
   if(Array.isArray(draft.answers)){
    const correct=kind==='lesson'?(Number.isInteger(draft.answer)?draft.answer:draft.correct):draft.correct,group=node('div','education-editor-preview-answers');draft.answers.forEach((text,index)=>{const answer=button(text,()=>{previewAnswer=index;renderPreview();});answer.dataset.previewAnswer=String(index);if(previewAnswer===index)answer.dataset.correct=String(index===correct);group.append(answer);});preview.append(group);
    if(previewAnswer!==null)preview.append(node('p','education-editor-preview-feedback',(previewAnswer===correct?'Correct. ':'Try again. ')+(draft.explanation||'')));
   }
  }
  function validateResult(result){return result!==false&&result?.ok!==false;}
  function applyDocument(next,text,expected=data){
   if(!canEdit()){message('Editing is unavailable. Your saved content was kept.');return false;}
   const previous=copy(store.getDocument());if(!same(previous,expected)){message('Content changed in another editor. Your draft was kept. Discard this draft to reload the saved version before trying again.');return false;}let result;try{result=store.saveDocument(next);}catch(error){message(error.message||'Content could not save.');return false;}
   if(!validateResult(result)){message(result?.error||'Content could not save. Check the selected question.');return false;}
   undo.push(previous);if(undo.length>25)undo.shift();redo.length=0;data=copy(store.getDocument());message(text||'Saved content in this browser. Export a content JSON backup to keep a copy.');return true;
  }
  function saveSelected(){
   if(!draft||!canEdit())return;const latest=copy(store.getDocument()),base=draftBases.get(key())||itemIn(data);if(!same(itemIn(latest),base)){message('This question or step changed in another editor. Your unsaved draft was kept. Use Discard draft to reload the saved version.');return;}const next=copy(latest),value=copy(draft);
   if(kind==='exam'){const index=next.exam.questions.findIndex(item=>item.id===selected);if(index<0)return;next.exam.questions[index]=value;}
   else if(kind==='quiz'){const index=next.quizzes[category].questions.findIndex(item=>item.id===selected);if(index<0)return;next.quizzes[category].questions[index]=value;}
   else if(kind==='study'){const index=next.lessons[category].study.findIndex(item=>item.id===selected);if(index<0)return;next.lessons[category].study[index]=value;}else next.lessons[category].steps[Number(selected)]=value;
   if(applyDocument(next,kind==='lesson'?'Saved lesson step. Reopen the lesson to see your changes.':kind==='study'?'Saved teaching card. Reopen the lesson to use your changes.':'Saved question. New practice attempts use your edited questions.',latest)){drafts.delete(key());draftBases.delete(key());dirty=false;loadDraft();renderList();renderForm();}
  }
  function discard(){drafts.delete(key());draftBases.delete(key());data=copy(store.getDocument());dirty=false;loadDraft();renderList();renderForm();message('Discarded this unsaved draft and loaded the latest saved content.');}
  function newId(){return library?.generateId?.()||'custom-'+Date.now().toString(36)+'-'+(++serial)+'-'+Math.random().toString(36).slice(2,8);}
  function addQuestion(){if(!canEdit()||kind==='lesson')return;saveDraft();const value=kind==='study'?{id:newId(),title:'New teaching card',teach:'Explain one musical idea here.',example:'Show a short worked example.',prompt:'Try this idea.',answers:['Answer 1','Answer 2','Answer 3'],correct:0,hint:'Look at the worked example.',visual:null,covers:[]}:{id:newId(),category,prompt:'New question',answers:['Answer 1','Answer 2','Answer 3'],correct:0,explanation:'',visual:null},latest=copy(store.getDocument()),next=copy(latest);if(kind==='exam')next.exam.questions.push(value);else if(kind==='study')next.lessons[category].study.push(value);else next.quizzes[category].questions.push(value);if(applyDocument(next,kind==='study'?'Added a teaching card. Add its teaching idea and practice question, then save.':'Added a question. Edit it below and save when ready.',latest)){selected=value.id;search.value='';loadDraft();renderList();renderForm();form.querySelector('[data-education-field="prompt"]')?.focus();}}
  function duplicate(){if(!canEdit()||kind==='lesson'||!draft)return;const value=copy(draft);value.id=newId();if(kind==='study')value.title+=' (copy)';else value.prompt+=' (copy)';const latest=copy(store.getDocument()),next=copy(latest);if(kind==='exam')next.exam.questions.push(value);else if(kind==='study')next.lessons[category].study.push(value);else next.quizzes[category].questions.push(value);if(applyDocument(next,kind==='study'?'Duplicated the teaching card.':'Duplicated the question.',latest)){saveDraft();selected=value.id;search.value='';loadDraft();renderList();renderForm();}}
  function request(text,action,verb='Delete'){if(!canEdit())return;confirmation=action;confirmText.textContent=text+' You can undo this saved edit.';confirmYes.textContent=verb;confirmBox.hidden=false;confirmYes.focus();}
  function removeQuestion(){if(!canEdit()||kind==='lesson'||!draft)return;const latest=copy(store.getDocument());if(!same(itemIn(latest),itemIn(data))){message('This question changed in another editor. Reload its saved version before deleting it.');return;}const next=copy(latest),oldKey=key();if(kind==='exam')next.exam.questions=next.exam.questions.filter(item=>item.id!==selected);else if(kind==='study')next.lessons[category].study=next.lessons[category].study.filter(item=>item.id!==selected);else next.quizzes[category].questions=next.quizzes[category].questions.filter(item=>item.id!==selected);if(applyDocument(next,kind==='study'?'Deleted the teaching card. Check exam coverage; Undo can restore it.':'Deleted the question. Undo saved edit can restore it.',latest)){drafts.delete(oldKey);draftBases.delete(oldKey);selected=collection()[0]?.id||'';loadDraft();renderList();renderForm();}}
  function defaults(){return store.getDefaults?.()||library?.getDefaults?.()||library?.BASE_DOCUMENT||null;}
  function restoreAll(){const base=defaults();if(!base){message('Default content is unavailable. Your current content was kept.');return;}if(applyDocument(base,'Restored the original questions and lessons. Undo saved edit can recover your changes.')){drafts.clear();draftBases.clear();selected=kind==='lesson'?'0':collection()[0]?.id||'';loadDraft();renderList();renderForm();}}
  function restoreDefault(){
   if(!canEdit()||!draft)return;const base=defaults();if(!base){message('Default content is unavailable. Your current edit was kept.');return;}let value;
   if(kind==='exam')value=base.exam?.questions.find(item=>item.id===selected);else if(kind==='quiz')value=base.quizzes?.[category]?.questions.find(item=>item.id===selected);else if(kind==='study')value=base.lessons?.[category]?.study?.find(item=>item.id===selected);else value=base.lessons?.[category]?.steps[Number(selected)];
   if(!value){message('This is a new question. Delete it to remove it from the content.');return;}draft=copy(value);markDirty();renderForm();message('Default restored in the draft. Save to apply it.');
  }
  function travel(back){if(!canEdit())return;const from=back?undo:redo,to=back?redo:undo;if(!from.length)return;if(!same(store.getDocument(),data)){message('Content changed in another editor. Undo and Redo were paused to preserve those saved changes.');return;}if(dirty||drafts.size){message('Save or discard your unsaved drafts before using Undo or Redo. Your drafts were kept.');return;}const next=from.at(-1),result=store.saveDocument(next);if(!validateResult(result)){message(result?.error||'This content change could not be restored.');return;}to.push(copy(data));from.pop();data=copy(store.getDocument());const items=collection();if(kind==='lesson')selected=String(Math.min(Number(selected)||0,Math.max(0,items.length-1)));else if(!items.some(item=>item.id===selected))selected=items[0]?.id||'';loadDraft();renderList();renderForm();message(back?'Undid saved content change.':'Redid saved content change.');}
  function exportContent(){
   const value=store.exportDocument?.()||JSON.stringify(data,null,2),encoded=typeof value==='string'?value:JSON.stringify(value,null,2),blob=new win.Blob([encoded],{type:'application/json'}),url=win.URL.createObjectURL(blob),link=node('a');link.href=url;link.download='coda-education-content.json';link.click();win.setTimeout(()=>win.URL.revokeObjectURL(url),1500);message('Exported saved content. Unsaved field drafts are not included.');
  }
  file.onchange=async()=>{const chosen=file.files?.[0];file.value='';if(!chosen||!canEdit())return;const expected=copy(store.getDocument());try{if(chosen.size>4*1024*1024)throw Error('Choose a content JSON file no larger than 4 MB.');const next=JSON.parse(await chosen.text());if(!canEdit())return;if(applyDocument(next,'Imported content JSON and saved it in this browser.',expected)){drafts.clear();draftBases.clear();search.value='';selected=kind==='lesson'?'0':collection()[0]?.id||'';loadDraft();renderList();renderForm();}}catch(error){message(error.message||'This content file could not be read. Current content was kept.');}};
  function switchMode(){saveDraft();kind=mode.value;syncCategories(categorySelect.value);search.value='';selected=kind==='lesson'?'0':collection()[0]?.id||'';loadDraft();renderList();renderForm();}
  mode.onchange=switchMode;categorySelect.onchange=switchMode;search.oninput=renderList;list.onchange=()=>selectItem(list.value);
  function setExpanded(value){
   value=!!value;if(value===expanded||destroyed)return;
   if(value){priorFocus=doc.activeElement;portal=doc.createComment('Lesson editor');root.before(portal);doc.body.append(root);priorOverflow=doc.body.style.overflow;doc.body.style.overflow='hidden';root.classList.add('is-expanded');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby',title.id);expanded=true;expandButton.textContent='Windowed editor';exitButton.focus();}
   else{expanded=false;root.classList.remove('is-expanded');root.removeAttribute('role');root.removeAttribute('aria-modal');root.removeAttribute('aria-labelledby');if(portal?.parentNode)portal.replaceWith(root);else host.append(root);portal=null;doc.body.style.overflow=priorOverflow;expandButton.textContent='Full screen';if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});}
  }
  function exit(){setExpanded(false);api.onExit?.();}
  function keyDown(event){
   if(destroyed||!expanded||!root.isConnected)return;
   if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(!confirmBox.hidden){confirmNo.click();return;}exit();return;}
   if(event.key==='Tab'){const targets=[...root.querySelectorAll('button,input,select,textarea,a[href]')].filter(element=>!element.disabled&&!element.hidden&&element.getClientRects().length);if(!targets.length)return;const first=targets[0],last=targets.at(-1);if(event.shiftKey&&(doc.activeElement===first||!root.contains(doc.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(doc.activeElement===last||!root.contains(doc.activeElement))){event.preventDefault();first.focus();}event.stopImmediatePropagation();return;}
   if(root.contains(event.target)&&event.key!=='F2')event.stopPropagation();
  }
  win.addEventListener('keydown',keyDown,true);
  function refresh(){if(destroyed)return;if(!dirty&&drafts.size===0){const next=store.getDocument();if(JSON.stringify(next)!==JSON.stringify(data)){data=copy(next);loadDraft();renderList();renderForm();}}if(formPermission!==canEdit())renderForm();renderList();}
  selected=collection()[0]?.id||'';loadDraft();renderList();renderForm();message('Choose content to edit. Saved changes remain local until exported and published.');
  return {refresh,setExpanded,setActive(value){if(!value)setExpanded(false);else{refresh();renderForm();}},getState:()=>({kind,category,selected,dirty,draft:copy(draft),expanded,status:statusText,undo:undo.length,redo:redo.length}),dispose(){if(destroyed)return;setExpanded(false);destroyed=true;notationEditor?.destroy();win.removeEventListener('keydown',keyDown,true);root.remove();},destroy(){this.dispose();}};
 }
 return Object.freeze({mount});
});
