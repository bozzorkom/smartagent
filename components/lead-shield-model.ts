import type { Item, Task } from './today-data';

export type ShieldChip = 'all' | 'calls' | 'messages' | 'review' | 'scheduled';
export type ShieldStatus = 'all' | 'reply' | 'review' | 'overdue';
export type ShieldView = { chip: ShieldChip; source: string; status: ShieldStatus; assignee: string; period: string; sort: string };
export const defaultShieldView: ShieldView = { chip: 'all', source: 'all', status: 'all', assignee: 'all', period: 'all', sort: 'priority' };

export type ShieldGroup = { key: string; lead: Item; items: Item[]; priority: number; eventAt: number; repeated: boolean };

const shieldKinds = ['overdue', 'promise', 'call', 'message', 'review'];

export function eventAt(item: Item, now = Date.now()) {
  if (item.receivedAt && Number.isFinite(Date.parse(item.receivedAt))) return Date.parse(item.receivedAt);
  if (item.callId) return item.due;
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
  return midnight.getTime() + item.due * 60000;
}

function priorityOf(item: Item, size: number) {
  if (item.kind === 'overdue' || item.kind === 'promise') return 1;
  if (item.kind === 'call') return 2;
  if (item.kind === 'message') return 3;
  if (size > 1) return 4;
  return 5;
}

export function shieldGroups(items: Item[], now = Date.now()): ShieldGroup[] {
  const map = new Map<string, Item[]>();
  for (const item of items) {
    if (!shieldKinds.includes(item.kind)) continue;
    const key = item.kind === 'call' && !item.context.startsWith('Номер не определён') ? `call:${item.scope}:${item.context}` : item.id;
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.entries()].map(([key, values]) => {
    const sorted = [...values].sort((a, b) => eventAt(b, now) - eventAt(a, now));
    return { key, lead: sorted[0], items: sorted, priority: priorityOf(sorted[0], sorted.length), eventAt: eventAt(sorted[0], now), repeated: sorted.length > 1 };
  });
}

export function statusOf(group: ShieldGroup): Exclude<ShieldStatus, 'all'> {
  const kind = group.lead.kind;
  return kind === 'overdue' || kind === 'promise' ? 'overdue' : kind === 'review' ? 'review' : 'reply';
}

export function sourceOf(item: Item) {
  return item.channel ?? 'manual';
}

export function matchesChip(group: ShieldGroup, chip: ShieldChip) {
  const kind = group.lead.kind;
  return chip === 'all' || (chip === 'calls' && kind === 'call') || (chip === 'messages' && kind === 'message') || (chip === 'review' && kind === 'review');
}

export function queryShield(groups: ShieldGroup[], view: ShieldView, now = Date.now()) {
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const shown = groups.filter(group => matchesChip(group, view.chip)
    && (view.source === 'all' || sourceOf(group.lead) === view.source)
    && (view.status === 'all' || statusOf(group) === view.status)
    && (view.assignee === 'all' || (view.assignee === 'none' ? !group.lead.assignee : view.assignee === 'me' ? group.lead.scope === 'mine' : group.lead.assignee === view.assignee))
    && (view.period === 'all' || (view.period === 'today' ? group.eventAt >= dayStart.getTime() : group.eventAt >= dayStart.getTime() - 6 * 86400000)));
  const sorters: Record<string, (a: ShieldGroup, b: ShieldGroup) => number> = {
    priority: (a, b) => a.priority - b.priority || a.eventAt - b.eventAt,
    newest: (a, b) => b.eventAt - a.eventAt,
    oldest: (a, b) => a.eventAt - b.eventAt,
    due: (a, b) => (a.priority === 1 ? 0 : 1) - (b.priority === 1 ? 0 : 1) || a.eventAt - b.eventAt,
  };
  return shown.sort((a, b) => (sorters[view.sort] ?? sorters.priority)(a, b) || a.key.localeCompare(b.key));
}

export function shieldMetrics(groups: ShieldGroup[]) {
  return {
    reply: groups.filter(group => statusOf(group) !== 'review').length,
    missed: groups.filter(group => group.lead.kind === 'call').reduce((sum, group) => sum + group.items.length, 0),
    review: groups.filter(group => statusOf(group) === 'review').length,
  };
}

export function scheduledTasks(tasks: Task[]) {
  return tasks.filter(task => !task.done && task.dueAt && (task.clientId || task.callId || task.state === 'Создано из результата' || task.state === 'Срок перенесён вами'));
}

export function elapsedLabel(at: number, now = Date.now()) {
  const minutes = Math.round((now - at) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return '';
  if (minutes < 60) return `${Math.max(1, minutes)} мин назад`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} ч назад`;
  return '';
}
