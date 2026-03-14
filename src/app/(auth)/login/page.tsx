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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setFormError('');

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      setEmailError(flattened.fieldErrors.email?.[0] ?? '');
      setPasswordError(flattened.fieldErrors.password?.[0] ?? '');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });

      if (result?.error) {
        setFormError('邮箱或密码错误');
        return;
      }
      if (result?.ok) {
        router.push(from);
        router.refresh();
      }
    } catch {
      setFormError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="font-display text-2xl tracking-widest text-faded-gold">
          魔法日记本
        </h1>
        <p className="mt-2 text-sm text-parchment-white/80">登录以继续</p>
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
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-parchment-white/10 border-rusty-copper text-parchment-white placeholder:text-parchment-white/50"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'email-error' : undefined}
          />
          {emailError && (
            <p id="email-error" className="text-sm text-red-300">
              {emailError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
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
          {isLoading ? '登录中...' : '登录'}
        </Button>
      </form>

      <p className="text-center text-sm text-parchment-white/70">
        还没有账号？{' '}
        <Link
          href="/register"
          className="text-faded-gold underline hover:no-underline"
        >
          切换到创建账号
        </Link>
      </p>
    </div>
  );
}
