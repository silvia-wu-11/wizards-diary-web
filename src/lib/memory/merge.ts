/**
 * Core Memory 合并逻辑：接收 LLM 提炼的增量 JSON，与现有记忆执行 Merge Patch。
 *
 * 合并策略（RFC 7396 JSON Merge Patch）：
 * - 标量字段（identity / preferences 等）：以增量中的新值覆盖旧值
 * - 数组字段（relationships / life_facts 等）：追加新条目，保留已有内容
 * - 容量约束：各数组字段有最大容量限制（参见 CORE_MEMORY_CAPACITY），
 *   超出时裁剪最旧的条目（slice(-capacity) 保留最新的 N 条）
 * - version 字段：用于检测 Schema 版本升级，触发迁移逻辑
 *
 * 防止灾难性遗忘：LLM 返回的增量 JSON 仅包含本轮提炼的新信息，
 * 不会整体覆写现有记忆，而是追加到对应数组字段中。
 *
 * 执行顺序：
 * 1. version 写入（迁移用）
 * 2. significant_events 追加（需在 emotional_context spread 之前）
 * 3. 标量字段 spread 覆盖
 * 4. goals 数组字段追加
 * 5. 其他数组字段追加 + 容量裁剪
 *
 * @see spec  openspec/specs/memory-engine/spec.md
 * @see design openspec/changes/memory-engine/design.md §6.2
 */

import type { CoreMemory } from "@/app/types/core-memory";
import {
  CORE_MEMORY_CAPACITY,
  INITIAL_CORE_MEMORY,
} from "@/app/types/core-memory";

export function mergeCoreMemory(
  current: CoreMemory | null,
  increment: Partial<CoreMemory>,
): CoreMemory {
  const base: CoreMemory = current ?? INITIAL_CORE_MEMORY;
  const merged: CoreMemory = JSON.parse(JSON.stringify(base));

  merged.version = increment.version ?? base.version;

  // 辅助函数：将未知的数组元素强制转换为字符串，并过滤掉空字符串
  const ensureStringArray = (arr: unknown[] | undefined | null): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .filter((item) => item.trim() !== "");
  };

  // 辅助函数：清洗 relationship 数组
  const ensureRelationships = (arr: unknown[] | undefined | null) => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item: unknown) => {
        if (typeof item !== "object" || item === null) {
          return { name: String(item), relation: "", description: "" };
        }
        const obj = item as Record<string, unknown>;
        return {
          name: String(obj.name || "").trim(),
          relation: String(obj.relation || "").trim(),
          description: String(obj.description || "").trim(),
        };
      })
      .filter((item) => item.name !== "");
  };

  // ① significant_events 追加（需在任何 spread 之前，避免被覆盖）
  if (increment.emotional_context?.significant_events) {
    const cap = (CORE_MEMORY_CAPACITY as Record<string, number>)[
      "emotional_context.significant_events"
    ];
    const existing = ensureStringArray(
      merged.emotional_context.significant_events,
    );
    const newItems = ensureStringArray(
      increment.emotional_context.significant_events,
    );
    const combined = [...existing, ...newItems];
    merged.emotional_context.significant_events = combined.slice(-cap);
  }

  // ② 标量字段覆盖（确保是对象中的基本类型）
  if (increment.identity && typeof increment.identity === "object") {
    merged.identity = {
      name: String(increment.identity.name ?? merged.identity.name),
      nickname: String(increment.identity.nickname ?? merged.identity.nickname),
      occupation: String(
        increment.identity.occupation ?? merged.identity.occupation,
      ),
      location: String(increment.identity.location ?? merged.identity.location),
    };
  }

  if (increment.preferences && typeof increment.preferences === "object") {
    merged.preferences = {
      likes: ensureStringArray(
        increment.preferences.likes || merged.preferences.likes,
      ),
      dislikes: ensureStringArray(
        increment.preferences.dislikes || merged.preferences.dislikes,
      ),
      hobbies: ensureStringArray(
        increment.preferences.hobbies || merged.preferences.hobbies,
      ),
      dietary: ensureStringArray(
        increment.preferences.dietary || merged.preferences.dietary,
      ),
      communication_style: String(
        increment.preferences.communication_style ??
          merged.preferences.communication_style,
      ),
    };
  }

  if (
    increment.emotional_context &&
    typeof increment.emotional_context === "object"
  ) {
    merged.emotional_context.recent_mood_trend = String(
      increment.emotional_context.recent_mood_trend ??
        merged.emotional_context.recent_mood_trend,
    );
  }

  // ③ goals 数组追加
  if (increment.goals && typeof increment.goals === "object") {
    const newShortTerm = ensureStringArray(increment.goals.short_term);
    const newLongTerm = ensureStringArray(increment.goals.long_term);
    merged.goals = {
      short_term: [
        ...ensureStringArray(merged.goals.short_term),
        ...newShortTerm,
      ],
      long_term: [...ensureStringArray(merged.goals.long_term), ...newLongTerm],
    };
  }

  // ④ 其他数组字段追加 + 容量裁剪
  // 处理 relationships
  if (increment.relationships && Array.isArray(increment.relationships)) {
    const cap = CORE_MEMORY_CAPACITY["relationships"];
    const existing = ensureRelationships(merged.relationships);
    const newItems = ensureRelationships(increment.relationships);
    const combined = [...existing, ...newItems];
    merged.relationships = combined.slice(-cap);
  }

  // 处理 life_facts 和 memory_anchors
  const stringArrayFields: (keyof Pick<
    CoreMemory,
    "life_facts" | "memory_anchors"
  >)[] = ["life_facts", "memory_anchors"];
  for (const field of stringArrayFields) {
    if (increment[field] && Array.isArray(increment[field])) {
      const cap =
        (CORE_MEMORY_CAPACITY as Record<string, number>)[field] ?? Infinity;
      const existing = ensureStringArray(merged[field]);
      const newItems = ensureStringArray(increment[field]);
      const combined = [...existing, ...newItems];
      merged[field] = combined.slice(-cap) as never;
    }
  }

  return merged;
}
