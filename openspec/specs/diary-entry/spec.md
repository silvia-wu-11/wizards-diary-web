# 日记条目 · 行为规格

## Purpose
用户可创建、更新、删除日记条目；数据持久化到后端数据库，与当前登录用户关联；应用加载时从后端拉取数据展示。

## Requirements

### Requirement: 创建日记需提供必填字段，可选字段有默认值
系统 SHALL 在用户创建日记时，要求「内容」为必填；「标题」「标签」为非必填；「所属日记本」默认选中第一个；「日期」默认为当日；缺少必填项时 SHALL 拒绝创建并返回可理解的错误。

#### Scenario: 用户仅提供内容，创建成功
- GIVEN 用户已登录
- AND 用户至少有一个日记本
- WHEN 用户提交日记，仅提供 content（不提供 title、tags，或 bookId、date 为空）
- THEN 系统使用默认值：bookId 为第一个日记本，date 为当日
- AND 创建日记记录（title、tags 可为空）
- AND 将日记关联到当前用户（通过 bookId 所属的 DiaryBook）
- AND 返回新创建的日记（含服务端生成的 id）
- AND 日记出现在日记列表中

#### Scenario: 用户提供完整字段，创建成功
- GIVEN 用户已登录
- AND 用户至少有一个日记本
- WHEN 用户提交包含 title、content、bookId、date、tags 的日记
- THEN 系统在校验通过后创建日记记录
- AND 将日记关联到当前用户（通过 bookId 所属的 DiaryBook）
- AND 返回新创建的日记（含服务端生成的 id）
- AND 日记出现在日记列表中

#### Scenario: 用户未提供内容
- GIVEN 用户已登录
- WHEN 用户提交的日记缺少 content 或 content 为空
- THEN 系统拒绝创建
- AND 返回「内容不能为空」或等价错误提示

#### Scenario: 用户无日记本时创建日记
- GIVEN 用户已登录
- AND 用户没有任何日记本
- WHEN 用户尝试创建日记
- THEN 系统拒绝创建
- AND 返回「请先创建日记本」或等价错误提示

---

### Requirement: 已创建的日记可被更新
系统 SHALL 支持用户更新已有日记的标题、内容、日期、标签、图片等字段；仅允许更新当前用户拥有的日记。

#### Scenario: 用户更新自己的日记
- GIVEN 用户已登录
- AND 该用户拥有日记 E
- WHEN 用户提交对 E 的更新（如修改 title、content）
- THEN 系统更新数据库中的记录
- AND 返回更新后的日记
- AND 前端展示更新后的内容

#### Scenario: 用户尝试更新不属于自己的日记
- GIVEN 用户已登录
- AND 日记 E 属于其他用户（通过 bookId 间接）
- WHEN 用户提交对 E 的更新
- THEN 系统拒绝更新
- AND 返回 403 或等价错误

---

### Requirement: 已创建的日记可被删除
系统 SHALL 支持用户删除已有日记；仅允许删除当前用户拥有的日记。

#### Scenario: 用户删除自己的日记
- GIVEN 用户已登录
- AND 该用户拥有日记 E
- WHEN 用户请求删除 E
- THEN 系统从数据库中删除该记录
- AND 日记从列表中消失

#### Scenario: 用户尝试删除不属于自己的日记
- GIVEN 用户已登录
- AND 日记 E 属于其他用户
- WHEN 用户请求删除 E
- THEN 系统拒绝删除
- AND 返回 403 或等价错误

---

### Requirement: 应用加载时从后端拉取当前用户的日记
系统 SHALL 在用户已登录且进入需展示日记的页面时，从后端 API 拉取当前用户的全部日记本与日记；未登录时 SHALL 不拉取或重定向至登录页。

#### Scenario: 已登录用户进入首页
- GIVEN 用户已登录
- WHEN 用户进入首页或日记相关页面
- THEN 系统调用后端接口获取该用户的 books 与 entries
- AND 展示日记本列表与日记列表
- AND 展示 loading 状态直至数据加载完成

#### Scenario: 未登录用户尝试访问日记数据
- GIVEN 用户未登录
- WHEN 系统尝试拉取日记数据（或用户访问需鉴权页面）
- THEN 系统不返回日记数据
- AND 将用户重定向至登录页（由 Auth 中间件处理）

---

### Requirement: 日记内容输入框支持图片粘贴上传
系统 SHALL 支持用户在日记输入框（首页与详情页）直接粘贴图片。若剪切板内容为图片且当前图片数量未达上限，系统自动将其提取、压缩并添加到日记的图片列表中。

#### Scenario: 剪切板为图片并执行粘贴
- GIVEN 用户处于日记输入或编辑状态
- AND 剪切板中包含图片数据
- AND 当前日记已上传图片数量未达上限（5张）
- WHEN 用户在输入框中触发粘贴（Ctrl+V / Cmd+V 或右键粘贴）
- THEN 系统提取剪切板中的图片
- AND 进行压缩处理
- AND 将图片加入当前日记的图片列表并展示上传预览状态

---

## 实现入口

本规格的实现由 OpenSpec 变更驱动，详见：

- [openspec/changes/diary-backend-persistence/](../../changes/diary-backend-persistence/) — proposal、design、tasks
- [openspec/changes/image-paste-upload/](../../changes/image-paste-upload/) — 图片粘贴上传功能的 proposal、design、tasks
