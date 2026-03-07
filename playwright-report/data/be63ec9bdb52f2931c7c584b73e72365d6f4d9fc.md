# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - heading "创建账号" [level=1] [ref=e7]
      - paragraph [ref=e8]: 加入魔法日记本
    - generic [ref=e9]:
      - generic [ref=e10]:
        - text: 邮箱
        - textbox "邮箱" [ref=e11]:
          - /placeholder: your@email.com
      - generic [ref=e12]:
        - text: 密码
        - generic [ref=e13]:
          - textbox "密码" [ref=e14]:
            - /placeholder: 至少 8 位
          - button "显示密码" [ref=e15]:
            - img [ref=e16]
      - generic [ref=e19]:
        - text: 确认密码
        - generic [ref=e20]:
          - textbox "确认密码" [ref=e21]:
            - /placeholder: 再次输入密码
          - button "显示密码" [ref=e22]:
            - img [ref=e23]
      - generic [ref=e26]:
        - text: 昵称（可选）
        - textbox "昵称（可选）" [ref=e27]:
          - /placeholder: 你的昵称
      - button "创建账号" [ref=e28]
    - paragraph [ref=e29]:
      - text: 已有账号？
      - link "返回登录" [ref=e30] [cursor=pointer]:
        - /url: /login
  - region "Notifications alt+T"
```