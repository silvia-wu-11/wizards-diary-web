import { describe, it, expect } from 'vitest';
import { formatCoreMemoryForPrompt } from './format';
import { INITIAL_CORE_MEMORY } from '@/app/types/core-memory';

describe('formatCoreMemoryForPrompt', () => {
  it('memory 为 null 时返回空字符串', () => {
    expect(formatCoreMemoryForPrompt(null)).toBe('');
  });

  it('所有字段为空时仅返回标题行', () => {
    const memory = { ...INITIAL_CORE_MEMORY };
    const result = formatCoreMemoryForPrompt(memory);
    expect(result).toBe('【用户记忆内核】');
  });

  it('identity 仅 name 时正确格式化', () => {
    const memory = {
      ...INITIAL_CORE_MEMORY,
      identity: { name: '小明', nickname: '', occupation: '', location: '' },
    };
    const result = formatCoreMemoryForPrompt(memory);
    expect(result).toContain('身份：小明');
  });

  it('identity 同时有 nickname 和 occupation 时用 nickname 优先', () => {
    const memory = {
      ...INITIAL_CORE_MEMORY,
      identity: { name: '李明', nickname: '明明', occupation: '学生', location: '北京' },
    };
    const result = formatCoreMemoryForPrompt(memory);
    expect(result).toContain('明明');
    expect(result).toContain('（学生）');
    expect(result).toContain('位于北京');
  });

  it('relationships 正确格式化', () => {
    const memory = {
      ...INITIAL_CORE_MEMORY,
      relationships: [
        { name: '小红', relation: '闺蜜', description: '从小认识' },
        { name: '老师李', relation: '恩师', description: '指引方向' },
      ],
    };
    const result = formatCoreMemoryForPrompt(memory);
    expect(result).toContain('重要关系：小红（闺蜜）、老师李（恩师）');
  });

  it('relationships 为空数组时不输出该行', () => {
    const memory = { ...INITIAL_CORE_MEMORY, relationships: [] };
    const result = formatCoreMemoryForPrompt(memory);
    expect(result).not.toContain('重要关系');
  });

  it('hobbies 正确格式化', () => {
    const memory = {
      ...INITIAL_CORE_MEMORY,
      preferences: {
        ...INITIAL_CORE_MEMORY.preferences,
        hobbies: ['阅读', '旅行', '写作'],
      },
    };
    const result = formatCoreMemoryForPrompt(memory);
    expect(result).toContain('兴趣爱好：阅读、旅行、写作');
  });

  it('goals.short_term 正确格式化', () => {
    const memory = {
      ...INITIAL_CORE_MEMORY,
      goals: { short_term: ['完成论文', '找工作'], long_term: [] },
    };
    const result = formatCoreMemoryForPrompt(memory);
    expect(result).toContain('短期目标：完成论文、找工作');
  });

  it('goals.long_term 正确格式化', () => {
    const memory = {
      ...INITIAL_CORE_MEMORY,
      goals: { short_term: [], long_term: ['环游世界', '出版书籍'] },
    };
    const result = formatCoreMemoryForPrompt(memory);
    expect(result).toContain('长期目标：环游世界、出版书籍');
  });

  it('emotional_context.recent_mood_trend 正确格式化', () => {
    const memory = {
      ...INITIAL_CORE_MEMORY,
      emotional_context: { recent_mood_trend: '最近心情不错', significant_events: [] },
    };
    const result = formatCoreMemoryForPrompt(memory);
    expect(result).toContain('近期情绪：最近心情不错');
  });

  it('life_facts 仅取最新 5 条', () => {
    const facts = Array.from({ length: 10 }, (_, i) => `事实${i}`);
    const memory = { ...INITIAL_CORE_MEMORY, life_facts: facts };
    const result = formatCoreMemoryForPrompt(memory);
    expect(result).toContain('事实5；事实6；事实7；事实8；事实9');
    expect(result).not.toContain('事实0');
  });

  it('各字段组合输出时顺序正确', () => {
    const memory = {
      ...INITIAL_CORE_MEMORY,
      identity: { name: '小明', nickname: '', occupation: '学生', location: '北京' },
      relationships: [{ name: '小红', relation: '闺蜜', description: '好友' }],
      preferences: {
        ...INITIAL_CORE_MEMORY.preferences,
        hobbies: ['阅读'],
      },
      goals: { short_term: ['考试'], long_term: [] },
      emotional_context: { recent_mood_trend: '平静', significant_events: [] },
      life_facts: ['去过巴黎'],
    };
    const result = formatCoreMemoryForPrompt(memory);
    const lines = result.split('\n');
    expect(lines[0]).toBe('【用户记忆内核】');
    expect(lines[1]).toContain('身份');
    expect(lines[2]).toContain('重要关系');
    expect(lines[3]).toContain('兴趣爱好');
    expect(lines[4]).toContain('短期目标');
    expect(lines[5]).toContain('近期情绪');
    expect(lines[6]).toContain('重要事实');
  });
});
