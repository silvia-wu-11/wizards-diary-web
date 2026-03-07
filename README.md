# Wizard's Diary Web App

This is a code bundle for Wizard's Diary Web App. The original project is available at https://www.figma.com/design/k5fRdHqNSQQ2Bh3JW3fn1P/Wizard-s-Diary-Web-App.

## Running the code

Run `pnpm i` to install the dependencies.

### Auth 模块（登录/注册）

1. 复制 `.env.example` 为 `.env.local`
2. 运行 `npx auth secret` 生成 `AUTH_SECRET` 并写入 `.env.local`
3. 配置 Supabase PostgreSQL：在 [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → Database 获取连接串，写入 `.env.local` 的 `DATABASE_URL`
4. 运行 `pnpm db:migrate` 在 Supabase 上创建表

Run `pnpm dev` to start the development server.
  