import test from 'node:test';
import assert from 'node:assert/strict';
import {employees} from '../components/today-data.ts';
import {applyPropertyCommand,demoProperties,canViewListing,requestTargets} from '../components/property-model.ts';
const now='2026-10-30T07:00:00.000Z';
test('every employee shown in assignment UI is accepted by property model',()=>{
 const state=demoProperties(now);
 for(const assignee of employees){const result=applyPropertyCommand(state,{type:'assign',id:'agency-1',version:1,assignee,operationId:assignee},{role:'owner',lost:false,offline:false},[],now);assert.equal(result.error,'');assert.equal(result.state.listings.find(l=>l.id==='agency-1').assignee,assignee);}
});
test('a separate capture does not replace an existing textual client request',()=>{
 const clients=[{id:'c',name:'Клиент',scope:'mine',request:'Ищу квартиру для себя'}];
 const items=[{id:'new-request',clientId:'c',scope:'mine',capture:{need:'Снять',price:'500',currency:'USD',districts:'Чиланзар'}}];
 const targets=requestTargets(clients,items);
 assert.deepEqual(targets[0].requests.map(r=>r.id),['client:c','new-request']);
});
test('an unspecified role cannot access corporate objects',()=>{
 const state=demoProperties(now);
 assert.equal(canViewListing(state.listings.find(l=>l.id==='agency-1'),{role:'',lost:false,offline:false}),false);
});
