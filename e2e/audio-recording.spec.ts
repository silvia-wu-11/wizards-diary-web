/**
 * 录音功能 E2E：
 * 覆盖首页录音的开始、停止、命名与删除确认主链路。
 */
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const E2E_USERNAME = process.env.E2E_EMAIL;
const prisma = new PrismaClient();

/**
 * 注入浏览器侧录音 mock，避免 E2E 依赖真实麦克风设备。
 */
async function mockBrowserAudio(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("wizards-diary-onboarding-completed", "true");
    window.URL.createObjectURL = () => "blob:e2e-audio-preview";
    window.URL.revokeObjectURL = () => {};

    class MockMediaRecorder {
      mimeType: string;
      state: "inactive" | "recording";
      ondataavailable: null | ((event: { data: Blob }) => void);
      onstop: null | (() => void);

      static isTypeSupported() {
        return true;
      }

      constructor(_stream: unknown, options: { mimeType?: string } = {}) {
        this.mimeType = options.mimeType ?? "audio/webm";
        this.state = "inactive";
        this.ondataavailable = null;
        this.onstop = null;
      }

      start() {
        this.state = "recording";
      }

      stop() {
        if (this.state !== "recording") return;
        this.state = "inactive";
        this.ondataavailable?.({
          data: new Blob(["voice"], { type: this.mimeType }),
        });
        this.onstop?.();
      }
    }

    class MockAudioContext {
      createMediaStreamSource() {
        return {
          connect() {},
        };
      }

      createAnalyser() {
        return {
          fftSize: 64,
          frequencyBinCount: 32,
          getByteFrequencyData(array: Uint8Array) {
            array.fill(128);
          },
        };
      }

      close() {
        return Promise.resolve();
      }
    }

    Object.defineProperty(window.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }],
        }),
      },
    });

    (
      window as unknown as { MediaRecorder: typeof MediaRecorder }
    ).MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;
    (window as unknown as { AudioContext: typeof AudioContext }).AudioContext =
      MockAudioContext as unknown as typeof AudioContext;
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(performance.now()), 16);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });
}

/**
 * 为当前测试上下文开启麦克风权限并注入录音 mock。
 */
async function prepareAudioContext(page: Page) {
  const baseURL = test.info().project.use.baseURL ?? "http://127.0.0.1:3000";
  const origin = new URL(baseURL).origin;

  await page.context().grantPermissions(["microphone"], {
    origin,
  });
  await mockBrowserAudio(page);
}

/**
 * 查询测试账号的一本日记本和一篇日记，供详情页录音用例直达路由。
 */
async function getDiarySeedForE2E() {
  test.skip(!E2E_USERNAME, "缺少 E2E_EMAIL 测试账号配置");

  const user = await prisma.user.findUnique({
    where: { accountId: E2E_USERNAME! },
    select: {
      books: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          entries: {
            orderBy: { createdAt: "asc" },
            select: { id: true },
            take: 1,
          },
        },
        take: 1,
      },
    },
  });

  const book = user?.books[0];
  test.skip(!book, "测试账号下没有可用日记本");

  return {
    bookId: book!.id,
    entryId: book!.entries[0]?.id ?? null,
  };
}

test.describe("Audio Recording", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("首页录音支持命名与删除确认", async ({ browserName, page }) => {
    test.skip(browserName !== "chromium", "录音 E2E 仅在 Chromium 下执行");
    await prepareAudioContext(page);

    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);

    const recordButton = page.getByRole("button", {
      name: /Begin Recording|Record Again/i,
    });
    await expect(recordButton).toBeVisible();

    await recordButton.click();
    await expect(page.getByText(/Recording/i)).toBeVisible();
    await expect(page.getByTestId("audio-recorder-waveform")).toBeVisible();

    await page.getByRole("button", { name: "Stop" }).click();

    const audioNameInput = page.getByPlaceholder("Untitled Voice Memory");
    await expect(audioNameInput).toBeVisible();

    await audioNameInput.fill("首页录音 E2E");
    await expect(page.getByText("首页录音 E2E").first()).toBeVisible();

    await page.getByRole("button", { name: "Discard recording" }).click();
    await expect(page.getByText("Forget this voice memory?")).toBeVisible();

    await page.getByRole("button", { name: "Keep It" }).click();
    await expect(audioNameInput).toHaveValue("首页录音 E2E");

    await page.getByRole("button", { name: "Discard recording" }).click();
    await page.getByRole("button", { name: "Discard" }).click();

    await expect(
      page.getByText("Capture a whisper, and bind this moment to your diary."),
    ).toBeVisible();
  });

  test("详情页编辑态支持录音命名与删除确认", async ({ browserName, page }) => {
    test.skip(browserName !== "chromium", "录音 E2E 仅在 Chromium 下执行");
    await prepareAudioContext(page);

    const seed = await getDiarySeedForE2E();

    if (seed.entryId) {
      await page.goto(`/diary/${seed.entryId}?open=1`);
      const editButton = page.getByRole("button", { name: "Edit" });
      await expect(editButton).toBeVisible({ timeout: 10000 });
      await editButton.click();
      await expect(page.getByRole("button", { name: "Save" })).toBeVisible({
        timeout: 10000,
      });
    } else {
      await page.goto(`/diary/new?bookId=${seed.bookId}&open=1&focus=1`);
      await expect(page.getByRole("button", { name: "Save" })).toBeVisible({
        timeout: 10000,
      });
    }

    const recorderField = page.getByTestId("audio-recorder-field");
    await expect(recorderField).toBeVisible();

    const recordButton = page.getByRole("button", {
      name: /Begin Recording|Record Again/i,
    });
    await recordButton.click();
    await expect(page.getByText(/Recording/i)).toBeVisible();

    await page.getByRole("button", { name: "Stop" }).click();

    const audioNameInput = page.getByPlaceholder("Untitled Voice Memory");
    await expect(audioNameInput).toBeVisible();
    await audioNameInput.fill("详情页录音 E2E");
    await expect(recorderField.getByText("详情页录音 E2E")).toBeVisible();

    await recorderField
      .getByRole("button", { name: "Discard recording" })
      .click();
    await expect(page.getByText("Forget this voice memory?")).toBeVisible();
    await page.getByRole("button", { name: "Keep It" }).click();
    await expect(audioNameInput).toHaveValue("详情页录音 E2E");

    await recorderField
      .getByRole("button", { name: "Discard recording" })
      .click();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByText("Forget this voice memory?")).not.toBeVisible();
    await expect(
      recorderField.getByText(
        "Capture a whisper, and bind this moment to your diary.",
      ),
    ).toBeVisible();
  });
});
