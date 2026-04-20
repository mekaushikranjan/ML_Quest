import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './ml-quest.css';
import { Toaster } from '@/components/ui/sonner';
import Providers from '@/components/layout/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ML Quest — Practice DSA',
  description: 'Solve coding problems and improve your skills',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
