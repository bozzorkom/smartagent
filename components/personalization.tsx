'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, UserRound, UsersRound, Building2, Check, PhoneIncoming, Bell, Database, ScanSearch, CalendarCheck, ChartNoAxesCombined, UserPlus, LoaderCircle, SlidersHorizontal } from 'lucide-react';
import './personalization.css';
const roles = [
  { id:'solo', title:'Работаю самостоятельно', description:'Веду своих клиентов и объекты сам', icon:UserRound },
  { id:'agent', title:'Работаю в агентстве', description:'Я риэлтор в команде', icon:UsersRound },
  { id:'owner', title:'Управляю агентством', description:'Руководитель или владелец команды', icon:Building2 },
];
const specializations = ['Аренда','Вторичное жильё','Новостройки','Коммерческая недвижимость','Земельные участки','Другое'];
const goals = [
  {id:'leads',title:'Не пропускать обращения',description:'Звонки, сообщения и новые заявки',icon:PhoneIncoming},
  {id:'clients',title:'Помнить о клиентах',description:'Перезвоны, обещания и следующие шаги',icon:Bell},
  {id:'database',title:'Навести порядок в базе',description:'Контакты, запросы и объекты',icon:Database},
  {id:'match',title:'Быстрее находить варианты',description:'Подбор объектов и клиентов',icon:ScanSearch},
  {id:'deals',title:'Контролировать показы и сделки',description:'Встречи, этапы и договорённости',icon:CalendarCheck},
  {id:'team',title:'Управлять командой',description:'Сотрудники, заявки и результаты',icon:UsersRound},
  {id:'income',title:'Контролировать доход',description:'Комиссии и аналитика',icon:ChartNoAxesCombined},
  {id:'growth',title:'Находить новых клиентов',description:'Источники обращений и продвижение',icon:UserPlus},
];
export function Personalization({onBack}:{onBack:()=>void}) {
  const [role,setRole]=useState('');
  const [team,setTeam]=useState('');
  const [specialties,setSpecialties]=useState<string[]>([]);
  const [priorities,setPriorities]=useState<string[]>([]);
  const [notice,setNotice]=useState('');
  const [mode,setMode]=useState('normal');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  const [result,setResult]=useState<'created'|'skipped'|null>(null);
  const [retrySkip,setRetrySkip]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const lock=useRef(false);
  const root=useRef<HTMLElement>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  useEffect(()=>{root.current?.closest('.app-content')?.scrollTo(0,0);root.current?.querySelector('.personal-content')?.scrollTo(0,0);root.current?.querySelector('h1')?.focus({preventScroll:true});},[result]);
  function save(skip=false){
    if(lock.current||(!skip&&!role))return;
    lock.current=true;setBusy(true);setError(false);setRetrySkip(skip);
    timer.current=setTimeout(()=>{lock.current=false;setBusy(false);if(mode==='offline'||mode==='error'){setError(true);return;}setResult(skip?'skipped':'created');},700);
  }
  function toggleGoal(id:string){
    if(priorities.includes(id)){setPriorities(priorities.filter(x=>x!==id));setNotice('');}
    else if(priorities.length===3)setNotice('Выберите не больше трёх задач. Остальные можно добавить позже.');
    else {setPriorities([...priorities,id]);setNotice('');}
  }
  const first = role==='owner'?['leads','team','deals']:role==='agent'?['leads','clients','deals']:['leads','clients','match'];
  const ordered=[...first.map(id=>goals.find(goal=>goal.id===id)!),...goals.filter(goal=>!first.includes(goal.id))];
  return <section className="personalization" ref={root} aria-busy={busy}>
    <header className="personal-nav"><button aria-label="Назад" disabled={busy} onClick={()=>result?setResult(null):onBack()}><ArrowLeft size={21}/></button><span>Настройка {result?'2':'1'} из 2</span>{!result?<button disabled={busy} onClick={()=>save(true)}>Позже</button>:<span className="personal-demo">Демо</span>}</header>
    {result?<div className="personal-content personal-next"><span className="personal-symbol"><SlidersHorizontal size={28}/></span><p className="personal-kicker">СЛЕДУЮЩИЙ ЭТАП · №04</p><h1 tabIndex={-1}>Подключение рабочих каналов</h1><p>Здесь вы сможете выбрать рабочие источники обращений. Этот экран спроектируем следующим.</p><div className="personal-summary"><strong>{result==='skipped'?'Нейтральное личное пространство':roles.find(r=>r.id===role)?.title}</strong><p>{result==='skipped'?'Персонализация не завершена. Роль и специализация не назначены.':specialties.length?specialties.join(' · '):'Без выбранной специализации'}</p>{result==='created'&&role==='owner'&&team&&<p>Размер команды: {team}</p>}{result==='created'&&priorities.length>0&&<ul>{priorities.map(id=><li key={id}>{goals.find(g=>g.id===id)?.title}</li>)}</ul>}<span>Каналы не подключены</span></div><p className="personal-disclaimer">Это результат демонстрации. Пространство и агентство не создавались, платные инструменты не подключены.</p><button className="primary-button" onClick={()=>setResult(null)}>Вернуться к настройке<ArrowLeft size={18}/></button></div>:<>
    <div className="personal-content">
      <p className="personal-kicker">ВАШ РИТМ. ВАШИ ИНСТРУМЕНТЫ.</p><h1 tabIndex={-1}>Настроим SuperApp под вас</h1><p className="personal-subtitle">Расскажите немного о своей работе. Мы предложим подходящие инструменты.</p>
      {mode==='offline'&&<p className="personal-banner" role="status">Нет соединения. Выбор остаётся в памяти этого экрана, но не отправляется на сервер.</p>}
      {mode==='invitation'&&<p className="personal-banner">Демо: есть приглашение в агентство. Его можно будет принять отдельно. Личные данные не передаются автоматически.</p>}
      <fieldset disabled={busy} className="personal-section"><legend>Как вы работаете?</legend><p>Выберите наиболее подходящий вариант</p><div className="personal-roles">{roles.map(({id,title,description,icon:Icon})=><label className="personal-role" key={id} data-selected={role===id}><input type="radio" name="work-role" value={id} checked={role===id} onChange={()=>setRole(id)}/><Icon size={23} strokeWidth={1.5}/><span><strong>{title}</strong><small>{description}</small></span><span className="personal-check" aria-hidden="true">{role===id&&<Check size={13}/>}</span></label>)}</div>
      <div className="personal-expand" data-open={role==='owner'} inert={role!=='owner'}><div>{role==='owner'&&<fieldset className="personal-team"><legend>Сколько риэлторов в вашей команде?</legend><p>Необязательно</p><div className="personal-chips">{['1–2','3–7','8–20','Больше 20'].map(value=><button type="button" aria-pressed={team===value} key={value} onClick={()=>setTeam(team===value?'':value)}>{value}</button>)}</div></fieldset>}</div></div>
      {role==='agent'&&<p className="personal-hint">Позже вы сможете присоединиться к пространству своего агентства.</p>}</fieldset>
      <fieldset disabled={busy} className="personal-section"><legend>С чем вы работаете?</legend><p>Можно выбрать несколько направлений</p><div className="personal-chips">{specializations.map(value=><button type="button" key={value} aria-pressed={specialties.includes(value)} onClick={()=>setSpecialties(specialties.includes(value)?specialties.filter(x=>x!==value):[...specialties,value])}>{specialties.includes(value)&&<Check size={14}/>} {value}</button>)}</div></fieldset>
      <fieldset disabled={busy} className="personal-section"><legend>Что хотите улучшить в первую очередь?</legend><p className="personal-count">Выберите до трёх задач<span aria-live="polite">{priorities.length} / 3</span></p><p className="personal-limit" role="status">{notice}</p><div className="personal-goals">{ordered.map(({id,title,description,icon:Icon})=><button type="button" key={id} aria-pressed={priorities.includes(id)} onClick={()=>toggleGoal(id)}><span className="personal-goal-top"><Icon size={22} strokeWidth={1.5}/><span className="personal-check" aria-hidden="true">{priorities.includes(id)&&<Check size={13}/>}</span></span><strong>{title}</strong><small>{description}</small></button>)}</div></fieldset>
      <details className="personal-tests"><summary>Демо · тестовые состояния</summary><label htmlFor="personal-mode">Сценарий</label><select id="personal-mode" disabled={busy} value={mode} onChange={e=>{setMode(e.target.value);setError(false);}}><option value="normal">Обычное сохранение</option><option value="error">Ошибка сохранения</option><option value="offline">Нет соединения</option><option value="invitation">Приглашение в агентство</option></select><p>Ответы остаются при возврате с этапа №04. После перезагрузки демо-выбор сбрасывается.</p></details>
    </div>
    <footer className="personal-footer">{error&&<div className="personal-error" role="alert"><strong>Не удалось сохранить настройки</strong><p>Проверьте соединение и попробуйте ещё раз. Ответы не потеряны.</p></div>}<button className="primary-button" disabled={busy||(!role&&!error)} onClick={()=>save(error?retrySkip:false)}>{busy?<><LoaderCircle className="auth-spinner" size={18}/>Подготавливаем пространство…</>:error?'Повторить':<>Создать моё пространство<ArrowRight size={18}/></>}</button><p>Настройки и инструменты можно изменить позже</p></footer>
    </>}
  </section>;
}
