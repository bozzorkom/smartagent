'use client';
import { useState } from 'react';
import { Phone, PhoneOff, ShieldCheck, Smartphone } from 'lucide-react';

export function CallerPlatforms({ onChannels }: { onChannels: () => void }) {
  const [platform,setPlatform]=useState<'ios'|'android'>('ios');
  const [capability,setCapability]=useState('directory');
  const [enabled,setEnabled]=useState(false);
  const [privatePreview,setPrivatePreview]=useState(true);
  return <section className="caller-platform">
    <div className="caller-switch" aria-label="Платформа">{(['ios','android'] as const).map(value=><button key={value} aria-pressed={platform===value} onClick={()=>setPlatform(value)}>{value==='ios'?'iPhone':'Android'}</button>)}</div>
    <p className="caller-caption">Системный концепт · нативная функция</p>
    <div className="caller-system-preview" role="img" aria-label={`${platform==='ios'?'iPhone':'Android'}: концептуальный системный вызов. Сведения CRM в системном экране скрыты.`}>
      <Smartphone size={22}/><span>Входящий вызов</span><h3>{enabled&&!privatePreview?'SuperApp: Мадина К.':'Рабочий звонок'}</h3><p>+998 90 ••• •• 42</p><small>{enabled?'Подпись определения · пример':'Определение SuperApp выключено'}</small>
      <div className="caller-system-buttons" aria-hidden="true"><span><PhoneOff size={24}/>Отклонить</span><span><Phone size={24}/>Ответить</span></div>
      <small>Телефонный интерфейс системы · иллюстрация</small>
    </div>
    <label className="caller-check"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>Показать пример включённой функции</label>
    <label className="caller-check"><input type="checkbox" checked={!privatePreview} onChange={e=>setPrivatePreview(!e.target.checked)}/>Показать пример имени в системной подписи</label>
    <div className="caller-info"><ShieldCheck size={20}/><div><strong>Подробности — в SuperApp</strong><p>Запрос, бюджет, заметки и история не выводятся в этом системном концепте. Имя в штатной подписи зависит от выбранной функции и настроек телефона.</p></div></div>
    {platform==='ios'?<><label className="caller-label" htmlFor="caller-native-kind">Вариант iPhone</label><select id="caller-native-kind" value={capability} onChange={e=>setCapability(e.target.value)}><option value="directory">Call Directory · справочник</option><option value="live">Live Caller ID Lookup</option><option value="unsupported">Функция недоступна</option><option value="outdated">Справочник обновляется</option></select><p className="caller-muted">{capability==='directory'?'Отдельное расширение использует подготовленный справочник. Оно не заменяет системный экран вызова.':capability==='live'?'Нужны нативное расширение, серверная инфраструктура и процедуры Apple. В этом веб-прототипе функция не подключена.':capability==='outdated'?'Подпись может оставаться прежней до обновления данных системы. Мгновенное изменение не обещается.':'Определение номера не поддерживается в этом режиме. CRM остаётся доступной.'}</p></>:<div className="caller-surface"><h3>Определение звонящих выключено</h3><p>Android требует поддерживаемую системную роль. Возможности отличаются по версии и устройству. Веб-прототип не запрашивает доступ к журналу звонков.</p><p className="caller-muted">Функция не должна задерживать или блокировать входящий вызов ради загрузки CRM.</p></div>}
    <button className="today-primary" onClick={onChannels}>Другие способы подключения</button>
  </section>;
}
