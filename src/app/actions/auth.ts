'use server';

import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { registerSchema } from '@/lib/auth/validators';

export type RegisterResult =
  | { success: true }
  | { success: false; error: string };

/** 注册（由调用方在客户端完成自动登录与跳转） */
export async function register(formData: FormData): Promise<RegisterResult> {
  try {
    const raw = {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      name: (formData.get('name') as string) || undefined,
    };

    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const msg = first?.message ?? 'The request could not be read';
      if (msg.includes('Passwords do not match')) {
        return { success: false, error: 'Passwords do not match' };
      }
      if (msg.includes('Username')) return { success: false, error: msg };
      if (msg.includes('Password')) return { success: false, error: msg };
      return { success: false, error: msg };
    }

    const { username, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { accountId: username },
    });
    if (existing) {
      return { success: false, error: 'This username is already claimed' };
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        accountId: username,
        passwordHash,
        nickname: name || null,
      },
    });

    // 不在此处 signIn：Server Action 中设置的 cookie 可能无法正确传递到客户端
    // 由调用方在客户端调用 signIn 完成自动登录并跳转
    return { success: true };
  } catch (err) {
    console.error('[register]', err);
    const message = err instanceof Error ? err.message : 'Registration failed';
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return { success: false, error: 'This username is already claimed' };
    }
    if (message.includes('connect') || message.includes('database')) {
      return { success: false, error: 'Database connection failed. Check the DATABASE_URL setting.' };
    }
    return { success: false, error: 'Registration failed. Try again.' };
  }
}
