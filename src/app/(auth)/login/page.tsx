'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { PasswordInput } from '@/app/components/auth/PasswordInput';
import { z } from 'zod';
import { signInSchema } from '@/lib/auth/validators';
import { useDiaryStore } from '@/app/store';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError('');
    setPasswordError('');
    setFormError('');

    const parsed = signInSchema.safeParse({ username, password });
    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      setUsernameError(flattened.fieldErrors.username?.[0] ?? '');
      setPasswordError(flattened.fieldErrors.password?.[0] ?? '');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        username: parsed.data.username,
        password: parsed.data.password,
        redirect: false,
      });

      if (result?.error) {
        setFormError('The sigil rejected that username or password.');
        return;
      }
      if (result?.ok) {
        useDiaryStore.setState({ isLoaded: false });
        router.push(from);
        router.refresh();
      }
    } catch {
      setFormError('The sign-in spell failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="font-display text-2xl tracking-widest text-faded-gold">
          Wizard&apos;s Diary
        </h1>
        <p className="mt-2 text-sm text-parchment-white/80">
          Sign in to resume your tale.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" data-onboarding-target="step1-login">
        {formError && (
          <div
            role="alert"
            className="rounded-md border border-vintage-burgundy/50 bg-vintage-burgundy/20 px-3 py-2 text-sm text-red-200"
          >
            {formError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-parchment-white/10 border-rusty-copper text-parchment-white placeholder:text-parchment-white/50"
            aria-invalid={!!usernameError}
            aria-describedby={usernameError ? 'username-error' : undefined}
          />
          {usernameError && (
            <p id="username-error" className="text-sm text-red-300">
              {usernameError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-parchment-white/10 border-rusty-copper text-parchment-white placeholder:text-parchment-white/50"
            error={passwordError}
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-vintage-burgundy hover:bg-vintage-burgundy/90 text-parchment-white"
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      <p className="text-center text-sm text-parchment-white/70">
        No account yet?{' '}
        <Link
          href="/register"
          className="text-faded-gold underline hover:no-underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
