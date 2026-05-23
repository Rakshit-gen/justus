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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'chatme',
    statusBarStyle: 'default',
  },
};

export const viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

// Pre-paints the right theme before React hydrates so users don't flash white
// when their preference is dark.
const themeInitScript = `
(function () {
  try {
    var pref = localStorage.getItem('chatme.theme');
    var dark =
      pref === 'dark' ||
      (pref !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

// Register service worker on first load.
const swInitScript = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function (err) {
      console.warn('SW registration failed', err);
    });
  });
}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: swInitScript }} />
      </head>
      <body className="h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
