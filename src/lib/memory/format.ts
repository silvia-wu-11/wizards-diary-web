/**
 * Core Memory 格式化：将 Core Memory JSON 转换为注入到 prompt 的可读文本。
 *
 * 在用户打开「老朋友 Chum」对话框时，将 Core Memory 格式化为文本片段，
 * 作为 system prompt 的前缀拼入，使大模型能够感知用户的长期记忆背景。
 *
 * 仅输出非空字段，保持 prompt 简洁；各数组字段取最新 5 条（life_facts），
 * 避免单次 prompt 过长。
 *
 * @see spec  openspec/specs/memory-engine/spec.md
 * @see design openspec/changes/memory-engine/design.md §8.1
 */

import type { CoreMemory } from "@/app/types/core-memory";

/**
 * 将 Core Memory JSON 格式化为自然语言文本。
 *
 * @param memory 用户当前的 Core Memory（null 表示无记忆，返回空字符串）
 * @returns 格式化的 prompt 文本片段，如：
 *   【用户记忆内核】
 *   身份：小明（学生），位于北京
 *   重要关系：小红（闺蜜）、老师李（恩师）
 *   兴趣爱好：阅读、旅行、写作
 *   ...
 */
export function formatCoreMemoryForPrompt(memory: CoreMemory | null): string {
  if (!memory) return "";

  const lines: string[] = ["【用户记忆内核】"];

  // 身份信息：昵称优先，拼装occupation和location
  if (memory.identity.name || memory.identity.nickname) {
    const name = memory.identity.nickname || memory.identity.name;
    const parts = [name];
    if (memory.identity.occupation) parts.push(`（${memory.identity.occupation}）`);
    if (memory.identity.location) parts.push(`，位于${memory.identity.location}`);
    lines.push(`身份：${parts.join("")}`);
  }

  // 重要关系：格式「姓名（关系）」，用顿号分隔
  if (memory.relationships.length > 0) {
    const rels = memory.relationships
      .map((r) => `${r.name}（${r.relation}）`)
      .join("、");
    lines.push(`重要关系：${rels}`);
  }

  // 兴趣爱好
  if (memory.preferences.hobbies.length > 0) {
    lines.push(`兴趣爱好：${memory.preferences.hobbies.join("、")}`);
  }

  // 短期 / 长期目标
  if (memory.goals.short_term.length > 0) {
    lines.push(`短期目标：${memory.goals.short_term.join("、")}`);
  }
  if (memory.goals.long_term.length > 0) {
    lines.push(`长期目标：${memory.goals.long_term.join("、")}`);
  }

  // 近期情绪趋势
  if (memory.emotional_context.recent_mood_trend) {
    lines.push(`近期情绪：${memory.emotional_context.recent_mood_trend}`);
  }

  // 生活事实：取最新的 5 条，避免 prompt 过长
  if (memory.life_facts.length > 0) {
    lines.push(`重要事实：${memory.life_facts.slice(-5).join("；")}`);
  }

  return lines.join("\n");
}
