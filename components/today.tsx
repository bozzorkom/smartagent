'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlarmClock, CalendarClock, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, House, Inbox, Instagram, LayoutGrid,
  MessageCircle, MessageSquare, MoreHorizontal, Phone, PhoneMissed, Plus, RefreshCw, Send, Sparkles, TriangleAlert,
  UserPlus, UsersRound, WifiOff, X,
} from 'lucide-react';
import './today.css';
import { CrmInbox } from './crm-inbox';
import {
  byPriority, channelNames, clockNow, demoItems, demoTasks, employees, plural, problemStates, results, scenarios,
  type ChannelId, type ChannelStates, type Item, type Kind, type Scenario, type Task,
} from './today-data';
import { createWorkspace, reduceWorkspace, workspaceDate, localDateTime, validDueAt, taskDay, type Workspace, type WorkspaceAction } from './today-state';

const kindIcons: Record<Kind, typeof Phone> = {
  overdue: Clock3, call: PhoneMissed, message: MessageSquare, promise: CalendarClock, review: CircleHelp,
  unassigned: UserPlus, teamOverdue: AlarmClock,
};
const channelIcons: Record<ChannelId, typeof Phone> = { phone: Phone, telegram: Send, whatsapp: MessageCircle, instagram: Instagram };
const channelIds = Object.keys(channelNames) as ChannelId[];
type Sheet = 'action' | 'result' | 'reply' | 'reschedule' | 'assign' | 'add' | 'profile' | 'denied' | 'clients' | 'client' | 'history' | 'inbox' | 'more' | 'task' | 'plan' | null;
type Filter = 'reply' | 'missed' | null;
type Undo = { message: string; restore: () => void } | null;

