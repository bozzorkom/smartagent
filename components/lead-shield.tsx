'use client';

import { useState } from 'react';
import { PhoneMissed, MessageSquare, SearchCheck, Clock3, ChevronRight, MoreHorizontal, SlidersHorizontal, CalendarClock, Repeat } from 'lucide-react';
import { channelNames, employees, plural, type Item, type Task } from './today-data';
import { queryShield, scheduledTasks, shieldGroups, shieldMetrics, elapsedLabel, defaultShieldView, type ShieldChip, type ShieldGroup, type ShieldView } from './lead-shield-model';
import './crm-inbox.css';
import './lead-shield.css';

export type ShieldHandlers = {
  onOpen: (item: Item, sheet: 'action' | 'reply' | 'result') => void;
  onClient: (item: Item) => void;
  onTask: (item: Item) => void;
  onResolve: (items: Item[], outcome: string) => void;
  onNeedsReply: (item: Item) => void;
  onHandoff: (items: Item[], assignee: string) => void;
  onChannels: () => void;
  onInbox: () => void;
  onHistory: () => void;
  onAdd: () => void;
  onOpenTask: (task: Task) => void;
};

const chips: [ShieldChip, string][] = [['all', 'Все'], ['calls', 'Звонки'], ['messages', 'Сообщения'], ['review', 'Проверить'], ['scheduled', 'Запланировано']];

