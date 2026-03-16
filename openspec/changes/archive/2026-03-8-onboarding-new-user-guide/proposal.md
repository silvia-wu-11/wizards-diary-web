# 新用户引导 · 变更提案

## 变更 ID
`onboarding-new-user-guide`

## 目标
基于 [openspec/specs/onboarding/spec.md](../../specs/onboarding/spec.md) 实现新用户引导功能，帮助新用户完成「注册/登录 → 创建日记本 → 创建第一篇日记」的核心流程；引导期间使用灰色蒙层与明亮引导组件，用户可随时取消。

## 范围
- 三步引导流程：Step1 注册/登录、Step2 创建日记本、Step3 写下第一篇日记
- Step1 点击「下一步」→ 展示注册账号弹窗；点击「取消」或完成注册/登录 → 1.5s 后滚动到书架，展示 Step2
- Step2 点击「下一步」→ 展示创建日记本表单弹窗（未登录也可点击）
- 创建第一个日记本后 1s 自动展示 Step3
- 灰色半透明蒙层、引导卡片明亮可交互、箭头指向
- 引导完成状态持久化（localStorage）

## 不在此次范围
- 设置页中的「重新查看引导」入口（可后续补充）
- 引导步骤内的动画、过渡效果（先实现基础版，再优化）
- 多语言/国际化

## 依赖
- 行为规格：`openspec/specs/onboarding/spec.md`
- 现有能力：`auth`、`diary-book`、`diary-entry` 相关页面与组件
- 技术设计：见本 change 的 `design.md`

## 协作约定
- 实现前先阅读 `spec.md` 与 `design.md`
- 按 TDD：先写测试（对应 spec 中的 Scenario），再实现直到通过
- 若实现中发现需求/设计需调整，优先更新 spec/design，再改代码
