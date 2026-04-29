import type { Metadata } from 'next';
import { DM_Mono, DM_Sans } from 'next/font/google';
import './globals.css';
import { TourProvider } from '../components/tour';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans'
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['400', '500']
});

export const metadata: Metadata = {
  title: 'TaskOps Core',
  description: 'Task-first operations workspace'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body>
        <TourProvider>
          {children}
        </TourProvider>
      </body>
    </html>
  );
}
