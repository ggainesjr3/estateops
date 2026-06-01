import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ChunkReloadListener } from '@web/components/chunk-reload-listener';
import { ServiceWorkerRegister } from '@web/components/pwa/service-worker-register';
import './globals.css';

const APP_NAME = 'EstateOps';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Property management platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={APP_NAME} />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} min-h-screen font-sans antialiased overflow-x-hidden`}>
        <ServiceWorkerRegister />
        <ChunkReloadListener />
        {children}
      </body>
    </html>
  );
}
