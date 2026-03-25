# Design: 图片粘贴上传实现

## 整体架构与交互流

本次变更主要集中在前端 UI 层以及公共的图片处理工具函数中。由于不涉及新的数据模型或 API 接口，只复用原有的压缩与状态更新逻辑，改动相对轻量。

**交互流**：
1. 用户在 `<textarea>` 触发 `onPaste` 事件。
2. React 捕获到 `ClipboardEvent`。
3. 调用封装好的帮助函数 `handleImagePasteHelper`。
4. 遍历 `clipboardData.items` 找出 `type` 包含 `"image"` 的项。
5. 转换为 `File` 对象，若没有图片文件则直接返回，让默认的文本粘贴行为继续执行。
6. 判断剩余的图片插槽数（最多5张），生成对应的临时图片对象并设置 `loading: true` 以更新页面状态。
7. 对提取出的 `File` 依次调用 `compressImage`。
8. 压缩成功后，更新对应图片的 `url` 并将 `loading` 设为 `false`。

## 代码结构与核心函数

### 1. `src/lib/image.ts`
新增公共函数 `handleImagePasteHelper`：
- **签名**：
  ```ts
  export const handleImagePasteHelper = async (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    images: DiaryImage[],
    setImages: React.Dispatch<React.SetStateAction<DiaryImage[]>>,
    maxImages: number = 5
  ) => void;
  ```
- **职责**：从剪切板事件中提取文件并压缩处理。

### 2. `src/app/pages/Dashboard.tsx`
在新建日记的 `<textarea>` 中绑定 `onPaste` 事件。
```tsx
import { handleImagePasteHelper } from "../../lib/image";

<textarea
  // ... 其他属性
  onPaste={(e) => handleImagePasteHelper(e, images, setImages, 5)}
/>
```

### 3. `src/app/pages/DiaryView.tsx`
在编辑已有日记或新日记弹窗内的 `<textarea>` 中绑定 `onPaste` 事件。
```tsx
import { handleImagePasteHelper } from "../../lib/image";

<textarea
  // ... 其他属性
  onPaste={(e) => handleImagePasteHelper(e, images, setImages, 5)}
/>
```

## 异常处理与边界情况

1. **非图片粘贴**：如果剪切板中没有图片，则 `handleImagePasteHelper` 早期 `return`，不会阻止默认的文本粘贴行为（浏览器会自动将文本填入输入框）。
2. **超出图片数量限制**：计算 `maxImages - images.length`，如果达到上限则忽略粘贴的图片。
3. **压缩失败**：在 `catch` 块中，将 `loading` 状态中的临时图片记录从列表中移除，避免在界面上留下死链或一直 `loading` 的占位符。
