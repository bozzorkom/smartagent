import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspace,reduceWorkspace} from '../components/today-state.ts';
test('waiting preserves deadline and completion and records scoped history',()=>{
 const task={id:'follow',title:'Позвонить',time:'10:00',dueAt:'2026-11-01T10:00',context:'Клиент',state:'Открыто',done:false,scope:'team'};
 const state={...createWorkspace(),tasks:[task]};
 const next=reduceWorkspace(state,{type:'setTaskKind',taskId:task.id,kind:'waiting'});
 assert.equal(next.tasks[0].followUpKind,'waiting'); assert.equal(next.tasks[0].done,false); assert.equal(next.tasks[0].dueAt,task.dueAt); assert.equal(next.history[0].scope,'team');
 assert.equal(reduceWorkspace(next,{type:'setTaskKind',taskId:task.id,kind:'waiting'}),next);
 assert.equal(reduceWorkspace(state,{type:'setTaskKind',taskId:'missing',kind:'promise'}),state);
 const done={...state,tasks:[{...task,done:true}]};
 assert.equal(reduceWorkspace(done,{type:'setTaskKind',taskId:task.id,kind:'promise'}),done);
});
