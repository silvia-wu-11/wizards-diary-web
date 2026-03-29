import { describe, it, expect } from 'vitest';
import { mergeCoreMemory } from './merge';
import { INITIAL_CORE_MEMORY } from '@/app/types/core-memory';

describe('mergeCoreMemory', () => {
  it('current 为 null 时使用 INITIAL_CORE_MEMORY 作为 base', () => {
    const increment = {
      identity: { name: '小明', nickname: '', occupation: '学生', location: '北京' },
    };
    const result = mergeCoreMemory(null, increment);
    expect(result.identity.name).toBe('小明');
    expect(result.identity.occupation).toBe('学生');
    expect(result.version).toBe('1.0');
  });

  it('relationships 数组追加而非覆盖', () => {
    const current = {
      ...INITIAL_CORE_MEMORY,
      relationships: [{ name: '小红', relation: '闺蜜', description: '最好的朋友' }],
    };
    const increment = {
      relationships: [{ name: '老师李', relation: '恩师', description: '影响深远' }],
    };
    const result = mergeCoreMemory(current, increment);
    expect(result.relationships).toHaveLength(2);
    expect(result.relationships[0].name).toBe('小红');
    expect(result.relationships[1].name).toBe('老师李');
  });

  it('identity 标量字段以增量覆盖旧值', () => {
    const current = {
      ...INITIAL_CORE_MEMORY,
      identity: { name: '小明', nickname: '', occupation: '学生', location: '北京' },
    };
    const increment = {
      identity: { occupation: '老师' },
    };
    const result = mergeCoreMemory(current, increment);
    expect(result.identity.occupation).toBe('老师');
    expect(result.identity.name).toBe('小明');
    expect(result.identity.location).toBe('北京');
  });

  it('超出 relationships 容量（20）时裁剪最旧条目', () => {
    const existingRels = Array.from({ length: 20 }, (_, i) => ({
      name: `旧人${i}`,
      relation: '关系',
      description: '旧',
    }));
    const current = {
      ...INITIAL_CORE_MEMORY,
      relationships: existingRels,
    };
    const newRels = [
      { name: '新人1', relation: '新', description: '新1' },
      { name: '新人2', relation: '新', description: '新2' },
    ];
    const result = mergeCoreMemory(current, { relationships: newRels });
    expect(result.relationships).toHaveLength(20);
    expect(result.relationships.find((r) => r.name === '新人1')).toBeDefined();
    expect(result.relationships.find((r) => r.name === '新人2')).toBeDefined();
    expect(result.relationships.find((r) => r.name === '旧人0')).toBeUndefined();
  });

  it('life_facts 超出容量（50）时裁剪最旧条目', () => {
    const existingFacts = Array.from({ length: 50 }, (_, i) => `旧事实${i}`);
    const current = {
      ...INITIAL_CORE_MEMORY,
      life_facts: existingFacts,
    };
    const newFacts = ['新事实A', '新事实B'];
    const result = mergeCoreMemory(current, { life_facts: newFacts });
    expect(result.life_facts).toHaveLength(50);
    expect(result.life_facts.slice(-2)).toEqual(['新事实A', '新事实B']);
  });

  it('goals.short_term 和 long_term 分别追加', () => {
    const current = {
      ...INITIAL_CORE_MEMORY,
      goals: { short_term: ['目标A'], long_term: ['长远目标A'] },
    };
    const increment = {
      goals: {
        short_term: ['目标B'],
        long_term: ['长远目标B'],
      },
    };
    const result = mergeCoreMemory(current, increment);
    expect(result.goals.short_term).toEqual(['目标A', '目标B']);
    expect(result.goals.long_term).toEqual(['长远目标A', '长远目标B']);
  });

  it('preferences 字段增量覆盖', () => {
    const current = {
      ...INITIAL_CORE_MEMORY,
      preferences: {
        likes: ['阅读'],
        dislikes: ['辣'],
        hobbies: ['写作'],
        dietary: ['素食'],
        communication_style: '直接',
      },
    };
    const increment = {
      preferences: {
        likes: ['旅行'],
        communication_style: '温和',
      },
    };
    const result = mergeCoreMemory(current, increment);
    expect(result.preferences.likes).toEqual(['旅行']);
    expect(result.preferences.dislikes).toEqual(['辣']);
    expect(result.preferences.hobbies).toEqual(['写作']);
    expect(result.preferences.communication_style).toBe('温和');
  });

  it('emotional_context 增量覆盖', () => {
    const current = {
      ...INITIAL_CORE_MEMORY,
      emotional_context: {
        recent_mood_trend: '开心',
        significant_events: ['升职'],
      },
    };
    const increment = {
      emotional_context: {
        recent_mood_trend: '平静',
        significant_events: ['旅行'],
      },
    };
    const result = mergeCoreMemory(current, increment);
    expect(result.emotional_context.recent_mood_trend).toBe('平静');
    expect(result.emotional_context.significant_events).toContain('升职');
    expect(result.emotional_context.significant_events).toContain('旅行');
  });

  it('increment.version 存在时记录迁移（当前为空实现）', () => {
    const current = { ...INITIAL_CORE_MEMORY, version: '1.0' };
    const increment = { version: '2.0', identity: { name: 'test', nickname: '', occupation: '', location: '' } };
    const result = mergeCoreMemory(current, increment);
    expect(result.version).toBe('2.0');
  });
});
