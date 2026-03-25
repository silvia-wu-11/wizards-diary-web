# Tasks: 日记批量删除功能

## 阶段 1：规格文档设计
- [x] 创建 `proposal.md` 描述需求背景和目标。
- [x] 创建 `design.md` 描述 UI 和接口设计。
- [x] 更新 `openspec/specs/diary-list/spec.md` 补充批量删除的行为规格（Requirement 和 Scenarios）。

## 阶段 2：服务端实现
- [ ] 在 `src/app/actions/diary.ts` 中新增 `deleteEntries` Server Action。
- [ ] 确保 `deleteEntries` 包含用户认证及日记所属权校验。
- [ ] 在 `src/app/store/index.ts` (如果有必要) 中增加删除记录的方法（或者由 Dashboard 组件自身维护列表状态）。

## 阶段 3：前端 UI 实现
- [ ] 在 `Dashboard.tsx` 中引入删除相关状态 (`isDeleteMode`, `selectedForDeletion`, `isDeleting`)。
- [ ] 在搜索栏右侧（OldFriendButton旁）新增删除模式切换/执行按钮。
- [ ] 根据设计调整删除按钮在默认/激活状态下的样式（图标、文字、角标）。
- [ ] 修改日记卡片列表的渲染逻辑：处于删除模式时，点击卡片变为切换选中状态；不放大展示详情。
- [ ] 为选中的日记卡片添加暗色蒙层样式。

## 阶段 4：联调与测试
- [ ] 点击“遗忘”按钮，调用 `deleteEntries` API 并在成功后更新前端列表和给予 toast 提示。
- [ ] 验证用户取消勾选、空勾选情况下的行为是否符合预期。
- [ ] 确保未登录或非自己日记本的情况下无法删除。
