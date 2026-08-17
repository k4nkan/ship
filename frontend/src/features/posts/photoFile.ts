const MAX_IMAGE_SIZE = 1280;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.86;

export async function readPhotoFile(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    return resizeImageSource(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function captureVideoFrame(video: HTMLVideoElement): Promise<string> {
  return resizeImageSource(video, video.videoWidth, video.videoHeight);
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("画像を読み込めませんでした"));
    image.src = source;
  });
}

async function resizeImageSource(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): Promise<string> {
  const scale = Math.min(
    MAX_IMAGE_SIZE / sourceWidth,
    MAX_IMAGE_SIZE / sourceHeight,
    1,
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("画像変換に失敗しました");
  }

  context.drawImage(source, 0, 0, width, height);
  const webpBlob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  if (webpBlob?.type === "image/webp") {
    return readBlobAsDataUrl(webpBlob);
  }

  const jpegBlob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
  if (jpegBlob?.type === "image/jpeg") {
    return readBlobAsDataUrl(jpegBlob);
  }

  throw new Error("画像変換に失敗しました");
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}
