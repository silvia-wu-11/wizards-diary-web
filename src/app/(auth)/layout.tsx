import Layout from '@/app/components/Layout';

export const dynamic = 'force-dynamic';

/** 登录/注册页使用与主应用一致的魔法风格布局 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
