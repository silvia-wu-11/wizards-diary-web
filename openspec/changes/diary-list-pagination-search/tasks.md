# 日记列表分页与搜索 · 任务清单

按执行顺序排列。每项任务完成后可勾选。

---

## 阶段 0：筛选逻辑与测试

- [x] ~~**T0.1** 抽取筛选工具函数~~（服务端分页，筛选在 getEntriesPaginated 内完成）
- [x] ~~**T0.2**~~ tag 精确、keyword 模糊已在 Server Action 实现

---

## 阶段 1：首页日期范围选择器

- [x] **T1.1** 新建 `MagicCalendarRange.tsx`：支持选择开始/结束日期，`onSelectRange(startStr, endStr)` 回调
- [x] **T1.2** 首页 Toolbar 将日期选择器从 `MagicCalendar` 替换为 `MagicCalendarRange`
- [x] **T1.3** 将 `selectedFilterDate` 改为 `selectedFilterDateRange: { from?: string; to?: string }`
- [x] **T1.4** 日期范围传入 `getEntriesPaginated` 的 dateFrom、dateTo
- [x] **T1.5** 日期选择器展示：有范围时显示 "MMM dd - MMM dd, yyyy"，无时显示 "All Dates"

---

## 阶段 2：首页无限滚动（服务端分页）

- [x] **T2.1** 新增 `getEntriesPaginated` Server Action，每批 30 条
- [x] **T2.2** 日记列表渲染 `listEntries`，由分页 API 返回
- [x] **T2.3** 列表底部添加哨兵元素
- [x] **T2.4** `IntersectionObserver` + `rootMargin: 30vh` 触发加载下一页
- [x] **T2.5** 底部展示「记忆提取完毕」当 hasMore=false

---

## 阶段 3：日记本内页关键词搜索

- [x] **T3.1** 为 Search 按钮添加 `onClick`，切换 `isSearchOpen` 状态
- [x] **T3.2** 搜索展开时在 header 显示输入框
- [x] **T3.3** 根据 `searchKeyword` 筛选 `bookEntries`：`title`、`content` 模糊匹配（不区分大小写）
- [x] **T3.4** 筛选后的 `bookEntries` 用于日历、prev/next 导航
- [x] **T3.5** 清空关键词时恢复展示全部日记
- [x] **T3.6** 搜索框 `onKeyDown` 监听 Enter，按下时基于 `searchKeyword` 执行匹配
- [x] **T3.7** 单条匹配：直接跳转到该日记 DiaryView
- [x] **T3.8** 多条匹配：弹窗展示日记列表（标题、日期、tag），点击项跳转后关闭弹窗
- [x] **T3.9** 无匹配：不跳转，可选展示「无匹配结果」提示

---

## 阶段 4：测试与验收

- [ ] **T4.1** 为 getEntriesPaginated 编写 Vitest 集成测试
- [ ] **T4.2** 手动验证：首页日期范围、组合筛选、无限滚动、底部提示；日记本内页搜索
- [x] **T4.3** 日记本内页日历保持单日期选择

---

## 验收标准

- 首页日记列表支持无限滚动，无分页按钮，保持瀑布流
- 首页日期选择器为日期范围，日记本内页保持单日期
- 首页支持日期范围、tag、日记本、关键词的组合筛选；tag 精确、keyword 模糊
- 日记本内页 Search 按钮可展开搜索框，按关键词模糊筛选当前本内日记
- 日记本内页搜索框按 Enter：单条匹配直接跳转，多条匹配弹窗选择后跳转
