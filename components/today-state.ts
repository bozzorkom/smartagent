import type { Item, Task } from './today-data';
import type { CallEvent, CallRecord, CallOutcome, CallStatus } from './caller-data';

export const callLabels: Record<CallStatus, string> = {
  incoming:'Входящий рабочий звонок', connecting:'Соединяем…', active:'Разговор идёт', ended:'Звонок завершён',
  missed:'Пропущенный звонок', answeredElsewhere:'На звонок ответил коллега', declined:'Звонок отклонён',
  canceled:'Звонящий завершил вызов', failed:'Не удалось установить соединение', unknown:'Результат звонка неизвестен',
};

export type Client = { id: string; name: string; request: string; scope: 'mine' | 'team'; phone?: string; archived?: boolean };
export type Activity = { id: string; entityId: string; at: string; title: string; outcome?: string; note?: string; clientId?: string; scope?: 'mine' | 'team' };
export type Workspace = { items: Item[]; tasks: Task[]; clients: Client[]; history: Activity[]; resolved: string[]; drafts: Record<string, string>; calls: CallRecord[] };
export type WorkspaceAction =
  | { type: 'callEvent'; event: CallEvent }
  | { type: 'callResult'; callId: string; operationId: string; expectedVersion: number; outcome: CallOutcome; note: string; callbackAttempt?: boolean; followUp?: { id: string; dueAt: string; title?: string } }
  | { type: 'callLink'; callId: string; clientId: string; expectedVersion: number }
  | { type: 'callCreateClient'; callId: string; clientId: string; name: string; request: string; expectedVersion: number }
  | { type: 'callNote'; callId: string; operationId: string; note: string }
  | { type: 'callAssign'; callId: string; assignee: string; expectedVersion: number }
  | { type: 'addClient'; id: string; name: string; request: string; itemId?: string }
  | { type: 'editClient'; clientId: string; name: string; request: string }
  | { type: 'clientNote'; clientId: string; note: string }
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
  return { items: seed.items ?? [], tasks: seed.tasks ?? [], clients: seed.clients ?? [], history: [], resolved: [], drafts: {}, calls: [] };
}

