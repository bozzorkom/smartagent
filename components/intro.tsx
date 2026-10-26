'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, Smartphone, Tablet, RotateCcw, Signal, Wifi, BatteryFull, Layers, ChevronRight } from 'lucide-react';
import { IntroScene } from './intro-scenes';
const slides = [
  { label: 'Всё в одном', title: 'Весь ваш бизнес.\nВ одном приложении.', description: 'Клиенты, объекты, показы и сделки — в единой рабочей системе' },
  { label: 'Клиенты и объекты', title: 'Клиенты и объекты.\nВсё под рукой.', description: 'История обращений, запросы клиентов и ваша база недвижимости — в одном месте' },
  { label: 'Умный подбор', title: 'Подходящие объекты находят своих клиентов.', description: 'Умный подбор помогает увидеть совпадения между запросами и предложениями' },
  { label: 'Путь к сделке', title: 'От первого обращения до сделки.', description: 'Планируйте показы, сохраняйте договорённости и отслеживайте следующие шаги' },
  { label: 'Ваш рабочий день', title: 'Ваш рабочий день — под контролем.', description: 'SuperApp помогает замечать важное, помнить обещания и планировать следующие действия' },
  { label: 'Результаты', title: 'Больше ясности.\nБольше возможностей.', description: 'Контролируйте рабочие обращения, продвижение сделок и результаты команды' },
];
export function Intro() {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [device, setDevice] = useState<'phone' | 'tablet'>('phone');
  const [destination, setDestination] = useState<'register' | 'login' | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [landscape, setLandscape] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageNotice, setStorageNotice] = useState('');
  function remember(value: string) {
    try {
      document.cookie = `superapp_intro=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
      if (!document.cookie.split('; ').includes(`superapp_intro=${value}`)) setStorageNotice('Браузер не сохраняет прогресс. После закрытия знакомство начнётся заново.');
    } catch { setStorageNotice('Сохранение прогресса недоступно в этом браузере.'); }
  }
  useEffect(() => {
    const saved = document.cookie.split('; ').find(item => item.startsWith('superapp_intro='))?.split('=')[1];
    if (saved === 'register' || saved === 'login') setDestination(saved);
    else if (saved && /^[0-5]$/.test(saved)) setSlide(Number(saved));
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    content.current?.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [slide, destination, ready]);
  function navigate(index: number) {
    const next = Math.max(0, Math.min(5, index));
    setDirection(next < slide || destination ? 'backward' : 'forward');
    setSlide(next); setDestination(null); remember(String(next));
  }
  function openDestination(next: 'register' | 'login') { setDestination(next); remember(next); }
  const current = slides[slide];
  return <main className="studio"><header className="studio-header"><a className="studio-brand" href="/" aria-label="SuperApp, начало"><span className="brand-symbol"><Layers size={19}/></span>SuperApp<span className="studio-divider"/><span className="studio-subtitle">Design preview</span></a><span className="prototype-tag"><span/>Интерактивный прототип</span></header>
    <div className="studio-body"><aside className="story-nav"><span className="eyebrow">ПЕРВОЕ ЗНАКОМСТВО</span><h2>Большая система.<br/>Простое начало.</h2><p className="studio-description">Шесть шагов к новому<br/>рабочему пространству.</p><nav aria-label="Экраны знакомства">{slides.map((item, i) => <button key={item.label} className={i === slide && !destination ? 'selected' : ''} onClick={() => navigate(i)} aria-current={i === slide && !destination ? 'step' : undefined}><span className="nav-number">0{i + 1}</span><span>{item.label}</span>{i === slide && !destination && <ChevronRight size={15}/>}</button>)}</nav><div className="story-note"><span className="note-line"/><p>Меньше рутины.<br/>Больше внимания к людям.</p></div></aside>
    <section className="device-area" aria-label="Макет приложения"><div className="device-toolbar"><div className="device-switch" aria-label="Устройство"><button aria-label="iPhone" aria-pressed={device === 'phone'} onClick={() => setDevice('phone')}><Smartphone size={15}/>iPhone</button><button aria-label="iPad" aria-pressed={device === 'tablet'} onClick={() => setDevice('tablet')}><Tablet size={16}/>iPad</button></div><button className="restart" aria-label="Начать знакомство заново" onClick={() => navigate(0)}><RotateCcw size={15}/></button></div>
    <div className="preview-options"><button aria-pressed={largeText} onClick={() => setLargeText(!largeText)}>Крупный текст</button>{device === 'tablet' && <button aria-pressed={landscape} onClick={() => setLandscape(!landscape)}>{landscape ? 'Альбомная' : 'Портретная'}</button>}</div><div data-ready={ready} className={`device ${device}${landscape && device === 'tablet' ? ' landscape' : ''}${largeText ? ' large-text' : ''}`}><span className="sr-only" role="status">{destination ? (destination === 'register' ? 'Регистрация — следующий этап' : 'Вход — следующий этап') : `Слайд ${slide + 1} из 6: ${current.label}`}</span><div className="status-bar" aria-hidden="true"><strong>9:41</strong><span className="dynamic-island"/><div><Signal size={15}/><Wifi size={15}/><BatteryFull size={21}/></div></div><div className="app-header"><span className="app-brand">SuperApp<span className="brand-period">.</span></span>{destination ? <button onClick={() => navigate(slide)}>Назад</button> : slide < 5 ? <button onClick={() => openDestination('register')}>Пропустить</button> : <button onClick={() => navigate(slide - 1)}>Назад</button>}</div>
    <div ref={content} className="app-content" onKeyDown={e => { if (destination || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return; if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); navigate(slide + (e.key === 'ArrowRight' ? 1 : -1)); } }} onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => { if (!touch.current || destination) return; const x = touch.current.x - e.changedTouches[0].clientX; const y = touch.current.y - e.changedTouches[0].clientY; if (Math.abs(x) > 55 && Math.abs(x) > Math.abs(y) * 1.5) navigate(slide + (x > 0 ? 1 : -1)); touch.current = null; }}>
    {destination ? <section className="handoff"><span className="handoff-icon"><Layers size={32}/></span><span className="eyebrow">СЛЕДУЮЩИЙ ЭТАП</span><h1 ref={heading} tabIndex={-1}>{destination === 'register' ? 'Ваше новое рабочее пространство.' : 'С возвращением.'}</h1><p>{destination === 'register' ? 'Здесь начнётся регистрация и настройка SuperApp под вашу работу.' : 'Здесь появится вход в ваш аккаунт SuperApp.'}</p><div className="handoff-notice">Это дизайн-прототип. Экран {destination === 'register' ? 'регистрации' : 'входа'} спроектируем следующим. Данные не отправляются.</div><button className="text-button" onClick={() => navigate(0)}><ArrowLeft size={16}/> Вернуться к знакомству</button></section> : <section key={slide} className="slide" data-direction={direction} data-scene={slide}><div className="intro-copy"><div className="section-kicker">{slide === 0 ? 'РАБОЧАЯ СИСТЕМА РИЭЛТОРА' : `0${slide + 1} / ${current.label.toUpperCase()}`}</div><h1 ref={heading} tabIndex={-1}>{current.title}</h1><p>{current.description}</p></div><IntroScene slide={slide}/></section>}
    </div>
    {!destination && <footer className="app-footer"><div className="progress" aria-label="Слайды знакомства">{slides.map((item, i) => <button aria-label={`Слайд ${i + 1} из 6: ${item.label}`} aria-current={slide === i ? 'step' : undefined} onClick={() => navigate(i)} key={item.label}><span className={i === slide ? 'active' : ''}/></button>)}</div><button className="primary-button" onClick={() => slide < 5 ? navigate(slide + 1) : openDestination('register')}>{slide < 5 ? 'Продолжить' : 'Начать работу'}<ArrowRight size={19}/></button><div className="secondary-row">{slide === 5 ? <button onClick={() => openDestination('login')}>У меня уже есть аккаунт</button> : slide > 0 ? <button onClick={() => navigate(slide - 1)}>Назад</button> : <span>Создано для вашей работы</span>}</div><p className="concept-note">Концепция платформы · возможности появятся поэтапно</p></footer>}
    {storageNotice && <p className="storage-notice" role="status">{storageNotice}</p>}<div className="home-bar" aria-hidden="true"><span/></div></div><div className="device-caption"><span>{destination ? 'Следующий этап' : `INTRO ${String(slide + 1).padStart(2, '0')} / 06`}</span><span>Mono-Ink · iOS</span></div></section></div><footer className="studio-footer"><span>SUPERAPP <span className="footer-dot">/</span> PRODUCT DESIGN</span><span>Первое знакомство <span className="footer-dot">·</span> v0.1</span></footer></main>;
}
