# 日记数据后端持久化 · 任务清单

按执行顺序排列。每项任务完成后可勾选。

---

## 阶段 0：数据模型与 Supabase

- [x] **T0.1** 在 `prisma/schema.prisma` 中新增 `DiaryBook`、`DiaryEntry` 模型（DiaryEntry 含 title?、imageUrls String[]），User 补充 `books` relation
- [x] **T0.2** 执行 `pnpm prisma migrate dev` 创建表
- [x] **T0.3** 执行 `pnpm prisma generate` 生成 Client
- [x] **T0.4** 配置 Supabase：创建项目、Storage bucket（如 `diary-images`）、配置 `NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`

---

## 阶段 1：Server Actions

- [x] **T1.1** 创建 `src/app/actions/diary.ts`：`getDiaryData()`，内部 `auth()` 校验，Prisma 查询当前用户的 books 与 entries
- [x] **T1.2** 实现 `createEntry(entry)`：仅 content 必填；bookId 缺省时取第一个日记本；date 缺省时为当日；title、tags 可选；创建 DiaryEntry，返回新记录
- [x] **T1.3** 实现 `updateEntry(id, updates)`：校验归属（通过 book.userId），更新并返回
- [x] **T1.4** 实现 `deleteEntry(id)`：校验归属，删除
- [x] **T1.5** 实现 `createBook(book)`：校验 name，创建 DiaryBook，返回新记录
- [x] **T1.6** 实现 `deleteBook(bookId)`：校验归属，级联删除（Prisma onDelete: Cascade 自动处理）

---

## 阶段 2：Store 改造

- [x] **T2.1** 移除 `src/app/store.ts` 中的 localStorage、IndexedDB 相关逻辑及 `idb-keyval` 依赖
- [x] **T2.2** 改造 `loadData`：调用 `getDiaryData()`，成功后 setState；未登录时处理错误（可选：重定向或清空）
- [x] **T2.3** 改造 `saveEntry`：调用 `createEntry()`，成功后更新本地 state 或重新 loadData
- [x] **T2.4** 改造 `addEntry`、`updateEntry`、`deleteEntry`：调用对应 Server Action，成功后更新 state
- [x] **T2.5** 改造 `addBook`、`deleteBook`：调用对应 Server Action，成功后更新 state
- [x] **T2.6** 移除默认 seed 数据逻辑（或改为：新用户无数据时展示空状态 + 引导创建）

---

## 阶段 3：图片上传与类型适配

- [x] **T3.1** 创建 `src/lib/supabase/storage.ts`：封装图片上传至 Supabase Storage，返回 URL
- [x] **T3.2** 日记创建/编辑流程：用户添加图片时先上传至 Storage，获得 URL 后随 entry 一并提交
- [x] **T3.3** 确保前端 `DiaryEntry.date`（string ISO）与 Prisma `DateTime` 的序列化/反序列化一致
- [x] **T3.4** 确保 `tags`、`imageUrls` 等字段在前后端间正确映射（前端 `images` 可改为 `imageUrls` 存 URL）

---

## 阶段 4：测试

- [x] **T4.1** 为 Server Actions 编写 Vitest 集成测试：getDiaryData 返回当前用户数据；createEntry 创建成功；未登录时抛错
- [ ] **T4.2** 编写 E2E 测试（Playwright）：登录后创建日记、创建日记本、删除日记本，刷新后数据仍在
- [x] **T4.3** 跑通全部测试，确认与 spec 一致

---

## 验收标准

- 日记保存、更新、删除均持久化到 PostgreSQL
- 日记本创建、删除均持久化到 PostgreSQL
- 删除日记本时，其下日记一并删除
- 应用加载时从后端拉取数据，未登录不返回数据
- 所有操作均校验当前用户归属，无法操作他人数据

