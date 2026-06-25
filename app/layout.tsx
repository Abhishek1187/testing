import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeadManager — AI-Powered Lead Intelligence',
  description:
    'Capture leads, send tracked emails, and monitor open and click rates with AI-powered categorization.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
