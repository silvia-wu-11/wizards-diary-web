# Design: 日记批量删除功能

## UI 交互设计
1. **删除模式开关**：
   - 位置：首页“日记筛选搜索栏”右侧（`OldFriendButton` 旁边）。
   - 默认状态：一个浅灰色的“垃圾桶”图标。
   - 激活状态（删除模式）：展示为垃圾桶图标 + “遗忘”文字，按钮样式变为暗红色。按钮右上方通过一个数字标记（Badge）展示当前被选中的日记数量。
2. **列表交互（删除模式下）**：
   - 激活删除模式后，用户点击下方列表中的日记卡片，不再触发查看详情的操作，而是切换选中状态。
   - **选中样式**：被选中的日记卡片颜色变暗（可使用深色遮罩或 opacity 调整），让用户明显感知其已被选中。
   - **点击热区**：整个日记卡片。
3. **执行删除**：
   - 用户勾选完日记后，点击处于激活状态的“遗忘”按钮。
   - 如果选中数量为 0，可直接退出删除模式或不响应。
   - 触发服务端 Action，从数据库中删除所选 ID 的日记记录。
   - 成功后：退出删除模式，清空选中状态，重新加载或本地过滤掉已删除的日记，弹出 toast 提示“成功遗忘这些记忆”。
   - 失败后：弹出 toast 提示错误信息，保持当前状态不变。

## 接口与数据层设计
1. **Server Action**：
   - 新增 `deleteEntries(ids: string[])` 函数在 `src/app/actions/diary.ts` 中。
   - 需要验证用户身份，并确保要删除的日记归属于当前用户（`book.userId === currentUser.id`）。
   - 使用 Prisma 的 `deleteMany` 批量删除选中的日记。

## 状态管理
1. **Dashboard 局部状态**：
   - `isDeleteMode`: boolean，标记是否处于批量删除模式。
   - `selectedForDeletion`: Set<string>，存储当前选中的日记 ID 集合。
   - `isDeleting`: boolean，标记是否正在执行删除请求。

## 样式细节
- 默认删除按钮：`text-[#4A4540]/60 hover:text-[#4A4540]` 等。
- 激活删除按钮：`bg-[#8B5A5A] text-[#EBE5DC]`。
- 选中状态的日记卡片：可以在 `motion.div` 外层增加一层 `after:absolute after:inset-0 after:bg-black/40` 之类的深色遮罩，配合 `relative` 和 `overflow-hidden` 实现暗色效果。
