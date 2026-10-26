export type ChannelId = 'phone' | 'telegram' | 'whatsapp' | 'instagram';
export type ChannelStates = Record<ChannelId, string>;
export type Kind = 'overdue' | 'call' | 'message' | 'promise' | 'review' | 'unassigned' | 'teamOverdue';

export type Item = {
  id: string;
  kind: Kind;
  scope: 'mine' | 'team';
  channel?: ChannelId;
  type: string;
  title: string;
  context: string;
  source: string;
  time: string;
  note: string;
  status?: string;
  cta: string;
  reason: string;
  draft?: string;
  due: number;
  rank: number;
  custom?: boolean;
};

export type Task = { id: string; time: string; title: string; context: string; state: string; done: boolean; custom?: boolean };

export const channelNames: Record<ChannelId, string> = {
  phone: 'Телефония',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
};

export const problemStates = ['lost', 'error', 'limited', 'pending', 'unsupported'];

export const demoItems: Item[] = [
  {
    id: 'p128', kind: 'overdue', scope: 'mine', type: 'Просроченный контакт', title: 'Перезвонить клиенту',
    context: 'Клиент №128 · Аренда · Чиланзар · До $500', source: 'Задача создана вами', time: 'Вчера, 17:00',
    note: 'Контакт был запланирован на вчера, 17:00. Выполнение не отмечено.', cta: 'Открыть действие',
    reason: 'Вы запланировали контакт на 25 октября, 17:00. Выполнение не отмечено.', due: -420, rank: 0,
  },
  {
    id: 'c42', kind: 'call', scope: 'mine', channel: 'phone', type: 'Пропущенный звонок', title: 'Перезвонить на новый номер',
    context: 'Новый номер · +998 90 ••• •• 42', source: 'Рабочая телефония', time: 'Сегодня, 10:42',
    note: 'Подтверждённый пропущенный рабочий вызов. Обратный звонок не отмечен.', cta: 'Перезвонить',
    reason: 'Рабочая телефония передала пропущенный вызов в 10:42. Обратный звонок не отмечен.', due: 642, rank: 1,
  },
  {
    id: 'm84', kind: 'message', scope: 'mine', channel: 'telegram', type: 'Новое сообщение', title: 'Ответить клиенту',
    context: 'Клиент №84 · Telegram', source: 'Telegram Business', time: 'Сегодня, 10:15',
    note: '«Можно сегодня посмотреть квартиру?»', status: 'Ответ не зафиксирован', cta: 'Ответить',
    reason: 'Сообщение получено через подключённый Telegram в 10:15. Ответ в SuperApp не зафиксирован.',
    draft: 'Здравствуйте! Спасибо за сообщение. Уточню возможность показа и вернусь к вам. Какое время сегодня вам удобно?',
    due: 615, rank: 2,
  },
  {
    id: 'w91', kind: 'message', scope: 'mine', channel: 'whatsapp', type: 'Новое сообщение', title: 'Ответить клиенту',
    context: 'Клиент №91 · WhatsApp', source: 'WhatsApp Business', time: 'Сегодня, 09:52',
    note: '«Подскажите, предложение по Юнусабаду ещё актуально?»', status: 'Ответ не зафиксирован', cta: 'Ответить',
    reason: 'Сообщение получено через подключённый WhatsApp в 09:52. Ответ в SuperApp не зафиксирован.',
    draft: 'Здравствуйте! Спасибо, что написали. Проверю актуальность предложения и сообщу вам сегодня.',
    due: 592, rank: 2,
  },
  {
    id: 'p32', kind: 'promise', scope: 'mine', type: 'Обещанный контакт', title: 'Вы обещали связаться',
    context: 'Клиент №32 · Покупка', source: 'Задача создана вами', time: 'Сегодня, 09:30',
    note: 'Ожидал подборку квартир.', cta: 'Подготовить сообщение',
    reason: 'Вы обещали отправить подборку сегодня до 09:30. Выполнение не отмечено.',
    draft: 'Здравствуйте! Я обещал отправить подборку квартир — извините за задержку. Подготовлю варианты и пришлю сегодня. Ваш запрос ещё актуален?',
    due: 570, rank: 0,
  },
  {
    id: 'i7', kind: 'review', scope: 'mine', channel: 'instagram', type: 'Требует проверки', title: 'Проверьте обращение',
    context: 'Instagram · Новый контакт', source: 'Instagram Direct', time: 'Сегодня, 08:40',
    note: 'Сообщение получено, но статус ответа пока неизвестен.', cta: 'Открыть обращение',
    reason: 'Instagram передал новое сообщение. Источник не подтверждает, был ли уже ответ.', due: 520, rank: 3,
  },
  {
    id: 'u1', kind: 'unassigned', scope: 'team', type: 'Без ответственного', title: 'Новая заявка без ответственного',
    context: 'Рабочий Inbox · Аренда', source: 'Командный источник', time: 'Сегодня, 10:05',
    note: 'Обращение ожидает назначения.', cta: 'Назначить сотрудника',
    reason: 'Заявка поступила в общий рабочий Inbox и не назначена сотруднику.', due: 605, rank: 1,
  },
  {
    id: 'u2', kind: 'unassigned', scope: 'team', type: 'Без ответственного', title: 'Новая заявка без ответственного',
    context: 'Рабочий Inbox · Покупка', source: 'Командный источник', time: 'Сегодня, 10:31',
    note: 'Обращение ожидает назначения.', cta: 'Назначить сотрудника',
    reason: 'Заявка поступила в общий рабочий Inbox и не назначена сотруднику.', due: 631, rank: 1,
  },
  {
    id: 't77', kind: 'teamOverdue', scope: 'team', type: 'Просроченная задача команды', title: 'Нужен контроль',
    context: 'Сотрудник · Анна · Клиент №77', source: 'Задача команды', time: 'Вчера, 18:00',
    note: 'Срок прошёл. Выполнение не отмечено.', cta: 'Открыть задачу',
    reason: 'Рабочая задача команды просрочена со вчерашнего дня, 18:00. Проверьте, нужна ли помощь.', due: -360, rank: 0,
  },
];

