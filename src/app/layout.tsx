import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from './components/AppShell';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './providers/AuthProvider';
import { OnboardingContextProvider } from './components/onboarding/OnboardingContext';
import { OnboardingProvider } from './components/onboarding/OnboardingProvider';

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
        <AuthProvider>
          <AppShell>
            <OnboardingContextProvider>
              <OnboardingProvider>{children}</OnboardingProvider>
            </OnboardingContextProvider>
          </AppShell>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
