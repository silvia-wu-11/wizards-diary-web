import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from './components/AppShell';
import { Toaster } from './components/ui/sonner';

export const metadata: Metadata = {
  title: "Wizard's Diary Web App",
  description: 'Record your magical journey...',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
