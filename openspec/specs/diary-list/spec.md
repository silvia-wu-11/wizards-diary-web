# 日记列表 · 行为规格

## Purpose
用户可在首页和日记本内页浏览、筛选、搜索日记；首页支持日期范围、tag、日记本、关键词的组合筛选与无限滚动；日记本内页支持关键词模糊搜索，且按下 Enter 后可跳转至匹配日记（单条直接跳转，多条弹窗选择）。

## Requirements

### Requirement: 首页日记列表支持无限滚动
系统 SHALL 在首页以瀑布流形式展示日记，采用无限滚动加载，不展示分页按钮；初始展示一批条目，用户滚动接近底部时自动加载下一批。

#### Scenario: 首页加载，初始展示第一批日记
- GIVEN 用户已登录
- AND 该用户有至少 30 条日记
- WHEN 用户进入首页
- THEN 系统展示前 24 条（或首屏合理数量）日记
- AND 日记以瀑布流布局排列
- AND 无分页按钮

#### Scenario: 用户滚动到底部，加载下一批
- GIVEN 用户已登录且在首页
- AND 已展示的日记少于筛选后的总数
- WHEN 用户滚动至列表底部（哨兵元素进入视口）
- THEN 系统追加展示下一批日记（如 24 条）
- AND 保持瀑布流布局

#### Scenario: 已展示全部日记时不再加载
- GIVEN 用户已登录且在首页
- AND 已展示的日记数等于筛选后的总数
- WHEN 用户继续滚动
- THEN 系统不再触发加载
- AND 无额外请求或渲染

---

### Requirement: 首页支持日期范围筛选
系统 SHALL 在首页提供日期范围选择器，用户可选择开始日期与结束日期进行筛选；仅首页使用日期范围，日记本内页保持单日期选择。

#### Scenario: 用户选择日期范围，列表仅展示范围内的日记
- GIVEN 用户已登录且在首页
- AND 用户有若干日记，日期分布在 2025-01-01 至 2025-01-31
- WHEN 用户选择日期范围为 2025-01-10 至 2025-01-20
- THEN 系统仅展示 date 落在该范围内的日记（含边界）
- AND 日期选择器显示所选范围（如 "Jan 10 - Jan 20, 2025"）

#### Scenario: 用户清除日期范围
- GIVEN 用户已选择日期范围
- WHEN 用户点击清除或选择「全部日期」
- THEN 系统恢复展示全部日记（其他筛选条件仍生效）
- AND 日期选择器显示 "All Dates"

#### Scenario: 日记本内页日期选择器保持单日期
- GIVEN 用户在日记本内页（DiaryView）
- WHEN 用户点击日历
- THEN 系统展示单日期选择器（与现有 MagicCalendar 一致）
- AND 选择某日期后跳转到该日期的日记（若有）

---

### Requirement: 首页支持 tag、日记本、关键词的组合筛选
系统 SHALL 支持用户按 tag（精确匹配）、日记本（精确匹配）、关键词（模糊匹配）筛选日记；各条件 AND 组合；未选择的维度不参与筛选。

#### Scenario: 用户选择 tag，仅展示含该 tag 的日记
- GIVEN 用户已登录且在首页
- AND 部分日记有 tag "spell"，部分有 "potion"
- WHEN 用户选择 tag "spell"
- THEN 系统仅展示 tags 数组包含 "spell" 的日记（精确匹配）
- AND 不含 "spell" 的日记不展示

#### Scenario: 用户选择日记本，仅展示该本内的日记
- GIVEN 用户已登录且在首页
- AND 用户有多个日记本，日记分布在不同的 bookId
- WHEN 用户选择某日记本
- THEN 系统仅展示 bookId 等于所选日记本的日记
- AND 其他日记本的日记不展示

#### Scenario: 用户输入关键词，模糊匹配 title 和 content
- GIVEN 用户已登录且在首页
- AND 某日记 title 为 "Learning Wingardium"、content 含 "leviosa"
- WHEN 用户输入关键词 "wing"
- THEN 系统展示该日记（title 包含 "wing"，不区分大小写）
- WHEN 用户输入关键词 "levi"
- THEN 系统展示该日记（content 包含 "levi"）
- AND 匹配不区分大小写

#### Scenario: 多条件组合筛选
- GIVEN 用户已登录且在首页
- WHEN 用户同时选择日期范围、tag "spell"、某日记本、关键词 "magic"
- THEN 系统仅展示同时满足以下条件的日记：date 在范围内 AND tags 含 "spell" AND bookId 匹配 AND (title 或 content 含 "magic")

---

### Requirement: 日记本内页支持关键词模糊搜索
系统 SHALL 在日记本内页提供搜索功能，用户输入关键词后，在当前日记本内按 title、content 模糊匹配筛选日记。

#### Scenario: 用户点击 Search 按钮，展开搜索框
- GIVEN 用户在日记本内页且书本已打开
- WHEN 用户点击 Search 按钮
- THEN 系统展开搜索输入框（内联或浮层）
- AND 用户可输入关键词

#### Scenario: 用户输入关键词，仅展示匹配的日记
- GIVEN 用户在日记本内页，当前本有若干日记
- AND 某日记 content 含 "phoenix feather"
- WHEN 用户输入关键词 "phoenix"
- THEN 系统仅展示 title 或 content 包含 "phoenix" 的日记（不区分大小写）
- AND 日历与 prev/next 导航基于筛选后的列表

#### Scenario: 用户清空关键词，恢复展示全部
- GIVEN 用户已输入关键词并看到筛选结果
- WHEN 用户清空搜索框
- THEN 系统恢复展示当前日记本内的全部日记
- AND 日历与导航恢复正常

---

### Requirement: 日记本内页搜索框支持 Enter 触发跳转
系统 SHALL 在用户于搜索框按下 Enter 后，基于当前关键词的匹配结果执行跳转：若仅匹配一篇日记则直接跳转至该日记；若匹配多篇则弹窗展示列表供用户选择后跳转。

#### Scenario: 按下 Enter 且仅匹配一篇日记，直接跳转
- GIVEN 用户在日记本内页，搜索框已展开且输入了关键词
- AND 当前日记本内仅有一篇日记的 title 或 content 匹配该关键词
- WHEN 用户在搜索框按下 Enter
- THEN 系统直接跳转到该日记的 DiaryView
- AND 关闭或收起搜索相关 UI

#### Scenario: 按下 Enter 且匹配多篇日记，弹窗展示列表供选择
- GIVEN 用户在日记本内页，搜索框已展开且输入了关键词
- AND 当前日记本内有多篇日记的 title 或 content 匹配该关键词
- WHEN 用户在搜索框按下 Enter
- THEN 系统弹出模态框，展示匹配的日记列表
- AND 列表项展示：标题、日期、tag 关键字（不展示正文）
- AND 用户可点击某一项，跳转到该日记的 DiaryView
- AND 跳转后关闭弹窗

#### Scenario: 按下 Enter 且无匹配结果
- GIVEN 用户在日记本内页，搜索框已展开且输入了关键词
- AND 当前日记本内无日记匹配该关键词
- WHEN 用户在搜索框按下 Enter
- THEN 系统不执行跳转
- AND 可展示「无匹配结果」提示（可选）

---

## 实现入口

本规格的实现由 OpenSpec 变更驱动，详见：

- [openspec/changes/diary-list-pagination-search/](../../changes/diary-list-pagination-search/) — proposal、design、tasks
