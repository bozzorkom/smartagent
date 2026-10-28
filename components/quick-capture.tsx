'use client';
import { useState } from 'react';
import type { Client } from './today-state';
import { type Capture, captureError, captureMatches, emptyCapture } from './quick-capture-model';
export function QuickCapture({value, onChange, clients, onSave}: {value: Capture; onChange: (v: Capture) => void; clients: Client[]; onSave: () => boolean}) {
 const [error,setError] = useState('');
 const update = (key: keyof Capture, v: string | boolean) => onChange({...value,[key]:v,...(['phone','name','mode'].includes(key)?{duplicateConfirmed:false}:{})});
 const matches = value.mode === 'new' ? captureMatches(value,clients) : [];
 return <form className="today-form" onSubmit={e => {e.preventDefault(); const issue=captureError(value,clients); setError(issue); if (!issue && !onSave()) setError('Заявка не сохранена. Проверьте доступ и соединение. Черновик сохранён.');}}>
 <p className="today-muted">Черновик сохраняется при закрытии формы, до перезагрузки прототипа. Реальных отправок нет.</p>
 <label>Контакт<select value={value.mode} onChange={e=>update('mode',e.target.value)}><option value="new">Новый контакт</option><option value="existing">Существующий контакт</option></select></label>
 {value.mode==='existing'?<label>Клиент<select required value={value.clientId} onChange={e=>update('clientId',e.target.value)}><option value="">Выберите клиента</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?` · ${c.phone}`:''}</option>)}</select></label>:<><label>Имя<input required maxLength={120} value={value.name} onChange={e=>update('name',e.target.value)}/></label><label>Телефон · необязательно<input type="tel" value={value.phone} onChange={e=>update('phone',e.target.value)} placeholder="+998"/></label></>}
 {matches.length>0 && <section className="today-note"><strong>Возможные совпадения</strong><p>Проверьте контакт. Автоматического объединения нет.</p>{matches.map(c=><button key={c.id} type="button" className="today-secondary" onClick={()=>onChange({...value,mode:'existing',clientId:c.id})}>Выбрать: {c.name}</button>)}<label><input type="checkbox" checked={value.duplicateConfirmed} onChange={e=>update('duplicateConfirmed',e.target.checked)}/> Это другой человек</label></section>}
 <label>Потребность<select value={value.need} onChange={e=>update('need',e.target.value)}>{['Купить','Снять','Продать','Сдать'].map(v=><option key={v}>{v}</option>)}</select></label>
 <label>Цена / бюджет · необязательно<input inputMode="decimal" value={value.price} onChange={e=>update('price',e.target.value)} placeholder="Не указано"/></label><label>Валюта<select value={value.currency} onChange={e=>update('currency',e.target.value)}><option>USD</option><option>UZS</option></select></label>
 <label>Районы · через запятую<input maxLength={300} value={value.districts} onChange={e=>update('districts',e.target.value)} placeholder="Например, Чиланзар, Юнусабад"/></label>
 <label>Источник обращения<select value={value.channel} onChange={e=>update('channel',e.target.value)}>{[['manual','Вручную'],['phone','Звонок'],['telegram','Telegram'],['whatsapp','WhatsApp'],['instagram','Instagram']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><p className="today-muted">Указание источника не подключает канал и не отправляет сообщение.</p>
 <label>Следующий шаг · необязательно<input maxLength={200} value={value.next} onChange={e=>update('next',e.target.value)} placeholder="Например, уточнить бюджет"/></label>{value.next && <label>Дата и время · Ташкент<input type="datetime-local" required value={value.dueAt} onChange={e=>update('dueAt',e.target.value)}/></label>}
 <label>Комментарий<textarea maxLength={2000} value={value.note} onChange={e=>update('note',e.target.value)}/></label>
 {error && <p role="alert" className="today-inline-error">{error}</p>}
 <button type="submit" className="today-primary">Создать заявку</button><button type="button" className="today-secondary" onClick={()=>{if(window.confirm('Удалить черновик заявки?')) {onChange({...emptyCapture});setError('');}}}>Удалить черновик</button>
 </form>;
}
