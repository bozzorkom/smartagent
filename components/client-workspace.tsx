'use client';

import { useState } from 'react';
import { MessageSquare, CalendarPlus, UserRound, Clock3 } from 'lucide-react';
import type { Client, Activity } from './today-state';
import { localDateTime } from './today-state';
import type { Item, Task } from './today-data';
import './client-workspace.css';

type Props = { client: Client; items: Item[]; tasks: Task[]; history: Activity[]; restricted: boolean; onTask: () => void; onOpenTask: (task: Task) => void; onOpenItem: (item: Item) => void };
export function ClientWorkspace({ client, items, tasks, history, restricted, onTask, onOpenTask, onOpenItem }: Props) {
  const [filter, setFilter] = useState('Все');
  const [notice, setNotice] = useState('');
  const pending = tasks.filter(task => !task.done).sort((a, b) => (a.dueAt || '9999').localeCompare(b.dueAt || '9999'));
  const next = pending[0];
  const overdue = next?.dueAt && next.dueAt < localDateTime();
  const messages = items.filter(item => item.kind === 'message');
  const entries = [...history].sort((a,b) => b.at.localeCompare(a.at));
  if (restricted) return <section><h2 id="today-sheet-title">Доступ ограничен</h2><p>Сведения клиента скрыты. Восстановите доступ к рабочему пространству.</p></section>;
  return <div className="client-workspace">
    <header><span className="today-label">CLIENT 360° · ДЕМО</span><div className="client-identity"><span className="client-avatar"><UserRound size={28}/></span><div><h2 id="today-sheet-title">{client.name || 'Новый контакт'}</h2><span className="client-chip">{client.request ? 'Активный клиент' : 'Без активных запросов'}</span></div></div><p className="today-muted">Телефон не указан</p><p>{client.request || 'Потребности пока не уточнены'}</p><small className="today-muted">{client.scope === 'mine' ? 'Личный рабочий контекст' : 'Контекст команды'} · Данные демо-сеанса</small></header>
    <div className="client-actions"><button onClick={() => setNotice('Телефон отсутствует. Номер не выводится из имени или канала сообщения.')}>Позвонить</button><button onClick={() => messages.length ? onOpenItem(messages[0]) : setNotice('Нет доступного канала для отправки. Реальная отправка в демо не подключена.')}><MessageSquare size={17}/>Написать</button><button onClick={onTask}><CalendarPlus size={17}/>Задача</button></div>
    {notice && <p className="today-note" role="status">{notice}<button className="today-link" onClick={() => setNotice('')}>Скрыть</button></p>}
    <section><h3>Следующее действие</h3><div className="client-next"><span className="today-label"><Clock3 size={14}/> {overdue ? 'Просроченная задача' : next ? 'Запланировано' : 'Следующий шаг'}</span><h4>{next?.title || 'Следующее действие не назначено'}</h4><p>{next ? `${next.dueAt?.replace('T', ' · ') || 'Без срока'} · Выполнение не отмечено` : 'Добавьте задачу, чтобы сохранить договорённость с клиентом.'}</p><button className="today-primary" onClick={() => next ? onOpenTask(next) : onTask()}>{next ? 'Открыть действие' : 'Добавить задачу'}</button>{next && <details><summary>Почему это важно?</summary><p>В рабочем пространстве есть невыполненная задача. Срок указан по времени Ташкента; открытие задачи не означает её выполнение.</p></details>}</div>{pending.length > 1 && <details><summary>Все действия · {pending.length}</summary>{pending.map(task => <button className="client-list-row" key={task.id} onClick={() => onOpenTask(task)}>{task.title}<small>{task.dueAt?.replace('T',' · ') || 'Без срока'}</small></button>)}</details>}</section>
    <section><h3>Что ищет клиент</h3><div className="client-surface"><h4>{client.request || 'Пока не знаем, что ищет клиент'}</h4><p className="today-muted">{client.request ? 'Сохранённый запрос · демо-данные' : 'Потребности ещё не зафиксированы.'}</p><p>Бюджет и дополнительные параметры не уточнены.</p></div></section>
    <section><h3>Объекты для клиента</h3><p className="today-muted">Модуль объектов не подключён. Подборки и рекомендации не рассчитываются.</p></section>
    <section><h3>История общения</h3><p className="today-muted">Подтверждённые записи текущего демо-сеанса.</p><div className="client-filters">{['Все', 'Задачи', 'Результаты'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>{entries.filter(entry => filter === 'Все' || (filter === 'Задачи' ? Boolean(tasks.find(task => task.id === entry.entityId)) : Boolean(entry.outcome))).map(entry => <article className="client-event" key={entry.id}><time>{new Date(entry.at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' })}</time><h4>{entry.title}</h4>{entry.outcome && <p>{entry.outcome}</p>}{entry.note && <p>{entry.note}</p>}<small>Запись демо-сеанса · Ташкент</small></article>)}{!entries.some(entry => filter === 'Все' || (filter === 'Задачи' ? tasks.some(task => task.id === entry.entityId) : entry.outcome)) && <p className="today-muted">В этой категории пока нет записей.</p>}</section>
    <details><summary>Связанные обращения · {items.length}</summary><p className="today-muted">Сохранённый контекст источников, не подтверждение нового контакта.</p>{items.map(item => <button className="client-list-row" key={item.id} onClick={() => onOpenItem(item)}>{item.title}<small>{item.source} · {item.time}</small></button>)}</details>
    <details><summary>Дополнительные сведения</summary><p className="today-muted">Заметки, расширенное редактирование и проверка совпадений будут добавлены следующим этапом. Автоматическое объединение контактов не выполняется.</p></details>
  </div>;
}
