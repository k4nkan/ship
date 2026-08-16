const MAX_IMAGE_SIZE = 1280;
const WEBP_QUALITY = 0.82;

export async function readPhotoFile(file: File): Promise<string> {
  const sourceDataUrl = await readFileAsDataUrl(file);
  return resizeImageDataUrlToWebp(sourceDataUrl);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function resizeImageDataUrlToWebp(
  sourceDataUrl: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(
        MAX_IMAGE_SIZE / image.naturalWidth,
        MAX_IMAGE_SIZE / image.naturalHeight,
        1,
      );
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("画像変換に失敗しました"));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      const webpDataUrl = canvas.toDataURL("image/webp", WEBP_QUALITY);
      if (!webpDataUrl.startsWith("data:image/webp")) {
        reject(new Error("WebP変換に失敗しました"));
        return;
      }

      resolve(webpDataUrl);
    };

    image.onerror = () => reject(new Error("画像を読み込めませんでした"));
    image.src = sourceDataUrl;
  });
}