export const demoTasks: Task[] = [
  { id: 't19', time: '09:00', title: 'Позвонить по заявке', context: 'Клиент №19 · Аренда', state: 'Выполнено вами', done: true },
  { id: 't42', time: '11:30', title: 'Отправить подборку', context: 'Клиент №42 · Двухкомнатная квартира', state: 'Запланировано', done: false },
  { id: 't57', time: '15:00', title: 'Подтвердить показ', context: 'Юнусабад · Клиент №57', state: 'Обычная задача', done: false },
  { id: 't21', time: '17:30', title: 'Связаться с собственником', context: 'Уточнить актуальность предложения №21', state: 'Запланировано', done: false },
];

export const results = ['Связались', 'Не ответил', 'Написал сообщение', 'Перенесли контакт', 'Клиент больше не ищет', 'Другое'];
export const employees = ['Анна', 'Тимур', 'Мадина'];

export const scenarios = {
  normal: 'Обычный день',
  loading: 'Загрузка',
  offline: 'Нет соединения',
  error: 'Не удалось загрузить',
  newUser: 'Новый пользователь',
  callsError: 'Ошибка блока звонков',
  saveError: 'Ошибка сохранения',
  delay: 'Задержка Telegram',
  noAi: 'Подсказки недоступны',
} as const;
export type Scenario = keyof typeof scenarios;

export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function byPriority(a: Item, b: Item) {
  return a.rank - b.rank || a.due - b.due || a.id.localeCompare(b.id);
}

export function clockNow() {
  const date = new Date();
  const zone = 'Asia/Tashkent';
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: zone }).format(date));
  const day = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: zone }).format(date);
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: zone }).format(date);
  const greeting = hour >= 5 && hour < 12 ? 'Доброе утро' : hour >= 12 && hour < 18 ? 'Добрый день' : 'Добрый вечер';
  return { greeting, day: day.charAt(0).toUpperCase() + day.slice(1), time };
}
