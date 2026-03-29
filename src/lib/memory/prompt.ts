/**
 * LLM 提炼提示词：为 updateCoreMemoryFromDiary 构建发送给大模型的 system prompt。
 *
 * prompt 策略：
 * - 将当前 Core Memory JSON 作为参考(仅供 LLM 理解上下文，不要直接复制)
 * - 将日记原文作为待提炼内容
 * - 要求 LLM 返回符合 CoreMemory Schema 的增量 JSON(increment)
 * - 明确说明数组字段追加而非覆盖、容量约束等合并规则
 *
 * @see spec  openspec/specs/memory-engine/spec.md
 * @see design openspec/changes/memory-engine/design.md §6.1
 */

import type { CoreMemory } from "@/app/types/core-memory";

/**
 * 构建用于提炼日记核心信息的 system prompt。
 *
 * @param currentMemory 当前用户 Core Memory(null 表示首次提炼，无参考)
 * @param diaryContent  用户本轮提交的日记原文
 * @returns 完整的 system prompt 字符串
 */
export function buildMemoryExtractionPrompt(
  currentMemory: CoreMemory | null,
  diaryContent: string,
): string {
  const memoryJson = currentMemory
    ? JSON.stringify(currentMemory, null, 2)
    : JSON.stringify({ version: "1.0" }, null, 2);

  return `你是一位记忆管理助手。请仔细阅读用户今日的日记内容，从中提炼可能对了解用户有帮助的信息，并以 JSON 格式返回。

【当前用户记忆(仅参考，不要直接复制)】
${memoryJson}

【今日日记内容】
${diaryContent}

【提炼要求】
请从日记中提炼新信息，并严格按照以下字段和类型返回 JSON 数据：

1. identity (对象)：姓名(name)、昵称(nickname)、职业(occupation)、所在地(location)
2. relationships (对象数组)：重要人物及其关系。格式必须为 [{"name": "张三", "relation": "同事", "description": "帮助过我"}]
3. life_facts (纯字符串数组)：重要事实或经历，例如 ["今天拿到了驾照", "搬家到新公寓"]
4. preferences (对象)：
   - likes, dislikes, hobbies, dietary (这4个必须是纯字符串数组)
   - communication_style (字符串)
5. goals (对象)：
   - short_term, long_term (必须是纯字符串数组)
6. emotional_context (对象)：
   - recent_mood_trend (字符串，近期情绪趋势)
   - significant_events (纯字符串数组，重要事件，例如 ["通过了面试"])
7. memory_anchors (纯字符串数组)：值得记忆的锚点

【JSON 返回格式示例】
只返回纯 JSON，不要包含解释或 markdown 代码块包裹：
{
  "identity": { "name": "小明" },
  "relationships": [{ "name": "小红", "relation": "朋友", "description": "高中同学" }],
  "life_facts": ["今天去了游乐园"],
  "goals": { "short_term": ["完成期末考试"] }
}

【严格遵守以下规则】
- 必须是纯字符串数组的字段：life_facts, likes, dislikes, hobbies, dietary, short_term, long_term, significant_events, memory_anchors。例如：["苹果", "香蕉"]，绝对不能是对象数组！
- 如果某个字段没有新信息，请返回空数组 [] 或空字符串 ""，不要返回 null。
- 数组字段请只提供“新增”的内容，不要重复当前记忆中已有的内容。
- 你的返回结果会被直接代码解析，所以绝对不能包含任何其他文字解释。`;
}
