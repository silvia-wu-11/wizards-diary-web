/**
 * 图片上传至 Supabase Storage 的封装
 * 服务端调用，使用 SUPABASE_SERVICE_ROLE_KEY
 *
 * 前置条件：在 Supabase Dashboard 创建 bucket「diary-images」并设为 public
 * Storage → New bucket → Name: diary-images, Public: true
 */
import { decode } from 'base64-arraybuffer';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'diary-images';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}

/** 路径仅保留安全字符，避免 Supabase InvalidKey */
function sanitizePathSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * 将 base64 图片上传至 Supabase Storage，返回公开 URL
 * @param base64Data - data:image/xxx;base64,... 或纯 base64
 * @param userId - 用户 ID，用于路径隔离
 * @param entryId - 日记 ID（可选，新建时可能尚无）
 * @param filename - 文件名（可选，默认用时间戳）
 */
export async function uploadImage(
  base64Data: string,
  userId: string,
  entryId?: string,
  filename?: string
): Promise<UploadResult> {
  const supabase = getSupabase();

  // 解析 base64：可能带 data:image/xxx;base64, 前缀
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  const mime = match ? match[1] : 'image/png';
  const base64 = match ? match[2] : base64Data;
  const ext = mime.split('/')[1] ?? 'png';

  // 使用 ArrayBuffer 替代 Buffer，避免 Node.js 环境下 Supabase 的 Bad Request
  const arrayBuffer = decode(base64);
  const name = filename ?? `${Date.now()}.${ext}`;
  const safeUserId = sanitizePathSegment(userId);
  const safeEntryId = entryId ? sanitizePathSegment(entryId) : undefined;
  const path = safeEntryId
    ? `${safeUserId}/${safeEntryId}/${name}`
    : `${safeUserId}/${Date.now()}-${name}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: mime,
    upsert: true,
  });

  if (error) {
    const detail = error.message || JSON.stringify(error);
    throw new Error(`Storage upload failed: ${detail}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl, path };
}

/**
 * 批量上传多张图片，返回 URL 数组
 */
export async function uploadImages(
  base64List: string[],
  userId: string,
  entryId?: string
): Promise<string[]> {
  const results = await Promise.all(
    base64List.map((base64, i) => {
      const match = base64.match(/^data:([^;]+);base64,/);
      const ext = match ? (match[1].split('/')[1] ?? 'png') : 'png';
      return uploadImage(base64, userId, entryId, `img-${i}.${ext}`);
    })
  );
  return results.map((r) => r.url);
}
