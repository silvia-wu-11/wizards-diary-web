# 日记本 · 行为规格

## Purpose
用户可创建、删除日记本；日记本作为日记条目的分组容器，与当前登录用户关联；数据持久化到后端数据库。

## Requirements

### Requirement: 用户可创建新日记本
系统 SHALL 支持已登录用户创建新日记本；创建时需提供名称，可选提供颜色、类型等；创建成功后日记本出现在列表中。

#### Scenario: 用户提供名称，创建成功
- GIVEN 用户已登录
- WHEN 用户提交新日记本（至少包含 name）
- THEN 系统创建日记本记录并关联到当前用户
- AND 返回新创建的日记本（含服务端生成的 id）
- AND 日记本出现在日记本列表中

#### Scenario: 用户未提供名称
- GIVEN 用户已登录
- WHEN 用户提交的日记本缺少 name 或 name 为空
- THEN 系统拒绝创建
- AND 返回「名称不能为空」或等价错误提示

---

### Requirement: 用户可删除已有日记本
系统 SHALL 支持已登录用户删除自己拥有的日记本；删除日记本时 SHALL 级联删除其下所有日记；仅允许删除当前用户拥有的日记本。

#### Scenario: 用户删除自己的日记本
- GIVEN 用户已登录
- AND 该用户拥有日记本 B，且 B 下有若干日记
- WHEN 用户请求删除 B
- THEN 系统从数据库中删除 B
- AND 级联删除 B 下的所有日记
- AND 日记本及其中日记从界面消失

#### Scenario: 用户尝试删除不属于自己的日记本
- GIVEN 用户已登录
- AND 日记本 B 属于其他用户
- WHEN 用户请求删除 B
- THEN 系统拒绝删除
- AND 返回 403 或等价错误

---

### Requirement: 应用加载时从后端拉取当前用户的日记本
系统 SHALL 在用户已登录且进入需展示日记本的页面时，从后端 API 拉取当前用户的全部日记本；与日记条目一并加载（见 diary-entry spec）。

#### Scenario: 已登录用户进入首页
- GIVEN 用户已登录
- WHEN 用户进入首页或日记相关页面
- THEN 系统调用后端接口获取该用户的 books
- AND 展示日记本列表
- AND 每个日记本可展示其下日记数量（实现可选）

---

## 实现入口

本规格的实现由 OpenSpec 变更驱动，详见：

- [openspec/changes/diary-backend-persistence/](../../changes/diary-backend-persistence/) — proposal、design、tasks
