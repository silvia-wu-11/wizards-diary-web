***

name: "wizards-ui-guidelines"
description: "定义魔法日记本 UI 开发规范（视觉、动效、组件、文案）。当开发/修改任何页面与组件 UI，或新增功能需要落 UI 时必须调用；要求页面文案一律为英文且复古魔法风。"
-------------------------------------------------------------------------------------------------

# 魔法日记本 · UI 开发规范 (UI Guidelines)

本 Skill 用于在功能开发过程中统一 UI 设计语言与落地标准，确保“温暖、复古、魔法世界”的整体体验一致，并避免出现现代化/科技感过强的视觉与文案。

## 触发场景 (When to Use)

当用户提出以下需求时，优先调用并遵循本 Skill：

- 新增页面、模块或核心交互（例如日记编辑、保存、检索、设置页）。
- 调整任何可见 UI（布局、样式、动效、图标、插画、组件状态）。
- 需要新增/修改页面文案（按钮、标题、提示、空状态、错误文案、loading 文案等）。
- 需要定义或重构 UI 组件库（Button/Card/Input/Modal/Toast 等）。

## 总则 (Non-Negotiables)

1. **页面可见文案一律使用英文**：包括标题、按钮、提示、占位符、空状态、错误与成功提示等（不含日志/调试输出）。
2. **英文文案必须“复古魔法世界”风格**：避免现代互联网口吻、技术术语堆砌、过度口语化。
3. **视觉语言一致**：水彩卡通 + 手绘纹理 + 半透明叠层 + 圆角 + 柔和漫反射阴影。
4. **动效克制但有“施法感”**：优先微交互与状态过渡，避免炫技与重动画。
5. **可访问性不妥协**：可读性、对比度、键盘可用、尊重 reduced motion。

## 视觉设计语言 (UI)

### 氛围与材质

- **整体氛围**：Warm / Magical / Inviting。
- **画风**：水彩卡通风，软刷笔触、半透明层、手绘纹理。
- **材质/纹理建议**：
  - Aged parchment（旧羊皮纸：轻微褶皱、磨损、污渍）
  - Vintage leather（复古皮革）
  - Metal clasps / hardware（金属扣件/铆钉）
  - Magical glow（微弱发光/光晕）
- **装饰元素**：星光、魔杖、药剂瓶、符文、蜡封、羽毛笔等“通用魔法元素”，避免明显指向特定 IP。

### 形状与阴影

- 所有 UI 元素优先 **圆角**（卡片、输入框、按钮、弹窗）。
- 阴影使用 **柔和、扩散型**（避免硬阴影/强对比）。
- 叠层建议使用 **半透明 + 背景纹理**，而不是纯色块堆叠。

## 字体与排版 (Typography)

- **标题/装饰性文字**：魔法感展示字体（例如 Caveat 或风格相近的优雅手写/书法体）。
- **正文英文**：Vintage Serif（复古衬线，营造手写/古籍感）。
- **中文字体说明**：项目整体氛围建议中文使用宋体，但由于“页面可见文案必须英文”，中文仅用于开发文档或非产品界面内容。
- **可读性底线**：
  - 正文对比度足够，避免浅色字压在复杂纹理上（必要时加半透明底或 text-shadow）。
  - 文本行高偏舒展（古籍感），避免现代 UI 的紧凑压迫。

## 交互与动效 (UX / Motion)

### 核心原则

- 动效服务“沉浸与反馈”，不服务“炫技”。
- 统一过渡时间与曲线（避免不同组件节奏割裂）。
- 尊重系统设置：`prefers-reduced-motion` 下应明显减少或关闭关键动画。

### 推荐动效模式

- **页面进入**：柔和“魔法光”淡入（light fade-in）。
- **按钮点击**：轻微火花/边缘发光反馈（sparks / glowing border）。
- **卡片 Hover**：轻微上浮 + 细微光晕（floating + halo）。
- **滚动体验**：平滑滚动，必要时模拟“羊皮纸翻页”感（克制使用）。

## 状态与系统反馈 (States)

- **成功**：微型“光点迸发/闪粉”提示（sparkle burst），不要大面积粒子爆炸。
- **错误**：主题化提示（“施法失败/冒烟/暗雾”），但文案必须清晰，不能只写氛围不说原因。
- **加载**：主题化加载（搅拌坩埚、漂浮魔杖、沙漏等），避免默认 spinner 的现代感。

## 组件落地规范 (Implementation)

### 组件化与一致性

- 对重复出现的 UI（按钮、输入框、卡片、Toast、Modal、EmptyState、Loading）必须抽象为可复用组件。
- 每个组件至少定义：`default` / `hover` / `active` / `disabled` / `loading` / `error`（按需）。
- 同一类组件的圆角、阴影、边框宽度、间距应统一，避免“每个页面一套”。

### 纹理与可读性处理

- 背景纹理要“可感知但不抢字”：必要时在文本区域加半透明底（例如 parchment overlay）。
- 不要在高频交互控件上使用过重纹理（会干扰识别与点击）。

### 可访问性 (A11y) 最低要求

- 可交互元素必须有明显的 focus 样式（键盘可用）。
- 错误提示要可被读屏识别（例如 `aria-live`，按项目约定落地）。
- 动效需兼容 reduced motion（提供降级）。

## 英文文案规范 (Copywriting)

### 风格定位

- 语气：克制、温柔、仪式感、古典但不晦涩。
- 用词：优先“书信/手稿/卷轴/封印/墨水/符文/星光”等意象。
- 避免：互联网俚语、过度感叹、emoji、现代产品术语（如 “Submit”, “Oops”, “LOL”, “FYI” 等）。

### 基本规则

- **清晰优先于氛围**：错误/空状态必须说明发生了什么，以及用户能做什么。
- 按钮动词使用“仪式化但直观”的表达（避免太文学导致不知所云）。
- 同一概念用词统一（例如始终用 “Entry” 或 “Page”，不要混用）。

### 建议词汇表 (可复用)

- Diary entry：`Entry` / `Page`
- Save：`Seal` / `Preserve` / `Set Ink`
- Edit：`Revise` / `Amend`
- Delete：`Discard` / `Burn the Page`（慎用，注意确认弹窗）
- Search：`Seek` / `Scry`
- Loading：`Stirring the Cauldron...` / `Gathering Starlight...`

### 组件文案示例

- Primary CTA：`Seal the Page`
- Secondary CTA：`Keep Revising`
- Empty state：
  - Title: `No Pages Yet`
  - Body: `Your diary awaits its first spell of ink. Begin a new entry to start the tale.`
  - CTA: `Begin a Page`
- Error toast：
  - Title: `The Spell Fizzled`
  - Body: `Your changes were not sealed. Try again in a moment.`
- Success toast：
  - `Sealed in Starlight.`

### 禁止项 (Hard No)

- 产品 UI 中出现中文文案。
- 现代口吻的提示：`Something went wrong`, `Oops`, `Click here`（可用但不推荐，需替换为复古魔法表达且保持清晰）。
- 把技术细节直接暴露给用户（例如直接显示原始异常堆栈）。必要时给出可理解的解释，并记录详细信息到日志（非 UI）。

## PR/自测清单 (Checklist)

- 页面所有可见文案均为英文，且符合复古魔法世界语气。
- 关键交互具备 hover/active/focus/disabled/loading 状态。
- 成功/错误/加载/空状态均有主题化反馈且信息清晰。
- 动效节奏统一，并在 reduced motion 下可降级。
- 纹理不影响可读性：长文本区域对比度足够。

