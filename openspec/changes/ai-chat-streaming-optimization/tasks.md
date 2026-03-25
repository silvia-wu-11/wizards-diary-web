# AI 对话流式展示优化 · 任务清单

按执行顺序排列。每项任务完成后可勾选。

---

## 阶段 0：流式解析优化

- [x] **T0.1** 更新 `OldFriendChatDrawer` 的缓冲区解析逻辑，支持增量解析与及时展示
- [x] **T0.2** 在流式更新路径中禁用 React 自动批处理
- [x] **T0.3** 增加不完整 JSON 的容错解析
- [x] **T0.4** 兼容 reasoning_content 阶段展示“思考中”
- [x] **T0.5** 对高频分片做节流合并，提升流畅度
- [x] **T0.6** 记录首分片到首 content 与首 content 到完成的指标

---

## 阶段 1：验证

- [ ] **T1.1** 验证流式输出的实时性与错误兜底行为
- [ ] **T1.2** 验证“思考中”展示、节流与指标记录

---

## 阶段 2：Session 缓存初始化

- [x] **T2.1** 在 `OldFriendChatDrawer` 打开抽屉时立即发起带 `instructions` + `caching: {type: "enabled"}` 的初始化请求，建立 Session 缓存
- [x] **T2.2** 在前端维护 `responseId`，每次发送消息后更新
- [x] **T2.3** 抽屉关闭后清空 `responseId`，下次打开重新初始化

---

## 阶段 3：多轮对话串联

- [x] **T3.1** 将 `previous_response_id` 作为必填参数传入后续请求
- [x] **T3.2** 修改 `input` 仅传当前用户输入，不再发送历史消息
- [x] **T3.3** 更新 `route.ts` 移除 `messages` 拼接逻辑，改为直接透传 `input` 与 `previous_response_id`

---

## 阶段 4：验证

- [ ] **T4.1** 验证首次打开抽屉时人设正确注入
- [ ] **T4.2** 验证多轮对话 `previous_response_id` 正确传递
- [ ] **T4.3** 验证关闭抽屉后重新打开建立新 Session

---

## 阶段 5：文档同步

- [x] **T5.1** 更新 `openspec/specs/ai-chat/spec.md` 确认 Session 缓存行为描述与实现一致