export function Today({ channels, role, active, onChannels }: { channels: ChannelStates; role: string; active: boolean; onChannels: () => void }) {
  const [clock, setClock] = useState({ greeting: '', day: '', time: '' });
  const [workspace, setWorkspace] = useState<Workspace>(createWorkspace);
  const model = useRef(workspace);
  const { items, tasks, resolved, clients, history } = workspace;
  const [sample, setSample] = useState(false);
  const [accessLost, setAccessLost] = useState(false);
  const accessRef = useRef({ lost: false, offline: false, owner: false });
  const lastEvent = useRef<Item | null>(null);
  const [scenario, setScenario] = useState<Scenario>('normal');
  accessRef.current = { lost: accessLost, offline: scenario === 'offline', owner: role === 'owner' };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [scope, setScope] = useState<'mine' | 'team'>('mine');
  const [clientId, setClientId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [resultDrafts, setResultDrafts] = useState<Record<string, { outcome: string; note: string; followUp: string }>>({});
  const [formError, setFormError] = useState('');
  const [dueAt, setDueAt] = useState('');
  const saveLock = useRef(false);
  const [filter, setFilter] = useState<Filter>(null);
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
  const [form, setForm] = useState({ title: '', detail: '', time: '', date: '', clientId: '' });
  const [toast, setToast] = useState<{ text: string; undo?: Undo } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const queueRef = useRef<HTMLElement>(null);
  const failNextSave = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const offline = scenario === 'offline';
  const demoData = sample;
  const isOwner = role === 'owner';
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { const update = () => setClock(clockNow()); update(); const t = setInterval(update, 30000); return () => clearInterval(t); }, []);
  useEffect(() => { if (active) { const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t); } }, [active]);
  useEffect(() => { if (active && !loading) heading.current?.focus({ preventScroll: true }); }, [active, loading]);
  useEffect(() => {
    if (sheet && active) {
      if (!dialog.current?.open) dialog.current?.showModal();
      const title = dialog.current?.querySelector<HTMLElement>('#today-sheet-title');
      if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
    } else dialog.current?.close();
  }, [sheet, active, addType]);
  useEffect(() => { if (!active) setSheet(null); }, [active]);
  useEffect(() => { setScope('mine'); }, [role]);
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
  const team = isOwner && sample ? visible.filter(item => item.scope === 'team') : [];
  const list = scope === 'team' ? team : mine;
  const [primary, ...rest] = scope === 'mine' ? mine : [];
  const filtered = (scope === 'mine' ? rest : team).filter(item =>
    filter === 'reply' ? item.kind === 'message' : filter === 'missed' ? item.kind === 'call' : true);
  const queue = filter ? (scope === 'mine' ? mine : team).filter(item => filtered.includes(item) || (primary && item.id === primary.id && matches(item))) : filtered;
  const shownQueue = queue.slice(0, 3);
  const todayTasks = tasks.filter(task => (task.custom || demoData) && (task.scope ?? 'mine') === (isOwner && sample && scope === 'team' ? 'team' : 'mine'));
  const openTasks = todayTasks.filter(task => taskDay(task) === 'today').sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const futureTasks = todayTasks.filter(task => taskDay(task) === 'future').sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const overdueTasks = todayTasks.filter(task => taskDay(task) === 'overdue');
  const doneTasks = todayTasks.filter(task => task.done && task.completedAt && workspaceDate(task.completedAt) === workspaceDate());
  const overdueCount = mine.filter(item => item.kind === 'overdue' || item.kind === 'promise').length;
  const messaging = connected.some(id => id !== 'phone');
  const unanswered = list.filter(item => item.kind === 'message').length;
  const toReview = list.filter(item => item.kind === 'review').length;
  const missed = list.filter(item => item.kind === 'call').length;
  const undatedTasks = todayTasks.filter(task => taskDay(task) === 'undated');
  const archivedTasks = todayTasks.filter(task => task.done && !doneTasks.includes(task));
  const pendingTasks = todayTasks.filter(task => !task.done);
  const unassigned = team.filter(item => item.kind === 'unassigned');

  function matches(item: Item) {
    return filter === 'reply' ? item.kind === 'message' : filter === 'missed' ? item.kind === 'call' : true;
  }

  const client = clients.find(value => value.id === clientId && (value.scope === 'mine' || (isOwner && sample && scope === 'team')));
  const selectedTask = tasks.find(task => task.id === taskId);
  function notify(text: string, undo?: Undo) { setToast({ text, undo: undo ?? null }); }
  function replace(next: Workspace) { model.current = next; setWorkspace(next); }
  function commit(action: WorkspaceAction, message: string, close = true) {
    const access = accessRef.current;
    const targetScope = 'itemId' in action ? model.current.items.find(item => item.id === action.itemId)?.scope : 'taskId' in action ? model.current.tasks.find(task => task.id === action.taskId)?.scope : undefined;
    if (access.lost || ((targetScope === 'team' || action.type === 'assign') && !access.owner)) { setSheet('denied'); return false; }
    if (access.offline) { setFormError('Нет сети. Изменение не сохранено; черновик остаётся в этом сеансе.'); notify('Нет сети: действие не сохранено.'); return false; }
    const before = model.current, next = reduceWorkspace(before, action);
    if (before === next) { setFormError('Изменение не сохранено. Проверьте данные и актуальность действия.'); return false; }
    replace(next); if (close) setSheet(null); setFormError('');
    notify(`${message} · в демо-сеансе`, { message, restore: () => {
      if (accessRef.current.lost || accessRef.current.offline || (targetScope === 'team' && !accessRef.current.owner)) return notify('Отмена недоступна: проверьте доступ и соединение.');
      if (model.current !== next) return notify('После этого изменения есть новые данные. Отмена недоступна.');
      replace(before);
    } });
    return true;
  }
  function closeSheet() { if (saveLock.current) return; setSheet(null); setFilter(null); setFormError(''); }
  function openClient(item?: Item) { setClientId(item?.clientId ?? ''); setCurrent(item ?? null); setSheet('client'); }
  function openTask(task: Task) { setTaskId(task.id); setDueAt(task.dueAt ?? ''); setFormError(''); setSheet('task'); }
  function loadSample() {
    const before = model.current, day = workspaceDate();
    const links: Record<string, string> = { p128: '128', m84: '84', w91: '91', p32: '32', t77: '77' };
    const merge = <T extends { id: string }>(a: T[], b: T[]) => [...a, ...b.filter(value => !a.some(item => item.id === value.id))];
    replace({ ...before, items: merge(before.items, demoItems.map(item => ({ ...item, clientId: links[item.id], reason: item.reason.replace('25 октября', 'вчера') }))),
      tasks: merge(before.tasks, demoTasks.map(task => ({ ...task, dueAt: `${day}T${task.time}`, completedAt: task.done ? new Date().toISOString() : undefined }))),
      clients: merge(before.clients, Object.values(links).map(id => ({ id, name: `Клиент №${id}`, request: demoItems.find(item => links[item.id] === id)?.context ?? '', scope: id === '77' ? 'team' as const : 'mine' as const }))) });
    setSample(true); setScenario('normal'); notify('Добавлен пример рабочего дня. Все события в нём вымышленные.');
  }

  function openItem(item: Item, next: Sheet = 'action') {
    const saved = resultDrafts[item.id];
    setCurrent(item); setOutcome(saved?.outcome ?? ''); setNote(saved?.note ?? ''); setFollowUp(saved?.followUp ?? ''); setCallStarted(false); setSaveFailed(false); setFormError('');
    setDueAt(`${workspaceDate(new Date(Date.now() + 86400000).toISOString())}T10:00`);
    setDraft(model.current.drafts[item.id] ?? item.draft ?? 'Здравствуйте! Возвращаюсь к вашему обращению. Подскажите, удобно ли сейчас обсудить детали?');
    setSheet(next);
  }

  useEffect(() => { if (current) setResultDrafts(map => ({ ...map, [current.id]: { outcome, note, followUp } })); }, [current, outcome, note, followUp]);

  function saveResult() {
    if (!current || !outcome || saveLock.current) return;
    if (offline) return setFormError('Нет соединения. Черновик сохранё�� в памяти; пов��орите после восстановления связи.');
    if (followUp && (!validDueAt(followUp) || followUp <= localDateTime())) return setFormError('Выберите будущие дату и время следующего контакта.');
    saveLock.current = true;
    if (scenario === 'saveError' && !failNextSave.current) {
      failNextSave.current = true; setSaving(true);
      later(() => { saveLock.current = false; setSaving(false); setSaveFailed(true); }, 600);
      return;
    }
    setSaving(true); setSaveFailed(false);
    later(() => {
      saveLock.current = false; setSaving(false);
      commit({ type: 'outcome', itemId: current.id, outcome, note, followUp: followUp ? { id: crypto.randomUUID(), dueAt: followUp } : undefined }, 'Результат и заметка сохранены');
    }, 500);
  }

  function reschedule(when: string) {
    if (!current) return;
    if (!validDueAt(when) || when <= localDateTime()) return setFormError('Выберите будущие дату и время.');
    commit({ type: 'reschedule', itemId: current.id, taskId: crypto.randomUUID(), dueAt: when }, 'Новый срок сохранён');
  }

  async function copyDraft() {
    if (!current) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(draft); notify('Текст скопирован. Сообщение не отправлено.'); setFormError('');
    } catch { setFormError('Не удалось скопировать. Выделите текст и скопируйте вручную.'); }
  }

  function toggleTask(task: Task) {
    commit({ type: 'toggleTask', taskId: task.id }, task.done ? 'Задача возвращена в план' : 'Задача отмечена выполненной', false);
  }

  function assign() {
    if (!isOwner || scope !== 'team' || !sample) return;
    commit({ type: 'assign', assignments: assignees }, 'Ответственные назначены');
  }

  function addEntry() {
    if (!form.title.trim() || !addType) return;
    if (accessRef.current.lost) { setSheet('denied'); return; }
    if (accessRef.current.offline) { setFormError('Нет сети. Черновик сохранён в памяти сеанса.'); return; }
    const id = crypto.randomUUID();
    if (addType === 'task') {
      const dueAt = `${form.date}T${form.time}`;
      if (!validDueAt(dueAt)) return setFormError('Укажите дату и время задачи.');
      commit({ type: 'addTask', task: { id, time: form.time, dueAt, title: form.title.trim(), context: form.detail.trim() || 'Без привязки к клиенту', clientId: form.clientId || undefined, state: 'Создано вами', done: false, custom: true } }, 'Задача создана');
    }
    if (addType === 'lead') commit({ type: 'addLead', item: { id, kind: 'review', scope: 'mine', type: 'Добавлено вручную', title: 'Обработать обращение', context: form.title.trim(), source: 'Добавлено вами', time: `Сегодня, ${clock.time}`, note: form.detail.trim() || 'Следующий шаг не указан.', cta: 'Открыть обращение', reason: 'Вы добавили обращение вручную. Результат обработки пока не от��ечен.', due: Date.now(), rank: 2, custom: true, clientId: form.clientId || undefined } }, 'Обращение добавлено');
    if (addType === 'client' && commit({ type: 'addClient', id, name: form.title, request: form.detail, itemId: current?.id }, 'Клиент добавлен')) { setClientId(id); setCurrent(null); setSheet('client'); }
    setAddType(null); setForm({ title: '', detail: '', time: '', date: '', clientId: '' });
  }

  function receiveDemoEvent(replay = false) {
    const source = lastEvent.current ?? model.current.items.find(item => item.scope === 'mine');
    if (!source) return notify('Сначала добавьте пример рабочего дня или обращение.');
    const event = replay ? source : { ...source, id: crypto.randomUUID(), custom: true, time: `Сегодня, ${clock.time}`, title: 'Новое событие по клиенту' };
    const before = model.current, next = reduceWorkspace(before, { type: 'receive', item: event });
    lastEvent.current = event;
    replace(next);
    notify(next === before ? 'Повторная доставка: дубль проигнорирован.' : 'Новое демо-событие добавлено. Предыдущий результат сохранён.');
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
    setFilter(next); setSheet('inbox');
  }

  const context = scope === 'team' && isOwner && sample ? 'Команда · демонстрационный пример' : 'Личное демо-пространство';

  const status = problems.length
    ? { title: `${problems.length} ${plural(problems.length, 'канал требует', 'канала требуют', 'каналов требуют')} внимания`, caption: problems.map(id => channelNames[id]).join(', ') + ' · данны�� могут быть неполными', cta: 'Проверить', warn: true }
    : delayed ? { title: 'Обновление Telegram задерживается', caption: 'Некоторые новые сообщения могут появиться позже.', cta: 'Проверить', warn: true }
    : connected.length ? { title: 'Демо-каналы настр��ены', caption: 'Подключения имитируются. Реальные звонки и сообщения не поступают.', cta: '', warn: false }
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

      <p className="today-demo-label">{sample ? 'Пример рабочего дня · 11:00 · все данные демо' : 'Локальное демо · данные до перезагрузки'}</p>
      {isOwner && sample && <div className="today-segment" role="tablist" aria-label="Область задач" onKeyDown={e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault(); const next = e.key === 'Home' ? 'mine' : e.key === 'End' ? 'team' : scope === 'mine' ? 'team' : 'mine';
        setScope(next); setFilter(null); e.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next === 'mine' ? 0 : 1]?.focus();
      }}>
        {(['mine', 'team'] as const).map(value => <button key={value} role="tab" tabIndex={scope === value ? 0 : -1} aria-selected={scope === value} onClick={() => { setScope(value); setFilter(null); }}>{value === 'mine' ? 'Мои' : 'Команда · демо'}</button>)}
      </div>}

      {offline && <div className="today-banner" role="status"><WifiOff size={18} /><div><strong>Нет соединения · демо</strong><p>Показаны данные текущего сеанса. Текст можно подготовить; серверная синхронизация не подключена.</p></div></div>}

      <div className="today-status" data-warn={status.warn}>
        <button className="today-status-main" aria-expanded={statusOpen} onClick={() => setStatusOpen(v => !v)}>
          <span className="today-status-icons" aria-hidden="true">{channelIds.map(id => { const Icon = channelIcons[id]; const s = channels[id]; return <span key={id} data-state={s === 'connected' ? 'on' : problemStates.includes(s) ? 'warn' : 'off'}><Icon size={13} /></span>; })}</span>
          <span className="today-status-text"><strong>{status.title}</strong><small>Рабочие каналы · {connected.length} из 4</small></span>
          <ChevronDown size={16} className="today-chevron" />
        </button>
        {status.cta && <button className="today-link" onClick={onChannels}>{status.cta}</button>}
        {statusOpen && <div className="today-status-detail"><p>{status.caption}</p><ul>{channelIds.map(id => <li key={id}><span>{channelNames[id]}</span><span>{channels[id] === 'connected' ? (id === 'telegram' && delayed ? 'Задерживается' : 'Работает · демо') : channels[id] === 'manual' ? 'Ручной учёт' : problemStates.includes(channels[id]) ? 'Требует внимания' : channels[id] === 'disabled' ? 'Отключено' : 'Не подключено'}</span></li>)}</ul><button className="today-link" onClick={onChannels}>Открыть подключения</button></div>}
      </div>

      {!offline && !loading && <button className="today-refresh" onClick={refresh} disabled={refreshing}><RefreshCw size={13} className={refreshing ? 'today-spin' : ''} />{refreshing ? 'Обновляется…' : `Обновить демо${updatedAt ? ` · ${updatedAt}` : ''}`}</button>}

      {loading ? <Skeleton /> : !items.length && !tasks.length && !clients.length ? <EmptyNew connected={connected.length > 0} onAdd={() => { setCurrent(null); setAddType('client'); setSheet('add'); }} onChannels={onChannels} /> : <>
        <div className="today-summary">
          {scope === 'mine' ? <>
            <Metric label="Без ответа" value={messaging || unanswered ? String(unanswered) : null} hint={toReview ? `+${toReview} проверить` : messaging ? 'по подтверждённым данным' : 'нет каналов сообщений'} active={filter === 'reply'} onClick={() => pickFilter('reply')} />
            <Metric label="Пропущенные" value={connected.includes('phone') && !callsFailed ? String(missed) : null} hint={connected.includes('phone') ? (callsFailed ? 'не обновилось' : 'рабочая телефония') : 'телефония не подключена'} active={filter === 'missed'} onClick={() => pickFilter('missed')} />
            <Metric label="Задачи" value={String(pendingTasks.length)} hint="все невыполненные" onClick={() => setSheet('plan')} />
          </> : <>
            <Metric label="Без ответственного" value={String(unassigned.length)} hint="ожидают назначения" />
            <Metric label="Просрочено" value={String(team.filter(i => i.kind === 'teamOverdue').length)} hint="задачи команды" />
            <Metric label="Без ответа" value="Нет данных" hint="личные каналы не видны" />
          </>}
        </div>
        {(filter === 'missed' && !connected.includes('phone')) && <p className="today-note">Пропущенные звонки появятся после подключения рабочей телефонии. Звонки с личной SIM не учитываются.</p>}

        {scope === 'mine' && primary && !filter && <section className="today-section" aria-labelledby="start-title">
          <h2 id="start-title" className="today-h2">Начните с этого</h2>
          <ActionCard item={primary} hero onOpen={() => openItem(primary)} onMenu={() => openItem(primary)} />
          {scenario !== 'noAi' && mine.find(i => i.id === 'p32') && <div className="today-ai"><Sparkles size={17} /><div><strong>Подсказка SuperApp</strong><p>Вы обещали отправить подборку клиенту №32. Можно начать с короткого сообщения.</p><button className="today-link" onClick={() => openItem(mine.find(i => i.id === 'p32')!, 'reply')}>Подготовить ответ</button></div></div>}
          {scenario === 'noAi' && <p className="today-note">Подсказки временно недоступны. Задачи и события работают как обычно.</p>}
        </section>}

        {scope === 'team' && unassigned.length > 0 && <section className="today-section" aria-labelledby="team-start">
          <h2 id="team-start" className="today-h2">Требует внимания команды</h2>
          <div className="today-card today-hero"><span className="today-type"><UsersRound size={15} />Распределение</span><h3>{unassigned.length} {plural(unassigned.length, 'заявка', 'заявки', 'заявок')} без ответственного</h3><p className="today-explain">Обращения ожидают назначения.</p><button className="today-primary" onClick={() => setSheet('assign')}>Распределить</button></div>
        </section>}

        <section className="today-section" ref={queueRef} aria-labelledby="queue-title">
          <div className="today-row"><h2 id="queue-title" className="today-h2">{filter === 'reply' ? 'Без ответа' : filter === 'missed' ? 'Пропущенные' : scope === 'team' ? 'Задачи команды' : 'Требует внимания'}</h2>
            {filter ? <button className="today-link" onClick={() => setFilter(null)}>Сбросить<X size={14} /></button> : list.length > 0 && <button className="today-link" onClick={() => setSheet('inbox')}>Все обращения · {list.length}</button>}</div>
          {callsFailed && <div className="today-inline-error" role="alert"><span><strong>Не удалось обновить звонки</strong><small>Остальные разделы работают.</small></span><button className="today-link" onClick={() => changeScenario('normal')}>Повторить</button></div>}
          {shownQueue.length ? <div className="today-list">{shownQueue.map(item => <ActionCard key={item.id} item={item} onOpen={() => item.kind === 'unassigned' ? setSheet('assign') : openItem(item, item.kind === 'message' ? 'reply' : 'action')} onMenu={() => openItem(item)} />)}</div>
            : (!primary || scope === 'team' || filter) && (incomplete
              ? <Empty title="Данные могут быть неполными" text="Один из рабочих каналов временно не обновляется или недоступен." cta="Проверить подключение" onClick={onChannels} />
              : filter ? <p className="today-note">По этому фильтру открытых действий нет.</p>
              : <Empty title="Очередь внимания обработана" text="Открытых обращений по доступным данным нет. План задач показан ниже." cta="Открыть журнал" onClick={() => setSheet('history')} />)}
          {primary && !shownQueue.length && !filter && scope === 'mine' && <p className="today-note">Других срочных действий нет.</p>}
        </section>

        <section className="today-section" id="today-plan" aria-labelledby="plan-title">
          <div className="today-row"><h2 id="plan-title" className="today-h2">{scope === 'team' ? 'Задачи команды' : 'План дня'}</h2><button className="today-link" onClick={() => setSheet('plan')}>Весь план · {todayTasks.length}</button></div>
          {openTasks.length ? <ul className="today-tasks">{openTasks.slice(0, 3).map(task => <li key={task.id}>
            <span className="today-time">{task.time}</span>
            <span className="today-task-text"><button className="today-task-open" onClick={() => openTask(task)}>{task.title}</button><small>{task.context}</small><small className="today-state">{task.state}</small></span>
            <button className="today-check" aria-label={`Отметить выполненной: ${task.title}`} onClick={() => toggleTask(task)}><Check size={16} /></button>
          </li>)}</ul> : <Empty title="На сегодня задач нет" text={futureTasks.length ? 'Будущие контакты показаны ниже.' : 'Добавьте следующий контакт, чтобы помнить о договорённости.'} cta="Создать задачу" onClick={() => { setCurrent(null); setAddType('task'); setSheet('add'); }} />}
          {overdueTasks.length > 0 && <details className="today-done"><summary>Просроченные задачи · {overdueTasks.length}</summary><DatedTasks tasks={overdueTasks} onToggle={toggleTask} onOpen={openTask}/></details>}
          {futureTasks.length > 0 && <details className="today-done"><summary>Запланировано позже · {futureTasks.length}</summary><DatedTasks tasks={futureTasks} onToggle={toggleTask} onOpen={openTask}/></details>}
          {doneTasks.length > 0 && <details className="today-done" id="today-done"><summary>Выполнено сегодня · {doneTasks.length}</summary><ul className="today-tasks">{doneTasks.map(task => <li key={task.id} data-done="true">
            <span className="today-time">{task.time}</span><span className="today-task-text"><strong>{task.title}</strong><small>{task.state}</small></span>
            <button className="today-check" aria-label={`Вернуть в план: ${task.title}`} onClick={() => toggleTask(task)}><Check size={16} /></button></li>)}</ul></details>}
        </section>
      </>}

      <details className="today-tests"><summary>Демо · состояния Today</summary>
        <label htmlFor="today-scenario">Сценарий</label>
        <select id="today-scenario" value={scenario} onChange={e => changeScenario(e.target.value as Scenario)}>{Object.entries(scenarios).filter(([id]) => id !== 'newUser').map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        {!sample && <button className="today-secondary" onClick={loadSample}>Показать пример рабочего дня</button>}
        <button className="today-secondary" onClick={() => { setAccessLost(value => !value); setSheet(null); }}>{accessLost ? 'Восстановить демо-доступ' : 'Имитировать потерю доступа'}</button>
        {accessLost && <p role="status">Доступ отозван. Действия заблокированы, черновики сохранены в памяти сеанса.</p>}
        <button className="today-secondary" onClick={() => receiveDemoEvent()}>Новое событие по клиенту</button>
        <button className="today-secondary" onClick={() => receiveDemoEvent(true)}>Повторная доставка события</button>
        <p>Данные живут в памяти текущего входа. Перезагрузка или выход к телефону очищает сеанс. Пример добавляется явно и сохраняет ваши записи. События каналов видны только после настройки соответствующего демо-канала на этапе №04.</p>
      </details>
    </div>

    <nav className="today-nav" aria-label="Основная навигация">
      <button aria-current="page" onClick={() => heading.current?.closest('.today-scroll')?.scrollTo({ top: 0 })}><House size={22} /><span>Сегодня</span></button>
      <button onClick={() => setSheet('inbox')}><Inbox size={22} /><span>Входящие</span></button>
      <button className="today-add" aria-label="Быстро добавить" onClick={() => { setCurrent(null); setAddType(null); setSheet('add'); }}><Plus size={24} /></button>
      <button onClick={() => setSheet('clients')}><UsersRound size={22} /><span>Клиенты</span></button>
      <button onClick={() => setSheet('more')}><LayoutGrid size={22} /><span>Ещё</span></button>
    </nav>

    {toast && !sheet && <div className="today-toast" role="status"><span>{toast.text}</span>{toast.undo && <button onClick={() => { const previous = model.current; toast.undo?.restore(); if (model.current !== previous) setToast({ text: 'Изменение отменено' }); }}>Отменить</button>}</div>}

    <dialog ref={dialog} className={`today-dialog${sheet === 'inbox' ? ' crm-dialog' : ''}`} aria-labelledby="today-sheet-title" onCancel={e => { e.preventDefault(); closeSheet(); }} onClick={e => { if (e.target === e.currentTarget) closeSheet(); }}>
      <div className="today-sheet">
        <span className="today-grabber" aria-hidden="true" />
        <button className="today-close" aria-label="Закрыть" disabled={saving} onClick={closeSheet}><X size={20} /></button>
        {(sheet === 'profile' || sheet === 'more') && <>
          <h2 id="today-sheet-title" className="today-h2">{sheet === 'profile' ? 'Ваше прост��анство' : 'Ещё'}</h2>
          <p className="today-muted">{context}. Роль: {role === 'owner' ? 'руководитель' : role === 'agent' ? 'сотрудник' : 'самостоятельная работа'}. Выбор роли не создаёт агентство и не предоставляет доступ к чужим данным.</p>
          <button className="today-option" onClick={() => { setSheet(null); onChannels(); }}>Рабочие каналы<ChevronRight size={18} /></button>
          <button className="today-option" onClick={() => setSheet('history')}>Журнал действий<ChevronRight size={18} /></button>
          <p className="today-note">Объекты, показы, сделки и расшире��ные настройки появятся отдельными экранами на ��ледующих этапах.</p>
        </>}
        {sheet === 'inbox' && <CrmInbox items={list} initialFilter={filter} incomplete={incomplete} phoneConnected={connected.includes('phone')} restricted={accessLost} team={scope === 'team' && isOwner} onOpen={openItem} onChannels={() => { closeSheet(); onChannels(); }} onAdd={() => { setAddType('lead'); setSheet('add'); }}/>}
        {sheet === 'plan' && <><h2 id="today-sheet-title" className="today-h2">Весь план · {todayTasks.length}</h2><p className="today-muted">Невыполненные: {pendingTasks.length} · Завершённые: {todayTasks.length - pendingTasks.length}. Счётчик на главной показывает только невыполненные.</p>{[['Просрочено', overdueTasks], ['Сегодня', openTasks], ['Позже', futureTasks], ['Без срока', undatedTasks], ['Выполнено сегодня', doneTasks], ['Выполнено ранее', archivedTasks]].map(([label, group]) => <section key={label as string}><h3 className="today-label">{label as string} · {(group as Task[]).length}</h3>{(group as Task[]).length ? <DatedTasks tasks={group as Task[]} onToggle={toggleTask} onOpen={openTask}/> : <p className="today-muted">Нет задач в этой группе.</p>}</section>)}</>}
        {sheet === 'clients' && <><h2 id="today-sheet-title" className="today-h2">Клиенты в этом сеансе</h2><p className="today-muted">Быстрый список Today · данные до перезагрузки.</p>{clients.filter(client => client.scope === 'mine' || (isOwner && sample && scope === 'team')).map(client => <button className="today-option" key={client.id} onClick={() => { setClientId(client.id); setCurrent(null); setSheet('client'); }}><span><strong>{client.name}</strong><small>{client.request || 'Запрос не указан'}</small></span><ChevronRight size={18}/></button>)}<button className="today-secondary" onClick={() => { setCurrent(null); setAddType('client'); setSheet('add'); }}>Добавить клиента</button></>}
        {sheet === 'client' && <><h2 id="today-sheet-title" className="today-h2">{client?.name || 'Клиент ещё не связан'}</h2>{client ? <><p className="today-muted">{client.request || 'Запрос не указан'}</p><button className="today-secondary" onClick={() => { setCurrent(null); setForm({ title: '', detail: client.name, date: workspaceDate(), time: '', clientId: client.id }); setAddType('task'); setSheet('add'); }}>Создать следующий контакт</button><h3 className="today-label">История клиента</h3><History entries={history.filter(entry => entry.clientId === client.id)}/></> : <><p className="today-muted">Обращение не связано с существующей карточкой. Проверьте данные перед созданием клиента.</p><button className="today-primary" onClick={() => { setForm({ title: current?.context.split(' · ')[0] ?? '', detail: current?.note ?? '', date: '', time: '', clientId: '' }); setAddType('client'); setSheet('add'); }}>Создать клиента из обращения</button></>}</>}
        {sheet === 'history' && <><h2 id="today-sheet-title" className="today-h2">Журнал действий</h2><p className="today-muted">Результаты, отмеченные вами в текущем демо-сеансе.</p><History entries={history.filter(entry => (entry.scope ?? 'mine') === 'mine' || (isOwner && scope === 'team' && sample))}/></>}
        {sheet === 'task' && selectedTask && <><h2 id="today-sheet-title" className="today-h2">{selectedTask.title}</h2><p className="today-muted">{selectedTask.context}</p><p className="today-note">{selectedTask.state} · {selectedTask.dueAt?.replace('T', ', ')}</p><form onSubmit={e => { e.preventDefault(); commit({ type: 'rescheduleTask', taskId, dueAt }, 'Новый срок задачи сохранён'); }}><label className="today-label" htmlFor="task-due">Новый срок</label><input id="task-due" required type="datetime-local" min={localDateTime()} value={dueAt} onInput={e => setDueAt(e.currentTarget.value)}/><button type="submit" className="today-primary">Перенести задачу</button></form><button className="today-secondary" onClick={() => commit({ type: 'toggleTask', taskId }, 'Задача отмечена выполненной')}>Отметить выполненной</button></>}

        {sheet === 'denied' && <>
          <h2 id="today-sheet-title" className="today-h2">Нет доступа к этому действию</h2>
          <p className="today-muted">Обратитесь к администратору рабочего пространства, если доступ необходим.</p>
          {accessLost && <button className="today-secondary" onClick={() => { setAccessLost(false); setSheet(null); notify('Демо-доступ восстановлен. Откройте действие и проверьте черновик.'); }}>Восстановить демо-доступ</button>}
          <button className="today-secondary" onClick={closeSheet}>Понятно</button>
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
            : current.kind === 'teamOverdue' ? <button className="today-primary" onClick={() => setSheet('result')}>Отметить результат задачи</button>
            : <button className="today-primary" onClick={() => setSheet('reply')}><Sparkles size={17} />Подготовить ответ</button>}
          <button className="today-secondary" onClick={() => setSheet('result')}>Отметить результат</button>
          <div className="today-extra">
            <button onClick={() => setSheet('reschedule')}>Перенести</button>
            <button onClick={() => commit({ type: 'dismiss', itemId: current.id }, 'Отмечено как неактуальное')}>Неактуально</button>
            <button onClick={() => openClient(current)}>Открыть клиента</button>
            {role === 'agent' && <button onClick={() => setSheet('denied')}>Не мой клиент</button>}
          </div>
        </>}

        {current && sheet === 'reply' && <>
          <p className="today-ai-label"><Sparkles size={14} />Подсказка SuperApp · черновик</p>
          <label htmlFor="today-draft" className="sr-only">Текст ответа</label>
          <textarea id="today-draft" value={draft} onChange={e => { setDraft(e.target.value); replace(reduceWorkspace(model.current, { type: 'draft', itemId: current.id, value: e.target.value })); }} rows={5} />
          <p className="today-muted">Черновик остаётся при закрытии панели. Отправка и переход к личному диалогу в демо не подключены.</p>
          <button className="today-primary" disabled={!draft.trim()} onClick={copyDraft}>Скопировать текст</button>
          <button className="today-secondary" onClick={() => setSheet('result')}>Указать результат вручную</button>
        </>}

        {current && sheet === 'result' && <>
          <fieldset className="today-result"><legend className="today-label">Результат контакта</legend>{results.map(value => <label key={value}><input type="radio" name="today-outcome" checked={outcome === value} onChange={() => { setOutcome(value); setFollowUp(''); }}/><span>{value}</span></label>)}</fieldset>
          {outcome === 'Не ответил' && <div className="today-followup"><label htmlFor="today-follow-up" className="today-label">Следующий контакт · необязательно</label><input id="today-follow-up" type="datetime-local" min={localDateTime()} value={followUp} onInput={e => setFollowUp(e.currentTarget.value)}/></div>}
          {outcome === 'Написал сообщение' && <p className="today-note">Сохранится как результат, введённый вами. Подтверждения от провайдера нет.</p>}
          <label htmlFor="today-note" className="today-label">Заметка · необязательно</label>
          <textarea id="today-note" value={note} onChange={e => setNote(e.target.value)} rows={2} />
          {saveFailed && <div className="today-inline-error" role="alert"><span><strong>Результат не сохранён</strong><small>Попробуйте ещё раз. Ваши изменения пока не подтверждены.</small></span></div>}
          <p className="today-muted">Сохранится ваша отметка, а не подтверждение провайдера. Черновик остаётся при закрытии панели.</p>
          <button className="today-primary" disabled={!outcome || saving || offline} onClick={saveResult}>{saving ? 'Сохраняем…' : saveFailed ? 'Повторить' : 'Сохранить результат'}</button>
        </>}

        {current && sheet === 'reschedule' && <form className="today-stack" onSubmit={e => { e.preventDefault(); reschedule(dueAt); }}><label className="today-label" htmlFor="today-due">Когда вернуться к действию?</label><input id="today-due" type="datetime-local" required min={localDateTime()} value={dueAt} onInput={e => setDueAt(e.currentTarget.value)}/><p className="today-muted">Задача появится в плане на выбранную дату. Исходное обращение и история сохранятся.</p><button className="today-primary" type="submit">Сохранить новый срок</button></form>}

        {sheet === 'assign' && <>
          <h2 id="today-sheet-title" className="today-h2">Распределить заявки</h2>
          <p className="today-muted">Изменится демонстрационная запись. Реальные права сотрудников не выдаются.</p>
          {isOwner && sample && scope === 'team' ? <>{unassigned.map(item => <div key={item.id} className="today-assign"><span><strong>{item.context}</strong><small>{item.time}</small></span>
            <select aria-label={`Ответственный: ${item.context}`} value={assignees[item.id] ?? ''} onChange={e => setAssignees(map => ({ ...map, [item.id]: e.target.value }))}><option value="">Выбрать</option>{employees.map(name => <option key={name}>{name}</option>)}</select></div>)}
            <button className="today-primary" disabled={!unassigned.some(item => assignees[item.id])} onClick={assign}>Назначить</button></>
            : <p className="today-note">Нет досту��а к этому действию.</p>}
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
            {addType !== 'client' && <><label htmlFor="add-client">Связать с клиентом</label><select id="add-client" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}><option value="">Без привязки</option>{clients.filter(client => client.scope === 'mine').map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></>}
            {addType === 'task' && <><label htmlFor="add-date">Дата</label><input id="add-date" required type="date" value={form.date} onInput={e => { const date = e.currentTarget.value; setForm(f => ({ ...f, date })); }}/><label htmlFor="add-time">Время</label><input id="add-time" required type="time" value={form.time} onInput={e => { const time = e.currentTarget.value; setForm(f => ({ ...f, time })); }} /></>}
            <button className="today-primary" type="submit" disabled={!form.title.trim()}>Сохранить</button>
            <button className="today-secondary" type="button" onClick={() => setAddType(null)}>Назад</button>
          </form>}
        </>}
        {offline && <div className="today-note"><p>Нет сети. Черновик остаётся в памяти этого сеанса; отправка не выполняется.</p><button className="today-secondary" onClick={() => { changeScenario('normal'); setFormError(''); }}>Восстановить демо-соединение</button></div>}
        {formError && <p className="today-inline-error" role="alert">{formError}</p>}
        {toast && sheet && <div className="today-toast" role="status">{toast.text}</div>}
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

