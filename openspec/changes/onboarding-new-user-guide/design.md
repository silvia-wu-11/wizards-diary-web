# 新用户引导 · 技术设计

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│  页面（Dashboard / Login / Register / DiaryView）                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  灰色蒙层（半透明、pointer-events: auto 阻止点击）                     │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │  引导步骤内容组件（明亮、z-index 高于蒙层、可点击）                │ │ │
│  │  │  - 当前步骤文案                                                   │ │ │
│  │  │  - 高亮目标元素（可选：spotlight 或箭头指向）                      │ │ │
│  │  │  - [下一步] [取消] 按钮                                           │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 状态与持久化

| 状态 | 存储位置 | 说明 |
|------|----------|------|
| `onboardingCompleted` | localStorage | `'true'` 表示已完成或已取消，不再自动展示 |
| `onboardingStep` | React state / Context | 当前步骤 1 | 2 | 3，用于渲染对应文案与高亮 |
| `onboardingVisible` | React state | 是否展示引导（含蒙层） |

**Key**：`wizards-diary-onboarding-completed`

---

## 引导步骤与目标元素

| 步骤 | 页面 | 引导文案（示例） | 高亮目标 | 下一步行为 | 取消行为 |
|------|------|------------------|----------|------------|----------|
| Step1 | 首页(Dashboard) | 请先注册或登录账号，开启你的魔法之旅 | header 的「login」按钮 | 展示「注册账号」弹窗（AuthModal 注册模式） | 1.5s 后滚动到书架，展示 Step2 |
| Step2 | 首页(Dashboard) | 创建你的第一本日记本 | 书架「+」添加按钮 | 展示「创建日记本」表单弹窗 | 退出引导 |
| Step3 | 首页 | 点击日记本打开，写下你的第一篇日记 | 书架中新建的日记本 | 点击「完成」结束引导 | 退出引导 |

**Step1 流程**：
- 点击「下一步」→ 打开 AuthModal（注册模式）
- 完成注册/登录成功 → 1.5s 后平滑滚动至书架居中 → 展示 Step2
- 点击「取消」→ 1.5s 后平滑滚动至书架居中 → 展示 Step2（不退出引导）

**Step2 流程**：
- 点击「下一步」→ 打开「创建日记本」表单弹窗（isNewBookModalOpen）
- 未登录用户也可点击「下一步」，弹窗打开后若需登录会触发 AuthModal（现有逻辑）
- 完成创建日记本 → 1s 后自动展示 Step3

**Step3 流程**：
- 点击「完成」→ 退出引导，持久化完成状态

---

## 组件设计

### OnboardingOverlay

**职责**：蒙层 + 引导内容容器，控制显示/隐藏与步骤切换。

**Props**：
```ts
interface OnboardingOverlayProps {
  visible: boolean;
  step: 1 | 2 | 3;
  onNext: () => void;
  onCancel: () => void;
  /** 高亮目标元素的 data 属性或 ref，用于定位 spotlight */
  highlightTarget?: string | React.RefObject<HTMLElement | null>;
}
```

**结构**：
- 蒙层：`fixed inset-0 z-[150] bg-black/60`，`pointer-events: auto` 阻止下层点击
- 引导卡片：居中或靠近高亮目标，`z-[151]`，明亮背景（如 `bg-[#EBE5DC]`），含文案、下一步、取消
- 箭头：从引导卡片指向目标元素（使用 `data-onboarding-target` 定位），不做法层挖洞

---

### OnboardingProvider / useOnboarding

**职责**：管理 `visible`、`step`、`onboardingCompleted` 持久化，以及 `onNext`、`onCancel` 逻辑；与 Dashboard 交互：打开 AuthModal、打开创建日记本弹窗、滚动到书架。

**Dashboard 注册的 Actions**（通过 Context 或 callback 注入）：
- `openAuthModal(mode: 'register')`：打开 AuthModal 并切换到注册模式
- `openCreateBookModal()`：打开创建日记本表单弹窗
- `scrollToBookshelf()`：平滑滚动到书架组件
- `onAuthComplete()`：注册/登录成功后由 Dashboard 调用
- `onBookCreated()`：创建日记本成功后由 Dashboard 调用

