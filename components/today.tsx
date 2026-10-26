'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlarmClock, CalendarClock, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, House, Inbox, Instagram, LayoutGrid,
  MessageCircle, MessageSquare, MoreHorizontal, Phone, PhoneMissed, Plus, RefreshCw, Send, Sparkles, TriangleAlert,
  UserPlus, UsersRound, WifiOff, X,
} from 'lucide-react';
import './today.css';
import {
  byPriority, channelNames, clockNow, demoItems, demoTasks, employees, plural, problemStates, results, scenarios,
  type ChannelId, type ChannelStates, type Item, type Kind, type Scenario, type Task,
} from './today-data';

const kindIcons: Record<Kind, typeof Phone> = {
  overdue: Clock3, call: PhoneMissed, message: MessageSquare, promise: CalendarClock, review: CircleHelp,
  unassigned: UserPlus, teamOverdue: AlarmClock,
};
const channelIcons: Record<ChannelId, typeof Phone> = { phone: Phone, telegram: Send, whatsapp: MessageCircle, instagram: Instagram };
const channelIds = Object.keys(channelNames) as ChannelId[];
type Sheet = 'action' | 'result' | 'reply' | 'reschedule' | 'assign' | 'add' | 'profile' | 'denied' | null;
type Filter = 'reply' | 'missed' | null;
type Undo = { message: string; restore: () => void } | null;