export function normalizePhone(value?: string) {
  if (!value || /[^\d+\s()-]/.test(value)) return undefined;
  let digits = value.replace(/\D/g,'');
  if (digits.length === 9 && !value.trim().startsWith('+')) digits = `998${digits}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : undefined;
}

export function callMatches(state: Workspace, call: Pick<CallRecord, 'phone' | 'scope'>) {
  const phone = normalizePhone(call.phone);
  return phone ? state.clients.filter(client => client.scope === call.scope && !client.archived && normalizePhone(client.phone) === phone) : [];
}

export function callNeedsAction(call: CallRecord) {
  return Boolean(call.identityReview) || (!call.result && !['incoming','connecting','active','answeredElsewhere'].includes(call.status));
}

function projectCall(state: Workspace, call: CallRecord): Workspace {
  const id = `call:${call.id}`;
  const client = call.contextAccess === 'ready' ? state.clients.find(value => value.id === call.clientId && value.scope === call.scope && !value.archived) : undefined;
  const status = call.status === 'missed' ? 'Пропущенный рабочий звонок' : call.status === 'answeredElsewhere' ? 'Ответил коллега' : 'Рабочий звонок';
  const item: Item = { id, callId: call.id, kind: call.status === 'missed' ? 'call' : 'review', scope: call.scope,
    type: status, title: call.identityReview ? 'Проверить связь с клиентом' : call.status === 'missed' ? 'Перезвонить' : 'Записать результат звонка',
    context: client?.name ?? (call.phone ? `Номер · •• ${call.phone.slice(-2)}` : 'Номер не определён'),
    source:'Демо-АТС', channel:'phone', time: new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Tashkent',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(call.startedAt)),
    note:status, cta:'Открыть звонок', reason:'Доступно событие демонстрационной телефонии. Результат обработки ещё не отмечен.',
    rank:call.status === 'missed' ? 1 : 2, due:Date.parse(call.startedAt), custom:true, clientId:call.clientId };
  const items = state.items.some(value => value.id === id) ? state.items.map(value => value.id === id ? item : value) : [...state.items,item];
  const resolved = state.resolved.filter(value => value !== id);
  if (!callNeedsAction(call)) resolved.push(id);
  return { ...state, items, resolved, calls:state.calls.some(value => value.id === call.id) ? state.calls.map(value => value.id === call.id ? call : value) : [...state.calls,call] };
}

export function clientHistory(state: Workspace, clientId: string): Activity[] {
  const client = state.clients.find(value => value.id === clientId);
  if (!client) return [];
  const linked = new Set([...state.items, ...state.tasks].filter(value => value.clientId === clientId).map(value => value.id));
  const seen = new Set<string>();
  return state.history.filter(entry => {
    if ((entry.scope ?? 'mine') !== client.scope || seen.has(entry.id)) return false;
    if (entry.clientId !== clientId && (entry.clientId || !linked.has(entry.entityId))) return false;
    seen.add(entry.id);
    return true;
  });
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
  return day < today || (day === today && task.dueAt < localDateTime(now)) ? 'overdue' : day > today ? 'future' : 'today';
}

export function taskSummaryCounts(tasks: Pick<Task, 'done' | 'dueAt'>[], now = new Date().toISOString()) {
  return tasks.reduce((counts, task) => {
    const day = taskDay(task, now);
    if (day === 'today') counts.today += 1;
    if (day === 'overdue') counts.overdue += 1;
    return counts;
  }, { today: 0, overdue: 0 });
}

export function teamOverdueCount(items: Pick<Item, 'kind'>[], tasks: Pick<Task, 'done' | 'dueAt'>[], now = new Date().toISOString()) {
  return items.filter(item => item.kind === 'teamOverdue').length + taskSummaryCounts(tasks, now).overdue;
}

export function inboxItems(items: Item[]) {
  return items.filter(item => ['call', 'message', 'review', 'unassigned'].includes(item.kind));
}

export type PrimaryAttention = { source: 'item'; value: Item } | { source: 'task'; value: Task } | null;

export function primaryAttention(items: Item[], tasks: Task[], now = new Date().toISOString()): PrimaryAttention {
  const item = [...items].sort((a, b) => a.rank - b.rank || a.due - b.due || a.id.localeCompare(b.id))[0];
  const task = tasks
    .filter(value => ['overdue', 'today'].includes(taskDay(value, now)))
    .sort((a, b) => a.dueAt!.localeCompare(b.dueAt!) || a.id.localeCompare(b.id))[0];
  if (!task) return item ? { source: 'item', value: item } : null;
  if (!item) return { source: 'task', value: task };
  const taskRank = taskDay(task, now) === 'overdue' ? 0 : 3;
  const start = new Date(`${workspaceDate(now)}T00:00:00+05:00`).getTime();
  const taskDue = (new Date(`${task.dueAt}:00+05:00`).getTime() - start) / 60000;
  const taskFirst = taskRank < item.rank || (taskRank === item.rank && (taskDue < item.due || (taskDue === item.due && task.id.localeCompare(item.id) < 0)));
  return taskFirst ? { source: 'task', value: task } : { source: 'item', value: item };
}

export function teamMetricDestination(metric: 'unassigned' | 'overdue'): 'assign' | 'plan' {
  return metric === 'unassigned' ? 'assign' : 'plan';
}

export function reduceWorkspace(state: Workspace, action: WorkspaceAction, now = new Date().toISOString()): Workspace {
  const record = (entityId: string, title: string, detail: Partial<Activity> = {}) =>
    [{ id: `${now}-${state.history.length}`, entityId, at: now, title, scope: state.items.find(item => item.id === entityId)?.scope ?? state.tasks.find(task => task.id === entityId)?.scope ?? 'mine', ...detail }, ...state.history];
  const item = 'itemId' in action ? state.items.find(item => item.id === action.itemId) : undefined;
  const open = item && !state.resolved.includes(item.id);

  switch (action.type) {
    case 'callEvent': {
      const event = action.event;
      if (!event.provider.trim() || !event.externalId.trim() || !Object.keys(callLabels).includes(event.status) || !Number.isInteger(event.sequence) || event.sequence < 1 || !Number.isFinite(Date.parse(event.startedAt)) || !Number.isFinite(Date.parse(event.receivedAt))) return state;
      const id = `${encodeURIComponent(event.provider)}/${encodeURIComponent(event.externalId)}`;
      const previous = state.calls.find(value => value.id === id);
      if (previous?.status==='answeredElsewhere'&&event.status==='missed') return state;
      if (previous && (event.sequence <= previous.sequence || (previous.scope !== event.scope) || (!['incoming','connecting','active','unknown'].includes(previous.status) && ['incoming','connecting','active'].includes(event.status)))) return state;
      const matches = callMatches(state,event);
      const permittedMatch = event.contextAccess === 'ready' && matches.length === 1 ? matches[0].id : undefined;
      const identityReview = Boolean(previous?.identityReview || (previous?.clientId && previous.phone !== normalizePhone(event.phone)));
      const call: CallRecord = { ...event, id, phone:normalizePhone(event.phone), durationSeconds:event.durationSeconds !== undefined && event.durationSeconds >= 0 && Number.isFinite(event.durationSeconds) ? event.durationSeconds : undefined,
        identityReview, businessVersion:previous?.businessVersion ?? 0, result:previous?.result, assignee:previous?.assignee, clientId:identityReview?undefined:previous?.clientId ?? permittedMatch, linkSource:identityReview?undefined:previous?.linkSource ?? (permittedMatch ? 'crm' : undefined) };
      const next = projectCall(state,call);
      return { ...next, history:[{id:`call-event:${id}:${event.sequence}`,entityId:`call:${id}`,at:event.receivedAt,title:`Демо-АТС · ${callLabels[event.status]}`,clientId:call.clientId,scope:call.scope},...state.history] };
    }
    case 'callResult': {
      const call = state.calls.find(value => value.id === action.callId);
      if (!call || call.result || call.identityReview || call.businessVersion !== action.expectedVersion || !action.operationId.trim() || ['incoming','connecting','active','answeredElsewhere'].includes(call.status) || call.contextAccess === 'restricted') return state;
      if (!['Связались','Не ответил','Перезвонить позже','Не требует ответа','Не относится к работе','Другое'].includes(action.outcome) || action.note.length > 2000) return state;
      if (call.status === 'missed' && action.outcome === 'Связались' && !action.callbackAttempt) return state;
      if (action.outcome === 'Не требует ответа' && !action.note.trim()) return state;
      if (action.outcome === 'Перезвонить позже' && !action.followUp) return state;
      if (action.followUp && (!validDueAt(action.followUp.dueAt) || action.followUp.dueAt <= localDateTime(now) || state.tasks.some(value => value.id === action.followUp!.id))) return state;
      const next = projectCall(state,{...call,businessVersion:call.businessVersion+1,result:{operationId:action.operationId,outcome:action.outcome,note:action.note.trim(),savedAt:now,source:'user',callbackAttempt:Boolean(action.callbackAttempt)}});
      const tasks: Task[] = action.followUp ? [{id:action.followUp.id,callId:call.id,title:action.followUp.title?.trim() || 'Повторный контакт',dueAt:action.followUp.dueAt,time:action.followUp.dueAt.slice(11),clientId:call.clientId,scope:call.scope,context:state.clients.find(value=>value.id===call.clientId)?.name ?? 'По рабочему звонку',state:'Создано вами после звонка',done:false,custom:true}] : [];
      const history: Activity[] = [{id:`call-result:${action.operationId}`,entityId:`call:${call.id}`,at:now,title:'Результат звонка отмечен вами',outcome:action.outcome,note:action.note.trim(),clientId:call.clientId,scope:call.scope}];
      if (tasks[0]) history.unshift({id:`call-follow:${action.operationId}`,entityId:tasks[0].id,at:now,title:'Задача по звонку создана',clientId:call.clientId,scope:call.scope,note:tasks[0].dueAt?.replace('T',', ')});
      return {...next,tasks:[...state.tasks,...tasks],history:[...history,...state.history]};
    }
    case 'callLink': {
      const call = state.calls.find(value=>value.id===action.callId), client = state.clients.find(value=>value.id===action.clientId);
      if (!call || !client || client.archived || call.scope!==client.scope || call.businessVersion!==action.expectedVersion || call.clientId===client.id || call.contextAccess==='restricted') return state;
      const next=projectCall(state,{...call,clientId:client.id,linkSource:'user',identityReview:false,businessVersion:call.businessVersion+1});
      return {...next,tasks:state.tasks.map(task=>task.callId===call.id?{...task,clientId:client.id}:task),history:[{id:`call-link:${call.id}:${call.businessVersion}`,entityId:`call:${call.id}`,at:now,title:'Звонок связан с клиентом вами',clientId:client.id,scope:call.scope},...state.history]};
    }
    case 'callCreateClient': {
      const call = state.calls.find(value=>value.id===action.callId);
      if (!call || call.clientId || call.contextAccess==='restricted' || call.businessVersion!==action.expectedVersion || action.name.trim().length>120 || action.request.trim().length>2000 || state.clients.some(value=>value.id===action.clientId) || (call.phone&&state.clients.some(value=>value.scope===call.scope&&normalizePhone(value.phone)===call.phone))) return state;
      const client: Client = {id:action.clientId,name:action.name.trim() || `Контакт · ${call.phone ? `•• ${call.phone.slice(-2)}` : 'без номера'}`,request:action.request.trim(),scope:call.scope,phone:call.phone};
      const next=reduceWorkspace({...state,clients:[...state.clients,client]},{type:'callLink',callId:call.id,clientId:client.id,expectedVersion:call.businessVersion},now);
      return {...next,history:[{id:`call-client:${call.id}:${client.id}`,entityId:client.id,at:now,title:'Клиент создан вами из рабочего звонка',clientId:client.id,scope:call.scope},...next.history]};
    }
    case 'callNote': {
      const call=state.calls.find(value=>value.id===action.callId), note=action.note.trim(), id=`call-note:${action.operationId}`;
      if (!call || call.contextAccess==='restricted' || !note || note.length>2000 || !action.operationId.trim() || state.history.some(entry=>entry.id===id)) return state;
      return {...state,history:[{id,entityId:`call:${call.id}`,at:now,title:'Заметка о звонке добавлена вами',clientId:call.clientId,scope:call.scope,note},...state.history]};
    }
    case 'callAssign': {
      const call=state.calls.find(value=>value.id===action.callId), assignee=action.assignee.trim();
      if (!call || call.scope!=='team' || call.contextAccess==='restricted' || call.businessVersion!==action.expectedVersion || !assignee || assignee===call.assignee) return state;
      return {...state,calls:state.calls.map(value=>value.id===call.id?{...value,assignee,businessVersion:call.businessVersion+1}:value),history:[{id:`call-assign:${call.id}:${call.businessVersion}`,entityId:`call:${call.id}`,at:now,title:`Ответственный по звонку: ${assignee}`,clientId:call.clientId,scope:call.scope},...state.history]};
    }
    case 'addClient': {
      const name = action.name.trim();
      if (!name || state.clients.some(client => client.id === action.id)) return state;
      return { ...state, clients: [...state.clients, { id: action.id, name, request: action.request.trim(), scope: item?.scope ?? 'mine' }],
        items: state.items.map(item => item.id === action.itemId ? { ...item, clientId: action.id } : item),
        history: record(action.id, 'Клиент добавлен', { clientId: action.id, scope: item?.scope ?? 'mine' }) };
    }
    case 'editClient': {
      const client = state.clients.find(value => value.id === action.clientId);
      const name = action.name.trim(), request = action.request.trim();
      if (!client || !name || name.length > 120 || request.length > 2000 || (name === client.name && request === client.request)) return state;
      return { ...state, clients: state.clients.map(value => value.id === client.id ? { ...value, name, request } : value), history: record(client.id, 'Данные клиента обновлены', { clientId: client.id, scope: client.scope }) };
    }
    case 'clientNote': {
      const client = state.clients.find(value => value.id === action.clientId), note = action.note.trim();
      if (!client || !note || note.length > 2000) return state;
      return { ...state, history: record(client.id, 'Заметка добавлена вами', { clientId: client.id, scope: client.scope, note }) };
    }
    case 'receive':
      if (state.items.some(value => value.id === action.item.id)) return state;
      return { ...state, items: [...state.items, action.item], history: record(action.item.id, 'Получено демо-событие', { clientId: action.item.clientId, scope: action.item.scope }) };
    case 'addLead':
      if (!action.item.context.trim() || state.items.some(item => item.id === action.item.id)) return state;
      return { ...state, items: [...state.items, action.item], history: record(action.item.id, 'Обращение добавлено вручную', { clientId: action.item.clientId, scope: action.item.scope }) };
    case 'addTask':
      if (!action.task.title.trim() || !validDueAt(action.task.dueAt ?? '') || state.tasks.some(task => task.id === action.task.id)) return state;
      return { ...state, tasks: [...state.tasks, action.task], history: record(action.task.id, 'Задача создана', { clientId: action.task.clientId, scope: action.task.scope ?? 'mine' }) };
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
