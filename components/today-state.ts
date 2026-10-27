import type { Item, Task } from './today-data';

export type Client = { id: string; name: string; request: string; scope: 'mine' | 'team' };
export type Activity = { id: string; entityId: string; at: string; title: string; outcome?: string; note?: string; clientId?: string; scope?: 'mine' | 'team' };
export type Workspace = { items: Item[]; tasks: Task[]; clients: Client[]; history: Activity[]; resolved: string[]; drafts: Record<string, string> };
export type WorkspaceAction =
  | { type: 'addClient'; id: string; name: string; request: string; itemId?: string }
  | { type: 'addLead'; item: Item }
  | { type: 'receive'; item: Item }
  | { type: 'addTask'; task: Task }
  | { type: 'outcome'; itemId: string; outcome: string; note: string; followUp?: { id: string; dueAt: string } }
  | { type: 'reschedule'; itemId: string; taskId: string; dueAt: string }
  | { type: 'dismiss'; itemId: string }
  | { type: 'assign'; assignments: Record<string, string> }
  | { type: 'toggleTask'; taskId: string }
  | { type: 'rescheduleTask'; taskId: string; dueAt: string }
  | { type: 'draft'; itemId: string; value: string };

export function createWorkspace(seed: Partial<Pick<Workspace, 'items' | 'tasks' | 'clients'>> = {}): Workspace {
  return { items: seed.items ?? [], tasks: seed.tasks ?? [], clients: seed.clients ?? [], history: [], resolved: [], drafts: {} };
}

export function workspaceDate(now = new Date().toISOString()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}

export function localDateTime(now = new Date().toISOString()) {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(now));
  return `${workspaceDate(now)}T${time}`;
}

export function validDueAt(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value)) return false;
  const parsed = new Date(`${value}:00+05:00`);
  return !Number.isNaN(parsed.getTime()) && localDateTime(parsed.toISOString()) === value;
}

export function taskDay(task: Pick<Task, 'done' | 'dueAt'>, now = new Date().toISOString()) {
  if (task.done) return 'done';
  if (!task.dueAt || !validDueAt(task.dueAt)) return 'undated';
  const day = task.dueAt.slice(0, 10), today = workspaceDate(now);
  return day < today ? 'overdue' : day > today ? 'future' : 'today';
}

