# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - heading "魔法日记本" [level=1] [ref=e7]
      - paragraph [ref=e8]: 登录以继续
    - generic [ref=e9]:
      - generic [ref=e10]:
        - text: 邮箱
        - textbox "邮箱" [ref=e11]:
          - /placeholder: your@email.com
      - generic [ref=e12]:
        - text: 密码
        - generic [ref=e13]:
          - textbox "密码" [ref=e14]:
            - /placeholder: ••••••••
          - button "显示密码" [ref=e15]:
            - img [ref=e16]
      - button "登录" [ref=e19]
    - paragraph [ref=e20]:
      - text: 还没有账号？
      - link "切换到创建账号" [ref=e21] [cursor=pointer]:
        - /url: /register
  - region "Notifications alt+T"
```