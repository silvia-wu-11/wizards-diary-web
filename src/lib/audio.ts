/**
 * 日记录音相关的客户端工具与共享类型。
 */
export interface DiaryAudioDraft {
  file: File | null;
  previewUrl: string | null;
  audioUrl: string | null;
  name: string;
  durationSec: number | null;
  mimeType: string | null;
}

export interface UploadDiaryAudioResult {
  url: string;
  path: string;
  mimeType: string;
}

export function createEmptyDiaryAudioDraft(): DiaryAudioDraft {
  return {
    file: null,
    previewUrl: null,
    audioUrl: null,
    name: "",
    durationSec: null,
    mimeType: null,
  };
}

export async function uploadDiaryAudio(
  file: File,
  entryId?: string,
): Promise<UploadDiaryAudioResult> {
  try {
    const formData = new FormData();
    formData.set("file", file);
    if (entryId) {
      formData.set("entryId", entryId);
    }

    const response = await fetch("/api/diary/audio", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(payload?.error || "上传录音失败");
    }

    return (await response.json()) as UploadDiaryAudioResult;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`[uploadDiaryAudio] ${detail}`);
  }
}

export function isBlobPreviewUrl(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith("blob:"));
}
