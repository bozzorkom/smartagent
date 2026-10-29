import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, reduceWorkspace } from '../components/today-state.ts';
const item={id:'call',kind:'call',scope:'mine',title:'Перезвонить',context:'Клиент',rank:1};
test('unsuccessful contact records history without removing recovery work',()=>{const state=createWorkspace({items:[item]});const next=reduceWorkspace(state,{type:'shieldResolve',itemIds:['call'],outcome:'Не ответил',note:'Нет связи'});assert.equal(next.resolved.length,0);assert.equal(next.history.length,1);});
test('confirmed contact closes events once',()=>{const state=createWorkspace({items:[item]});const action={type:'shieldResolve',itemIds:['call'],outcome:'Связались',note:''};const next=reduceWorkspace(state,action);assert.deepEqual(next.resolved,['call']);assert.equal(reduceWorkspace(next,action),next);});
test('empty handoff leaves state unchanged',()=>{const state=createWorkspace();assert.equal(reduceWorkspace(state,{type:'shieldHandoff',itemIds:[],assignee:'Агент'}),state);});
