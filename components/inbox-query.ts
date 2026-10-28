import type { Item } from './today-data';
import { inboxItems, matchesInboxQuery, needsAssignee } from './today-state.ts';
export type InboxFilter = 'all' | 'reply' | 'missed' | 'unassigned' | 'review';
export function matchesInboxFilter(item: Item, filter: InboxFilter) {
 return filter === 'all' || (filter === 'reply' ? item.kind === 'message' : filter === 'missed' ? item.kind === 'call' : filter === 'review' ? item.kind === 'review' : needsAssignee(item));
}
export function queryInbox(items: Item[], view: {query:string;filter:InboxFilter;source:string;sort:string;privateMode:boolean}, restricted = false) {
 if (restricted) return [];
 return inboxItems(items).filter(item => matchesInboxFilter(item,view.filter) && (view.source === 'all' || (item.channel ?? 'manual') === view.source) && matchesInboxQuery(item,view.query,view.privateMode)).sort((a,b) => {
  if (view.sort === 'newest' || view.sort === 'oldest') {
   const at = Date.parse(a.receivedAt ?? ''), bt = Date.parse(b.receivedAt ?? '');
   if (Number.isFinite(at) !== Number.isFinite(bt)) return Number.isFinite(at) ? -1 : 1;
   if (Number.isFinite(at) && at !== bt) return view.sort === 'newest' ? bt-at : at-bt;
  } else if (view.sort === 'name') { const name = a.context.localeCompare(b.context,'ru'); if(name) return name; }
  else if (a.rank !== b.rank) return a.rank-b.rank;
  return a.id.localeCompare(b.id);
 });
}
