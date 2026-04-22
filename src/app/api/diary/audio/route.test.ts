import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/supabase/storage", () => ({
  uploadAudio: vi.fn(),
}));

import { auth } from "@/auth";
import { uploadAudio } from "@/lib/supabase/storage";

describe("POST /api/diary/audio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", name: "Tester" },
      expires: "9999-12-31T23:59:59.999Z",
    } as never);
  });

  it("上传录音成功并返回 URL", async () => {
    vi.mocked(uploadAudio).mockResolvedValue({
      url: "https://example.com/audio.webm",
      path: "user-123/audio.webm",
    });

    const formData = new FormData();
    formData.set(
      "file",
      new File(["audio-content"], "memory.webm", { type: "audio/webm" }),
    );
    formData.set("entryId", "entry-1");

    const req = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as Request;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe("https://example.com/audio.webm");
    expect(uploadAudio).toHaveBeenCalledWith(
      expect.any(File),
      "user-123",
      "entry-1",
      "memory.webm",
    );
  });

  it("未登录时返回 401", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const formData = new FormData();
    formData.set(
      "file",
      new File(["audio-content"], "memory.webm", { type: "audio/webm" }),
    );

    const req = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as Request;

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("上传非音频文件时返回 400", async () => {
    const formData = new FormData();
    formData.set("file", new File(["text"], "oops.txt", { type: "text/plain" }));

    const req = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as Request;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("仅支持音频文件上传");
  });
});
