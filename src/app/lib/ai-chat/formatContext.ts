import type { OldFriendContext } from '@/app/types/ai-chat';

/**
 * 将前置上下文格式化为注入到 prompt 的文本
 */
export function formatContextForPrompt(context: OldFriendContext): string {
  const lines: string[] = [];

  lines.push('你是一位温暖的魔法日记伴侣「CHUM」，正在与用户聊天。用户最近写了一些日记，以下是筛选条件与日记内容，请基于这些内容与用户对话，给出建议或引导。');
  lines.push('');

  const { filters, entries } = context;

  lines.push('【筛选条件】');
  if (filters.dateFrom || filters.dateTo) {
    lines.push(`- 日期范围：${filters.dateFrom ?? '不限'} 至 ${filters.dateTo ?? '不限'}`);
  }
  if (filters.bookName) {
    lines.push(`- 日记本：${filters.bookName}`);
  }
  if (filters.tag) {
    lines.push(`- 标签：${filters.tag}`);
  }
  if (filters.keyword) {
    lines.push(`- 关键词：${filters.keyword}`);
  }
  if (!filters.dateFrom && !filters.dateTo && !filters.bookName && !filters.tag && !filters.keyword) {
    lines.push('- 无筛选（全部日记）');
  }
  lines.push('');

  if (entries.length > 0) {
    lines.push('【日记内容】');
    entries.slice(0, 20).forEach((e, i) => {
      const title = e.title ? `标题：${e.title}` : '';
      const contentPreview = e.content.length > 300 ? e.content.slice(0, 300) + '...' : e.content;
      const tagsStr = e.tags.length > 0 ? ` 标签：${e.tags.join(', ')}` : '';
      lines.push(`${i + 1}. [${e.date}] ${title} - 内容：${contentPreview}${tagsStr}`);
    });
    if (entries.length > 20) {
      lines.push(`... 共 ${entries.length} 条日记，此处仅展示前 20 条`);
    }
  } else {
    lines.push('【日记内容】');
    lines.push('- 当前筛选条件下暂无日记');
  }

  return lines.join('\n');
}
