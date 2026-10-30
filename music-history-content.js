/* Authored history content is project data; player discoveries keep stable IDs. */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?require('./music-history-data.js'):root.CodaMusicHistoryData,typeof module==='object'&&module.exports?require('./music-history-quiz-data.js'):root.CodaMusicHistoryQuizData);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.CodaMusicHistoryContent=api;
})(typeof window==='undefined'?null:window,function(PEOPLE,QUIZ_DATA){
 'use strict';
 const LIMITS=Object.freeze({fact:1200,prompt:300,choice:200});
 const FACTS=Object.freeze(Object.values(PEOPLE).flatMap(person=>person.facts));
 const QUESTIONS=Object.freeze((Array.isArray(QUIZ_DATA)?QUIZ_DATA:QUIZ_DATA?.QUESTIONS||[]).slice());
 const BY_FACT=new Map(FACTS.map(fact=>[fact.id,fact])),BY_QUIZ=new Map(QUESTIONS.map(question=>[question.id,question]));
 const EMPTY=Object.freeze({version:1,facts:Object.freeze({}),quizzes:Object.freeze({})});
 const own=(value,key)=>Object.hasOwn(value,key);
 const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
 const keys=(value,allowed)=>Object.keys(value).every(key=>allowed.includes(key));
 const text=(value,max)=>typeof value==='string'&&value.length<=max&&value.trim().length>0;
 function validQuiz(value,source){
  return record(value)&&keys(value,['prompt','choices','answer'])&&['prompt','choices','answer'].every(key=>own(value,key))&&text(value.prompt,LIMITS.prompt)&&Array.isArray(value.choices)&&value.choices.length===source.choices.length&&value.choices.every(choice=>text(choice,LIMITS.choice))&&new Set(value.choices.map(choice=>choice.trim().toLowerCase())).size===value.choices.length&&Number.isSafeInteger(value.answer)&&value.answer>=0&&value.answer<value.choices.length;
 }
 function validate(value){
  try{
   return record(value)&&keys(value,['version','facts','quizzes'])&&['version','facts','quizzes'].every(key=>own(value,key))&&value.version===1&&record(value.facts)&&record(value.quizzes)&&Object.keys(value.facts).length<=FACTS.length&&Object.keys(value.quizzes).length<=QUESTIONS.length&&Object.entries(value.facts).every(([id,value])=>BY_FACT.has(id)&&text(value,LIMITS.fact))&&Object.entries(value.quizzes).every(([id,value])=>BY_QUIZ.has(id)&&validQuiz(value,BY_QUIZ.get(id)));
  }catch{return false;}
 }
 function normalize(value){
  if(!validate(value))return null;
  const facts={},quizzes={};
  for(const fact of FACTS)if(own(value.facts,fact.id)){const next=value.facts[fact.id].trim();if(next!==fact.text)facts[fact.id]=next;}
  for(const question of QUESTIONS)if(own(value.quizzes,question.id)){
   const input=value.quizzes[question.id],next={prompt:input.prompt.trim(),choices:input.choices.map(choice=>choice.trim()),answer:input.answer};
   if(next.prompt!==question.prompt||next.answer!==question.answer||next.choices.some((choice,index)=>choice!==question.choices[index]))quizzes[question.id]=next;
  }
  return {version:1,facts,quizzes};
 }
 function factFrom(value,id){const base=BY_FACT.get(id);return base?{...base,text:own(value.facts,id)?value.facts[id]:base.text}:null;}
 function quizFrom(value,id){const base=BY_QUIZ.get(id),override=value.quizzes[id];return base?{...base,...override,choices:(override?.choices||base.choices).slice()}:null;}
 function resolvedFact(value,id){return factFrom(normalize(value)||EMPTY,id);}
 function resolvedQuiz(value,id){return quizFrom(normalize(value)||EMPTY,id);}
 function resolvePeople(value){
  const data=normalize(value)||EMPTY;
  return Object.fromEntries(Object.entries(PEOPLE).map(([id,person])=>[id,{...person,facts:person.facts.map(fact=>factFrom(data,fact.id))}]));
 }
 function resolveQuestions(value){const data=normalize(value)||EMPTY;return QUESTIONS.map(question=>quizFrom(data,question.id));}
 return Object.freeze({PEOPLE,FACTS,QUESTIONS,LIMITS,EMPTY,validate,normalize,resolvedFact,resolvedQuiz,resolvePeople,resolveQuestions});
});
