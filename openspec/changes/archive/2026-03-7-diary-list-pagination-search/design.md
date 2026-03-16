# 日记列表分页与搜索 · 技术设计

## 技术选型

沿用项目栈：Next.js 15 App Router + Prisma + PostgreSQL。首页采用**服务端分页**，新增 `getEntriesPaginated` Server Action；日记本内页仍在前端对 `bookEntries` 做关键词筛选（数据量小）。

**选服务端分页的原因**：支持大数据量；筛选在数据库层完成，性能更好；与 Prisma cursor 分页天然契合。

**无限滚动**：每批 30 条；当用户滚动至距离页面底部 30vh 时触发加载下一页；到达底部时展示「记忆提取完毕」提示。

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│  首页 Dashboard                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 筛选栏：日期范围 | 日记本 | Tag | 关键词搜索                          ││
│  │ 日记列表：瀑布流 + 无限滚动（服务端分页，每批 30 条）                   ││
│  │ 底部提示：「记忆提取完毕」                                             ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  数据流：getEntriesPaginated(filters, cursor) → { entries, nextCursor, hasMore } │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  日记本内页 DiaryView                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Search 按钮 → 展开搜索框 → 关键词模糊匹配 → 筛选 bookEntries          ││
│  │ Enter 触发：单条匹配直接跳转；多条匹配弹窗列表选择后跳转                ││
│  │ 日历保持单日期选择，用于跳转到某日期的日记                              ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 首页：筛选与分页

### 1. 日期范围选择器（仅首页）

- **现状**：`MagicCalendar` 支持 `onSelectDate(dateStr)` 单日期
- **改造**：新增 `MagicCalendarRange` 组件，或扩展 `MagicCalendar` 支持 `mode: 'single' | 'range'`
- **交互**：用户选择开始日期、结束日期；支持「清除范围」恢复为「全部日期」
- **展示**：选中范围时显示 `"MMM dd - MMM dd, yyyy"`，未选时显示 `"All Dates"`

**实现建议**：新建 `MagicCalendarRange.tsx`，复用 `MagicCalendar` 的月视图与样式，`onSelectRange(startStr, endStr)` 回调。首页 Toolbar 使用 `MagicCalendarRange`，日记本内页继续使用 `MagicCalendar`（单日期）。

### 2. 组合筛选逻辑

| 筛选条件 | 匹配方式 | 说明 |
|----------|----------|------|
| 日期范围 | 包含 | `entry.date` 在 `[dateFrom, dateTo]` 内（含边界） |
| Tag | 精确匹配 | `entry.tags` 包含所选 tag（`tags.includes(tag)`） |
| 日记本 | 精确匹配 | `entry.bookId === selectedBookId` |
| 关键词 | 模糊匹配 | `title` 或 `content` 包含关键词（不区分大小写，`includes`） |

**组合规则**：各条件 AND 组合；任一条件未选则忽略该维度。

### 3. 无限滚动实现

- **批次大小**：每批 30 条
- **触发**：用户滚动至距离页面底部 30vh 时触发加载下一页；使用 `IntersectionObserver` + `rootMargin: '0px 0px 30vh 0px'` 扩展底部检测区域
- **服务端分页**：调用 `getEntriesPaginated(filters, cursor)`，返回 `{ entries, nextCursor, hasMore }`
- **底部提示**：当 `!hasMore` 且已有条目时，展示「记忆提取完毕」
- **无分页按钮**：仅通过滚动触发，保持瀑布流沉浸感

---

## 日记本内页：关键词搜索

### 1. Search 按钮行为

- **现状**：`<ActionButton icon={<Search />} label="Search" />` 无 `onClick`
- **改造**：点击后展开搜索框（内联或浮层），用户输入关键词
- **筛选**：在当前日记本 `bookEntries` 中，对 `title`、`content` 做模糊匹配（不区分大小写）
- **结果**：若有关键词，仅展示匹配的日记；支持清空关键词恢复全部

### 2. 搜索 UI 形态

