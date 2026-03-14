'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { PasswordInput } from '@/app/components/auth/PasswordInput';
import { z } from 'zod';
import { signInSchema, registerSchema } from '@/lib/auth/validators';
import { register } from '@/app/actions/auth';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 打开时优先展示的模式，用于新手引导等场景 */
  initialMode?: 'login' | 'register';
  /** 登录或注册成功时调用（在关闭弹窗前） */
  onSuccess?: () => void;
  /** 弹窗关闭时调用（含取消、成功等所有关闭场景） */
  onClose?: () => void;
}

export function AuthModal({ open, onOpenChange, initialMode = 'login', onSuccess, onClose }: AuthModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function resetForm() {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setFormError('');
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetForm();
      onClose?.();
    }
    onOpenChange(next);
  }

  async function handleLogin(e: React.FormEvent) {
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
        onSuccess?.();
        handleOpenChange(false);
        router.refresh();
      }
    } catch {
      setFormError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
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
        flattened.fieldErrors.confirmPassword?.[0] ?? flattened.formErrors?.[0] ?? ''
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

      const result = await register(formData);
      if (!result.success) {
        if (result.error.includes('邮箱')) setEmailError(result.error);
        else if (result.error.includes('密码')) setConfirmPasswordError(result.error);
        else setFormError(result.error);
        return;
      }
      onSuccess?.();
      // 注册成功后自动登录并跳转到首页
      const signInResult: any = await signIn('credentials', {
        email: parsed.data.email,
        password: parsed.data.password,
        callbackUrl: '/',
        redirect: true,
      });
      console.log('signInResult',signInResult);
      if (signInResult?.error) {
        setFormError('账号已创建，请手动登录');
      }
      // redirect: true 成功时会直接跳转，不会执行到此
    } catch {
      setFormError('注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-castle-stone border-rusty-copper text-parchment-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-faded-gold font-display">
            {session ? '账户' : mode === 'login' ? '登录' : '创建账号'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {session ? (
            <div className="space-y-4">
              <p className="text-parchment-white/80">
                已登录为 <span className="text-faded-gold">{session.user?.email}</span>
              </p>
              <Button
                variant="outline"
                className="w-full border-rusty-copper text-faded-gold hover:bg-rusty-copper/30"
                onClick={() => {
                  signOut({ callbackUrl: '/login' });
                  handleOpenChange(false);
                  router.refresh();
                }}
              >
                登出
              </Button>
            </div>
          ) : (
          <>
          {formError && (
            <div
              role="alert"
              className="rounded-md border border-vintage-burgundy/50 bg-vintage-burgundy/20 px-3 py-2 text-sm text-red-200"
            >
              {formError}
            </div>
          )}

          {!session && mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-email">邮箱</Label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-parchment-white/10 border-rusty-copper text-parchment-white"
                  aria-invalid={!!emailError}
                />
                {emailError && <p className="text-sm text-red-300">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-password">密码</Label>
                <PasswordInput
                  id="auth-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-parchment-white/10 border-rusty-copper text-parchment-white"
                  error={passwordError}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-vintage-burgundy hover:bg-vintage-burgundy/90"
              >
                {isLoading ? '登录中...' : '登录'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-email">邮箱</Label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-parchment-white/10 border-rusty-copper text-parchment-white"
                  aria-invalid={!!emailError}
                />
                {emailError && <p className="text-sm text-red-300">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-password">密码</Label>
                <PasswordInput
                  id="auth-password"
                  placeholder="至少 8 位"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-parchment-white/10 border-rusty-copper text-parchment-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-confirm">确认密码</Label>
                <PasswordInput
                  id="auth-confirm"
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-parchment-white/10 border-rusty-copper text-parchment-white"
                  error={confirmPasswordError}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-name">昵称（可选）</Label>
                <Input
                  id="auth-name"
                  type="text"
                  placeholder="你的昵称"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-parchment-white/10 border-rusty-copper text-parchment-white"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-vintage-burgundy hover:bg-vintage-burgundy/90"
              >
                {isLoading ? '创建中...' : '创建账号'}
              </Button>
            </form>
          )}

          {!session && (
          <p className="text-center text-sm text-parchment-white/70">
            {mode === 'login' ? (
              <>
                还没有账号？{' '}
                <button
                  type="button"
                  className="text-faded-gold underline hover:no-underline"
                  onClick={() => setMode('register')}
                >
                  切换到创建账号
                </button>
              </>
            ) : (
              <>
                已有账号？{' '}
                <button
                  type="button"
                  className="text-faded-gold underline hover:no-underline"
                  onClick={() => setMode('login')}
                >
                  去登录
                </button>
              </>
            )}
          </p>
          )}
          </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