export function reduceWorkspace(state: Workspace, action: WorkspaceAction, now = new Date().toISOString()): Workspace {
  const record = (entityId: string, title: string, detail: Partial<Activity> = {}) =>
    [{ id: `${now}-${state.history.length}`, entityId, at: now, title, scope: state.items.find(item => item.id === entityId)?.scope ?? state.tasks.find(task => task.id === entityId)?.scope ?? 'mine', ...detail }, ...state.history];
  const item = 'itemId' in action ? state.items.find(item => item.id === action.itemId) : undefined;
  const open = item && !state.resolved.includes(item.id);

  switch (action.type) {
    case 'addClient': {
      const name = action.name.trim();
      if (!name || state.clients.some(client => client.id === action.id)) return state;
      return { ...state, clients: [...state.clients, { id: action.id, name, request: action.request.trim(), scope: item?.scope ?? 'mine' }],
        items: state.items.map(item => item.id === action.itemId ? { ...item, clientId: action.id } : item),
        history: record(action.id, 'Клиент добавлен', { clientId: action.id, scope: item?.scope ?? 'mine' }) };
    }
    case 'receive':
      if (state.items.some(value => value.id === action.item.id)) return state;
      return { ...state, items: [...state.items, action.item], history: record(action.item.id, 'Получено демо-событие', { clientId: action.item.clientId, scope: action.item.scope }) };
    case 'addLead':
      if (!action.item.context.trim() || state.items.some(item => item.id === action.item.id)) return state;
      return { ...state, items: [...state.items, action.item], history: record(action.item.id, 'Обращение добавлено вручную', { clientId: action.item.clientId }) };
    case 'addTask':
      if (!action.task.title.trim() || !validDueAt(action.task.dueAt ?? '') || state.tasks.some(task => task.id === action.task.id)) return state;
      return { ...state, tasks: [...state.tasks, action.task], history: record(action.task.id, 'Задача создана', { clientId: action.task.clientId }) };
    case 'outcome': {
      if (!open || !action.outcome.trim()) return state;
      if (action.followUp && (!validDueAt(action.followUp.dueAt) || action.followUp.dueAt <= localDateTime(now))) return state;
      const followUp: Task[] = action.followUp ? [{ id: action.followUp.id, title: 'Повторный контакт', time: action.followUp.dueAt.slice(11), dueAt: action.followUp.dueAt,
        context: item.context, clientId: item.clientId, scope: item.scope, state: 'Создано из результата', done: false, custom: true }] : [];
      return { ...state, resolved: [...state.resolved, item.id], tasks: [...state.tasks, ...followUp],
        history: record(item.id, 'Результат отмечен вами', { clientId: item.clientId, outcome: action.outcome, note: action.note.trim() }) };
    }
    case 'reschedule': {
      if (!open || !validDueAt(action.dueAt) || action.dueAt <= localDateTime(now)) return state;
      const task: Task = { id: action.taskId, title: item.title, context: item.context, clientId: item.clientId, scope: item.scope, dueAt: action.dueAt, time: action.dueAt.slice(11), state: 'Срок перенесён вами', done: false, custom: true };
      return { ...state, resolved: [...state.resolved, item.id], tasks: [...state.tasks, task],
        history: record(item.id, 'Срок перенесён', { clientId: item.clientId, note: action.dueAt.replace('T', ', ') }) };
    }
    case 'dismiss':
      if (!open) return state;
      return { ...state, resolved: [...state.resolved, item.id], history: record(item.id, 'Отмечено вами как неактуальное', { clientId: item.clientId }) };
    case 'assign': {
      const changed = state.items.filter(item => item.scope === 'team' && item.kind === 'unassigned' && action.assignments[item.id]?.trim());
      if (!changed.length) return state;
      return { ...state, items: state.items.map(item => changed.includes(item) ? { ...item, kind: 'review', type: 'Назначено сотруднику', assignee: action.assignments[item.id], cta: 'Открыть обращение', note: `Ответственный: ${action.assignments[item.id]}`, reason: `Обращение назначено сотруднику ${action.assignments[item.id]}. Проверьте результат обработки.` } : item),
        history: [...changed.map((item, i) => ({ id: `${now}-assign-${state.history.length + i}`, entityId: item.id, at: now, scope: 'team' as const, title: `Назначен сотрудник: ${action.assignments[item.id]}` })), ...state.history] };
    }
    case 'toggleTask': {
      const task = state.tasks.find(task => task.id === action.taskId);
      if (!task) return state;
      return { ...state, tasks: state.tasks.map(value => value.id === task.id ? { ...value, done: !task.done, completedAt: task.done ? undefined : now, state: task.done ? 'Запланировано' : 'Выполнено вами' } : value),
        history: record(task.id, task.done ? 'Задача возвращена в план' : 'Задача отмечена выполненной', { clientId: task.clientId }) };
    }
    case 'rescheduleTask': {
      const task = state.tasks.find(task => task.id === action.taskId);
      if (!task || task.done || !validDueAt(action.dueAt) || action.dueAt <= localDateTime(now)) return state;
      return { ...state, tasks: state.tasks.map(value => value.id === task.id ? { ...value, dueAt: action.dueAt, time: action.dueAt.slice(11), state: 'Срок перенесён вами' } : value),
        history: record(task.id, 'Срок задачи перенесён', { clientId: task.clientId, note: action.dueAt.replace('T', ', ') }) };
    }
    case 'draft':
      return { ...state, drafts: { ...state.drafts, [action.itemId]: action.value } };
  }
}
