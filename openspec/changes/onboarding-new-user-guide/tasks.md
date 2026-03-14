# 新用户引导 · 任务清单

按执行顺序排列。每项任务完成后可勾选。

---

## 阶段 0：准备

- [x] **T0.1** 阅读 `openspec/specs/onboarding/spec.md` 与 `design.md`，确认引导步骤与 UI 行为
- [x] **T0.2** 确认 localStorage key：`wizards-diary-onboarding-completed`

---

## 阶段 1：AuthModal 支持初始 mode

- [ ] **T1.1** 为 AuthModal 添加 `initialMode?: 'login' | 'register'` prop，打开时优先展示对应模式

---

## 阶段 2：OnboardingContext 与 Actions

- [ ] **T2.1** 创建 `OnboardingContext`：提供 `registerActions({ openAuthModal, openCreateBookModal, scrollToBookshelf })`、`onAuthComplete`、`onBookCreated`
- [ ] **T2.2** 更新 `useOnboarding`：Step1 onNext 调用 `openAuthModal('register')`；Step1 onCancel 隐藏后 1.5s 滚动到书架并显示 Step2；Step2 onNext 调用 `openCreateBookModal`
- [ ] **T2.3** 实现 `scrollToBookshelf`：书架添加 `id="bookshelf"` 或 `data-onboarding-target="bookshelf"`，`scrollIntoView({ behavior: 'smooth', block: 'center' })`

---

## 阶段 3：Dashboard 集成

- [ ] **T3.1** Dashboard 挂载时调用 `registerOnboardingActions` 注册 openAuthModal、openCreateBookModal、scrollToBookshelf
- [ ] **T3.2** AuthModal 关闭时（登录/注册成功）调用 `onAuthComplete`
- [ ] **T3.3** 创建日记本成功后调用 `onBookCreated`（1s 后展示 Step3）
- [ ] **T3.4** Step1 点击「下一步」时以 `initialMode="register"` 打开 AuthModal

---

## 阶段 4：OnboardingOverlay 调整

- [ ] **T4.1** Step2 移除「必须完成创建才能点下一步」限制，未登录也可点击
- [ ] **T4.2** Step1 展示时点击「下一步」不切换 step，由 onNext 内部打开 AuthModal
- [ ] **T4.3** 确认 Step3 文案为「写下第一篇日记」，按钮为「完成」

---

## 阶段 5：收尾

- [ ] **T5.1** 跑通完整流程：Step1 下一步→注册弹窗→完成/取消→1.5s 滚动→Step2→下一步→创建日记本弹窗→创建完成→1s→Step3→完成
- [ ] **T5.2** 检查无障碍与动画流畅度

---

## 验收标准

- Step1 点击「下一步」展示注册账号弹窗
- Step1 取消或完成注册/登录后，1.5s 后平滑滚动到书架，展示 Step2
- Step2 点击「下一步」展示创建日记本表单弹窗，未登录也可点击
- 创建第一个日记本后 1s 自动展示 Step3
- Step3 点击「完成」退出引导并持久化
