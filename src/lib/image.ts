import type { DiaryImage } from '../app/components/ImagePreviewGallery';

export const compressImage = (file: File, maxSizeMB: number = 2): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxDim = 2048;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
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
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export const handleImageUploadHelper = async (
  e: React.ChangeEvent<HTMLInputElement>,
  images: DiaryImage[],
  setImages: React.Dispatch<React.SetStateAction<DiaryImage[]>>,
  maxImages: number = 5
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
          img.id === id ? { ...img, url: compressedUrl, loading: false } : img
        )
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
  maxImages: number = 5
) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  const files: File[] = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const file = items[i].getAsFile();
      if (file) files.push(file);
    }
  }

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
          img.id === id ? { ...img, url: compressedUrl, loading: false } : img
        )
      );
    } catch {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  }
};