**onNext 行为**：
- Step1：调用 `openAuthModal('register')`，不切换 step
- Step2：调用 `openCreateBookModal()`，不切换 step
- Step3：持久化完成，隐藏引导

**onCancel 行为**：
- Step1：隐藏 overlay，1.5s 后 `scrollToBookshelf()`，设置 step=2，显示 overlay
- Step2/Step3：持久化完成，隐藏引导

**onAuthComplete**：隐藏 overlay，1.5s 后 `scrollToBookshelf()`，设置 step=2，显示 overlay

**onBookCreated**：1s 后设置 step=3，显示 overlay

---

## 书架滚动

- 书架区域需添加 `data-onboarding-target="bookshelf"` 或 `id="bookshelf"`
- `scrollToBookshelf()`：`document.getElementById('bookshelf')?.scrollIntoView({ behavior: 'smooth', block: 'center' })`
- 或使用 `scroll-margin-top` 确保滚动后书架在视口中间

## AuthModal 注册模式

- AuthModal 需支持通过 prop 指定初始 mode（`'login' | 'register'`）
- Step1 点击「下一步」时，以 `mode="register"` 打开 AuthModal

## 文件结构

```
src/
├── app/
│   ├── components/
│   │   └── onboarding/
│   │       ├── OnboardingOverlay.tsx    # 蒙层 + 引导卡片
│   │       ├── OnboardingProvider.tsx  # Context + 挂载 Overlay
│   │       ├── OnboardingContext.tsx   # 提供 actions 注册、onAuthComplete、onBookCreated
│   │       └── useOnboarding.ts        # hook
│   ├── pages/
│   │   ├── Dashboard.tsx               # 挂载 OnboardingOverlay，Step2/3 时传入 highlightTarget
│   │   └── DiaryView.tsx               # Step3 在日记本内页时挂载
│   └── (auth)/
│       ├── login/
│       │   └── page.tsx                # Step1 时挂载 OnboardingOverlay
│       └── register/
│           └── page.tsx                # Step1 时挂载（可选）
```

**挂载策略**：
- 在根 Layout 或各页面分别挂载 `OnboardingOverlay`，由 `useOnboarding` 控制显示
- 或：在根 Layout 统一挂载一个 `OnboardingOverlay`，通过 Context 获取 `step` 与当前路由，动态渲染对应页面的高亮目标（需要跨页面通信，略复杂）
- **推荐**：在根 Layout 挂载 `OnboardingProvider` + `OnboardingOverlay`，Overlay 根据 `step` 与 `pathname` 决定展示内容；高亮目标通过 `data-onboarding-target="add-book"` 等 data 属性标记，Overlay 用 `document.querySelector` 获取位置做 spotlight（可选）

---

## 样式要点

- 蒙层：`bg-black/60` 或 `bg-black/50`，确保足够暗以突出引导卡片
- 引导卡片：明亮背景（如 `bg-[#EBE5DC]`、`text-[#4A4540]`），与现有魔法风格一致；圆角、阴影
- 按钮：`[下一步]` 主按钮、`[取消]` 次要按钮，符合现有 `MagicButton` 或 `Button` 风格

---

## 测试策略

| 层级 | 工具 | 覆盖 |
|------|------|------|
| 单元 | Vitest | `useOnboarding` 的 step 切换、localStorage 读写 |
| E2E | Playwright | 引导展示、下一步/取消、蒙层不可点击、完成后再访问不展示 |

---

## 实现顺序建议

1. 实现 `useOnboarding` + localStorage 持久化
2. 实现 `OnboardingOverlay` 基础版（蒙层 + 卡片 + 文案 + 按钮，无高亮）
3. 在 Dashboard、Login 页挂载，根据 session 与 step 展示
4. 可选：为书架添加按钮、日记本添加 `data-onboarding-target`，实现 spotlight 或箭头指向
5. 编写 E2E 测试
