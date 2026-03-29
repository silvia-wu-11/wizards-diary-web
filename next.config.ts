import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 使用 src 目录，app 路由在 src/app
  transpilePackages: ["motion"],
  experimental: {
    serverActions: {
      // 默认 1MB，base64 图片易超限；提高到 10MB 以支持多图上传
      bodySizeLimit: "10mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  // 欲了解所有可用选项，请参阅：
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "null-hc",
  project: "magic-diary-web",

  // 仅在 CI 环境中打印上传 source maps 的日志（如果禁用上传，此项不生效）
  silent: !process.env.CI,

  // ---------------------------------------------------------
  // Source Map 上传控制策略
  // 仅在明确设置了 SENTRY_UPLOAD_SOURCEMAPS=true 时，或者在生产环境 CI 中才上传
  // 如果不想上传 Source map，只需确保没有该环境变量即可（本地 pnpm build 默认不会上传）
  // ---------------------------------------------------------
  sourcemaps: {
    disable:
      process.env.NODE_ENV !== "production" ||
      process.env.SENTRY_UPLOAD_SOURCEMAPS !== "true",
  },

  // 欲了解所有可用选项，请参阅：
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // 上传更大范围的 source maps 以获得更美观的错误堆栈跟踪（会增加构建时间）
  widenClientFileUpload: true,

  // 通过 Next.js 的重写功能将浏览器请求路由到 Sentry，以绕过广告拦截器。
  // 这可能会增加你的服务器负载以及托管费用。
  // 注意：请检查配置的路由是否会与你的 Next.js 中间件发生匹配冲突，否则客户端错误的报告将会失败。
  tunnelRoute: "/monitoring",

  webpack: {
    // 启用对 Vercel Cron Monitors 的自动插桩。（目前尚不支持 App Router 的 route handlers。）
    // 更多信息请参阅以下链接：
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // 用于减小打包体积的 Tree-shaking 选项
    treeshake: {
      // 自动移除 Sentry 的调试日志语句，以减小打包体积
      removeDebugLogging: true,
    },
  },
});
