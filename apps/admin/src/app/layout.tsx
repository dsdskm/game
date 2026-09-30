import type { Metadata } from 'next';
import './style.css';

export const metadata: Metadata = { title: 'Yes or No | 관리자' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}