- **方案 A**：点击 Search 后，在 header 或书本上方展开一个输入框，输入即筛选
- **方案 B**：弹出 Modal，输入关键词后确认，关闭 Modal 并应用筛选

**推荐方案 A**：内联展开，输入即筛选，体验更流畅。

### 3. 与日历的配合

- 日历保持单日期选择，用于跳转到某日期的日记
- 搜索与日历可同时生效：先按关键词筛选，再在结果中通过日历跳转（日历的 `entries` 传入筛选后的列表）

### 4. Enter 触发搜索跳转

- **触发**：搜索框 `onKeyDown` 监听 Enter，按下时基于当前 `searchKeyword` 对 `bookEntries` 做模糊匹配
- **单条匹配**：若 `filteredEntries.length === 1`，直接 `router.push` 到该日记的 DiaryView（`/diary/[bookId]/[entryId]`）
- **多条匹配**：若 `filteredEntries.length > 1`，打开模态框展示列表
  - 列表项字段：`title`、`date`、`tags`（不展示 `content`）
  - 点击列表项 → 跳转到对应 DiaryView → 关闭模态框
- **无匹配**：不跳转，可选展示 toast 或内联提示「无匹配结果」

**模态框 UI**：复用现有 Parchment/Modal 风格，列表项为可点击卡片，展示标题、日期、tag 标签。

---

## 数据流与 API

### 首页

```
getEntriesPaginated(filters, cursor?, limit?)
  → { entries, nextCursor, hasMore }
  → 筛选条件：dateFrom, dateTo, tag, bookId, keyword
  → Prisma where + cursor 分页
  → IntersectionObserver (rootMargin 30vh) 触发加载下一页
  → 底部展示「记忆提取完毕」当 hasMore=false
```

**新增 Server Action**：`getEntriesPaginated`。

### 日记本内页

```
bookEntries = entries.filter(e => e.bookId === currentBookId)
  → 若 searchKeyword 非空：filter(bookEntries, e => 
      (e.title ?? '').toLowerCase().includes(keyword) || 
      e.content.toLowerCase().includes(keyword))
  → 用于日历展示与 prev/next 导航
```

---

## 文件结构

```
src/
├── app/
│   ├── components/
│   │   ├── MagicCalendar.tsx          # 保持单日期，日记本内页用
│   │   ├── MagicCalendarRange.tsx     # 新建：日期范围选择，首页用
│   │   └── ...
│   └── pages/
│       ├── Dashboard.tsx              # 日期范围、组合筛选、无限滚动
│       └── DiaryView.tsx              # Search 展开 + 关键词筛选
```

---

## 筛选参数类型（前端）

```ts
interface DiaryListFilters {
  dateFrom?: string;   // 'YYYY-MM-DD'
  dateTo?: string;    // 'YYYY-MM-DD'
  tag?: string;
  bookId?: string;
  keyword?: string;
}
```

---

## 测试策略

| 层级 | 工具 | 覆盖 |
|------|------|------|
| 单元 | Vitest | 筛选逻辑：日期范围、tag 精确、keyword 模糊、组合 AND |
| 集成 | Vitest | 无限滚动：visibleCount 递增、底部哨兵触发 |
| E2E | Playwright | 首页选择日期范围、输入关键词、滚动加载；日记本内页点击 Search、输入关键词筛选；日记本内页搜索框按 Enter，单条匹配直接跳转、多条匹配弹窗选择跳转 |

---

## Server Action: getEntriesPaginated

```ts
getEntriesPaginated(params: {
  dateFrom?: string;   // 'YYYY-MM-DD'
  dateTo?: string;
  tag?: string;
  bookId?: string;
  keyword?: string;
  cursor?: string;     // 上一页最后一条的 id
  limit?: number;      // 默认 30
}): Promise<{
  entries: DiaryEntryDto[];
  nextCursor: string | null;
  hasMore: boolean;
}>
```

Prisma `where` 组合：`date` 范围、`tags has`、`bookId`、`OR: [{ title: { contains, mode: 'insensitive' } }, { content: { contains, mode: 'insensitive' } }]`。
