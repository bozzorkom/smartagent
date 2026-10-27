import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../components/today-state.ts';

const now = '2026-10-27T09:30:00.000Z';
const client = { id:'c1', name:'Мадина · демо', request:'Аренда · Чиланзар', phone:'+998900000042', scope:'mine' };
const event = { provider:'demo-pbx', externalId:'e1', sequence:1, status:'missed', startedAt:'2026-10-27T09:12:00.000Z', receivedAt:now, phone:'+998900000042', scope:'mine', control:'events', contextAccess:'ready' };
function received(patch = {}, seed = {}) {
  const next = model.reduceWorkspace(model.createWorkspace({clients:[client],...seed}),{type:'callEvent',event:{...event,...patch}},now);
  assert.ok(next?.calls?.length === 1, 'one received call must be represented in the shared workspace');
  return next;
}
const save = (patch={}) => ({type:'callResult',callId:'demo-pbx/e1',operationId:'save-1',expectedVersion:0,outcome:'Не ответил',note:'Попытка обратного контакта отмечена вручную',...patch});

test('a call becomes one CRM item linked to its permitted known client',()=>{
  const state=received();
  assert.equal(state.calls[0].id,'demo-pbx/e1');
  assert.equal(state.calls[0].clientId,'c1');
  assert.equal(state.items.length,1);
  assert.equal(state.items[0].callId,'demo-pbx/e1');
  assert.equal(state.items[0].kind,'call');
  assert.equal(state.history[0].clientId,'c1');
});

test('replayed and older call events preserve the same workspace reference',()=>{
  const state=received({sequence:3});
  for(const sequence of [3,2,1]) assert.equal(model.reduceWorkspace(state,{type:'callEvent',event:{...event,sequence}},now),state);
});

test('provider updates describe a lifecycle, not several inquiries',()=>{
  const first=received({status:'incoming'});
  const next=model.reduceWorkspace(first,{type:'callEvent',event:{...event,status:'ended',sequence:2,durationSeconds:84}},now);
  assert.equal(next.calls.length,1);
  assert.equal(next.items.length,1);
  assert.equal(next.calls[0].status,'ended');
  assert.equal(next.calls[0].durationSeconds,84);
  assert.equal(next.calls[0].startedAt,'2026-10-27T09:12:00.000Z');
});

test('a terminal event is not reverted to ringing by a late status',()=>{
  const state=received({status:'ended'});
  assert.equal(model.reduceWorkspace(state,{type:'callEvent',event:{...event,status:'incoming',sequence:8}},now),state);
});

test('separate calls from the same phone remain separate',()=>{
  const state=model.reduceWorkspace(received(),{type:'callEvent',event:{...event,externalId:'e2'}},now);
  assert.equal(state.calls.length,2);
  assert.equal(state.items.length,2);
});

test('missing duration and unanswered events do not invent a conversation',()=>{
  const state=received({status:'unknown'});
  assert.equal(state.calls[0].durationSeconds,undefined);
  assert.equal(state.calls[0].status,'unknown');
  assert.equal(state.calls[0].result,undefined);
});

test('a call answered elsewhere is not a personal missed callback item',()=>{
  const state=received({status:'answeredElsewhere',scope:'team'});
  assert.equal(state.items.filter(item=>item.kind==='call'&&!state.resolved.includes(item.id)).length,0);
  assert.equal(state.resolved.includes('call:demo-pbx/e1'),true);
});

test('business result and dated follow-up save atomically and only once',()=>{
  const action=save({outcome:'Перезвонить позже',followUp:{id:'follow',dueAt:'2026-10-28T10:00',title:'Перезвонить'}});
  const state=model.reduceWorkspace(received(),action,now);
  assert.equal(state.calls[0].result.outcome,'Перезвонить позже');
  assert.equal(state.calls[0].result.note,'Попытка обратного контакта отмечена вручную');
  assert.equal(state.calls[0].status,'missed');
  assert.equal(state.tasks.length,1);
  assert.equal(state.tasks[0].clientId,'c1');
  assert.equal(state.tasks[0].callId,'demo-pbx/e1');
  assert.equal(state.resolved.includes('call:demo-pbx/e1'),true);
  assert.equal(model.reduceWorkspace(state,action,now),state);
});

