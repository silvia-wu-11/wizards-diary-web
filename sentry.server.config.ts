/* 后端 Node.js 环境监控，包括 API 和 Server Actions 错误拦截 */
// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://19432e56fdb03ff3e3642bf002207711@o4511122676056064.ingest.us.sentry.io/4511122683658240",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,
  integrations: [
    // 告诉 Sentry 捕获哪些级别的 console 日志
    Sentry.captureConsoleIntegration({
      levels: ["warn", "error"], // 过滤掉普通的 console.log 和 console.info
    }),
  ],

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
