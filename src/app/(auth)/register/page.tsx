'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { PasswordInput } from '@/app/components/auth/PasswordInput';
import { register } from '@/app/actions/auth';
import { z } from 'zod';
import { registerSchema } from '@/lib/auth/validators';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('from') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setConfirmPasswordError('');
    setFormError('');

    const parsed = registerSchema.safeParse({
      email,
      password,
      confirmPassword,
      name: name || undefined,
    });

    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      setEmailError(flattened.fieldErrors.email?.[0] ?? '');
      setConfirmPasswordError(
        flattened.fieldErrors.confirmPassword?.[0] ??
        flattened.formErrors?.[0] ??
        ''
      );
      if (flattened.fieldErrors.password?.[0]) setFormError(flattened.fieldErrors.password[0]);
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set('email', email);
      formData.set('password', password);
      formData.set('confirmPassword', confirmPassword);
      if (name) formData.set('name', name);

      const result = await register(formData, redirectTo);

      if (!result.success) {
        if (result.error.includes('邮箱')) setEmailError(result.error);
        else if (result.error.includes('密码')) setConfirmPasswordError(result.error);
        else setFormError(result.error);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setFormError('注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="font-display text-2xl tracking-widest text-faded-gold">
          创建账号
        </h1>
        <p className="mt-2 text-sm text-parchment-white/80">加入魔法日记本</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          />
          {emailError && (
            <p className="text-sm text-red-300">{emailError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="至少 8 位"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-parchment-white/10 border-rusty-copper text-parchment-white placeholder:text-parchment-white/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认密码</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="再次输入密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-parchment-white/10 border-rusty-copper text-parchment-white placeholder:text-parchment-white/50"
            error={confirmPasswordError}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">昵称（可选）</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="你的昵称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-parchment-white/10 border-rusty-copper text-parchment-white placeholder:text-parchment-white/50"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-vintage-burgundy hover:bg-vintage-burgundy/90 text-parchment-white"
        >
          {isLoading ? '创建中...' : '创建账号'}
        </Button>
      </form>

      <p className="text-center text-sm text-parchment-white/70">
        已有账号？{' '}
        <Link
          href="/login"
          className="text-faded-gold underline hover:no-underline"
        >
          返回登录
        </Link>
      </p>
    </div>
  );
}
