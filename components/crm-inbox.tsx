'use client';

import { useState } from 'react';
import { Search, PhoneMissed, MessageSquare, ChevronRight, X } from 'lucide-react';
import { channelNames, type Item } from './today-data';
import './crm-inbox.css';

type Filter = 'all' | 'reply' | 'missed' | 'unassigned';
export function CrmInbox({ items, initialFilter, incomplete, phoneConnected, restricted, team, onOpen, onChannels, onAdd }: { items: Item[]; initialFilter: 'reply' | 'missed' | null; incomplete: boolean; phoneConnected: boolean; restricted: boolean; team: boolean; onOpen: (item: Item) => void; onChannels: () => void; onAdd: () => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(initialFilter ?? 'all');
  const [source, setSource] = useState('all');
  const [sort, setSort] = useState('priority');
  const [privateMode, setPrivateMode] = useState(false);
  const records = restricted ? [] : items.filter(item => item.channel || item.custom);
  const count = (kind: Filter) => records.filter(item => kind === 'all' || (kind === 'reply' ? item.kind === 'message' : kind === 'missed' ? item.kind === 'call' : item.kind === 'unassigned' && !item.assignee)).length;
  const normalize = (text: string) => text.toLocaleLowerCase().normalize('NFKC').trim();
  const shown = records.filter(item => {
    const text = normalize([item.id, item.context, item.source, privateMode ? '' : item.note].join(' '));
    const needle = normalize(query);
    const digits = needle.replace(/\D/g, '');
    const search = !needle || text.includes(needle) || (/^[+\d\s()-]+$/.test(needle) && digits.length >= 3 && text.replace(/\D/g, '').includes(digits));
    return search && (source === 'all' || (item.channel ?? 'manual') === source) && (filter === 'all' || (filter === 'reply' ? item.kind === 'message' : filter === 'missed' ? item.kind === 'call' : item.kind === 'unassigned' && !item.assignee));
  }).sort((a, b) => sort === 'priority' ? a.rank - b.rank || a.id.localeCompare(b.id) : a.context.localeCompare(b.context, 'ru') || a.id.localeCompare(b.id));
  function reset() { setFilter('all'); setSource('all'); setQuery(''); }
  return <section className="crm-inbox">
    <header><p className="crm-eyebrow">LEAD SHIELD · ДЕМО</p><h2 id="today-sheet-title">Входящие</h2><p className="today-muted">Звонки, сообщения и рабочие обращения</p><span className="crm-context">{team ? 'Команда' : 'Мои обращения'}</span></header>
    {restricted ? <div role="alert" className="today-note"><strong>Доступ отозван</strong><p>Содержимое и поиск недоступны. Обратитесь к администратору или восстановите демо-доступ в Today.</p></div> : <>
      <button className="crm-source" onClick={onChannels}><span><strong>{incomplete ? 'Данные могут быть неполными' : 'Рабочие источники'}</strong><small>Демо-сеанс · проверить подключения</small></span><ChevronRight size={18}/></button>
      <p className="crm-caption">Общая сводка · не зависит от поиска. Категории пересекаются.</p>
      <div className="crm-metrics">{([['reply', 'Без ответа'], ['missed', 'Пропущенные'], [team ? 'unassigned' : 'all', team ? 'Без ответственного' : 'Открытые']] as [Filter, string][]).map(([key, label]) => <button key={key} onClick={() => { setQuery(''); setSource('all'); setFilter(key); }}><strong>{key === 'missed' && !phoneConnected ? '—' : count(key)}</strong><span>{label}</span>{key === 'missed' && !phoneConnected && <small>Нет данных канала</small>}</button>)}</div>
      <div className="crm-search"><Search size={18}/><input aria-label="Поиск обращений" placeholder="Имя, телефон или сообщение" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button aria-label="Очистить поиск" onClick={() => setQuery('')}><X size={18}/></button>}</div>
      <div className="crm-chips" aria-label="Быстрые фильтры">{([['all', 'Все'], ['reply', 'Без ответа'], ['missed', 'Пропущенные'], ...(team ? [['unassigned', 'Без ответственного']] : [])] as [Filter, string][]).map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
      <div className="crm-controls"><label>Источник<select value={source} onChange={event => setSource(event.target.value)}><option value="all">Все источники</option>{Object.entries(channelNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}<option value="manual">Вручную</option></select></label><label>Сортировка<select value={sort} onChange={event => setSort(event.target.value)}><option value="priority">Сначала важные</option><option value="name">По имени</option></select></label></div>
      <label className="crm-private"><input type="checkbox" checked={privateMode} onChange={event => setPrivateMode(event.target.checked)}/>Скрыть содержимое сообщений</label>
      <div className="today-row"><h3>Обращения <span className="today-muted">{shown.length}</span></h3>{(query || filter !== 'all' || source !== 'all') && <button className="today-link" onClick={reset}>Сбросить</button>}</div>
      <p className="crm-caption">Важность — по правилам Today. Группировка диалогов и сортировка по времени появятся на следующем этапе.</p>
      <ul className="crm-list">{shown.map(item => <li key={item.id}><button className="crm-record" onClick={() => onOpen(item)}><span className="crm-icon">{item.kind === 'call' ? <PhoneMissed size={20}/> : <MessageSquare size={20}/>}</span><span className="crm-body"><strong>{item.context.split(' · ')[0] || item.title}</strong><span className="crm-preview">{privateMode ? 'Содержимое скрыто настройками приватности' : item.note || item.title}</span><small>{item.channel ? channelNames[item.channel] : 'Вручную'} · {item.time}</small><span className="crm-status">{item.kind === 'review' ? 'Требует проверки' : item.kind === 'call' ? 'Требует обратного звонка' : item.kind === 'message' ? 'Требует ответа' : item.status || 'В работе'}{item.assignee ? ` · ${item.assignee}` : ''}</span></span><ChevronRight size={16}/></button></li>)}</ul>
      {!shown.length && <div className="crm-empty"><MessageSquare size={28}/><h3>{records.length ? 'Ничего не найдено' : 'Пока нет обращений'}</h3><p>Проверьте фильтры, подключите источник или добавьте обращение вручную.</p><button className="today-secondary" onClick={reset}>Сбросить фильтры</button></div>}
      <button className="today-primary" onClick={onAdd}>Добавить обращение</button><p className="crm-caption">Данные до перезагрузки. Реальные сообщения и звонки не отправляются.</p>
    </>}
  </section>;
}
