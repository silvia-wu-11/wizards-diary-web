/**
 * Core Memory（记忆内核）类型定义
 *
 * 记忆内核是每个用户一份的长期存储 JSON 结构，存储身份、关系、生活事实、
 * 偏好、目标、情绪上下文等经 LLM 提炼后合并入库的结构化信息。
 *
 * @see spec  openspec/specs/memory-engine/spec.md
 * @see design openspec/changes/memory-engine/design.md
 */

/** 记忆内核完整结构，version 字段用于未来 Schema 升级时的迁移判断 */
export interface CoreMemory {
  version: string;
  identity: {
    name: string;
    nickname: string;
    occupation: string;
    location: string;
  };
  relationships: Array<{
    name: string;
    relation: string;
    description: string;
  }>;
  life_facts: string[];
  preferences: {
    likes: string[];
    dislikes: string[];
    hobbies: string[];
    dietary: string[];
    communication_style: string;
  };
  goals: {
    short_term: string[];
    long_term: string[];
  };
  emotional_context: {
    recent_mood_trend: string;
    significant_events: string[];
  };
  memory_anchors: string[];
}

/**
 * 各数组字段的最大容量约束，防止 Core Memory JSON 无限膨胀。
 * 超出容量时，mergeCoreMemory 会裁剪最旧的条目。
 */
export const CORE_MEMORY_CAPACITY = {
  relationships: 20,
  life_facts: 50,
  "preferences.likes": 10,
  "preferences.dislikes": 10,
  "preferences.hobbies": 10,
  "preferences.dietary": 10,
  "goals.short_term": 10,
  "goals.long_term": 10,
  "emotional_context.significant_events": 20,
  memory_anchors: 30,
} as const;

/** 新用户首次初始化时的空结构，version 固定为 "1.0" */
export const INITIAL_CORE_MEMORY: CoreMemory = {
  version: "1.0",
  identity: { name: "", nickname: "", occupation: "", location: "" },
  relationships: [],
  life_facts: [],
  preferences: {
    likes: [],
    dislikes: [],
    hobbies: [],
    dietary: [],
    communication_style: "",
  },
  goals: { short_term: [], long_term: [] },
  emotional_context: { recent_mood_trend: "", significant_events: [] },
  memory_anchors: [],
};
