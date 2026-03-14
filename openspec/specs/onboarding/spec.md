# 新用户引导 · 行为规格

## Purpose
为新用户提供分步引导，帮助其完成「注册/登录 → 创建日记本 → 创建第一篇日记」的核心流程；引导期间通过蒙层与高亮突出当前步骤，用户可随时取消引导。

## Requirements

### Requirement: 引导分三步，每步可进入下一步或取消
系统 SHALL 提供三步引导流程：Step1 引导注册/登录、Step2 引导创建日记本、Step3 引导打开日记本并创建第一篇日记；每步 SHALL 提供「下一步」与「取消」按钮；点击「下一步」进入下一步骤，点击「取消」退出引导并隐藏蒙层与引导内容。

#### Scenario: Step1 展示时，用户点击「下一步」
- GIVEN 用户处于引导 Step1（引导注册/登录）
- WHEN 用户点击「下一步」按钮
- THEN 系统展示「注册账号」弹窗（AuthModal，注册模式）
- AND 引导蒙层与卡片保持展示（或暂时隐藏，由实现决定）

#### Scenario: Step1 展示时，用户点击「取消」
- GIVEN 用户处于引导 Step1
- WHEN 用户点击「取消」按钮
- THEN 系统隐藏 Step1 引导蒙层与卡片
- AND 1.5 秒后，平滑滚动页面将书架组件置于页面中间
- AND 展示 Step2 引导弹窗（引导创建日记本）

#### Scenario: Step2 展示时，用户点击「下一步」
- GIVEN 用户处于引导 Step2（引导创建日记本）
- WHEN 用户点击「下一步」按钮
- THEN 系统展示「创建日记本」信息表单弹窗
- AND 无论用户是否已登录，均可点击「下一步」触发此行为

#### Scenario: Step2 展示时，用户点击「取消」
- GIVEN 用户处于引导 Step2
- WHEN 用户点击「取消」按钮
- THEN 系统退出引导
- AND 隐藏蒙层与引导内容
- AND 页面恢复正常展示并可点击

#### Scenario: Step3 展示时，用户点击「下一步」或「完成」
- GIVEN 用户处于引导 Step3（最后一步）
- WHEN 用户点击「下一步」或「完成」按钮
- THEN 系统退出引导
- AND 隐藏蒙层与引导内容
- AND 页面恢复正常展示并可点击

#### Scenario: Step3 展示时，用户点击「取消」
- GIVEN 用户处于引导 Step3
- WHEN 用户点击「取消」按钮
- THEN 系统退出引导
- AND 隐藏蒙层与引导内容
- AND 页面恢复正常展示并可点击

---

### Requirement: 引导期间页面其余部分被灰色蒙层掩盖且不可点击
系统 SHALL 在展示引导时，使用灰色半透明蒙层覆盖页面除「引导步骤内容组件」以外的区域；蒙层覆盖的区域 SHALL 不可点击（pointer-events 阻止）；引导步骤内容组件 SHALL 保持明亮、可交互。

#### Scenario: 引导展示时，蒙层覆盖非引导区域
- GIVEN 引导正在展示（任意步骤）
- WHEN 用户查看页面
- THEN 引导步骤内容组件（含文案、下一步、取消按钮）为明亮、可见、可点击
- AND 页面其余部分被灰色半透明蒙层覆盖
- AND 蒙层覆盖区域不可点击（点击无效或穿透至蒙层本身）

#### Scenario: 取消引导后，蒙层与引导内容隐藏
- GIVEN 用户已点击「取消」或完成最后一步
- WHEN 引导已退出
- THEN 蒙层隐藏
- AND 引导内容组件隐藏
- AND 页面正常展示，所有区域可点击

---

### Requirement: Step1 引导用户注册或登录
系统 SHALL 在 Step1 中引导用户完成注册或登录；文案应指向登录/注册入口（如 header 的「登录」按钮或 AuthModal）；用户完成登录/注册后，可自动进入 Step2 或由用户点击「下一步」进入。

#### Scenario: 未登录用户看到 Step1
- GIVEN 用户未登录
- AND 引导条件满足（如首次访问、未完成过引导）
- WHEN 用户进入首页（未登录可访问首页）
- THEN 系统展示 Step1 引导
- AND 引导文案指向「注册账号」或「登录账号」入口
- AND 箭头指向 header 的登录/注册按钮

#### Scenario: 用户完成注册或登录后进入 Step2
- GIVEN 用户处于 Step1 引导
- AND 用户通过 AuthModal 完成注册或登录
- WHEN 注册/登录成功
- THEN 1.5 秒后，系统平滑滚动页面将书架置于中间
- AND 展示 Step2 引导弹窗（引导创建日记本）

---

### Requirement: Step2 引导用户创建日记本
系统 SHALL 在 Step2 中引导用户创建日记本；点击「下一步」时展示「创建日记本」表单弹窗；未登录用户也可点击「下一步」。

#### Scenario: 用户进入 Step2 引导
- GIVEN 用户完成 Step1（注册/登录）或点击 Step1「取消」
- AND 1.5 秒后页面已平滑滚动至书架居中
- WHEN 系统展示 Step2 引导
- THEN 引导文案说明创建日记本
- AND 箭头指向书架或添加按钮
- AND 用户（无论是否登录）可点击「下一步」

#### Scenario: 用户点击 Step2「下一步」展示创建日记本表单
- GIVEN 用户处于 Step2 引导
- WHEN 用户点击「下一步」按钮
- THEN 系统展示「创建日记本」信息表单弹窗
- AND 用户可填写并提交创建

---

### Requirement: Step3 引导用户打开日记本并创建第一篇日记
系统 SHALL 在 Step3 中引导用户点击日记本打开并创建第一篇日记；用户完成创建第一个日记本后，1 秒后自动展示 Step3 引导。

#### Scenario: 用户完成创建第一个日记本后自动进入 Step3
- GIVEN 用户处于 Step2 引导
- AND 用户通过表单弹窗成功创建第一个日记本
- WHEN 创建完成
- THEN 1 秒后系统展示 Step3 引导弹窗（「写下第一篇日记」）
- AND 引导文案说明点击日记本打开并创建第一篇日记
- AND 箭头指向书架中刚创建的日记本

#### Scenario: 用户点击 Step3「完成」结束引导
- GIVEN 用户处于 Step3 引导
- WHEN 用户点击「完成」按钮
- THEN 系统退出引导，隐藏蒙层与引导内容

---

### Requirement: 引导完成状态持久化，避免重复展示
系统 SHALL 在用户完成引导（点击「完成」或走完 Step3）或取消引导后，将「已看过引导」状态持久化（如 localStorage）；后续访问时 SHALL 不再自动展示引导，除非用户主动触发（如设置中的「重新查看引导」）。

#### Scenario: 用户完成引导后再次访问
- GIVEN 用户曾完成或取消过引导
- WHEN 用户再次访问首页或相关页面
- THEN 系统不自动展示引导
- AND 页面正常展示，无蒙层

#### Scenario: 新用户首次访问
- GIVEN 用户从未完成或取消过引导（localStorage 无记录或为 false）
- WHEN 用户首次访问需展示引导的页面
- THEN 系统展示引导（从 Step1 或根据登录状态从 Step2 开始）
- AND 蒙层与引导内容按 spec 展示

---

## 实现入口

本规格的实现由 OpenSpec 变更驱动，详见：

- [openspec/changes/onboarding-new-user-guide/](../../changes/onboarding-new-user-guide/) — proposal、design、tasks
