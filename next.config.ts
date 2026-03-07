import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 使用 src 目录，app 路由在 src/app
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  transpilePackages: ['motion'],
};

export default nextConfig;
