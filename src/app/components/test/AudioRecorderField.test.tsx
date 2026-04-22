/**
 * AudioRecorderField 关键交互测试：
 * 覆盖自动停止、展示名称编辑以及删除确认流程。
 */
import { createEmptyDiaryAudioDraft, type DiaryAudioDraft } from "@/lib/audio";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioRecorderField } from "../AudioRecorderField";

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode;
    }) => <div {...props}>{children}</div>,
  },
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);

  public mimeType: string;
  public state: "inactive" | "recording" = "inactive";
  public ondataavailable: ((event: BlobEvent) => void) | null = null;
  public onstop: (() => void | Promise<void>) | null = null;

  /**
   * 创建录音器 mock。
   */
  constructor(
    public stream: MediaStream,
    options?: { mimeType?: string },
  ) {
    this.mimeType = options?.mimeType ?? "audio/webm";
  }

  /**
   * 启动录音。
   */
  start() {
    this.state = "recording";
  }

  /**
   * 停止录音并同步抛出数据。
   */
  stop() {
    if (this.state !== "recording") return;
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["voice"], { type: this.mimeType }),
    } as BlobEvent);
    void this.onstop?.();
  }
}

class MockAudioContext {
  public close = vi.fn().mockResolvedValue(undefined);

  /**
   * 返回可连接的音频源 mock。
   */
  createMediaStreamSource() {
    return {
      connect: vi.fn(),
    };
  }

  /**
   * 返回固定频谱数据，驱动实时声波渲染。
   */
  createAnalyser() {
    return {
      fftSize: 64,
      frequencyBinCount: 32,
      getByteFrequencyData: (data: Uint8Array) => data.fill(128),
    };
  }
}

interface ControlledFieldProps {
  initialValue?: DiaryAudioDraft;
  maxDurationSec?: number;
  onRecordingChange?: (isRecording: boolean) => void;
}

/**
 * 创建受控包装组件，便于断言 onChange 后的 UI 结果。
 */
function ControlledField({
  initialValue = createEmptyDiaryAudioDraft(),
  maxDurationSec = 120,
  onRecordingChange,
}: ControlledFieldProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <AudioRecorderField
      value={value}
      onChange={setValue}
      onRecordingChange={onRecordingChange}
      maxDurationSec={maxDurationSec}
    />
  );
}

describe("AudioRecorderField", () => {
  const mockTrackStop = vi.fn();
  const mockGetUserMedia = vi.fn();
  const mockCreateObjectURL = vi.fn(() => "blob:mock-audio-url");
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: mockTrackStop }],
    } as unknown as MediaStream);

    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: mockGetUserMedia,
      },
    });

    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.stubGlobal("BlobEvent", class BlobEvent {} as typeof BlobEvent);

    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("录音达到最大时长后自动停止并生成预览", async () => {
    vi.useFakeTimers();
    const handleRecordingChange = vi.fn();

    render(
      <ControlledField
        maxDurationSec={1}
        onRecordingChange={handleRecordingChange}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Begin Recording" }));
      await Promise.resolve();
    });

    expect(screen.queryByText(/^Recording\b/i)).not.toBeNull();
    expect(screen.getByTestId("audio-recorder-waveform")).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.queryByRole("button", { name: "Record Again" }),
    ).not.toBeNull();

    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(mockToast.info).toHaveBeenCalledWith("Maximum length reached (1s).");
    expect(handleRecordingChange).toHaveBeenNthCalledWith(1, true);
    expect(handleRecordingChange).toHaveBeenLastCalledWith(false);
  });

  it("支持编辑录音展示名称并实时反映到预览区域", () => {
    render(
      <ControlledField
        initialValue={{
          file: null,
          previewUrl: "https://example.com/audio.webm",
          audioUrl: "https://example.com/audio.webm",
          name: "旧的展示名称",
          durationSec: 8,
          mimeType: "audio/webm",
        }}
      />,
    );

    const input = screen.getByDisplayValue("旧的展示名称");
    fireEvent.change(input, { target: { value: "新的展示名称" } });

    expect(screen.queryByDisplayValue("新的展示名称")).not.toBeNull();
  });

  it("删除录音时支持取消与确认两条路径", async () => {
    render(
      <ControlledField
        initialValue={{
          file: null,
          previewUrl: "https://example.com/audio.webm",
          audioUrl: "https://example.com/audio.webm",
          name: "晨间咒语",
          durationSec: 6,
          mimeType: "audio/webm",
        }}
      />,
    );

    const recorder = screen.getByTestId("audio-recorder-field");

    fireEvent.click(
      within(recorder).getByRole("button", { name: "Discard recording" }),
    );
    await screen.findByText("Forget this voice memory?");

    fireEvent.click(screen.getByRole("button", { name: "Keep It" }));

    await waitFor(() => {
      expect(screen.queryByText("Forget this voice memory?")).toBeNull();
    });
    expect(screen.queryByDisplayValue("晨间咒语")).not.toBeNull();

    fireEvent.click(
      within(screen.getByTestId("audio-recorder-field")).getByRole("button", {
        name: "Discard recording",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    await waitFor(() => {
      expect(
        screen.queryByText(
          "Capture a whisper, and bind this moment to your diary.",
        ),
      ).not.toBeNull();
    });
    expect(screen.queryByDisplayValue("晨间咒语")).toBeNull();
  });
});
