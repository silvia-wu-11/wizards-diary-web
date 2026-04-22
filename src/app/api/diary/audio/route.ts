/**
 * 录音上传接口：接收单个音频文件并返回公开 URL。
 */
import { auth } from "@/auth";
import { uploadAudio } from "@/lib/supabase/storage";

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const entryIdValue = formData.get("entryId");
    const entryId = typeof entryIdValue === "string" ? entryIdValue : undefined;

    if (!(file instanceof File)) {
      return Response.json({ error: "缺少录音文件" }, { status: 400 });
    }

    if (!file.type.startsWith("audio/")) {
      return Response.json({ error: "仅支持音频文件上传" }, { status: 400 });
    }

    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      return Response.json(
        { error: "录音文件过大，请控制在 10MB 以内" },
        { status: 400 },
      );
    }

    const uploaded = await uploadAudio(file, session.user.id, entryId, file.name);

    return Response.json({
      url: uploaded.url,
      path: uploaded.path,
      mimeType: file.type,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `[POST /api/diary/audio] ${detail}` },
      { status: 500 },
    );
  }
}
