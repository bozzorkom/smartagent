export type CallStatus = 'incoming' | 'connecting' | 'active' | 'ended' | 'missed' | 'answeredElsewhere' | 'declined' | 'canceled' | 'failed' | 'unknown';
export type CallOutcome = 'Связались' | 'Не ответил' | 'Перезвонить позже' | 'Не требует ответа' | 'Не относится к работе' | 'Другое';
export type ContextAccess = 'ready' | 'loading' | 'error' | 'restricted';
export type CallEvent = {
  provider: string; externalId: string; sequence: number; status: CallStatus;
  startedAt: string; receivedAt: string; endedAt?: string; durationSeconds?: number;
  phone?: string; scope: 'mine' | 'team'; control: 'events' | 'voip'; contextAccess: ContextAccess;
  line?: string; answeredBy?: string; contextVariant?: 'owner' | 'multiple' | 'roles' | 'archived';
};
export type CallRecord = CallEvent & {
  id: string; clientId?: string; linkSource?: 'crm' | 'user'; businessVersion: number; assignee?: string; identityReview?: boolean;
  result?: { operationId: string; outcome: CallOutcome; note: string; savedAt: string; source: 'user'; callbackAttempt: boolean };
};
export type CallDraft = {
  operationId: string; expectedVersion: number; outcome: CallOutcome | ''; note: string;
  followUp: string; taskTitle: string; callbackAttempt: boolean; dirty: boolean;
  clientName?: string; clientRequest?: string; selectedClient?: string;
};

export { callLabels } from './today-state';
export const callOutcomes: CallOutcome[] = ['Связались','Не ответил','Перезвонить позже','Не требует ответа','Не относится к работе','Другое'];
export const callCases = {
  ended:'После разговора · известный клиент', missed:'Пропущенный звонок', incoming:'Входящий · события АТС',
  voip:'Управляемый VoIP · концепт', unknown:'Номер не найден', multiple:'Несколько совпадений', hidden:'Номер скрыт',
  owner:'Звонит собственник', requests:'Несколько запросов', roles:'Два рабочих контекста', answeredElsewhere:'Ответил коллега', team:'Общая линия · без ответственного',
  declined:'Вызов отклонён', canceled:'Отменён звонящим', failed:'Не удалось соединиться', uncertain:'Результат неизвестен',
  delayed:'Событие пришло с задержкой', noDuration:'Длительность не предоставлена', loading:'Контекст загружается',
  contextError:'Ошибка загрузки клиента', restricted:'Нет доступа к контексту', archived:'Архивный контакт',
} as const;
export type CallCase = keyof typeof callCases;

export function phoneLabel(phone?: string) {
  if (!phone) return 'Номер не определён';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9 ? `+${digits.slice(0,-9)} ${digits.slice(-9,-7)} ••• •• ${digits.slice(-2)}` : 'Номер не определён';
}

export function callTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Tashkent',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
}
