import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, reduceWorkspace, taskDay, workspaceDate } from '../components/today-state.ts';
import * as workspaceModel from '../components/today-state.ts';

const now = '2026-10-26T19:30:00.000Z'; // 27 October, 00:30 in Tashkent.
const item = { id: 'a1', kind: 'overdue', scope: 'mine', title: 'Позвонить', context: 'Клиент №128', source: 'Вручную', type: 'Контакт', time: 'Вчера', note: '', cta: 'Открыть', reason: '', due: 0, rank: 0, clientId: 'c1' };
const seed = () => createWorkspace({ items: [item], clients: [{ id: 'c1', name: 'Азиз', request: 'Аренда', scope: 'mine' }] });

test('team attention metrics open the matching work list', () => {
  assert.equal(typeof workspaceModel.teamMetricDestination, 'function');
  assert.equal(workspaceModel.teamMetricDestination('unassigned'), 'assign');
  assert.equal(workspaceModel.teamMetricDestination('overdue'), 'plan');
});

test('a client linked after an inquiry sees its original history exactly once', () => {
  const inquiry = { ...item, id: 'lead', clientId: undefined };
  const created = reduceWorkspace(createWorkspace(), { type: 'addLead', item: inquiry }, now);
  const linked = reduceWorkspace(created, { type: 'addClient', id: 'new-client', name: 'Мадина', request: '', itemId: 'lead' }, '2026-10-26T19:31:00.000Z');
  assert.equal(typeof workspaceModel.clientHistory, 'function');
  const history = workspaceModel.clientHistory(linked, 'new-client');
  assert.deepEqual(history.map(entry => entry.title), ['Клиент добавлен', 'Обращение добавлено вручную']);
  assert.equal(new Set(history.map(entry => entry.id)).size, 2);
  assert.equal(created.history[0].clientId, undefined);
});

test('client history never infers a link across scopes or an explicit different client', () => {
  const state = seed();
  state.history = [
    { id: 'own', entityId: 'a1', at: now, title: 'Связано', scope: 'mine' },
    { id: 'team', entityId: 'a1', at: now, title: 'Команда', scope: 'team' },
    { id: 'other', entityId: 'a1', clientId: 'different', at: now, title: 'Другой клиент', scope: 'mine' },
  ];
  assert.equal(typeof workspaceModel.clientHistory, 'function');
  assert.deepEqual(workspaceModel.clientHistory(state, 'c1').map(entry => entry.id), ['own']);
  assert.deepEqual(workspaceModel.clientHistory(state, 'missing'), []);
});

test('client edits preserve identity and record client history', () => {
  const state = seed();
  const next = reduceWorkspace(state, { type: 'editClient', clientId: 'c1', name: ' Азиз Алиев ', request: ' Покупка ' }, now);
  assert.equal(next.clients[0].name, 'Азиз Алиев');
  assert.equal(next.items[0].clientId, 'c1');
  assert.equal(next.history[0].clientId, 'c1');
  assert.equal(reduceWorkspace(next, { type: 'editClient', clientId: 'c1', name: ' ', request: '' }, now), next);
});

test('team inquiry and task creation stay out of the personal activity journal', () => {
  const initial = createWorkspace({ clients: [{ id: 'team-client', name: 'Командный клиент', request: '', scope: 'team' }] });
  const lead = reduceWorkspace(initial, { type: 'addLead', item: { ...item, id: 'team-lead', scope: 'team', clientId: 'team-client' } }, now);
  const state = reduceWorkspace(lead, { type: 'addTask', task: { id: 'team-task', title: 'Контакт', context: '', state: 'Создано', done: false, time: '14:00', dueAt: '2026-10-27T14:00', scope: 'team', clientId: 'team-client' } }, '2026-10-26T19:32:00.000Z');
  assert.deepEqual(state.history.map(entry => entry.scope), ['team', 'team']);
  assert.equal(state.history.filter(entry => (entry.scope ?? 'mine') === 'mine').length, 0);
  assert.equal(workspaceModel.clientHistory(state, 'team-client').length, 2);
});

test('client notes reject blank or unknown clients and retain scope', () => {
  const state = seed();
  assert.equal(reduceWorkspace(state, { type: 'clientNote', clientId: 'missing', note: 'Текст' }, now), state);
  assert.equal(reduceWorkspace(state, { type: 'clientNote', clientId: 'c1', note: ' ' }, now), state);
  const next = reduceWorkspace(state, { type: 'clientNote', clientId: 'c1', note: ' Позвонить завтра ' }, now);
  assert.equal(next.history[0].note, 'Позвонить завтра');
  assert.equal(next.history[0].clientId, 'c1');
});

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

test('a task whose time has passed today is overdue in Tashkent', () => {
  assert.equal(taskDay({ done: false, dueAt: '2026-10-27T11:29' }, '2026-10-27T06:30:00.000Z'), 'overdue');
});

test('an overdue dated task can become the primary attention action', () => {
  assert.equal(typeof workspaceModel.primaryAttention, 'function');
  if (typeof workspaceModel.primaryAttention !== 'function') return;
  const task = { id: 't1', title: 'Ранний контакт', context: '', state: 'Запланировано', time: '00:10', dueAt: '2026-10-27T00:10', done: false };
  const primary = workspaceModel.primaryAttention([{ ...item, id: 'later', due: 570 }], [task], now);
  assert.equal(primary?.source, 'task');
  assert.equal(primary?.value.id, 't1');
});

test('the next dated task today becomes primary when the inquiry queue is empty', () => {
  const task = { id: 't2', title: 'Ближайшая задача', context: '', state: 'Запланировано', time: '11:30', dueAt: '2026-10-27T11:30', done: false };
  const primary = workspaceModel.primaryAttention([], [task], now);
  assert.equal(primary?.source, 'task');
  assert.equal(primary?.value.id, 't2');
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