export function Today({ channels, role, active, onChannels }: { channels: ChannelStates; role: string; active: boolean; onChannels: () => void }) {
  const [clock] = useState(clockNow);
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(clock.time);
  const [scope, setScope] = useState<'mine' | 'team'>('mine');
  const [items, setItems] = useState<Item[]>(demoItems);
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [resolved, setResolved] = useState<string[]>([]);
  const [opened, setOpened] = useState<Record<string, string>>({});
  const [pendingSync, setPendingSync] = useState(0);
  const [filter, setFilter] = useState<Filter>(null);
  const [showAll, setShowAll] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [current, setCurrent] = useState<Item | null>(null);
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [draft, setDraft] = useState('');
  const [callStarted, setCallStarted] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignees, setAssignees] = useState<Record<string, string>>({});
  const [addType, setAddType] = useState<'client' | 'lead' | 'task' | null>(null);
  const [form, setForm] = useState({ title: '', detail: '', time: '18:00' });
  const [toast, setToast] = useState<{ text: string; undo?: Undo } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const queueRef = useRef<HTMLElement>(null);
  const failNextSave = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const offline = scenario === 'offline';
  const demoData = scenario !== 'newUser';
  const isOwner = role === 'owner';
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { if (active) { const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t); } }, [active]);
  useEffect(() => { if (active && !loading) heading.current?.focus({ preventScroll: true }); }, [active, loading]);
  useEffect(() => { if (sheet && active) { if (!dialog.current?.open) dialog.current?.showModal(); } else dialog.current?.close(); }, [sheet, active]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);

  const connected = channelIds.filter(id => channels[id] === 'connected');
  const problems = channelIds.filter(id => problemStates.includes(channels[id]));
  const delayed = scenario === 'delay' && connected.includes('telegram');
  const callsFailed = scenario === 'callsError' && connected.includes('phone');
  const incomplete = problems.length > 0 || delayed || offline || callsFailed;

  const visible = useMemo(() => items
    .filter(item => (item.custom || demoData) && !resolved.includes(item.id))
    .filter(item => !item.channel || channels[item.channel] === 'connected')
    .filter(item => !(callsFailed && item.kind === 'call'))
    .sort(byPriority), [items, resolved, channels, demoData, callsFailed]);
  const mine = visible.filter(item => item.scope === 'mine');
  const team = isOwner ? visible.filter(item => item.scope === 'team') : [];
  const list = scope === 'team' ? team : mine;
  const [primary, ...rest] = scope === 'mine' ? mine : [];
  const filtered = (scope === 'mine' ? rest : team).filter(item =>
    filter === 'reply' ? item.kind === 'message' || item.kind === 'review' : filter === 'missed' ? item.kind === 'call' : true);
  const queue = filter ? (scope === 'mine' ? mine : team).filter(item => filtered.includes(item) || (primary && item.id === primary.id && matches(item))) : filtered;
  const shownQueue = showAll || filter ? queue : queue.slice(0, 4);
  const todayTasks = tasks.filter(task => task.custom || demoData);
  const openTasks = todayTasks.filter(task => !task.done).sort((a, b) => a.time.localeCompare(b.time));
  const doneTasks = todayTasks.filter(task => task.done);
  const overdueCount = mine.filter(item => item.kind === 'overdue' || item.kind === 'promise').length;
  const messaging = connected.some(id => id !== 'phone');
  const unanswered = mine.filter(item => item.kind === 'message').length;
  const toReview = mine.filter(item => item.kind === 'review').length;
  const missed = mine.filter(item => item.kind === 'call').length;
  const unassigned = team.filter(item => item.kind === 'unassigned');

  function matches(item: Item) {
    return filter === 'reply' ? item.kind === 'message' || item.kind === 'review' : filter === 'missed' ? item.kind === 'call' : true;
  }

  function notify(text: string, undo?: Undo) { setToast({ text, undo: undo ?? null }); }

  function openItem(item: Item, next: Sheet = 'action') {
    setCurrent(item); setOutcome(''); setNote(''); setFollowUp(''); setCallStarted(false); setSaveFailed(false);
    setDraft(item.draft ?? 'Здравствуйте! Возвращаюсь к вашему обращению. Подскажите, удобно ли сейчас обсудить детали?');
    setSheet(next);
  }

  function resolve(id: string, message: string, extraRestore?: () => void) {
    setResolved(list => [...list, id]);
    setSheet(null);
    notify(message, { message, restore: () => { setResolved(list => list.filter(x => x !== id)); extraRestore?.(); } });
  }

  function saveResult() {
    if (!current || !outcome || saving) return;
    if (scenario === 'saveError' && !failNextSave.current) {
      failNextSave.current = true; setSaving(true);
      later(() => { setSaving(false); setSaveFailed(true); }, 600);
      return;
    }
    setSaving(true); setSaveFailed(false);
    later(() => {
      setSaving(false);
      const createdId = followUp ? `f-${Date.now()}` : '';
      if (followUp) setTasks(list => [...list, { id: createdId, time: followUp, title: 'Повторный контакт', context: current.context, state: 'Создано из результата', done: false, custom: true }]);
      const manualMark = outcome === 'Написал сообщение' ? ' · отмечено вами' : '';
      if (offline) setPendingSync(n => n + 1);
      resolve(current.id, offline ? 'Ожидает синхронизации' : `Результат сохранён${manualMark}`, () => {
        if (createdId) setTasks(list => list.filter(task => task.id !== createdId));
        if (offline) setPendingSync(n => Math.max(0, n - 1));
      });
    }, 500);
  }

  function reschedule(when: string) {
    if (!current) return;
    resolve(current.id, offline ? 'Перенос ожидает синхронизации' : `Срок перенесён: ${when}`);
  }

  function copyDraft() {
    if (!current) return;
    navigator.clipboard?.writeText(draft).catch(() => undefined);
    if (current.channel) setOpened(map => ({ ...map, [current.id]: 'Диалог открыт · ответ не подтверждён' }));
    setOutcome(''); setSheet('result');
    notify(current.channel ? 'Черновик скопирован. Переход в диалог не подтверждает ответ.' : 'Черновик скопирован');
  }

  function toggleTask(task: Task) {
    const done = !task.done;
    setTasks(list => list.map(t => t.id === task.id ? { ...t, done, state: done ? (offline ? 'Ожидает синхронизации' : 'Выполнено вами') : 'Запланировано' } : t));
    if (done) notify('Задача отмечена выполненной', { message: '', restore: () => setTasks(list => list.map(t => t.id === task.id ? { ...task } : t)) });
  }

  function assign() {
    const chosen = unassigned.filter(item => assignees[item.id]);
    if (!chosen.length) return;
    const ids = chosen.map(item => item.id);
    setResolved(list => [...list, ...ids]);
    setSheet(null);
    notify(`Назначено: ${chosen.map(item => assignees[item.id]).join(', ')}`, { message: '', restore: () => setResolved(list => list.filter(x => !ids.includes(x))) });
  }

  function addEntry() {
    if (!form.title.trim() || !addType) return;
    const id = `n-${Date.now()}`;
    if (addType === 'task') setTasks(list => [...list, { id, time: form.time, title: form.title.trim(), context: form.detail.trim() || 'Без привязки к клиенту', state: offline ? 'Ожидает синхронизации' : 'Создано вами', done: false, custom: true }]);
    if (addType === 'lead') setItems(list => [...list, { id, kind: 'review', scope: 'mine', type: 'Добавлено вручную', title: 'Обработать обращение', context: form.title.trim(), source: 'Добавлено вами', time: `Сегодня, ${clock.time}`, note: form.detail.trim() || 'Следующий шаг не указан.', cta: 'Открыть обращение', reason: 'Вы добавили обращение вручную. Результат обработки пока не отмечен.', due: 2000, rank: 2, custom: true }]);
    setSheet(null); setAddType(null); setForm({ title: '', detail: '', time: '18:00' });
    notify(addType === 'client' ? `Клиент «${form.title.trim()}» добавлен · демо` : offline ? 'Сохранено на устройстве · ожидает синхронизации' : addType === 'task' ? 'Задача создана' : 'Обращение добавлено');
  }

  function refresh() {
    if (refreshing || offline) return;
    setRefreshing(true);
    later(() => { setRefreshing(false); setUpdatedAt(clockNow().time); }, 800);
  }

  function changeScenario(next: Scenario) {
    setScenario(next); failNextSave.current = false; setFilter(null);
    if (next === 'loading') { setLoading(true); later(() => setLoading(false), 1600); }
  }

  function pickFilter(next: Filter) {
    setFilter(f => f === next ? null : next); setShowAll(false);
    later(() => queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }

  const context = role === 'owner' ? (scope === 'team' ? 'Агентство · Обзор команды' : 'Агентство · Мои задачи') : role === 'agent' ? 'Агентство · Мои задачи' : 'Ваше рабочее пространство';

  const status = problems.length
    ? { title: `${problems.length} ${plural(problems.length, 'канал требует', 'канала требуют', 'каналов требуют')} внимания`, caption: problems.map(id => channelNames[id]).join(', ') + ' · данные могут быть неполными', cta: 'Проверить', warn: true }
    : delayed ? { title: 'Обновление Telegram задерживается', caption: 'Некоторые новые сообщения могут появиться позже.', cta: 'Проверить', warn: true }
    : connected.length ? { title: 'Подключённые каналы работают', caption: 'SuperApp получает доступные события из проверенных подключений. Демо: события имитируются.', cta: '', warn: false }
    : channels.phone === 'manual' ? { title: 'Ручной учёт обращений', caption: 'Автоматические источники пока не подключены.', cta: 'Подключить', warn: false }
    : { title: 'Подключите рабочие каналы', caption: 'Звонки и сообщения из подключённых источников смогут появляться здесь.', cta: 'Настроить', warn: false };

  if (scenario === 'error') {
    return <section className="today" hidden={!active}><div className="today-scroll today-center">
      <TriangleAlert size={32} /><h1 ref={heading} tabIndex={-1} className="today-h2">Не удалось загрузить рабочий день</h1>
      <p className="today-muted">Проверьте соединение и попробуйте снова.</p>
      <button className="today-primary" onClick={() => changeScenario('loading')}>Повторить</button>
    </div></section>;
  }

  return <section className="today" hidden={!active} aria-busy={loading || refreshing}>
    <div className="today-scroll">
      <header className="today-header">
        <div>
          <p className="today-greeting">{clock.greeting}</p>
          <h1 ref={heading} tabIndex={-1}>Сегодня</h1>
          <p className="today-date">{clock.day}</p>
          <p className="today-context">{context}</p>
        </div>
        <button className="today-avatar" aria-label="Профиль и настройки" onClick={() => setSheet('profile')}>Вы</button>
      </header>

      {isOwner && <div className="today-segment" role="tablist" aria-label="Область задач">
        {(['mine', 'team'] as const).map(value => <button key={value} role="tab" aria-selected={scope === value} onClick={() => { setScope(value); setFilter(null); }}>{value === 'mine' ? 'Мои' : 'Команда'}</button>)}
      </div>}

      {offline && <div className="today-banner" role="status"><WifiOff size={18} /><div><strong>Нет соединения</strong><p>Показаны последние сохранённые данные. Новые обращения могут быть недоступны.</p><p>Обновлено в {updatedAt}</p></div></div>}
      {pendingSync > 0 && !offline && <p className="today-sync">Синхронизировано действий: {pendingSync}. Дубли не созданы.</p>}
      {pendingSync > 0 && offline && <p className="today-sync">{pendingSync} {plural(pendingSync, 'действие ожидает', 'действия ожидают', 'действий ожидают')} синхронизации</p>}

      <div className="today-status" data-warn={status.warn}>
        <button className="today-status-main" aria-expanded={statusOpen} onClick={() => setStatusOpen(v => !v)}>
          <span className="today-status-icons" aria-hidden="true">{channelIds.map(id => { const Icon = channelIcons[id]; const s = channels[id]; return <span key={id} data-state={s === 'connected' ? 'on' : problemStates.includes(s) ? 'warn' : 'off'}><Icon size={13} /></span>; })}</span>
          <span className="today-status-text"><strong>{status.title}</strong><small>Рабочие каналы · {connected.length} из 4</small></span>
          <ChevronDown size={16} className="today-chevron" />
        </button>
        {status.cta && <button className="today-link" onClick={onChannels}>{status.cta}</button>}
        {statusOpen && <div className="today-status-detail"><p>{status.caption}</p><ul>{channelIds.map(id => <li key={id}><span>{channelNames[id]}</span><span>{channels[id] === 'connected' ? (id === 'telegram' && delayed ? 'Задерживается' : 'Работает · демо') : channels[id] === 'manual' ? 'Ручной учёт' : problemStates.includes(channels[id]) ? 'Требует внимания' : channels[id] === 'disabled' ? 'Отключено' : 'Не подключено'}</span></li>)}</ul><button className="today-link" onClick={onChannels}>Открыть подключения</button></div>}
      </div>

      {!offline && !loading && <button className="today-refresh" onClick={refresh} disabled={refreshing}><RefreshCw size={13} className={refreshing ? 'today-spin' : ''} />{refreshing ? 'Обновляется…' : `Обновлено в ${updatedAt}`}</button>}

      {loading ? <Skeleton /> : !demoData && !list.length && !openTasks.length ? <EmptyNew onAdd={() => setSheet('add')} onChannels={onChannels} /> : <>
        <div className="today-summary">
          {scope === 'mine' ? <>
            <Metric label="Без ответа" value={messaging || unanswered ? String(unanswered) : null} hint={toReview ? `+${toReview} проверить` : messaging ? 'по подтверждённым данным' : 'нет каналов сообщений'} active={filter === 'reply'} onClick={() => pickFilter('reply')} />
            <Metric label="Пропущенные" value={connected.includes('phone') && !callsFailed ? String(missed) : null} hint={connected.includes('phone') ? (callsFailed ? 'не обновилось' : 'рабочая телефония') : 'телефония не подключена'} active={filter === 'missed'} onClick={() => pickFilter('missed')} />
            <Metric label="Задачи" value={String(openTasks.length)} hint={overdueCount ? `ещё ${overdueCount} просрочено` : 'на сегодня'} onClick={() => document.getElementById('today-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
          </> : <>
            <Metric label="Без ответственного" value={String(unassigned.length)} hint="ожидают назначения" />
            <Metric label="Просрочено" value={String(team.filter(i => i.kind === 'teamOverdue').length)} hint="задачи команды" />
            <Metric label="Без ответа" value="Нет данных" hint="личные каналы не видны" />
          </>}
        </div>
        {(filter === 'missed' && !connected.includes('phone')) && <p className="today-note">Пропущенные звонки появятся после подключения рабочей телефонии. Звонки с личной SIM не учитываются.</p>}

        {scope === 'mine' && primary && !filter && <section className="today-section" aria-labelledby="start-title">
          <h2 id="start-title" className="today-h2">Начните с этого</h2>
          <ActionCard item={primary} hero opened={opened[primary.id]} onOpen={() => openItem(primary)} onMenu={() => openItem(primary)} />
          {scenario !== 'noAi' && mine.find(i => i.id === 'p32') && <div className="today-ai"><Sparkles size={17} /><div><strong>Подсказка SuperApp</strong><p>Вы обещали отправить подборку клиенту №32. Можно начать с короткого сообщения.</p><button className="today-link" onClick={() => openItem(mine.find(i => i.id === 'p32')!, 'reply')}>Подготовить ответ</button></div></div>}
          {scenario === 'noAi' && <p className="today-note">Подсказки временно недоступны. Задачи и события работают как обычно.</p>}
        </section>}

        {scope === 'team' && unassigned.length > 0 && <section className="today-section" aria-labelledby="team-start">
          <h2 id="team-start" className="today-h2">Требует внимания команды</h2>
          <div className="today-card today-hero"><span className="today-type"><UsersRound size={15} />Распределение</span><h3>{unassigned.length} {plural(unassigned.length, 'заявка', 'заявки', 'заявок')} без ответственного</h3><p className="today-explain">Обращения ожидают назначения.</p><button className="today-primary" onClick={() => setSheet('assign')}>Распределить</button></div>
        </section>}

        <section className="today-section" ref={queueRef} aria-labelledby="queue-title">
          <div className="today-row"><h2 id="queue-title" className="today-h2">{filter === 'reply' ? 'Без ответа' : filter === 'missed' ? 'Пропущенные' : scope === 'team' ? 'Задачи команды' : 'Требует внимания'}</h2>
            {filter ? <button className="today-link" onClick={() => setFilter(null)}>Сбросить<X size={14} /></button> : queue.length > 4 && <button className="today-link" onClick={() => setShowAll(v => !v)}>{showAll ? 'Свернуть' : 'Смотреть все'}</button>}</div>
          {callsFailed && <div className="today-inline-error" role="alert"><span><strong>Не удалось обновить звонки</strong><small>Остальные разделы работают.</small></span><button className="today-link" onClick={() => changeScenario('normal')}>Повторить</button></div>}
          {shownQueue.length ? <div className="today-list">{shownQueue.map(item => <ActionCard key={item.id} item={item} opened={opened[item.id]} onOpen={() => item.kind === 'unassigned' ? setSheet('assign') : openItem(item, item.kind === 'message' ? 'reply' : 'action')} onMenu={() => openItem(item)} />)}</div>
            : (!primary || scope === 'team' || filter) && (incomplete
              ? <Empty title="Данные могут быть неполными" text="Один из рабочих каналов временно не обновляется или недоступен." cta="Проверить подключение" onClick={onChannels} />
              : filter ? <p className="today-note">По этому фильтру открытых действий нет.</p>
              : <Empty title="На сегодня всё обработано" text={connected.length ? 'Нет открытых действий, требующих внимания, по доступным данным.' : 'Нет открытых действий по задачам, добавленным вручную.'} cta="Посмотреть выполненное" onClick={() => document.getElementById('today-done')?.setAttribute('open', '')} />)}
          {primary && !shownQueue.length && !filter && scope === 'mine' && <p className="today-note">Других срочных действий нет.</p>}
        </section>

        {scope === 'mine' && <section className="today-section" id="today-plan" aria-labelledby="plan-title">
          <h2 id="plan-title" className="today-h2">Запланировано сегодня</h2>
          {openTasks.length ? <ul className="today-tasks">{openTasks.map(task => <li key={task.id}>
            <span className="today-time">{task.time}</span>
            <span className="today-task-text"><strong>{task.title}</strong><small>{task.context}</small><small className="today-state">{task.state}</small></span>
            <button className="today-check" aria-label={`Отметить выполненной: ${task.title}`} onClick={() => toggleTask(task)}><Check size={16} /></button>
          </li>)}</ul> : <Empty title="На сегодня задач нет" text="Следующие запланированные контакты находятся в вашем списке задач." cta="Посмотреть задачи" onClick={() => notify('Список задач — следующий экран прототипа')} />}
          {doneTasks.length > 0 && <details className="today-done" id="today-done"><summary>Выполнено сегодня · {doneTasks.length}</summary><ul className="today-tasks">{doneTasks.map(task => <li key={task.id} data-done="true">
            <span className="today-time">{task.time}</span><span className="today-task-text"><strong>{task.title}</strong><small>{task.state}</small></span>
            <button className="today-check" aria-label={`Вернуть в план: ${task.title}`} onClick={() => toggleTask(task)}><Check size={16} /></button></li>)}</ul></details>}
        </section>}
      </>}

      <details className="today-tests"><summary>Демо · состояния Today</summary>
        <label htmlFor="today-scenario">Сценарий</label>
        <select id="today-scenario" value={scenario} onChange={e => changeScenario(e.target.value as Scenario)}>{Object.entries(scenarios).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        <button className="today-link" onClick={() => { setResolved(visible.map(i => i.id)); setTasks(list => list.map(t => ({ ...t, done: true, state: 'Выполнено вами' }))); }}>Отметить всё обработанным</button>
        <button className="today-link" onClick={() => { setResolved([]); setTasks(demoTasks); setItems(demoItems); setPendingSync(0); setOpened({}); }}>Сбросить демо-данные</button>
        <p>Все клиенты, звонки и сообщения — демонстрационные. Обращения из каналов показываются, только если канал подключён на этапе №04.</p>
      </details>
    </div>

    <nav className="today-nav" aria-label="Основная навигация">
      <button aria-current="page"><House size={22} /><span>Сегодня</span></button>
      <button onClick={() => notify('«Входящие» — следующий экран прототипа')}><Inbox size={22} /><span>Входящие</span></button>
      <button className="today-add" aria-label="Быстро добавить" onClick={() => { setAddType(null); setSheet('add'); }}><Plus size={24} /></button>
      <button onClick={() => notify('«Клиенты» — следующий экран прототипа')}><UsersRound size={22} /><span>Клиенты</span></button>
      <button onClick={() => notify('Объекты и сделки появятся в «Ещё» после подключения модулей')}><LayoutGrid size={22} /><span>Ещё</span></button>
    </nav>

    {toast && <div className="today-toast" role="status"><span>{toast.text}</span>{toast.undo && <button onClick={() => { toast.undo?.restore(); setToast({ text: 'Изменение отменено' }); }}>Отменить</button>}</div>}

    <dialog ref={dialog} className="today-dialog" aria-labelledby="today-sheet-title" onCancel={e => { e.preventDefault(); setSheet(null); }} onClick={e => { if (e.target === e.currentTarget) setSheet(null); }}>
      <div className="today-sheet">
        <span className="today-grabber" aria-hidden="true" />
        <button className="today-close" aria-label="Закрыть" onClick={() => setSheet(null)}><X size={20} /></button>
        {sheet === 'profile' && <>
          <h2 id="today-sheet-title" className="today-h2">Профиль</h2>
          <p className="today-muted">{context} · демо</p>
          <button className="today-option" onClick={() => notify('Профиль — следующий экран прототипа')}>Открыть профиль<ChevronRight size={18} /></button>
          {role && role !== 'solo' && <button className="today-option" onClick={() => setSheet('denied')}>Сменить рабочее пространство<ChevronRight size={18} /></button>}
          <button className="today-option" onClick={() => { setSheet(null); onChannels(); }}>Рабочие каналы<ChevronRight size={18} /></button>
          <button className="today-option" onClick={() => notify('Настройки — следующий экран прототипа')}>Настройки<ChevronRight size={18} /></button>
        </>}

        {sheet === 'denied' && <>
          <h2 id="today-sheet-title" className="today-h2">Нет доступа к этому действию</h2>
          <p className="today-muted">Обратитесь к администратору рабочего пространства, если доступ необходим.</p>
          <button className="today-secondary" onClick={() => setSheet(null)}>Понятно</button>
        </>}

        {current && (sheet === 'action' || sheet === 'result' || sheet === 'reply' || sheet === 'reschedule') && <>
          <h2 id="today-sheet-title" className="today-h2">{sheet === 'reply' ? 'Подготовить ответ' : sheet === 'reschedule' ? 'Перенести срок' : sheet === 'result' ? 'Чем закончилось?' : current.title}</h2>
          <p className="today-sheet-context">{current.context}</p>
        </>}

        {current && sheet === 'action' && <>
          <div className="today-why"><strong>Почему это здесь?</strong><p>{current.reason}</p><small>Источник: {current.source}</small></div>
          {callStarted && <p className="today-note" role="status">Демо: набор номера открыт. Это не подтверждает, что разговор состоялся.</p>}
          {current.kind === 'call' || current.kind === 'overdue'
            ? <button className="today-primary" onClick={() => { setCallStarted(true); notify('Демо · набор номера. Звонок не совершается'); }}><Phone size={17} />Позвонить</button>
            : current.kind === 'teamOverdue' ? <button className="today-primary" onClick={() => notify('Задача сотрудника — следующий экран прототипа')}>Открыть задачу</button>
            : <button className="today-primary" onClick={() => setSheet('reply')}><Sparkles size={17} />Подготовить ответ</button>}
          <button className="today-secondary" onClick={() => { setOutcome(''); setSheet('result'); }}>Отметить результат</button>
          <div className="today-extra">
            <button onClick={() => setSheet('reschedule')}>Перенести</button>
            <button onClick={() => resolve(current.id, 'Отмечено как неактуальное')}>Неактуально</button>
            <button onClick={() => notify('Карточка клиента — следующий экран прототипа')}>Открыть клиента</button>
            {role === 'agent' && <button onClick={() => setSheet('denied')}>Не мой клиент</button>}
          </div>
        </>}

        {current && sheet === 'reply' && <>
          <p className="today-ai-label"><Sparkles size={14} />Подсказка SuperApp · черновик</p>
          <label htmlFor="today-draft" className="sr-only">Текст ответа</label>
          <textarea id="today-draft" value={draft} onChange={e => setDraft(e.target.value)} rows={5} />
          <p className="today-muted">Учтены только сообщение клиента и ваша задача. Объекты не подставляются. Ничего не отправляется автоматически.</p>
          {current.channel && <><button className="today-primary" disabled>Отправить через {channelNames[current.channel]}</button><p className="today-muted">{offline ? 'Отправка недоступна без соединения.' : 'Отправка выключена в разрешениях демо-канала.'}</p></>}
          <button className={current.channel ? 'today-secondary' : 'today-primary'} disabled={!draft.trim()} onClick={copyDraft}>{current.channel ? 'Скопировать и открыть диалог' : 'Скопировать текст'}</button>
          <button className="today-secondary" onClick={() => setSheet(null)}>Отменить</button>
        </>}

        {current && sheet === 'result' && <>
          <div className="today-choices" role="radiogroup" aria-label="Результат">{results.map(value => <button key={value} role="radio" aria-checked={outcome === value} onClick={() => { setOutcome(value); setFollowUp(''); }}>{outcome === value && <Check size={14} />}{value}</button>)}</div>
          {outcome === 'Не ответил' && <div className="today-followup"><strong>Запланировать новый контакт?</strong><div className="today-choices">{['14:00', '16:00', '18:30'].map(time => <button key={time} aria-pressed={followUp === time} onClick={() => setFollowUp(followUp === time ? '' : time)}>Сегодня, {time}</button>)}</div></div>}
          {outcome === 'Написал сообщение' && <p className="today-note">Сохранится как результат, введённый вами. Подтверждения от провайдера нет.</p>}
          <label htmlFor="today-note" className="today-label">Заметка · необязательно</label>
          <textarea id="today-note" value={note} onChange={e => setNote(e.target.value)} rows={2} />
          {saveFailed && <div className="today-inline-error" role="alert"><span><strong>Результат не сохранён</strong><small>Попробуйте ещё раз. Ваши изменения пока не подтверждены.</small></span></div>}
          <button className="today-primary" disabled={!outcome || saving} onClick={saveResult}>{saving ? 'Сохраняем…' : saveFailed ? 'Повторить' : 'Сохранить результат'}</button>
        </>}

        {current && sheet === 'reschedule' && <div className="today-stack">
          {['Сегодня, 18:00', 'Завтра, 10:00', 'Послезавтра, 12:00'].map(when => <button key={when} className="today-option" onClick={() => reschedule(when)}>{when}<ChevronRight size={18} /></button>)}
        </div>}

        {sheet === 'assign' && <>
          <h2 id="today-sheet-title" className="today-h2">Распределить заявки</h2>
          <p className="today-muted">Сотрудник получит доступ только к назначенному обращению.</p>
          {isOwner ? <>{unassigned.map(item => <div key={item.id} className="today-assign"><span><strong>{item.context}</strong><small>{item.time}</small></span>
            <select aria-label={`Ответственный: ${item.context}`} value={assignees[item.id] ?? ''} onChange={e => setAssignees(map => ({ ...map, [item.id]: e.target.value }))}><option value="">Выбрать</option>{employees.map(name => <option key={name}>{name}</option>)}</select></div>)}
            <button className="today-primary" disabled={!unassigned.some(item => assignees[item.id])} onClick={assign}>Назначить</button></>
            : <p className="today-note">Нет доступа к этому действию.</p>}
        </>}

        {sheet === 'add' && <>
          <h2 id="today-sheet-title" className="today-h2">{addType ? { client: 'Новый клиент', lead: 'Рабочее обращение', task: 'Новая задача' }[addType] : 'Что добавить?'}</h2>
          {!addType ? <div className="today-stack">
            {([['client', 'Нового клиента', UsersRound], ['lead', 'Рабочее обращение', Inbox], ['task', 'Задачу', CalendarClock]] as const).map(([id, label, Icon]) => <button key={id} className="today-option" onClick={() => setAddType(id)}><Icon size={19} />{label}<ChevronRight size={18} /></button>)}
            <p className="today-muted">Объекты и показы появятся здесь, когда модули будут подключены.</p>
          </div> : <form className="today-form" onSubmit={e => { e.preventDefault(); addEntry(); }}>
            <label htmlFor="add-title">{addType === 'client' ? 'Имя или метка клиента' : addType === 'lead' ? 'Кто обратился' : 'Что нужно сделать'}</label>
            <input id="add-title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={addType === 'task' ? 'Например, позвонить клиенту №12' : 'Например, Клиент №12'} />
            <label htmlFor="add-detail">{addType === 'task' ? 'Клиент или контекст' : 'Запрос'} · необязательно</label>
            <input id="add-detail" value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="Аренда · Чиланзар" />
            {addType === 'task' && <><label htmlFor="add-time">Срок сегодня</label><input id="add-time" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></>}
            <button className="today-primary" type="submit" disabled={!form.title.trim()}>Сохранить</button>
            <button className="today-secondary" type="button" onClick={() => setAddType(null)}>Назад</button>
          </form>}
        </>}
      </div>
    </dialog>
  </section>;
}

function ActionCard({ item, hero, opened, onOpen, onMenu }: { item: Item; hero?: boolean; opened?: string; onOpen: () => void; onMenu: () => void }) {
  const Icon = kindIcons[item.kind];
  return <article className={`today-card${hero ? ' today-hero' : ''}`}>
    <div className="today-card-top">
      <span className="today-type"><Icon size={15} />{item.type}</span>
      <button className="today-menu" aria-label={`Действия: ${item.title}, ${item.context}`} onClick={onMenu}><MoreHorizontal size={19} /></button>
    </div>
    <h3>{item.title}</h3>
    <p className="today-meta">{item.context}</p>
    <p className="today-explain">{item.note}</p>
    <p className="today-source">{item.source} · {item.time}{(opened || item.status) && <> · <span>{opened || item.status}</span></>}</p>
    <button className={hero ? 'today-primary' : 'today-cta'} onClick={onOpen}>{item.cta}{!hero && <ChevronRight size={16} />}</button>
  </article>;
}

function Metric({ label, value, hint, active, onClick }: { label: string; value: string | null; hint: string; active?: boolean; onClick?: () => void }) {
  const content = <><span className={value === null || value === 'Нет данных' ? 'today-metric-na' : 'today-metric-value'}>{value ?? 'Нет данных'}</span><span className="today-metric-label">{label}</span><small>{hint}</small></>;
  return onClick ? <button className="today-metric" aria-pressed={active} onClick={onClick}>{content}</button> : <div className="today-metric">{content}</div>;
}

function Empty({ title, text, cta, onClick }: { title: string; text: string; cta: string; onClick: () => void }) {
  return <div className="today-empty"><strong>{title}</strong><p>{text}</p><button className="today-link" onClick={onClick}>{cta}</button></div>;
}

function EmptyNew({ onAdd, onChannels }: { onAdd: () => void; onChannels: () => void }) {
  return <div className="today-empty today-empty-new"><UserPlus size={30} /><strong>Ваш рабочий день начинается здесь</strong><p>Добавьте первого клиента или подключите рабочий канал, чтобы управлять обращениями и следующими действиями.</p><button className="today-primary" onClick={onAdd}>Добавить клиента</button><button className="today-secondary" onClick={onChannels}>Подключить канал</button></div>;
}

function Skeleton() {
  return <div className="today-skeleton" aria-label="Загрузка рабочего дня"><div className="today-summary">{[0, 1, 2].map(i => <span key={i} className="sk sk-metric" />)}</div><span className="sk sk-title" /><span className="sk sk-hero" /><span className="sk sk-row" /><span className="sk sk-row" /><span className="sk sk-row" /></div>;
}
