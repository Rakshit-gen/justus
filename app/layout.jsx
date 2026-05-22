import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'chatme',
  description: 'Fast, simple real-time chat with read receipts',
};

export const viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
