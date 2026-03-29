# 设计：混合搜索技术实现

## 概述
本文档详细说明了在“魔法日记本” Web 应用中实现混合搜索（ILIKE + 向量）的技术方案。修改范围涉及前端 UI 组件和后端 Server Actions。

## 1. 后端修改 (`src/app/actions/diary.ts`)

### `getEntriesPaginated` (供 Dashboard 首页使用)
目前，该函数处理分页和过滤，包括一个使用 Prisma `contains` 的 `keyword` 过滤器。

**变更逻辑：**
*   如果提供了 `keyword` 参数：
    1.  执行现有的 Prisma `findMany` 查询以获取精确匹配结果（`ILIKE`）。
    2.  并发执行 `searchRelatedDiaries`（来自 `lib/embedding/search.ts`）以获取向量匹配结果（限制 10 条）。
    3.  **去重（Deduplication）：** 过滤掉向量匹配结果中已经存在于精确匹配数组中的日记。
    4.  **数据格式：** 当前的返回类型是 `{ entries: DiaryEntryDto[], nextCursor, hasMore }`。为了支持 UI 渲染分割线，我们需要让前端知道哪些是精确匹配，哪些是语义匹配。
        *   *选项 A (修改 DTO):* 在 `DiaryEntryDto` 中添加一个 `matchType: 'exact' | 'semantic'` 字段。
        *   *选项 B (独立数组):* 返回 `{ exactEntries, semanticEntries, nextCursor, hasMore }`。
        *   **决策：** 选项 B 更清晰，便于前端直接渲染分割线。我们将修改返回类型，当存在 `keyword` 时返回 `semanticEntries`。
    5.  **分页处理说明：** 当使用关键字搜索并混合两个列表时，传统的游标分页会变得复杂。对于混合搜索的 V1 版本，我们将保持精确匹配的正常分页，而语义匹配结果**仅在第一页（`cursor` 为空时）返回并追加在底部**。

**`getEntriesPaginated` 的选定方案：**
我们将修改现有的 Server Action，在返回体中增加一个可选的 `semanticEntries` 数组。

```typescript
export interface PaginatedResponse {
  entries: DiaryEntryDto[];
  semanticEntries?: DiaryEntryDto[]; // 新增字段
  nextCursor: string | null;
  hasMore: boolean;
}
```
当 `params.keyword` 存在且 `params.cursor` 未定义（即请求第一页）时：
1. 获取精确匹配条目（限制 30 条）。
2. 使用 `searchRelatedDiaries` 获取语义匹配条目（限制 10 条）。
3. 过滤语义条目，移除在精确匹配中已存在的重复项。
4. 将两者一并返回。

### 新增 Action: `searchBookEntries` (供 DiaryView 内页使用)
DiaryView 目前在客户端对日记进行本地过滤（`bookEntries.filter(...)`）。由于向量搜索需要调用数据库/LLM，我们需要将这个搜索逻辑移到服务端。

**变更逻辑：**
创建一个新的 Server Action `searchBookEntries(bookId: string, keyword: string)`。
1.  使用 Prisma 获取精确匹配结果（对标题/内容执行 `ILIKE`），限制条件为 `bookId = bookId`。
2.  使用 `searchRelatedDiaries` 获取向量匹配结果（我们需要确保该函数能通过 `bookId` 限制范围，目前它只通过 `userId` 限制。必须更新 `searchRelatedDiaries` 以接受可选的 `bookId` 参数）。
3.  执行去重。
4.  返回 `{ exactMatches: DiaryEntryDto[], semanticMatches: DiaryEntryDto[] }`（语义结果限制 5 条）。

## 2. 前端修改

### Dashboard 首页 (`src/app/pages/Dashboard.tsx`)
*   更新状态管理，新增 `semanticEntries` 用于保存向量搜索结果。
*   更新调用 `getEntriesPaginated` 后的 `.then()` 处理逻辑，以设置 `semanticEntries`。
*   在 JSX 渲染部分，在映射渲染 `listEntries` 之后，检查 `semanticEntries` 是否存在且有数据。
*   如果有，渲染一个视觉分割线（例如 `<div className="divider">✨ 魔杖感应到了以下相关的记忆...</div>`）。
*   映射并渲染 `semanticEntries`。

### DiaryView 内页 (`src/app/pages/DiaryView.tsx`)
*   目前，`handleSearchEnter` 只是在本地过滤 `bookEntries` 并打开 `SearchResultModal`。
*   **变更：** 将 `handleSearchEnter` 改为 `async` 异步函数。
*   在搜索栏或弹窗中展示加载状态（Loading Spinner）。
*   调用新增的 `searchBookEntries` Server Action。
*   将结果传递给 `SearchResultModal`。
*   更新 `SearchResultModal` 的 Props，使其能够接收分组结果，从而渲染“精确”和“语义”两个区块。

### SearchResultModal 组件 (`src/app/components/SearchResultModal.tsx`)
*   修改 Props 定义，接收分组数据：`exactEntries` 和 `semanticEntries`。
*   优先渲染精确匹配条目。
*   如果 `semanticEntries` 数量大于 0，渲染一个小标题/分割线（如 "相关记忆"），然后渲染语义匹配条目。

## 3. 工具函数修改 (`src/lib/embedding/search.ts`)
*   修改 `searchRelatedDiaries`，增加一个可选的 `bookId` 参数，以便将向量搜索限制在特定的日记本内（DiaryView 需要）。

```typescript
export async function searchRelatedDiaries(
  userId: string,
  query: string,
  limit = 5,
  bookId?: string // 新增的可选参数
) { ... }
```
更新原生 SQL 查询，如果提供了 `bookId`，则追加 `AND db.id = ${bookId}` 条件。