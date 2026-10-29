import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SuperApp — ваш бизнес, в одном приложении', description: 'Интерактивный демо-прототип рабочего приложения риэлтора: обращения, клиенты, задачи и база объектов недвижимости.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body>{children}</body></html>; }
