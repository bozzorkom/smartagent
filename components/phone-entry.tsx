'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import './phone-entry.css';
import { Personalization, type PersonalizationDraft } from './personalization';
import { WorkChannels } from './work-channels';

type Scenario = 'new' | 'existing' | 'returning' | 'multiple' | 'network' | 'provider' | 'expired' | 'limited' | 'blocked';
const scenarios: [Scenario, string][] = [['new','Новый пользователь'],['existing','Существующий пользователь'],['returning','Незавершённая настройка'],['multiple','Несколько пространств'],['network','Нет соединения'],['provider','Ошибка SMS-сервиса'],['expired','Код истёк'],['limited','Лимит отправки'],['blocked','Доступ ограничен']];
const routes = { new: ['Персонализация', 'Экран №03 · следующий этап проектирования'], existing: ['Ваше рабочее пространство', 'Маршрут существующего пользователя'], returning: ['Продолжим настройку', 'Экран №04 · подключение каналов'], multiple: ['Выберите пространство', 'Демонстрационные рабочие пространства'] };
const formatPhone = (n: string) => n.replace(/^(\d{2})(\d{0,3})(\d{0,2})(\d{0,2})$/, (_, a,b,c,d) => [a,b,c,d].filter(Boolean).join(' '));
export function PhoneEntry({ onBack }: { onBack: () => void }) {
  const [step,setStep] = useState<'phone'|'code'|'result'>('phone');
  const [phone,setPhone] = useState('');
  const [personalizationDraft,setPersonalizationDraft] = useState<PersonalizationDraft>({role:'',team:'',specialties:[],priorities:[]});
  const [code,setCode] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [scenario,setScenario] = useState<Scenario>('new');
  const [deadline,setDeadline] = useState(0);
  const [expires,setExpires] = useState(0);
  const [now,setNow] = useState(Date.now());
  const [attempts,setAttempts] = useState(0);
  const [generation,setGeneration] = useState(0);
  const [sheet,setSheet] = useState<'help'|'terms'|'privacy'|'support'|null>(null);
  const [space,setSpace] = useState('');
  const [scenariosOpen,setScenariosOpen] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);
  const remaining = Math.max(0, Math.ceil((deadline-now)/1000));
  const demoCode = String(123456 + generation);
  const valid = /^\d{9}$/.test(phone);
  useEffect(() => { title.current?.focus({ preventScroll:true }); },[step]);
  useEffect(() => { if (!deadline) return; const id=setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(id); },[deadline]);
  useEffect(() => () => { if(timer.current) clearTimeout(timer.current); },[]);
  useEffect(() => { if(sheet) dialog.current?.showModal(); else dialog.current?.close(); },[sheet]);
  function resetAttempt() { if(timer.current) clearTimeout(timer.current); pending.current=false; setBusy(false); setError(''); setCode(''); setAttempts(0); }
  function editPhone() { resetAttempt(); setStep('phone'); }
  function run(action:()=>void) { if(pending.current)return; pending.current=true;setBusy(true);setError('');timer.current=setTimeout(()=>{pending.current=false;setBusy(false);action();},650); }
  function send() {
    if(!valid || remaining>0 || busy)return;
    run(()=>{
      if(scenario==='network')return setError('Нет соединения. Проверьте сеть и повторите попытку.');
      if(scenario==='provider')return setError('Сервис SMS временно недоступен. Попробуйте позже.');
      if(scenario==='limited'){setDeadline(Date.now()+60000);setNow(Date.now());return setError('Слишком много запросов. Повторите через минуту.');}
      setGeneration(g=>g+1);setCode('');setAttempts(0);setDeadline(Date.now()+60000);setExpires(Date.now()+300000);setNow(Date.now());setStep('code');setSheet(null);
    });
  }
  function verify() {
    if(code.length!==6 || busy || attempts>=5)return;
    run(()=>{
      if(scenario==='network')return setError('Нет соединения. Код сохранён — попробуйте ещё раз.');
      if(scenario==='expired'||Date.now()>=expires)return setError('Срок действия кода истёк. Запросите новый код.');
      if(code!==demoCode){setAttempts(a=>a+1);return setError(attempts>=4?'Слишком много попыток. Запросите новый код после окончания таймера.':'Неверный код. Попробуйте ещё раз.');}
      if(scenario==='blocked')return setError('Доступ ограничен. Обратитесь в поддержку.');
      setCode('');setStep('result');
    });
  }
  const route = routes[scenario as keyof typeof routes] || routes.new;
  if (step==='result' && scenario==='new') return <Personalization onBack={editPhone} draft={personalizationDraft} onDraftChange={setPersonalizationDraft}/>;
  if (step==='result' && (scenario==='existing'||scenario==='returning'||(scenario==='multiple'&&space))) return <WorkChannels onBack={editPhone} role="" active startAtToday={scenario!=='returning'} backLabel="Назад к демо-входу"/>;
  return <section className="phone-entry">
    <header className="auth-nav"><button aria-label="Назад" onClick={()=>step==='phone'?onBack():editPhone()}><ArrowLeft size={21}/></button><span>SuperApp<span>.</span></span><span className="auth-demo-tag">Демо</span></header>
    <div className="auth-body" key={step}>
      <div className="auth-symbol" aria-hidden="true">{step==='result'?<Check size={29}/>:<LockKeyhole size={27} strokeWidth={1.5}/>}</div>
      <p className="auth-eyebrow">{step==='result'?'ПРОВЕРКА ЗАВЕРШЕНА':'ЕДИНЫЙ ВХОД В SUPERAPP'}</p>
      <h1 ref={title} tabIndex={-1}>{step==='phone'?'Начните с номера телефона':step==='code'?'Подтвердите номер':space||route[0]}</h1>
      <p className="auth-description">{step==='phone'?'Отправим код подтверждения, чтобы вы могли войти или создать аккаунт.':step==='code'?'Введите код из SMS, отправленного на номер':route[1]}</p>
      {step==='code'&&<><p className="masked-phone">+998 {phone.slice(0,2)} ••• •• {phone.slice(-2)}</p><button className="auth-link" onClick={editPhone}>Изменить номер</button></>}
      {step!=='result'?<form onKeyDown={e=>{if(e.key==='Enter'&&(e.nativeEvent.isComposing||e.nativeEvent.keyCode===229))e.preventDefault();}} onSubmit={e=>{e.preventDefault();step==='phone'?send():verify();}}>
        {step==='phone'?<><label htmlFor="auth-phone">Номер телефона</label><div className={`phone-field ${error?'has-error':''}`}><span>+998</span><input id="auth-phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="90 123 45 67" value={formatPhone(phone)} aria-invalid={!!error} aria-describedby="auth-error" disabled={busy} onBlur={()=>{if(phone&&!valid)setError('Введите номер телефона полностью.');}} onChange={e=>{let raw=e.target.value;let digits=raw.replace(/\D/g,'');if(digits.startsWith('998')&&(digits.length>9||raw.startsWith('+')))digits=digits.slice(3);if(digits.length>9||((raw.match(/\+/g)||[]).length>1)||(raw.startsWith('+')&&!raw.startsWith('+998'))){setError('Проверьте номер телефона. Поддерживается только +998.');return;}setPhone(digits);setError('');}}/></div></>:<><label htmlFor="auth-code">Код подтверждения</label><div className={`otp-field ${error?'has-error':''}`}><input id="auth-code" aria-label="Шестизначный код подтверждения" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} disabled={busy||attempts>=5} aria-invalid={!!error} aria-describedby="auth-error code-hint" onChange={e=>{setCode(e.target.value.replace(/\D/g,'').slice(0,6));setError('');}}/><div className="otp-cells" aria-hidden="true">{Array.from({length:6},(_,i)=><span key={i} className={code.length===i?'current':''}>{code[i]||''}</span>)}</div></div></>}
        <p id="auth-error" className="auth-error" role="alert">{error}</p>
        <button className="primary-button auth-submit" disabled={busy||(step==='phone'?(!valid||remaining>0):(code.length!==6||attempts>=5))}>{busy?<><LoaderCircle className="auth-spinner" size={18}/>{step==='phone'?'Отправляем код…':'Проверяем код…'}</>:step==='phone'?'Получить код':'Подтвердить и войти'}{!busy&&<ArrowRight size={18}/>}</button>
        {step==='phone'&&remaining>0&&<p className="auth-countdown" role="status">Повторить через {Math.floor(remaining/60).toString().padStart(2,'0')}:{(remaining%60).toString().padStart(2,'0')}</p>}
      </form>:<div className="auth-result"><p><Check size={18}/>Демо-проверка пройдена</p><p>Выберите демонстрационное пространство. Настоящий аккаунт не создаётся; доступ к данным других людей не предоставляется.</p>{scenario==='multiple'&&!space&&['Личное пространство','Агентство · демо'].map(name=><button className="auth-space" key={name} onClick={()=>setSpace(name)}>{name}<ArrowRight size={18}/></button>)}<button className="auth-link" onClick={()=>{resetAttempt();setSpace('');setDeadline(0);setExpires(0);setStep('phone');}}>Проверить другой сценарий</button></div>}
      {step==='phone'&&<p className="auth-legal">Продолжая, вы принимаете <button onClick={()=>setSheet('terms')}>Условия использования</button> и подтверждаете ознакомление с <button onClick={()=>setSheet('privacy')}>Политикой конфиденциальности</button>.</p>}
      {step==='code'&&<div className="auth-resend"><p>Не получили код?</p><button disabled={remaining>0||busy} onClick={send}>{remaining>0?`Отправить повторно через ${Math.floor(remaining/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}`:'Отправить код повторно'}</button><button className="auth-link" onClick={()=>setSheet('help')}>Проблемы с получением кода?</button></div>}
      <div className="auth-prototype" id="code-hint"><span className="auth-demo-dot"/>Прототип · SMS не отправляются.{step==='code'&&<><br/>Тестовый код: <strong>{demoCode}</strong>. {generation>1?'Используйте последний показанный код.':''}</>}</div>
      <details className="auth-scenarios" open={scenariosOpen}><summary onClick={e=>{e.preventDefault();setScenariosOpen(value=>!value);}}>Тестовые сценарии</summary><label htmlFor="auth-scenario">Поведение прототипа</label><select id="auth-scenario" value={scenario} disabled={busy} onChange={e=>{resetAttempt();setSpace('');setScenario(e.target.value as Scenario);if(step==='result')setStep('phone');}}>{scenarios.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select>{step==='code'&&<button onClick={()=>{setDeadline(0);setNow(Date.now());}}>Завершить ожидание повтора</button>}</details>
      <p className="auth-security"><ShieldCheck size={19}/><span>Номер используется для входа и защиты аккаунта. Доступ к звонкам и сообщениям настраивается отдельно.</span></p>
    </div>
    <dialog ref={dialog} className="auth-dialog" onCancel={()=>setSheet(null)} onClick={e=>{if(e.target===e.currentTarget)setSheet(null);}} aria-labelledby="auth-sheet-title"><div className="auth-sheet"><div className="auth-sheet-handle"/><button className="sheet-close" aria-label="Закрыть" onClick={()=>setSheet(null)}><X size={20}/></button><h2 id="auth-sheet-title">{sheet==='help'?'Не приходит код?':sheet==='terms'?'Условия использования':sheet==='privacy'?'Конфиденциальность':'Поддержка'}</h2><p>{sheet==='help'?'Проверьте номер, связь и сообщения на телефоне. Иногда SMS приходит с задержкой. В этом прототипе SMS не отправляются — используйте код на экране.':sheet==='support'?'Демонстрационный раздел. Канал поддержки пока не подключён. Для проверки ошибок используйте тестовые сценарии.': 'Это макет документа, а не действующие юридические условия. Для рабочего продукта текст должен пройти юридическую проверку. В демо номер и код хранятся только в памяти открытого экрана и не отправляются на сервер.'}</p>{sheet==='help'&&<><button className="primary-button" onClick={()=>{setSheet(null);editPhone();}}>Проверить номер</button><button className="auth-link" disabled={remaining>0||busy} onClick={send}>Отправить повторно{remaining>0?` · ${remaining} сек.`:''}</button><button className="auth-link" onClick={()=>setSheet('support')}>Связаться с поддержкой</button></>}</div></dialog>
  </section>;
}
