'use server';

import { signIn } from '@/auth';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { registerSchema } from '@/lib/auth/validators';

export type RegisterResult =
  | { success: true }
  | { success: false; error: string };

/** 注册并自动登录 */
export async function register(
  formData: FormData,
  redirectTo: string = '/'
): Promise<RegisterResult> {
  try {
    const raw = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      name: (formData.get('name') as string) || undefined,
    };

    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const msg = first?.message ?? '请求参数无效';
      if (msg.includes('两次密码')) return { success: false, error: '两次密码不一致' };
      if (msg.includes('邮箱')) return { success: false, error: msg };
      if (msg.includes('密码')) return { success: false, error: msg };
      return { success: false, error: msg };
    }

    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: '该邮箱已被注册' };
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: { email, passwordHash, name: name || null },
    });

    // 使用 redirect: false 避免 Server Action 中 signIn 抛出重定向导致 500
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      // 用户已创建但登录失败，返回成功让用户手动登录
      console.warn('[register] signIn after create failed:', result.error);
      return { success: true };
    }

    return { success: true };
  } catch (err) {
    console.error('[register]', err);
    const message = err instanceof Error ? err.message : '注册失败';
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return { success: false, error: '该邮箱已被注册' };
    }
    if (message.includes('connect') || message.includes('database')) {
      return { success: false, error: '数据库连接失败，请检查 DATABASE_URL 配置' };
    }
    return { success: false, error: '注册失败，请重试' };
  }
}
