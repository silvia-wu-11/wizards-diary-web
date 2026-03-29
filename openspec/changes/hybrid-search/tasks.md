# 任务列表：混合搜索功能实现

## 阶段 1：后端准备
- [x] 1.1 修改 `src/lib/embedding/search.ts`：更新 `searchRelatedDiaries` 函数，使其接受一个可选的 `bookId` 参数，并相应地调整原生 SQL 查询以支持范围限制。
- [x] 1.2 修改 `src/app/actions/diary.ts`：更新 `getEntriesPaginated` 的返回类型，在 payload 中增加一个可选的 `semanticEntries` 数组。
- [x] 1.3 修改 `src/app/actions/diary.ts`：在 `getEntriesPaginated` 中，如果存在 `keyword` 且为第一页（无 cursor），则调用 `searchRelatedDiaries`（限制 10 条），通过精确匹配的结果进行去重，并将结果放入 `semanticEntries` 中返回。
- [x] 1.4 修改 `src/app/actions/diary.ts`：创建一个新的 Server Action `searchBookEntries(bookId, keyword)`，该函数返回 `{ exactMatches, semanticMatches }`（语义匹配限制 5 条），供 DiaryView 内页使用。

## 阶段 2：前端 Dashboard 首页更新
- [x] 2.1 修改 `src/app/pages/Dashboard.tsx`：添加一个新的 state 变量 `semanticEntries`，用于保存向量搜索的结果。
- [x] 2.2 修改 `src/app/pages/Dashboard.tsx`：更新 `getEntriesPaginated` 的请求逻辑，以捕获并设置 `semanticEntries` 的状态。
- [x] 2.3 修改 `src/app/pages/Dashboard.tsx`：在 JSX 渲染列表中，添加逻辑优先渲染精确匹配的结果；接着渲染一个带有魔法感的视觉分割线（例如："✨ 魔杖感应到了以下相关的记忆..."）；最后渲染 `semanticEntries`（如果存在）。

## 阶段 3：前端 DiaryView 内页更新
- [x] 3.1 修改 `src/app/components/SearchResultModal.tsx`：更新组件的 props 和 UI 结构，以支持同时展示两个分组列表（精确匹配和语义匹配），并添加合适的子标题进行区分。
- [x] 3.2 修改 `src/app/pages/DiaryView.tsx`：将 `handleSearchEnter` 重构为 `async` 异步函数，在搜索时显示加载指示器，并调用新创建的 `searchBookEntries` Server Action，取代原有的本地过滤逻辑。
- [x] 3.3 修改 `src/app/pages/DiaryView.tsx`：将结构化的搜索结果 `{ exactMatches, semanticMatches }` 传递给更新后的 `SearchResultModal`。

## 阶段 4：测试与打磨
- [ ] 4.1 编写/更新 Vitest API 测试，覆盖 `getEntriesPaginated` 接口，验证新增的 `semanticEntries` payload 是否符合预期。
- [ ] 4.2 编写/更新 Vitest API 测试，覆盖新增的 `searchBookEntries` 接口。
- [ ] 4.3 手动验证 UI 布局、分割线的样式，并确保精确匹配列表和语义匹配列表之间没有出现重复的日记条目。