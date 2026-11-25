
import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from './components/language-provider';

export const metadata: Metadata = {
  title: 'Kentalya Welfare Management System',
  description:
    'Employee welfare, job cards and workplace management system for Kentalya PLC.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
