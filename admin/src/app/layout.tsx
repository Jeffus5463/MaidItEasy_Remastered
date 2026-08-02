import type { Metadata } from 'next';
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import { AdminGate } from '@/components/AdminGate';
import { Providers } from '@/components/Providers';
import './globals.css';

const display = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const body = Plus_Jakarta_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'MaidItEasy — Admin Console',
  description: 'Operations dashboard for MaidItEasy: dispatch, payments, partners, and services.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body style={{ fontFamily: 'var(--font-body)' }}>
        <Providers>
          <AdminGate>{children}</AdminGate>
        </Providers>
      </body>
    </html>
  );
}
