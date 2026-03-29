/**
 * 异步 Core Memory 更新任务：用户保存日记后，后台执行的记忆提炼与合并写入。
 *
 * 调用链路（由 createEntry 的 after() 触发）：
 *   ① 从 DB 读取当前 Core Memory（若为 null 则使用 INITIAL_CORE_MEMORY）
 *   ② 构建提炼 prompt，连同日记得文本发送给 LLM
 *   ③ LLM 返回增量 JSON（increment）
 *   ④ mergeCoreMemory 执行 JSON Merge Patch
 *   ⑤ 将合并结果写回 User.coreMemory
 *
 * 容错：异常在函数内部捕获并记录日志，不向调用方抛出，确保日记保存不受影响。
 * 幂等：重复调用会基于最新的 Core Memory 重新提炼并合并（增量追加）。
 *
 * @see spec  openspec/specs/memory-engine/spec.md
 * @see design openspec/changes/memory-engine/design.md §6.3
 */

"use server";

import type { CoreMemory } from "@/app/types/core-memory";
import { prisma } from "@/lib/db";
import { mergeCoreMemory } from "@/lib/memory/merge";
import { buildMemoryExtractionPrompt } from "@/lib/memory/prompt";

/** 提炼任务使用的模型 Endpoint ID（与对话共用火山方舟账号） */
const MEMORY_EXTRACTION_MODEL = "ep-20260325172108-n42bd";

/**
 * 调用火山方舟 Chat Completions API，从日记中提炼核心信息。
 *
 * @param systemPrompt  构建好的提炼提示词（含 Core Memory 参考 + 日记内容）
 * @param diaryContent  日记原文（同时作为 user 消息内容）
 * @returns LLM 返回的增量 JSON（Partial<CoreMemory>），解析失败时返回空对象
 */
async function callLLMToExtract(
  systemPrompt: string,
  diaryContent: string,
): Promise<Partial<CoreMemory>> {
  const apiKey = process.env.HUOSHAN_MODEL_API_KEY;
  if (!apiKey) throw new Error("HUOSHAN_MODEL_API_KEY not configured");

  const res = await fetch(
    "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MEMORY_EXTRACTION_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `请根据以下日记提炼信息：\n\n${diaryContent}`,
          },
        ],
        max_tokens: 1024,
        temperature: 0.3, // 低温度保证提炼结果稳定，避免幻觉
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM extraction failed: ${res.status} ${err}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? "{}";

  try {
    return JSON.parse(text);
  } catch {
    // LLM 返回非 JSON 时静默忽略，不阻塞流程
    console.error(
      "[memory/update] Failed to parse LLM response as JSON:",
      text,
    );
    return {};
  }
}

/**
 * 更新用户的 Core Memory：从日记提炼核心信息并合并写入数据库。
 *
 * 此函数由 createEntry 通过 after() 在后台异步调用，不阻塞日记保存流程。
 *
 * @param userId       目标用户 ID
 * @param diaryContent  本轮提交的日记原文
 */
export async function updateCoreMemoryFromDiary(
  userId: string,
  diaryContent: string,
): Promise<void> {
  try {
    // ① 读取当前 Core Memory（null 时使用初始空结构）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coreMemory: true },
    });

    const currentMemory: CoreMemory | null =
      user?.coreMemory as CoreMemory | null;

    // ② 构建提炼 prompt
    const systemPrompt = buildMemoryExtractionPrompt(
      currentMemory,
      diaryContent,
    );

    // ③ 调用 LLM 提炼增量信息
    const increment = await callLLMToExtract(systemPrompt, diaryContent);

    // ④ JSON Merge Patch 合并
    const merged = mergeCoreMemory(currentMemory, increment);

    // ⑤ 写回数据库
    await prisma.user.update({
      where: { id: userId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { coreMemory: merged as any },
    });

    console.log(`[memory/update] Core memory updated for user ${userId}`);
  } catch (err) {
    // 静默失败：记录日志但不向调用方抛出，不影响日记保存流程
    console.error(
      `[memory/update] Failed to update core memory for user ${userId}:`,
      err,
    );
  }
}
