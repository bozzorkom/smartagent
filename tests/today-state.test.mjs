import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, reduceWorkspace, taskDay, workspaceDate } from '../components/today-state.ts';

const now = '2026-10-26T19:30:00.000Z'; // 27 October, 00:30 in Tashkent.
const item = { id: 'a1', kind: 'overdue', scope: 'mine', title: 'Позвонить', context: 'Клиент №128', source: 'Вручную', type: 'Контакт', time: 'Вчера', note: '', cta: 'Открыть', reason: '', due: 0, rank: 0, clientId: 'c1' };
const seed = () => createWorkspace({ items: [item], clients: [{ id: 'c1', name: 'Азиз', request: 'Аренда', scope: 'mine' }] });

test('replayed events never reopen a resolved action or duplicate history', () => {
  const closed = reduceWorkspace(seed(), { type: 'outcome', itemId: item.id, outcome: 'Связались', note: 'Готово' }, now);
  assert.equal(reduceWorkspace(closed, { type: 'receive', item }, now), closed);
});

test('a new event for the same client preserves the earlier result and draft', () => {
  const draft = reduceWorkspace(seed(), { type: 'draft', itemId: item.id, value: 'Черновик' }, now);
  const closed = reduceWorkspace(draft, { type: 'outcome', itemId: item.id, outcome: 'Связались', note: 'Готово' }, now);
  const event = { ...item, id: 'event-2' };
  const next = reduceWorkspace(closed, { type: 'receive', item: event }, now);
  assert.equal(next.items.length, 2);
  assert.deepEqual(next.resolved, [item.id]);
  assert.equal(next.history[1].note, 'Готово');
  assert.equal(next.drafts[item.id], 'Черновик');
  assert.equal(reduceWorkspace(next, { type: 'receive', item: event }, now), next);
});

test('a created client is available as a real local record with its request', () => {
  const state = reduceWorkspace(createWorkspace(), { type: 'addClient', id: 'c2', name: '  Мадина  ', request: 'Аренда · Чиланзар' }, now);
  assert.equal(state.clients[0].name, 'Мадина');
  assert.equal(state.clients[0].request, 'Аренда · Чиланзар');
  assert.equal(state.history[0].entityId, 'c2');
});

test('empty clients and duplicate submission do not create phantom records', () => {
  const empty = createWorkspace();
  assert.deepEqual(reduceWorkspace(empty, { type: 'addClient', id: 'x', name: ' ', request: '' }, now), empty);
  const action = { type: 'addClient', id: 'c2', name: 'Мадина', request: '' };
  const first = reduceWorkspace(empty, action, now);
  assert.deepEqual(reduceWorkspace(first, action, now), first);
});

test('recording an outcome retains the note and creates exactly one dated follow-up', () => {
  const action = { type: 'outcome', itemId: 'a1', outcome: 'Не ответил', note: 'Просил связаться вечером', followUp: { id: 'f1', dueAt: '2026-10-27T18:00' } };
  const state = reduceWorkspace(seed(), action, now);
  assert.equal(state.resolved.includes('a1'), true);
  assert.equal(state.history[0].outcome, 'Не ответил');
  assert.equal(state.history[0].note, 'Просил связаться вечером');
  assert.equal(state.tasks[0].clientId, 'c1');
  assert.equal(state.tasks[0].dueAt, '2026-10-27T18:00');
  assert.deepEqual(reduceWorkspace(state, action, now), state);
});

test('rescheduling preserves the action as a future task with a real date', () => {
  const state = reduceWorkspace(seed(), { type: 'reschedule', itemId: 'a1', taskId: 'r1', dueAt: '2026-10-28T10:00' }, now);
  assert.equal(state.tasks[0].title, 'Позвонить');
  assert.equal(state.tasks[0].dueAt, '2026-10-28T10:00');
  assert.equal(taskDay(state.tasks[0], now), 'future');
  assert.equal(state.resolved.includes('a1'), true);
  assert.equal(state.history[0].entityId, 'a1');
});

