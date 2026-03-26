/**
 * 文件说明：NextAuth (Auth.js) 核心配置文件
 * 作用：配置鉴权提供者（Providers）、会话策略（Session）以及 JWT/Session 数据透传回调。
 * 关键设计点：使用 Credentials Provider 实现自定义的账号/密码登录，
 * 并通过 callbacks 将用户 ID 等核心信息持久化到 JWT 中，避免频繁查询数据库。
 */
import { verifyPassword } from "@/lib/auth/password";
import { signInSchema } from "@/lib/auth/validators";
import { prisma } from "@/lib/db";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // 使用账号和密码进行鉴权
    Credentials({
      credentials: {
        username: { label: "账号", type: "text" },
        password: { label: "密码", type: "password" },
      },
      /**
       * 授权逻辑处理
       * @param credentials - 用户输入的凭证（账号、密码）
       * @returns 验证成功返回用户对象，失败返回 null
       */
      authorize: async (credentials) => {
        // 1. 使用 Zod 校验输入格式
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;

        // 2. 检查用户是否存在
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return null;

        // 3. 验证密码 Hash 是否匹配
        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // 4. 返回的用户对象将被传递给 jwt callback
        return {
          id: user.id,
          username: user.username,
          name: user.name ?? undefined,
        };
      },
    }),
  ],
  session: {
    // 使用 JWT 策略来管理会话，状态保存在客户端 Token 中
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 会话有效期：30 天
  },
  pages: {
    // 自定义登录页面路由，未登录访问受保护路由时会重定向到此页面
    signIn: "/login",
  },
  callbacks: {
    /**
     * JWT 回调：在创建或更新 JWT 时触发。
     * 作用：将 user 对象中的自定义字段（如 id, name）写入 token 持久化。
     * 注意：`user` 参数仅在用户初次登录成功时存在。
     */
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.name = user.name;
      }
      return token;
    },
    /**
     * Session 回调：在调用 `auth()` (服务端) 或 `useSession()` (客户端) 时触发。
     * 作用：把 token 中携带的自定义字段传递给 session 对象，安全地暴露给客户端。
     */
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.name = token.name as string | null;
      }
      return session;
    },
  },
});
