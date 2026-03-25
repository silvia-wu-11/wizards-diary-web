import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 使用 src 目录，app 路由在 src/app
  transpilePackages: ['motion'],
  experimental: {
    serverActions: {
      // 默认 1MB，base64 图片易超限；提高到 10MB 以支持多图上传
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
