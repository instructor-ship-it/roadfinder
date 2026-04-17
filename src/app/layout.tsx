import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TC Work Zone Locator - Traffic Controller SLK Tracking',
  description:
    'Mobile-first web app for Traffic Controllers in Western Australia. Locate work zones by road ID and SLK, track GPS position, view speed limits offline with 69,000+ roads.',
  keywords: [
    'Traffic Controller',
    'WA Roads',
    'SLK Tracking',
    'Work Zone',
    'MRWA',
    'GPS Tracking',
    'Speed Zones',
    'Western Australia',
    'Road Safety',
  ],
  authors: [{ name: 'TC Work Zone Locator' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/icon-192.png',
  },
  themeColor: '#0ea5e9',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TC Locator',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'TC Work Zone Locator',
    description:
      'Work zone planning and real-time SLK tracking for Traffic Controllers in Western Australia',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TC Work Zone Locator',
    description: 'Work zone planning and real-time SLK tracking for Traffic Controllers',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ServiceWorkerRegistration />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
