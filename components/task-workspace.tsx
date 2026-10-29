'use client';
import type { Task } from './today-data';
import { taskDay } from './today-state';
export type TaskView = { query: string; filter: string };
const groups = [['overdue','Просрочено'],['today','Сегодня'],['future','Предстоящие'],['undated','Без срока'],['done','Выполненные']] as const;
export function TaskWorkspace({tasks,now,view,onViewChange,onOpen,onAdd,restricted,team}:{tasks:Task[];now:string;view:TaskView;onViewChange:(view:TaskView)=>void;onOpen:(task:Task)=>void;onAdd:()=>void;restricted:boolean;team:boolean}) {
 const available = restricted ? [] : tasks;
 const filtered = available.filter(task => (view.filter === 'all' || taskDay(task,now) === view.filter) && `${task.title} ${task.context}`.toLocaleLowerCase('ru').includes(view.query.trim().toLocaleLowerCase('ru')));
 return <div className="crm-inbox"><header><p className="today-label">{team ? 'Задачи команды' : 'Мои задачи'}</p><h2 id="today-sheet-title" className="today-h2" tabIndex={-1}>Задачи</h2><p className="today-muted">Обещания, контакты и следующие действия</p></header>
 {restricted ? <p role="alert" className="today-note">Доступ отозван. Задачи скрыты.</p> : <>
 <div className="crm-metrics">{groups.slice(0,3).map(([key,label])=><button key={key} aria-pressed={view.filter===key} onClick={()=>onViewChange({...view,filter:key,query:''})}><strong>{available.filter(task=>taskDay(task,now)===key).length}</strong><span>{label}</span></button>)}</div>
 <label className="today-label">Поиск по задаче или клиенту<input className="today-input" type="search" value={view.query} onChange={event=>onViewChange({...view,query:event.target.value})}/></label>
 <label className="today-label">Срок и состояние<select className="today-input" value={view.filter} onChange={event=>onViewChange({...view,filter:event.target.value})}><option value="all">Все задачи</option>{groups.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 <p className="today-muted" role="status">Найдено: {filtered.length} · Время Ташкента</p>
 {groups.map(([key,label])=>{const entries=filtered.filter(task=>taskDay(task,now)===key).sort((a,b)=>(a.dueAt??'').localeCompare(b.dueAt??'')||a.id.localeCompare(b.id));return entries.length ? <section key={key}><h3 className="today-label">{label} · {entries.length}</h3>{entries.map(task=><button key={task.id} data-task-origin={task.id} className="today-option" onClick={()=>onOpen(task)}><span><strong>{task.title}</strong><span style={{display:'block'}} className="today-muted">{task.context || 'Клиент не связан'} · {task.dueAt ? task.dueAt.replace('T',' · ') : 'Срок не задан'}</span></span><span>{task.done?'Выполнено':'Открыть'}</span></button>)}</section>:null;})}
 {!filtered.length&&<div className="today-note"><p>{available.length?'Нет задач по выбранным условиям.':'Задач пока нет. Создайте первый следующий шаг.'}</p>{available.length>0&&<button className="today-link" onClick={()=>onViewChange({query:'',filter:'all'})}>Сбросить фильтры</button>}</div>}
 <button className="today-primary" onClick={onAdd}>Создать задачу</button><p className="today-muted">Демо-сеанс: изменения общие с Today и карточкой клиента. Фоновые напоминания не отправляются.</p>
 </>}
 </div>;
}
