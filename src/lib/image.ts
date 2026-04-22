import type { DiaryImage } from "../app/components/ImagePreviewGallery";

export const compressImage = (
  file: File,
  maxSizeMB: number = 2,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 先将原始文件读取为 Data URL，便于后续加载到 Image 对象中。
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        // 限制图片最大边长，避免超大分辨率图片占用过多内存。
        const maxDim = 2048;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width *= ratio;
          height *= ratio;
        }
        // 按压缩后的尺寸重建画布，并将图片绘制到画布上。
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        // 从较高质量开始导出，若仍超出体积限制则逐步降低质量。
        let quality = 0.8;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (
          dataUrl.length * 0.75 > maxSizeMB * 1024 * 1024 &&
          quality > 0.1
        ) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      // 图片解码失败时，直接透传错误给调用方处理。
      img.onerror = reject;
    };
    // 文件读取失败时，中止压缩流程并返回错误。
    reader.onerror = reject;
  });
};

export const handleImageUploadHelper = async (
  e: React.ChangeEvent<HTMLInputElement>,
  images: DiaryImage[],
  setImages: React.Dispatch<React.SetStateAction<DiaryImage[]>>,
  maxImages: number = 5,
) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const availableSlots = maxImages - images.length;
  if (availableSlots <= 0) return;

  const filesToProcess = files.slice(0, availableSlots);
  const newImages = filesToProcess.map(() => ({
    id: Math.random().toString(36).substring(2, 9),
    url: "",
    loading: true,
  }));
  setImages((prev) => [...prev, ...newImages]);

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    const id = newImages[i].id;
    try {
      const compressedUrl = await compressImage(file, 2);
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, url: compressedUrl, loading: false } : img,
        ),
      );
    } catch {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  }
  e.target.value = "";
};

export const handleImagePasteHelper = async (
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  images: DiaryImage[],
  setImages: React.Dispatch<React.SetStateAction<DiaryImage[]>>,
  maxImages: number = 5,
) => {
  // 从剪贴板条目中读取内容，后续只提取图片类型。
  const items = e.clipboardData?.items;
  if (!items) return;

  const files: File[] = [];
  // 遍历剪贴板数据，筛选出所有可用的图片文件。
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const file = items[i].getAsFile();
      if (file) files.push(file);
    }
  }

  if (!files.length) return;

  // 限制最多可追加的图片数量，避免超过上限。
  const availableSlots = maxImages - images.length;
  if (availableSlots <= 0) return;

  const filesToProcess = files.slice(0, availableSlots);
  // 先插入 loading 占位项，让界面立即反馈粘贴结果。
  const newImages = filesToProcess.map(() => ({
    id: Math.random().toString(36).substring(2, 9),
    url: "",
    loading: true,
  }));
  setImages((prev) => [...prev, ...newImages]);

  // 逐张压缩图片，并按占位 id 回填最终结果。
  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    const id = newImages[i].id;
    try {
      const compressedUrl = await compressImage(file, 2);
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, url: compressedUrl, loading: false } : img,
        ),
      );
    } catch {
      // 单张处理失败时，仅移除对应占位项，不影响其他图片继续上传。
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  }
};