test('past, missing or invalid callback dates do not resolve the call',()=>{
  const state=received();
  for(const dueAt of ['', '2026-10-26T10:00', '2026-02-31T10:00']) assert.equal(model.reduceWorkspace(state,save({outcome:'Перезвонить позже',followUp:{id:'follow',dueAt}}),now),state);
  assert.equal(model.reduceWorkspace(state,save({outcome:'Перезвонить позже'}),now),state);
});

test('a confirmed missed call needs an explicit manual callback outcome before Связались',()=>{
  const state=received();
  assert.equal(model.reduceWorkspace(state,save({outcome:'Связались'}),now),state);
  const next=model.reduceWorkspace(state,save({outcome:'Связались',callbackAttempt:true}),now);
  assert.equal(next.calls[0].result.outcome,'Связались');
  assert.equal(next.calls[0].status,'missed');
});

test('an in-progress call cannot be prematurely completed',()=>{
  const state=received({status:'active'});
  assert.equal(model.reduceWorkspace(state,save(),now),state);
});

test('a new operation with a stale business version cannot overwrite a result',()=>{
  const state=model.reduceWorkspace(received(),save(),now);
  assert.equal(model.reduceWorkspace(state,save({operationId:'other',outcome:'Другое',note:'Другой результат'}),now),state);
});

test('late provider updates preserve the saved result and do not reopen its CRM item',()=>{
  const first=model.reduceWorkspace(received(),save(),now);
  const next=model.reduceWorkspace(first,{type:'callEvent',event:{...event,sequence:2,status:'ended'}},now);
  assert.equal(next.calls[0].result.operationId,'save-1');
  assert.equal(next.resolved.includes('call:demo-pbx/e1'),true);
});

test('hidden and duplicate phones never auto-select an arbitrary identity',()=>{
  assert.equal(received({phone:undefined}).calls[0].clientId,undefined);
  const state=received({}, {clients:[client,{...client,id:'c2',name:'Другой контакт'}]});
  assert.equal(state.calls[0].clientId,undefined);
  assert.equal(model.callMatches(state,state.calls[0]).length,2);
});

test('explicit linking is limited to the call workspace and preserves original history',()=>{
  const state=received({phone:'+998930000076'}, {clients:[client,{...client,id:'team',scope:'team'}]});
  const before=state.history[0];
  assert.equal(model.reduceWorkspace(state,{type:'callLink',callId:'demo-pbx/e1',clientId:'team',expectedVersion:0},now),state);
  const next=model.reduceWorkspace(state,{type:'callLink',callId:'demo-pbx/e1',clientId:'c1',expectedVersion:0},now);
  assert.equal(next.calls[0].clientId,'c1');
  assert.equal(next.history.at(-1),before);
  assert.equal(model.clientHistory(next,'c1').length,2);
});

test('unknown callers are not created automatically and explicit creation keeps their phone and source',()=>{
  const state=received({phone:'+998930000076'});
  assert.equal(state.clients.length,1);
  const next=model.reduceWorkspace(state,{type:'callCreateClient',callId:'demo-pbx/e1',clientId:'new',name:'',request:'Аренда',expectedVersion:0},now);
  assert.equal(next.clients.length,2);
  assert.equal(next.clients[1].phone,'+998930000076');
  assert.match(next.clients[1].name,/Контакт/);
  assert.equal(next.calls[0].clientId,'new');
  assert.equal(next.items[0].clientId,'new');
});

test('explicit creation cannot duplicate an existing phone',()=>{
  const state=received();
  assert.equal(model.reduceWorkspace(state,{type:'callCreateClient',callId:'demo-pbx/e1',clientId:'new',name:'Дубль',request:'',expectedVersion:0},now),state);
});

test('team call results and follow-ups remain in the team scope',()=>{
  const state=received({scope:'team'}, {clients:[{...client,scope:'team'}]});
  const next=model.reduceWorkspace(state,save({followUp:{id:'team-follow',dueAt:'2026-10-28T11:00'}}),now);
  assert.equal(next.tasks[0].scope,'team');
  assert.ok(next.history.every(entry=>entry.scope==='team'));
});

