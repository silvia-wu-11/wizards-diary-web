# Tasks: 图片粘贴上传功能

## 阶段一：核心逻辑实现
- [x] 1. 在 `src/lib/image.ts` 中实现 `handleImagePasteHelper` 函数。
  - [x] 从 `React.ClipboardEvent` 中解析图片文件。
  - [x] 限制最大图片上传数量（复用可用 slot 逻辑）。
  - [x] 加入 `loading: true` 状态位到组件的 `images` 数组。
  - [x] 调用 `compressImage` 压缩并在成功/失败后更新/移除对应图片记录。

## 阶段二：UI 绑定与应用
- [x] 2. 更新 `Dashboard.tsx` 页面。
  - [x] 引入 `handleImagePasteHelper`。
  - [x] 在首页新建日记的 `<textarea>` 元素上绑定 `onPaste` 事件，传入当前组件的状态和 `setImages`。
- [x] 3. 更新 `DiaryView.tsx` 页面。
  - [x] 引入 `handleImagePasteHelper`。
  - [x] 在详情页/编辑页面的 `<textarea>` 元素上绑定 `onPaste` 事件。

## 阶段三：类型修复与测试验证
- [x] 4. 修复相关的类型错误（如 `ViewEntryModal` 中的 `setViewingPreviewIndex` 强类型不匹配问题，以及 `MagicCalendar` 的类型报错）。
- [x] 5. 本地运行 `npm run build` 和 `npm run dev` 确保项目编译通过并可正常启动。
- [x] 6. 测试在浏览器中使用快捷键/右键在输入框中粘贴图片的行为是否符合预期。
