import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspace,reduceWorkspace,taskReminder} from '../components/today-state.ts';
const task={id:'reminder',title:'Связаться',time:'10:00',context:'Клиент',state:'Открыто',done:false,scope:'team',dueAt:'2026-11-01T10:00'};
test('reminder uses Tashkent time and includes exact boundary',()=>{
 const value={...task,reminderMinutes:15};
 assert.deepEqual(taskReminder(value,'2026-11-01T04:44:59Z'),{status:'scheduled',at:'2026-11-01T04:45:00.000Z'});
 assert.equal(taskReminder(value,'2026-11-01T04:45:00Z').status,'due');
 assert.equal(taskReminder({...value,done:true},'2026-11-01T05:00:00Z').status,'off');
 assert.equal(taskReminder({...value,dueAt:undefined},'2026-11-01T05:00:00Z').status,'no-date');
});
test('reminder validates settings, scopes history, follows rescheduling and can be disabled',()=>{
 const state=createWorkspace({tasks:[task]}); const action={type:'setTaskReminder',taskId:task.id,minutes:60};
 const saved=reduceWorkspace(state,action); assert.equal(saved.tasks[0].reminderMinutes,60);assert.equal(saved.history[0].scope,'team');
 assert.equal(reduceWorkspace(saved,action),saved);
 assert.equal(reduceWorkspace(state,{...action,minutes:-1}),state);
 const undated=createWorkspace({tasks:[{...task,dueAt:undefined}]});assert.equal(reduceWorkspace(undated,action),undated);
 const completed=createWorkspace({tasks:[{...task,done:true}]});assert.equal(reduceWorkspace(completed,action),completed);
 const moved=reduceWorkspace(saved,{type:'rescheduleTask',taskId:task.id,dueAt:'2026-11-02T10:00'});
 assert.equal(taskReminder(moved.tasks[0],'2026-11-01T05:00:00Z').at,'2026-11-02T04:00:00.000Z');
 const off=reduceWorkspace(saved,{...action,minutes:null});assert.equal(taskReminder(off.tasks[0],'2026-11-01T05:00:00Z').status,'off');
});