test('invalid and past reschedules leave the original action open', () => {
  const state = seed();
  for (const dueAt of ['', 'wrong', '2026-10-26T17:00', '2026-02-31T10:00']) {
    assert.deepEqual(reduceWorkspace(state, { type: 'reschedule', itemId: 'a1', taskId: 'r1', dueAt }, now), state);
  }
});

test('assignment changes ownership without deleting the team inquiry', () => {
  const state = createWorkspace({ items: [{ ...item, kind: 'unassigned', scope: 'team' }] });
  const assigned = reduceWorkspace(state, { type: 'assign', assignments: { a1: 'Анна' } }, now);
  assert.equal(assigned.items[0].assignee, 'Анна');
  assert.equal(assigned.items[0].kind, 'review');
  assert.equal(assigned.resolved.includes('a1'), false);
  assert.equal(assigned.history[0].entityId, 'a1');
});

test('task completion can be undone without erasing its original date', () => {
  const state = createWorkspace({ tasks: [{ id: 't1', title: 'Подборка', context: '', state: 'Запланировано', time: '14:00', dueAt: '2026-10-27T14:00', done: false }] });
  const done = reduceWorkspace(state, { type: 'toggleTask', taskId: 't1' }, now);
  assert.equal(done.tasks[0].done, true);
  assert.equal(done.tasks[0].dueAt, '2026-10-27T14:00');
  assert.equal(reduceWorkspace(done, { type: 'toggleTask', taskId: 't1' }, now).tasks[0].done, false);
});

test('workspace day uses Tashkent at the UTC date boundary', () => {
  assert.equal(workspaceDate(now), '2026-10-27');
  assert.equal(taskDay({ done: false, dueAt: '2026-10-26T23:59' }, now), 'overdue');
  assert.equal(taskDay({ done: false, dueAt: '2026-10-27T11:30' }, now), 'today');
  assert.equal(taskDay({ done: false, dueAt: '2026-10-28T11:30' }, now), 'future');
  assert.equal(taskDay({ done: true, dueAt: '2026-10-26T11:30' }, now), 'done');
});

test('rescheduling an existing task updates its date without duplicating or losing its client', () => {
  const state = createWorkspace({ tasks: [{ id: 't1', title: 'Контакт', context: 'Азиз', clientId: 'c1', state: 'Запланировано', done: false, time: '14:00', dueAt: '2026-10-27T14:00' }] });
  const next = reduceWorkspace(state, { type: 'rescheduleTask', taskId: 't1', dueAt: '2026-10-29T12:00' }, now);
  assert.equal(next.tasks.length, 1);
  assert.equal(next.tasks[0].clientId, 'c1');
  assert.equal(next.tasks[0].dueAt, '2026-10-29T12:00');
  assert.equal(next.tasks[0].time, '12:00');
  assert.equal(next.history[0].clientId, 'c1');
});

test('a completed task cannot be silently reopened by rescheduling', () => {
  const state = createWorkspace({ tasks: [{ id: 't1', title: 'Контакт', context: '', state: 'Выполнено вами', done: true, time: '14:00', dueAt: '2026-10-27T14:00' }] });
  assert.deepEqual(reduceWorkspace(state, { type: 'rescheduleTask', taskId: 't1', dueAt: '2026-10-29T12:00' }, now), state);
});

test('a follow-up to a team inquiry stays in the team scope', () => {
  const state = createWorkspace({ items: [{ ...item, scope: 'team' }] });
  const next = reduceWorkspace(state, { type: 'outcome', itemId: 'a1', outcome: 'Не ответил', note: '', followUp: { id: 'f1', dueAt: '2026-10-28T12:00' } }, now);
  assert.equal(next.tasks[0].scope, 'team');
  assert.equal(next.history[0].scope, 'team');
});
