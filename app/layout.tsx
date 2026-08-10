import type { Metadata } from 'next';
import { Inter, Tajawal } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const tajawal = Tajawal({ subsets: ['arabic'], weight: ['400', '500', '700'], variable: '--font-tajawal' });

export const metadata: Metadata = {
  title: 'SpeakFlow AI — Personal English Coach',
  description: 'A live, voice-first English speaking coach that remembers you, session after session.',
  manifest: '/manifest.json',
};

export const viewport = { themeColor: '#0a0f1f' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: { colorPrimary: '#d4af37', colorBackground: '#0e1526' },
      }}
    >
      <html lang="en" className={`${inter.variable} ${tajawal.variable}`}>
        <body className="min-h-screen font-sans antialiased">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