export function LeadShield({ items, tasks, view, onViewChange, team, canHandoff, restricted, incomplete, connectedCount, phoneConnected, handlers }: { items: Item[]; tasks: Task[]; view: ShieldView; onViewChange: (change: Partial<ShieldView>) => void; team: boolean; canHandoff: boolean; restricted: boolean; incomplete: boolean; connectedCount: number; phoneConnected: boolean; handlers: ShieldHandlers }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const now = Date.now();
  const groups = restricted ? [] : shieldGroups(items, now);
  const metrics = shieldMetrics(groups);
  const shown = queryShield(groups, view, now);
  const planned = restricted ? [] : scheduledTasks(tasks);
  const filtered = view.source !== 'all' || view.status !== 'all' || view.assignee !== 'all' || view.period !== 'all';
  const channelLine = connectedCount === 0
    ? { title: 'Автоматические источники не подключены', text: 'Добавляйте обращения вручную или настройте рабочие каналы.', cta: 'Подключить' }
    : incomplete ? { title: 'Данные могут быть неполными', text: 'Часть рабочих каналов требует проверки.', cta: 'Проверить' }
    : { title: 'Подключённые каналы работают', text: 'Демо-сеанс · состояние источников вымышленное.', cta: 'Каналы' };

  return <section className="crm-inbox shield">
    <header>
      <p className="crm-eyebrow">LEAD SHIELD · ДЕМО</p>
      <h2 id="today-sheet-title">Не упустите обращения</h2>
      <p className="today-muted">Звонки и сообщения, которые требуют вашего внимания</p>
      <span className="crm-context">{team ? 'Команда' : 'Мои обращения'}</span>
    </header>
    {restricted ? <div role="alert" className="today-note"><strong>Доступ отозван</strong><p>Очередь и действия недоступны. Обратитесь к администратору или восстановите демо-доступ в Today.</p></div> : <>
      <button className="crm-source" onClick={handlers.onChannels}><span><strong>{channelLine.title}</strong><small>{channelLine.text}</small></span><span className="shield-cta">{channelLine.cta}<ChevronRight size={16}/></span></button>

      <div className="crm-metrics">
        <button onClick={() => onViewChange({ ...defaultShieldView, sort: view.sort, status: 'reply' })}><strong>{metrics.reply}</strong><span>Требуют ответа</span></button>
        <button onClick={() => onViewChange({ ...defaultShieldView, sort: view.sort, chip: 'calls' })}><strong>{phoneConnected ? metrics.missed : '—'}</strong><span>Пропущенных</span>{!phoneConnected && <small>Нет данных</small>}</button>
        <button onClick={() => onViewChange({ ...defaultShieldView, sort: view.sort, chip: 'review' })}><strong>{metrics.review}</strong><span>Нужно проверить</span></button>
      </div>
      <p className="crm-caption">Категории могут пересекаться. Пропущенные считаются по событиям, карточки — по рабочей цели.</p>

      <div className="crm-chips" aria-label="Быстрые фильтры">{chips.map(([key, label]) => <button key={key} aria-pressed={view.chip === key} onClick={() => onViewChange({ chip: key })}>{label}</button>)}</div>
      <div className="shield-toolbar">
        <button className="today-link" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={16}/>Фильтры{filtered ? ' · активны' : ''}</button>
        <label className="shield-sort"><span className="sr-only">Сортировка</span><select value={view.sort} onChange={event => onViewChange({ sort: event.target.value })}><option value="priority">Сначала важные</option><option value="newest">Сначала новые</option><option value="due">По сроку</option><option value="oldest">Сначала старые</option></select></label>
      </div>
      {filtersOpen && <div className="shield-filters" role="group" aria-label="Фильтры Lead Shield">
        <label>Источник<select value={view.source} onChange={event => onViewChange({ source: event.target.value })}><option value="all">Все</option>{Object.entries(channelNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}<option value="manual">Ручной учёт</option></select></label>
        <label>Статус<select value={view.status} onChange={event => onViewChange({ status: event.target.value as ShieldView['status'] })}><option value="all">Все</option><option value="reply">Требует ответа</option><option value="review">Требует проверки</option><option value="overdue">Просрочено по правилу</option></select></label>
        <label>Ответственный<select value={view.assignee} onChange={event => onViewChange({ assignee: event.target.value })}><option value="all">Все разрешённые</option><option value="me">Я</option>{team && <option value="none">Не назначен</option>}{team && employees.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
        <label>Период<select value={view.period} onChange={event => onViewChange({ period: event.target.value })}><option value="all">Весь доступный</option><option value="today">Сегодня</option><option value="week">Последние 7 дней</option></select></label>
        <div className="shield-filter-actions"><button className="today-secondary" onClick={() => onViewChange({ source: 'all', status: 'all', assignee: 'all', period: 'all' })}>Сбросить</button><button className="today-primary" onClick={() => setFiltersOpen(false)}>Показать обращения · {shown.length}</button></div>
      </div>}

      {view.chip === 'scheduled' ? <>
        <div className="today-row"><h3>Ответ запланирован <span className="today-muted">{planned.length}</span></h3></div>
        {planned.length ? <ul className="crm-list">{planned.map(task => <li key={task.id}><button className="crm-record" onClick={() => handlers.onOpenTask(task)}><span className="crm-icon"><CalendarClock size={20}/></span><span className="crm-body"><strong>{task.title}</strong><span className="crm-preview">{task.context}</span><small>{task.dueAt?.replace('T', ', ')} · {task.state}</small></span><ChevronRight size={16}/></button></li>)}</ul>
          : <Empty title="Запланированных ответов нет" text="Когда вы перенесёте контакт или создадите задачу из обращения, она появится здесь." onReset={() => onViewChange({ chip: 'all' })}/>}
      </> : <>
        <div className="today-row"><h3>Требуют действия <span className="today-muted">{shown.length}</span></h3>{(view.chip !== 'all' || filtered) && <button className="today-link" onClick={() => onViewChange({ ...defaultShieldView, sort: view.sort })}>Сбросить</button>}</div>
        {shown.length ? <ul className="shield-list">{shown.map(group => <li key={group.key}><ShieldCard group={group} now={now} open={expanded === group.key} onToggle={() => setExpanded(key => key === group.key ? null : group.key)} canHandoff={canHandoff && group.lead.scope === 'team'} handlers={handlers}/></li>)}</ul>
          : groups.length ? <Empty title="Ничего не найдено" text="Измените фильтры — данные и статусы не изменились." onReset={() => onViewChange({ ...defaultShieldView, sort: view.sort })}/>
          : <div className="crm-empty"><SearchCheck size={28}/><h3>{connectedCount ? 'Открытых обращений нет' : 'Очередь пуста'}</h3><p>{connectedCount ? 'По доступным данным подключённых каналов открытых действий нет. Это не означает отсутствие звонков вне подключённых источников.' : 'Источники не подключены, поэтому пустая очередь не подтверждает отсутствие обращений.'}</p></div>}
      </>}

      <div className="shield-footer">
        <button className="today-secondary" onClick={handlers.onHistory}>История обработанных</button>
        <button className="today-secondary" onClick={handlers.onInbox}>Все входящие</button>
      </div>
      <button className="today-primary" onClick={handlers.onAdd}>Добавить обращение вручную</button>
      <p className="crm-caption">Демо-данные до перезагрузки. Звонки и сообщения не отправляются; ручные отметки сохраняются как «Результат указал пользователь».</p>
    </>}
  </section>;
}

function Empty({ title, text, onReset }: { title: string; text: string; onReset: () => void }) {
  return <div className="crm-empty"><MessageSquare size={28}/><h3>{title}</h3><p>{text}</p><button className="today-secondary" onClick={onReset}>Сбросить фильтры</button></div>;
}

function ShieldCard({ group, now, open, onToggle, canHandoff, handlers }: { group: ShieldGroup; now: number; open: boolean; onToggle: () => void; canHandoff: boolean; handlers: ShieldHandlers }) {
  const [handoff, setHandoff] = useState('');
  const item = group.lead;
  const hidden = item.context.startsWith('Номер не определён');
  const count = group.items.length;
  const kind = item.kind;
  const elapsed = elapsedLabel(group.eventAt, now);
  const type = kind === 'call' ? (group.repeated ? `${count} ${plural(count, 'пропущенный вызов', 'пропущенных вызова', 'пропущенных вызовов')}` : 'Пропущенный звонок')
    : kind === 'message' ? 'Требует ответа' : kind === 'review' ? 'Проверьте результат' : 'Просрочено по вашему сроку';
  const title = kind === 'call' ? (group.repeated ? 'Клиент обратился повторно' : 'Перезвонить клиенту') : kind === 'message' ? 'Ответить клиенту' : kind === 'review' ? 'Проверьте обращение' : item.title;
  const reason = kind === 'call' ? 'Вызов не был принят. Обратный контакт не зафиксирован.'
    : kind === 'message' ? (item.status?.includes('вручную') ? item.reason : 'После сообщения клиента ответ пока не подтверждён. Прочитано ≠ отвечено.')
    : kind === 'review' ? 'Есть обращение, но статус ответа неизвестен.' : item.reason;
  const Icon = kind === 'call' ? (group.repeated ? Repeat : PhoneMissed) : kind === 'message' ? MessageSquare : kind === 'review' ? SearchCheck : Clock3;
  const source = item.channel ? channelNames[item.channel] : item.source || 'Ручной учёт';
  const primary = kind === 'call'
    ? <button className="today-primary" disabled={hidden} onClick={() => handlers.onOpen(item, 'action')}>{hidden ? 'Номер не определён' : 'Перезвонить'}</button>
    : kind === 'message' ? <button className="today-primary" onClick={() => handlers.onOpen(item, 'reply')}>Ответить</button>
    : kind === 'review' ? <button className="today-primary" aria-expanded={open} onClick={onToggle}>Проверить</button>
    : <button className="today-primary" onClick={() => handlers.onOpen(item, 'action')}>Открыть действие</button>;
  const secondary = kind === 'message' && item.clientId
    ? <button className="today-secondary" onClick={() => handlers.onClient(item)}>Открыть клиента</button>
    : kind === 'review' ? null : <button className="today-secondary" aria-expanded={open} onClick={onToggle}>Подробнее</button>;

  return <article className="shield-card" data-shield-item={item.id}>
    <div className="shield-card-top"><span className="shield-type"><Icon size={15}/>{type}</span>
      <details className="shield-menu"><summary aria-label={`Действия: ${item.context}`}><MoreHorizontal size={18}/></summary>
        <div>
          <button onClick={() => handlers.onTask(item)}>Создать задачу</button>
          {!item.callId && <button onClick={() => handlers.onOpen(item, 'result')}>Отметить результат</button>}
          {!item.callId && <button onClick={() => handlers.onResolve(group.items, 'Не требует ответа')}>Не требует ответа{group.repeated ? ` · ${count}` : ''}</button>}
        </div>
      </details>
    </div>
    <h4>{title}</h4>
    <p className="shield-contact">{item.context} · {source}</p>
    {kind === 'message' && item.note && <p className="shield-preview">{item.note}</p>}
    <p className="shield-reason">{reason}</p>
    <p className="shield-meta">{item.time}{elapsed && kind !== 'overdue' && kind !== 'promise' ? ` · получено ${elapsed}, ответ пока не зафиксирован` : ''}{item.assignee ? ` · Ответственный: ${item.assignee}` : item.scope === 'team' ? ' · Ответственный не назначен' : ''}</p>
    {hidden && <p className="shield-note">Перезвон недоступен. Создайте задачу или отметьте результат вручную.</p>}
    <div className="shield-actions">{primary}{secondary}</div>
    {open && <div className="shield-details">
      {group.repeated && <><p className="shield-label">События · {count}</p><ul>{group.items.map(value => <li key={value.id}>{value.time} · {value.channel ? channelNames[value.channel] : value.source}</li>)}</ul><p className="crm-caption">Один рабочий элемент — отдельные задачи по каждому вызову не создаются.</p></>}
      {!group.repeated && <><p className="shield-label">Последнее известное событие</p><p>{item.type} · {item.time}</p></>}
      <p className="shield-label">Почему в очереди</p><p>{item.reason}</p>
      {kind === 'review' && <><p className="shield-label">Ограничение канала</p><p>Источник не подтверждает исходящие ответы. Ручная отметка не превращается в подтверждённую отправку.</p>
        <div className="shield-choices">
          <button className="today-secondary" onClick={() => handlers.onNeedsReply(item)}>Ответ нужен</button>
          <button className="today-secondary" onClick={() => handlers.onResolve([item], 'Ответ отмечен вручную')}>Уже ответили</button>
          <button className="today-secondary" onClick={() => handlers.onResolve([item], 'Не относится к работе')}>Не относится к работе</button>
          <button className="today-secondary" onClick={() => handlers.onTask(item)}>Создать задачу</button>
        </div></>}
      {kind === 'call' && !item.callId && <div className="shield-choices"><p className="shield-label">Удалось связаться?</p>
        <button className="today-secondary" onClick={() => handlers.onResolve(group.items, 'Связались')}>Да, связались</button>
        <button className="today-secondary" onClick={() => handlers.onResolve(group.items, 'Не ответил')}>Нет, клиент не ответил</button>
        <button className="today-secondary" onClick={() => handlers.onTask(item)}>Перезвонить позже</button>
        <button className="today-secondary" onClick={() => handlers.onOpen(item, 'result')}>Другое</button>
      </div>}
      {canHandoff && !item.callId && <label className="shield-handoff">Передать сотруднику<span><select value={handoff} onChange={event => setHandoff(event.target.value)}><option value="">Выберите</option>{employees.map(name => <option key={name} value={name}>{name}</option>)}</select><button className="today-secondary" disabled={!handoff} onClick={() => handlers.onHandoff(group.items, handoff)}>Передать</button></span></label>}
    </div>}
  </article>;
}
