'use client';
import { useState } from 'react';
import type { Task } from './today-data';
import { taskReminder } from './today-state';

export function TaskReminder({task,onChange}:{task:Task;onChange:(minutes:number|null)=>void}) {
 const [checkedAt,setCheckedAt]=useState<string|null>(null);
 const result=checkedAt ? taskReminder(task,checkedAt) : null;
 const format=(at:string)=>new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Tashkent',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(at));
 return <div className="today-note">
 <label className="today-label">Демо-напоминание: {task.title}<select className="today-input" disabled={task.done} value={task.reminderMinutes ?? 'off'} onChange={event=>{setCheckedAt(null);onChange(event.target.value==='off'?null:Number(event.target.value));}}>
 <option value="off">Выключено</option>{[[0,'В срок'],[15,'За 15 минут'],[60,'За час'],[1440,'За день']].map(([value,label])=><option key={value} value={value} disabled={!task.dueAt}>{label}</option>)}
 </select></label>
 <p className="today-muted">{task.done?'Задача выполнена — напоминание неактивно.':!task.dueAt?'Сначала задайте срок задачи.':'Время Ташкента. При переносе срока напоминание пересчитывается.'}</p>
 {!task.done && task.reminderMinutes != null && <button className="today-link" onClick={()=>setCheckedAt(new Date().toISOString())}>Проверить напоминание сейчас</button>}
 {result && !task.done && <p role="status">{result.status==='due'?`Пора вернуться к задаче · ${format(result.at!)}. Это демо, уведомление не отправлено.`:result.status==='scheduled'?`Запланировано в демо на ${format(result.at!)}.`:result.status==='no-date'?'Для напоминания нужен корректный срок.':'Напоминание выключено.'}</p>}
 </div>;
}