test('phone normalization permits Uzbek local input but rejects hidden and malformed identifiers',()=>{
  assert.equal(typeof model.normalizePhone,'function');
  assert.equal(model.normalizePhone('90 000 00 42'),'+998900000042');
  assert.equal(model.normalizePhone('+998 (90) 000-00-42'),'+998900000042');
  assert.equal(model.normalizePhone('номер скрыт'),undefined);
  assert.equal(model.normalizePhone('123'),undefined);
});

test('saving only a note retains an unhandled call and rejects a repeated note operation',()=>{
  const action={type:'callNote',callId:'demo-pbx/e1',operationId:'note-1',note:'Уточнить контакт'};
  const next=model.reduceWorkspace(received(),action,now);
  assert.ok(next?.calls?.length===1,'note must retain the call');
  assert.equal(next.calls[0].result,undefined);
  assert.equal(next.resolved.includes('call:demo-pbx/e1'),false);
  assert.equal(next.history[0].note,'Уточнить контакт');
  assert.equal(model.reduceWorkspace(next,action,now),next);
});

test('assigning a team call records responsibility without reassigning the client',()=>{
  const state=received({scope:'team'},{clients:[{...client,scope:'team'}]});
  const next=model.reduceWorkspace(state,{type:'callAssign',callId:'demo-pbx/e1',assignee:'Анна',expectedVersion:0},now);
  assert.ok(next?.calls?.length===1,'assignment must retain the call');
  assert.equal(next.calls[0].assignee,'Анна');
  assert.deepEqual(next.clients,state.clients);
  assert.equal(next.history[0].scope,'team');
});

test('a corrected number invalidates its old identity until an explicit review',()=>{
  const clients=[client,{...client,id:'c2',name:'Другой клиент',phone:'+998930000076'}];
  const first=received({}, {clients});
  const next=model.reduceWorkspace(first,{type:'callEvent',event:{...event,phone:'+998930000076',sequence:2}},now);
  assert.equal(next.calls[0].clientId,undefined);
  assert.equal(next.calls[0].identityReview,true);
  assert.equal(next.items[0].context.includes('Мадина'),false);
  assert.equal(model.reduceWorkspace(next,save(),now),next);
  const update=model.reduceWorkspace(next,{type:'callEvent',event:{...event,phone:'+998930000076',sequence:3}},now);
  assert.equal(update.calls[0].clientId,undefined);
  const linked=model.reduceWorkspace(update,{type:'callLink',callId:'demo-pbx/e1',clientId:'c2',expectedVersion:0},now);
  assert.equal(linked.calls[0].identityReview,false);
  assert.equal(linked.calls[0].clientId,'c2');
});

test('a number correction does not silently move an earlier follow-up to another client',()=>{
  const first=model.reduceWorkspace(received(),save({followUp:{id:'f',dueAt:'2026-10-28T10:00'}}),now);
  const next=model.reduceWorkspace(first,{type:'callEvent',event:{...event,phone:'+998930000076',sequence:2}},now);
  assert.equal(next.tasks[0].clientId,'c1');
  assert.equal(next.calls[0].clientId,undefined);
  assert.equal(model.callNeedsAction(next.calls[0]),true);
});

test('archived phone matches cannot be duplicated through unknown-contact creation',()=>{
  const state=received({}, {clients:[{...client,archived:true}]});
  assert.equal(state.calls[0].clientId,undefined);
  assert.equal(model.reduceWorkspace(state,{type:'callCreateClient',callId:'demo-pbx/e1',clientId:'duplicate',name:'Ещё один',request:'',expectedVersion:0},now),state);
});

test('an unknown provider status is rejected without inventing an event',()=>{
  const state=model.createWorkspace();
  assert.equal(model.reduceWorkspace(state,{type:'callEvent',event:{...event,status:'missedd'}},now),state);
});

test('a later agent-leg missed status cannot reopen a call answered by a colleague',()=>{
  const state=received({status:'answeredElsewhere',scope:'team'});
  assert.equal(model.reduceWorkspace(state,{type:'callEvent',event:{...event,status:'missed',scope:'team',sequence:2}},now),state);
});