function EmptyNew({ onAdd, onChannels, connected }: { onAdd: () => void; onChannels: () => void; connected: boolean }) {
  return <div className="today-empty today-empty-new"><UserPlus size={30} /><strong>{connected ? 'Новых обращений пока нет' : 'Ваш рабочий день начинается здес��'}</strong><p>{connected ? 'Демо-канал настроен. Реальные события не поступают; можно начать с клиента вручную.' : 'Добавьте первого клиента или подключите рабочий канал, чтобы управлять обращениями и следующими действиями.'}</p><button className="today-primary" onClick={onAdd}>Добавить клиента</button><button className="today-secondary" onClick={onChannels}>{connected ? 'Открыть подключения' : 'Подключить канал'}</button></div>;
}

function DatedTasks({ tasks, onToggle, onOpen }: { tasks: Task[]; onToggle: (task: Task) => void; onOpen: (task: Task) => void }) {
  return <ul className="today-tasks">{tasks.map(task => <li key={task.id}><span className="today-time"><small>{task.dueAt?.slice(0, 10).split('-').reverse().join('.')}</small>{task.time}</span><span className="today-task-text"><button className="today-task-open" onClick={() => onOpen(task)}>{task.title}</button><small>{task.context}</small><small>{task.state}</small></span><button className="today-check" aria-label={`Отметить выполненной: ${task.title}`} onClick={() => onToggle(task)}><Check size={16}/></button></li>)}</ul>;
}
function History({ entries }: { entries: Workspace['history'] }) {
  return entries.length ? <ol className="today-history">{entries.map(entry => <li key={entry.id}><strong>{entry.title}</strong><small>{new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(entry.at))}</small>{entry.outcome && <p>{entry.outcome}</p>}{entry.note && <p>{entry.note}</p>}</li>)}</ol> : <p className="today-muted">В этом сеансе действий ещё нет.</p>;
}

function Skeleton() {
  return <div className="today-skeleton" aria-label="Загрузка рабочего дня"><div className="today-summary">{[0, 1, 2].map(i => <span key={i} className="sk sk-metric" />)}</div><span className="sk sk-title" /><span className="sk sk-hero" /><span className="sk sk-row" /><span className="sk sk-row" /><span className="sk sk-row" /></div>;
}
