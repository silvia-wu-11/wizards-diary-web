/**
 * Supabase Storage 上传封装。
 * 服务端调用，使用 `SUPABASE_SERVICE_ROLE_KEY`。
 */
import { createClient } from "@supabase/supabase-js";
import { decode } from "base64-arraybuffer";

const IMAGE_BUCKET = "diary-images";
const AUDIO_BUCKET = "diary-audios";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key);
}

/** 路径仅保留安全字符，避免 Supabase InvalidKey。 */
function sanitizePathSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function sanitizeFilename(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) {
    return sanitizePathSegment(filename);
  }
  const basename = sanitizePathSegment(filename.slice(0, lastDot));
  const ext = sanitizePathSegment(filename.slice(lastDot + 1));
  return `${basename}.${ext}`;
}

function buildStoragePath(
  userId: string,
  entryId: string | undefined,
  name: string,
) {
  const safeUserId = sanitizePathSegment(userId);
  const safeEntryId = entryId ? sanitizePathSegment(entryId) : undefined;
  if (safeEntryId) {
    return `${safeUserId}/${safeEntryId}/${name}`;
  }
  return `${safeUserId}/${Date.now()}-${name}`;
}

async function uploadArrayBufferToBucket(
  bucket: string,
  arrayBuffer: ArrayBuffer,
  mimeType: string,
  userId: string,
  entryId: string | undefined,
  filename: string,
): Promise<UploadResult> {
  const supabase = getSupabase();
  const path = buildStoragePath(userId, entryId, filename);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    const detail = error.message || JSON.stringify(error);
    throw new Error(`Storage upload failed: ${detail}`);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: urlData.publicUrl, path };
}

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * 将 base64 图片上传至 Supabase Storage，返回公开 URL。
 * @param base64Data - `data:image/xxx;base64,...` 或纯 base64
 * @param userId - 用户 ID，用于路径隔离
 * @param entryId - 日记 ID（可选，新建时可能尚无）
 * @param filename - 文件名（可选，默认用时间戳）
 */
export async function uploadImage(
  base64Data: string,
  userId: string,
  entryId?: string,
  filename?: string,
): Promise<UploadResult> {
  try {
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    const mime = match ? match[1] : "image/png";
    const base64 = match ? match[2] : base64Data;
    const ext = mime.split("/")[1] ?? "png";
    const arrayBuffer = decode(base64);
    const name = filename ?? `${Date.now()}.${ext}`;

    return await uploadArrayBufferToBucket(
      IMAGE_BUCKET,
      arrayBuffer,
      mime,
      userId,
      entryId,
      name,
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`[uploadImage] ${detail}`);
  }
}

/**
 * 批量上传多张图片，返回 URL 数组。
 */
export async function uploadImages(
  base64List: string[],
  userId: string,
  entryId?: string,
): Promise<string[]> {
  try {
    const results = await Promise.all(
      base64List.map((base64, i) => {
        const match = base64.match(/^data:([^;]+);base64,/);
        const ext = match ? (match[1].split("/")[1] ?? "png") : "png";
        return uploadImage(base64, userId, entryId, `img-${i}.${ext}`);
      }),
    );
    return results.map((r) => r.url);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`[uploadImages] ${detail}`);
  }
}

/**
 * 直接上传录音文件到 Supabase Storage，返回公开 URL。
 */
export async function uploadAudio(
  file: File,
  userId: string,
  entryId?: string,
  filename?: string,
): Promise<UploadResult> {
  try {
    const mimeType = file.type || "audio/webm";
    const ext = mimeType.split("/")[1] ?? "webm";
    const arrayBuffer = await file.arrayBuffer();
    const safeFilename = filename
      ? sanitizeFilename(filename)
      : `audio-${Date.now()}.${ext}`;

    return await uploadArrayBufferToBucket(
      AUDIO_BUCKET,
      arrayBuffer,
      mimeType,
      userId,
      entryId,
      safeFilename,
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`[uploadAudio] ${detail}`);
  }
}
