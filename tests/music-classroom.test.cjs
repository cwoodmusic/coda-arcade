const test=require('node:test');
const assert=require('node:assert/strict');
const {TOPICS,SHELVES,HAYDN,topicFor}=require('../music-classroom.js');
test('Haydn and all bookshelf targets have real study content',()=>{
  assert.equal(HAYDN.name,'Professor Haydn');
  assert.equal(SHELVES.length,3);
  const ids=new Set(TOPICS.map(topic=>topic.id));assert.equal(ids.size,TOPICS.length);
  for(const shelf of SHELVES){assert.ok(ids.has(shelf.topic));assert.ok(shelf.approach.y>=285&&shelf.approach.y<=565);}
  for(const topic of TOPICS){assert.ok(topic.html.length>600);assert.ok(topic.quiz.answers.length>=3);assert.ok(topic.quiz.correct>=0&&topic.quiz.correct<topic.quiz.answers.length);assert.ok(topic.quiz.explanation);assert.equal(topicFor(topic.id),topic);}
  assert.equal(topicFor('bad-id').id,'welcome');
});
test('classroom covers all cabinets and both Chopin game types accurately',()=>{
  const all=TOPICS.map(topic=>topic.html).join(' ');
  for(const game of ['Pitch Race','Music Triad','Rhythm Room','Song Machine','Piano Lab'])assert.ok(all.includes(game));
  assert.match(topicFor('music-triad').html,/rhythm card strategy game/);assert.match(topicFor('music-triad').html,/Notes battle notes; rests battle rests/);
  assert.match(topicFor('piano').html,/walking is silent/);assert.match(topicFor('piano').html,/press <strong>E/);
  assert.match(topicFor('intervals').html,/C5 → A♭4/);assert.match(topicFor('meter').html,/6\/8 usually has two/);
  assert.match(topicFor('song-machine').html,/16 cells make one bar/);
});
test('listening examples use valid pitches and distinguish chords from melodies',()=>{
  const examples=TOPICS.flatMap(topic=>topic.audio||[]);assert.ok(examples.length>=6);
  assert.ok(examples.some(example=>example.chord));assert.ok(examples.some(example=>!example.chord));
  for(const example of examples){assert.ok(example.label);assert.ok(example.notes.length>=2);assert.ok(example.notes.every(note=>Number.isInteger(note)&&note>=48&&note<=84));}
});
