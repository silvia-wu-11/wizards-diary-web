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
      const msg = first?.message ?? '请求参数无效';
      if (msg.includes('两次密码')) return { success: false, error: '两次密码不一致' };
      if (msg.includes('账号')) return { success: false, error: msg };
      if (msg.includes('密码')) return { success: false, error: msg };
      return { success: false, error: msg };
    }

    const { username, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return { success: false, error: '该账号已被注册' };
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: { username, passwordHash, name: name || null },
    });

    // 不在此处 signIn：Server Action 中设置的 cookie 可能无法正确传递到客户端
    // 由调用方在客户端调用 signIn 完成自动登录并跳转
    return { success: true };
  } catch (err) {
    console.error('[register]', err);
    const message = err instanceof Error ? err.message : '注册失败';
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return { success: false, error: '该账号已被注册' };
    }
    if (message.includes('connect') || message.includes('database')) {
      return { success: false, error: '数据库连接失败，请检查 DATABASE_URL 配置' };
    }
    return { success: false, error: '注册失败，请重试' };
  }
}
