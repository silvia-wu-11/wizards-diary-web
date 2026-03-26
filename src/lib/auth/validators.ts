import { z } from 'zod';

/** 登录表单校验 */
export const signInSchema = z.object({
  username: z
    .string()
    .min(1, '请输入账号'),
  password: z
    .string()
    .min(1, '请输入密码'),
});

/** 注册表单校验（服务端） */
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, '账号至少 3 个字符')
    .max(20, '账号最多 20 个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '账号只能包含字母、数字和下划线'),
  password: z
    .string()
    .min(8, '密码至少 8 位')
    .max(72, '密码过长'),
  confirmPassword: z.string(),
  name: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword'],
});

export type SignInInput = z.infer<typeof signInSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
