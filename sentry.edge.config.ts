/* 针对 Next.js Edge Runtime 比如中间件的监控 */
// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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
