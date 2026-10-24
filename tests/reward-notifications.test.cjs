const test=require('node:test'),assert=require('node:assert/strict');
const {createNotificationQueue,achievementItem,missionCompleteItem,missionRewardItem}=require('../reward-notifications.js');
test('new celebrations queue in order and duplicate event IDs never replay',()=>{
 const queue=createNotificationQueue();assert.equal(queue.push({id:'one',title:'First'}),true);assert.equal(queue.push({id:'two',title:'Second'}),true);
 assert.equal(queue.snapshot().current.id,'one');assert.deepEqual(queue.snapshot().queued.map(item=>item.id),['two']);
 assert.equal(queue.push({id:'one',title:'Duplicate'}),false);queue.dismiss();assert.equal(queue.snapshot().current.id,'two');queue.dismiss();assert.equal(queue.snapshot().current,null);
 assert.equal(queue.push({id:'one',title:'Still duplicate'}),false);
});
test('restored awards can be silent and invalid data does not enter the queue',()=>{
 const queue=createNotificationQueue();assert.equal(queue.push({id:'old',title:'Already earned',announce:false}),false);assert.equal(queue.push({id:'',title:'No ID'}),false);assert.equal(queue.push({id:'no-title'}),false);
 assert.deepEqual(queue.snapshot(),{current:null,queued:[],seen:[]});
});
test('completion and reward collection are distinct, with no implied automatic payout',()=>{
 const queue=createNotificationQueue(),mission={id:'bach-win',title:'Counterpoint Champion',giver:'Bach',reward:90};queue.push(missionCompleteItem(mission));
 assert.match(queue.snapshot().current.message,/Go back to Bach to collect 90 Notes/);assert.doesNotMatch(queue.snapshot().current.message,/Collected/);
 queue.push(missionRewardItem({...mission,notes:90,xp:100}));assert.match(queue.snapshot().current.message,/Collected 90 Notes and 100 XP/);assert.equal(queue.snapshot().current.kind,'mission-reward');
});
test('achievement helper keeps known event IDs stable and only includes positive XP',()=>{
 assert.equal(achievementItem({id:'achievement:note-reader',title:'Note reader',xp:50}).id,'achievement:note-reader');
 assert.match(achievementItem({id:'note-reader',title:'Note reader',xp:50}).message,/\+50 XP/);
 assert.doesNotMatch(achievementItem({id:'note-reader',title:'Note reader',xp:-5}).message,/-5/);
});
test('bounded waiting queue keeps recent celebrations and snapshots cannot mutate it',()=>{
 const queue=createNotificationQueue({limit:2});for(const id of ['a','b','c','d'])queue.push({id,title:id});
 const snapshot=queue.snapshot();assert.equal(snapshot.current.id,'a');assert.deepEqual(snapshot.queued.map(item=>item.id),['c','d']);snapshot.current.title='changed';snapshot.queued.length=0;
 assert.equal(queue.snapshot().current.title,'a');assert.equal(queue.snapshot().queued.length,2);queue.clear();assert.equal(queue.snapshot().current,null);
});
test('mission return instructions take priority over waiting achievement notices',()=>{
 const queue=createNotificationQueue();queue.push(achievementItem({id:'a',title:'First'}));queue.push(achievementItem({id:'b',title:'Second'}));
 queue.push(missionCompleteItem({id:'chopin',title:'Melody complete',giver:'Chopin',reward:20}));
 assert.deepEqual(queue.snapshot().queued.map(item=>item.kind),['mission-complete','achievement']);
 queue.dismiss();assert.equal(queue.snapshot().current.missionId,'chopin');
});
test('achievement bursts cannot evict pending mission return instructions',()=>{
 const queue=createNotificationQueue({limit:2});queue.push(achievementItem({id:'a',title:'First'}));queue.push(missionCompleteItem({id:'chopin',giver:'Chopin',reward:20}));
 for(const id of ['b','c','d'])queue.push(achievementItem({id,title:id}));
 assert.deepEqual(queue.snapshot().queued.map(item=>item.id),['mission-complete:chopin','achievement:d']);
});
test('collecting a visible mission reward replaces its return instruction immediately',()=>{
 const queue=createNotificationQueue();queue.push(missionCompleteItem({id:'chopin',giver:'Chopin',reward:20}));queue.push(achievementItem({id:'a',title:'First'}));
 queue.push(missionRewardItem({id:'chopin',notes:20,xp:30}));
 assert.equal(queue.snapshot().current.kind,'mission-reward');assert.match(queue.snapshot().current.message,/Collected 20 Notes/);assert.equal(queue.snapshot().queued.length,1);
 queue.dismiss();assert.equal(queue.snapshot().current.kind,'achievement');
});
test('claiming before a queued completion displays removes stale instructions permanently',()=>{
 const queue=createNotificationQueue();queue.push(achievementItem({id:'a',title:'First'}));queue.push(missionCompleteItem({id:'chopin',giver:'Chopin',reward:20}));
 queue.push(missionRewardItem({id:'chopin',notes:20}));assert.deepEqual(queue.snapshot().queued.map(item=>item.kind),['mission-reward']);
 queue.dismiss();assert.equal(queue.snapshot().current.kind,'mission-reward');queue.dismiss();
 assert.equal(queue.push(missionCompleteItem({id:'chopin',giver:'Chopin',reward:20})),false);
 const claimedFirst=createNotificationQueue();claimedFirst.push(missionRewardItem({id:'bach',notes:10}));assert.equal(claimedFirst.push(missionCompleteItem({id:'bach',reward:10})),false);
});
