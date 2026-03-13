# 账号登录/创建模块 · 行为规格

## Purpose
用户未登录时，支持用户登录、新用户创建账号；用户已登录时，直接跳转到首页。认证模块为日记等业务提供「当前用户」身份，未登录用户无法访问需鉴权的功能。

## Requirements

### Requirement: 未登录用户访问需鉴权页面时被重定向至登录页
系统 SHALL 在用户未登录（无有效 session）且访问需鉴权页面时，将其重定向至登录页；登录成功后 SHALL 跳转回原目标页或首页。

#### Scenario: 未登录用户访问首页
- GIVEN 用户未登录
- WHEN 用户访问 `/` 或任意需鉴权路由
- THEN 系统重定向至登录页（如 `/login`）
- AND 登录成功后跳转至首页

#### Scenario: 未登录用户访问登录页
- GIVEN 用户未登录
- WHEN 用户访问 `/login`
- THEN 系统展示登录表单
- AND 提供「切换到创建账号」入口

#### Scenario: 已登录用户访问登录页
- GIVEN 用户已登录
- WHEN 用户访问 `/login` 或 `/register`
- THEN 系统重定向至首页
- AND 不展示登录/注册表单

---

### Requirement: 用户必须输入邮箱和密码才能提交登录
系统 SHALL 在用户提交登录请求时，要求必须提供「邮箱」、「密码」；缺少任一项时 SHALL 拒绝登录并展示可理解的错误提示。

#### Scenario: 用户提供完整凭证，登录成功
- GIVEN 用户未登录
- AND 该邮箱已在系统中注册
- WHEN 用户输入正确邮箱、正确密码，并点击「登录」
- THEN 系统校验通过
- AND 创建 session
- AND 重定向至首页或原目标页
- AND 展示 loading 状态直至跳转完成

#### Scenario: 用户未填邮箱
- GIVEN 用户未登录并处于登录页
- WHEN 用户不填邮箱、只填密码并点击「登录」
- THEN 系统不发起登录请求
- AND 在邮箱输入框附近展示「请输入邮箱」或等价错误提示

#### Scenario: 用户未填密码
- GIVEN 用户未登录并处于登录页
- WHEN 用户只填邮箱、密码为空并点击「登录」
- THEN 系统不发起登录请求
- AND 在密码输入框附近展示「请输入密码」或等价错误提示

#### Scenario: 邮箱或密码错误
- GIVEN 用户未登录并处于登录页
- WHEN 用户输入已注册邮箱但密码错误，或输入未注册邮箱，并点击「登录」
- THEN 系统拒绝登录
- AND 在表单上方或显著位置展示红色错误提示（如「邮箱或密码错误」）
- AND 用户仍停留在登录页，已填内容保留

---

### Requirement: 登录表单提供密码可见性切换
系统 SHALL 在密码输入框旁提供「显示/隐藏密码」控件，便于用户核对输入。

#### Scenario: 用户切换密码可见性
- GIVEN 用户处于登录页
- WHEN 用户点击密码框旁的可见性切换按钮
- THEN 密码在明文与密文之间切换显示
- AND 按钮图标/文案相应更新

---

### Requirement: 新用户可创建账号
系统 SHALL 支持新用户通过邮箱、密码、昵称创建账号；创建成功后自动登录并跳转至首页。

#### Scenario: 用户提供完整信息，创建成功
- GIVEN 用户未登录
- AND 该邮箱未被注册
- WHEN 用户填写邮箱、密码、确认密码、昵称（如需要），并点击「创建账号」
- THEN 系统创建用户记录
- AND 自动登录
- AND 重定向至首页

#### Scenario: 邮箱已被占用
- GIVEN 用户未登录并处于注册页
- WHEN 用户填写已被注册的邮箱并提交
- THEN 系统拒绝创建
- AND 在邮箱输入框附近展示「该邮箱已被注册」或等价错误提示

#### Scenario: 两次密码不一致
- GIVEN 用户未登录并处于注册页
- WHEN 用户填写的「确认密码」与「密码」不一致并提交
- THEN 系统不发起创建请求
- AND 在确认密码输入框附近展示「两次密码不一致」或等价错误提示

#### Scenario: 密码强度不足（可选）
- GIVEN 系统配置了密码强度策略（如最少 8 位）
- WHEN 用户填写的密码不满足策略并提交
- THEN 系统不创建账号
- AND 展示具体强度要求或等价错误提示

---

### Requirement: 登录与注册页可互相切换
系统 SHALL 在登录页提供「切换到创建账号」入口，在注册页提供「返回登录」入口，便于用户在不同流程间切换。

#### Scenario: 从登录切换到注册
- GIVEN 用户处于登录页
- WHEN 用户点击「切换到创建账号」或等价链接
- THEN 系统展示注册表单
- AND 已填的邮箱等可保留（实现可选）

#### Scenario: 从注册切换到登录
- GIVEN 用户处于注册页
- WHEN 用户点击「返回登录」或等价链接
- THEN 系统展示登录表单

---

### Requirement: 已登录用户可登出
系统 SHALL 在应用内提供登出入口；用户登出后清除 session 并重定向至登录页。

#### Scenario: 用户点击登出
- GIVEN 用户已登录
- WHEN 用户点击「登出」或等价按钮
- THEN 系统清除 session
- AND 重定向至登录页
- AND 后续访问需鉴权页面时需重新登录

---

### Requirement: Session 持久化与恢复
系统 SHALL 在用户关闭浏览器后再次打开时，若 session 仍有效，则视为已登录；若 session 过期或无效，则视为未登录。

#### Scenario: 用户刷新页面且 session 有效
- GIVEN 用户已登录且 session 未过期
- WHEN 用户刷新页面或重新打开应用
- THEN 系统识别为已登录状态
- AND 不重定向至登录页

#### Scenario: Session 过期
- GIVEN 用户曾登录但 session 已过期
- WHEN 用户访问需鉴权页面
- THEN 系统视为未登录
- AND 重定向至登录页

---

## 实现入口

本规格的实现由 OpenSpec 变更驱动，详见：

- [openspec/changes/auth-implementation/](../changes/auth-implementation/) — proposal、design、tasks
