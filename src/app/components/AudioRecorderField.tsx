/**
 * 日记录音字段组件：负责录音、预览、命名与删除确认。
 */
"use client";

import {
  createEmptyDiaryAudioDraft,
  isBlobPreviewUrl,
  type DiaryAudioDraft,
} from "@/lib/audio";
import { format } from "date-fns";
import { Loader2, Mic, Square, Trash2, Waves } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { ConfirmActionModal } from "./ConfirmActionModal";

const MAX_WAVE_BARS = 32;
const DEFAULT_WAVE_LEVELS = Array.from({ length: MAX_WAVE_BARS }, () => 18);

interface AudioRecorderFieldProps {
  value: DiaryAudioDraft;
  onChange: (value: DiaryAudioDraft) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  maxDurationSec?: number;
  disabled?: boolean;
  variant?: "dashboard" | "diary-view";
  showInlineRecordButton?: boolean;
  /**
   * 空闲且无录音时不渲染完整容器（Dashboard 外部录音按钮场景），或仅渲染开始录音按钮（showInlineRecordButton=true）。
   */
  hideUntilActive?: boolean;
}

export interface AudioRecorderFieldHandle {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

function formatDuration(totalSeconds: number | null): string {
  const safeSeconds = Math.max(0, totalSeconds ?? 0);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getSupportedAudioMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return (
    candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ||
    "audio/webm"
  );
}

function buildDefaultAudioName(): string {
  return `Voice Memory ${format(new Date(), "MM-dd HH:mm")}`;
}

export const AudioRecorderField = forwardRef<
  AudioRecorderFieldHandle,
  AudioRecorderFieldProps
>(function AudioRecorderField(
  {
    value,
    onChange,
    onRecordingChange,
    maxDurationSec = 120,
    disabled = false,
    variant = "dashboard",
    showInlineRecordButton = true,
    hideUntilActive = false,
  },
  ref,
) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const autoStoppedRef = useRef(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [waveLevels, setWaveLevels] = useState<number[]>(DEFAULT_WAVE_LEVELS);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasAudio = Boolean(value.previewUrl || value.audioUrl);
  const previewUrl = value.previewUrl || value.audioUrl;
  // Diary inner page only keeps "delete recording"; re-record is handled by deleting first.
  const shouldShowRecordAgainButton =
    showInlineRecordButton && variant !== "diary-view";

  const containerClassName = useMemo(() => {
    if (variant === "diary-view") {
      return "rounded-xl border border-vintage-burgundy/20 bg-black/5 p-4 shadow-inner";
    }
    return "rounded-xl border border-rusty-copper/20 bg-black/5 p-4 shadow-inner";
  }, [variant]);

  const buttonBaseClassName =
    variant === "diary-view"
      ? "inline-flex items-center gap-2 rounded-full border border-rusty-copper/40 bg-rusty-copper/10 px-4 py-2 font-['Cinzel'] text-sm font-bold text-rusty-copper transition-all hover:bg-rusty-copper hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      : "inline-flex items-center gap-2 rounded-full border border-rusty-copper/40 bg-rusty-copper/10 px-4 py-2 font-['Cinzel'] text-sm font-bold text-rusty-copper transition-all hover:bg-rusty-copper hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

  const nameInputClassName =
    variant === "diary-view"
      ? "min-w-0 flex-1 bg-transparent outline-none text-vintage-burgundy placeholder:text-vintage-burgundy/40"
      : "min-w-0 flex-1 bg-transparent outline-none text-rusty-copper placeholder:text-rusty-copper/40";

  const resetRecordingResources = async () => {
    try {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      analyserRef.current = null;
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }
      mediaRecorderRef.current = null;
      startedAtRef.current = null;
      setWaveLevels(DEFAULT_WAVE_LEVELS);
      setElapsedSec(0);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[AudioRecorderField.resetRecordingResources]", detail);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  };

  const handleDeleteAudio = async () => {
    try {
      setShowDeleteConfirm(false);
      onChange(createEmptyDiaryAudioDraft());
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      toast.error(
        `[AudioRecorderField] Failed to discard recording: ${detail}`,
      );
    }
  };

  const startWaveAnimation = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const blockSize = Math.max(
        1,
        Math.floor(dataArray.length / MAX_WAVE_BARS),
      );
      const nextLevels = Array.from({ length: MAX_WAVE_BARS }, (_, index) => {
        const slice = dataArray.slice(
          index * blockSize,
          (index + 1) * blockSize,
        );
        const average =
          slice.reduce((sum, current) => sum + current, 0) / slice.length || 0;
        return Math.max(16, Math.min(100, (average / 255) * 100));
      });
      setWaveLevels(nextLevels);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const startRecording = async () => {
    try {
      if (disabled || isPreparing || isRecording) return;
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof MediaRecorder === "undefined"
      ) {
        toast.error("This browser cannot capture audio.");
        return;
      }

      setIsPreparing(true);
      autoStoppedRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      recordedChunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const mime = recorder.mimeType || mimeType;
          const blob = new Blob(recordedChunksRef.current, { type: mime });
          const extension = mime.split("/")[1]?.split(";")[0] ?? "webm";
          const file = new File(
            [blob],
            `diary-audio-${Date.now()}.${extension}`,
            {
              type: mime,
            },
          );
          const duration = autoStoppedRef.current
            ? maxDurationSec
            : Math.max(
                1,
                Math.round(
                  (Date.now() - (startedAtRef.current ?? Date.now())) / 1000,
                ),
              );
          const nextValue: DiaryAudioDraft = {
            file,
            previewUrl: URL.createObjectURL(blob),
            audioUrl: null,
            name: value.name.trim() || buildDefaultAudioName(),
            durationSec: duration,
            mimeType: mime,
          };
          onChange(nextValue);
          if (autoStoppedRef.current) {
            toast.info(`Maximum length reached (${maxDurationSec}s).`);
          }
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          toast.error(
            `[AudioRecorderField] Failed to prepare recording: ${detail}`,
          );
        } finally {
          await resetRecordingResources();
          setIsRecording(false);
          onRecordingChange?.(false);
          setIsPreparing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      onRecordingChange?.(true);
      setElapsedSec(0);
      startWaveAnimation();
      timerRef.current = window.setInterval(() => {
        const startedAt = startedAtRef.current;
        if (!startedAt) return;
        const nextElapsed = Math.min(
          maxDurationSec,
          Math.floor((Date.now() - startedAt) / 1000),
        );
        setElapsedSec(nextElapsed);
        if (nextElapsed >= maxDurationSec) {
          autoStoppedRef.current = true;
          stopRecording();
        }
      }, 200);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      toast.error(`[AudioRecorderField] Failed to start recording: ${detail}`);
      await resetRecordingResources();
      setIsRecording(false);
      onRecordingChange?.(false);
      setIsPreparing(false);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      startRecording,
      stopRecording,
    }),
    [startRecording],
  );

  useEffect(() => {
    return () => {
      void resetRecordingResources();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (isBlobPreviewUrl(value.previewUrl)) {
        URL.revokeObjectURL(value.previewUrl!);
      }
    };
  }, [value.previewUrl]);

  const shouldHideContainer =
    hideUntilActive && !hasAudio && !isRecording && !isPreparing;

  if (shouldHideContainer && !showInlineRecordButton) {
    return null;
  }

  return (
    <>
      {shouldHideContainer && showInlineRecordButton ? (
        <button
          type="button"
          onClick={startRecording}
          className={buttonBaseClassName}
          disabled={disabled || isPreparing}>
          {isPreparing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          Begin Recording
        </button>
      ) : (
        <div className={containerClassName} data-testid="audio-recorder-field">
          {isRecording ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                  </span>
                  <span className="font-['Cinzel'] text-sm font-bold text-red-600">
                    Recording {formatDuration(elapsedSec)}
                  </span>
                </div>
                {showInlineRecordButton && (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className={buttonBaseClassName}>
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                )}
              </div>

              <div
                className="relative flex h-20 items-end justify-center gap-[3px] overflow-hidden rounded-lg bg-black/10 px-3 py-4"
                data-testid="audio-recorder-waveform">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0, rgba(255,255,255,0.25) 1px, transparent 1px, transparent 6px)",
                  }}
                />
                {waveLevels.map((level, index) => (
                  <div
                    key={`${index}-${level}`}
                    className="w-[3px] flex-none rounded-sm bg-gradient-to-t from-rusty-copper/60 via-faded-gold/80 to-faded-gold transition-all shadow-[0_0_8px_rgba(201,184,150,0.18)]"
                    style={{ height: `${level}%` }}
                  />
                ))}
              </div>
            </div>
          ) : hasAudio ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 rounded-lg border border-faded-gold/15 bg-white/20 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-['Cinzel'] text-sm text-rusty-copper">
                    <Waves className="h-4 w-4" />
                    <input
                      type="text"
                      maxLength={50}
                      value={value.name}
                      onChange={(event) =>
                        onChange({
                          ...value,
                          name: event.target.value,
                        })
                      }
                      placeholder="Untitled Voice Memory"
                      className={nameInputClassName}
                      disabled={disabled}
                    />
                  </div>
                  <span className="font-['Cinzel'] text-xs text-rusty-copper/70">
                    {formatDuration(value.durationSec)}
                  </span>
                </div>

                <div className="flex flex-nowrap items-center gap-3">
                  {previewUrl && (
                    <div className="min-w-0 flex-1">
                      <audio
                        controls
                        src={previewUrl}
                        className="w-full"
                        preload="metadata"
                      />
                    </div>
                  )}
                  <div className="flex flex-none items-center gap-2">
                    {shouldShowRecordAgainButton && (
                      <button
                        type="button"
                        onClick={startRecording}
                        className={buttonBaseClassName}
                        title="Record Again"
                        aria-label="Record Again"
                        disabled={disabled || isPreparing}>
                        {isPreparing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-900/10 px-4 py-2 font-['Cinzel'] text-sm font-bold text-red-500 transition-all hover:bg-red-800/20"
                      title="Discard recording"
                      aria-label="Discard recording"
                      disabled={disabled}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-rusty-copper/20 bg-white/15 px-4 py-4">
              <div className="font-['Caveat'] text-2xl text-rusty-copper/60">
                Capture a whisper, and bind this moment to your diary.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {showInlineRecordButton && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className={buttonBaseClassName}
                    disabled={disabled || isPreparing}>
                    {isPreparing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                    Begin Recording
                  </button>
                )}
                <span className="font-['Cinzel'] text-xs text-rusty-copper/60">
                  When the ink settles, you can listen, name it, or discard it.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmActionModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAudio}
        isSubmitting={false}
        title="Forget this voice memory?"
        description="This will discard the recording and its name. This cannot be undone."
        confirmText="Discard"
      />
    </>
  );
});
