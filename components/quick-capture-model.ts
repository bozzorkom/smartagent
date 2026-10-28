import type { Client } from './today-state.ts';
import { normalizePhone, validDueAt } from './today-state.ts';
export type Capture = { mode: string; clientId: string; name: string; phone: string; need: string; price: string; currency: string; districts: string; channel: string; next: string; dueAt: string; note: string; duplicateConfirmed: boolean };
export const emptyCapture: Capture = { mode:'new',clientId:'',name:'',phone:'',need:'Купить',price:'',currency:'USD',districts:'',channel:'manual',next:'',dueAt:'',note:'',duplicateConfirmed:false };
export function captureMatches(value: Capture, clients: Client[]) { return clients.filter(c => !c.archived && ((value.phone && normalizePhone(value.phone) && normalizePhone(value.phone) === normalizePhone(c.phone)) || (value.name.trim() && c.name.trim().toLowerCase() === value.name.trim().toLowerCase()))); }
export function captureError(value: Capture, clients: Client[]) {
 if (value.mode === 'existing' ? !clients.some(c => c.id === value.clientId && !c.archived) : !value.name.trim()) return 'Укажите контакт.';
 if (value.mode === 'new' && value.phone && !normalizePhone(value.phone)) return 'Проверьте номер телефона.';
 if (!['Купить','Снять','Продать','Сдать'].includes(value.need)) return 'Выберите тип потребности.';
 if (!['USD','UZS'].includes(value.currency)) return 'Выберите валюту.';
 if (!['manual','phone','telegram','whatsapp','instagram'].includes(value.channel)) return 'Выберите канал.';
 if (value.price && (!/^\d+(\.\d{1,2})?$/.test(value.price) || Number(value.price) <= 0 || Number(value.price) > 1e15)) return 'Укажите положительную цену, не более двух знаков после точки.';
 if (value.next.trim() && !validDueAt(value.dueAt)) return 'Укажите дату и время следующего шага.';
 if (value.dueAt && !value.next.trim()) return 'Укажите следующий шаг.';
 if (value.mode === 'new' && captureMatches(value, clients).length && !value.duplicateConfirmed) return 'Проверьте совпадения контактов.';
 if (value.name.length > 120 || value.note.length > 2000 || value.districts.length > 300 || value.next.length > 200) return 'Сократите текст полей.';
 return '';
}
