import test from 'node:test';
import assert from 'node:assert/strict';
import {queryInbox,matchesInboxFilter} from '../components/inbox-query.ts';
const view={query:'',filter:'all',source:'all',sort:'priority',privateMode:false};
const item=(id,extra={})=>({id,scope:'mine',kind:'message',rank:2,context:'Азиз',title:'Ответить',note:'Секрет',source:'Вручную',time:'Сегодня',...extra});
test('all status counters match their queues',()=>{const items=[item('a'),item('b',{kind:'call'}),item('c',{kind:'review'}),item('d',{kind:'unassigned',scope:'team'})];for(const filter of ['all','reply','missed','review','unassigned']) assert.equal(queryInbox(items,{...view,filter}).length,items.filter(i=>matchesInboxFilter(i,filter)).length);});
test('time ordering uses arrival, unknown times last and stable ties',()=>{const items=[item('c'),item('b',{receivedAt:'2026-10-28T12:00:00Z'}),item('a',{receivedAt:'2026-10-28T10:00:00Z'})];assert.deepEqual(queryInbox(items,{...view,sort:'newest'}).map(i=>i.id),['b','a','c']);assert.deepEqual(queryInbox(items,{...view,sort:'oldest'}).map(i=>i.id),['a','b','c']);});
test('restricted access and privacy prevent hidden search results',()=>{assert.equal(queryInbox([item('a')],view,true).length,0);assert.equal(queryInbox([item('a')],{...view,query:'Секрет',privateMode:true}).length,0);});
test('sources and a thousand records retain exact counts without mutation',()=>{const items=Array.from({length:1000},(_,i)=>item(String(i),{channel:i%2?'telegram':undefined}));const result=queryInbox(items,{...view,source:'telegram'});assert.equal(result.length,500);assert.equal(new Set(result.map(i=>i.id)).size,500);assert.equal(items[0].id,'0');});
