import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { fetchPostSummary } from "../api/postsApi";
import {
  ROUTE_TARGET_GYAN,
  sampleRouteCoordinate,
} from "../features/map/route";
import type { AdventurePost, PostSummary } from "../types";

const POST_IMAGE_WIDTH = 1080;
const POST_IMAGE_HEIGHT = 1500;

export function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialSummary = (location.state as { summary?: PostSummary } | null)
    ?.summary;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [summary, setSummary] = useState<PostSummary | null>(
    initialSummary ?? null,
  );
  const [latestPost, setLatestPost] = useState<
    AdventurePost | null | undefined
  >(initialSummary?.lastPost);
  const [saveLabel, setSaveLabel] = useState("投稿画像を保存");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (initialSummary) return;

    fetchPostSummary()
      .then((nextSummary) => {
        setSummary(nextSummary);
        setLatestPost(nextSummary.lastPost);
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error ? error.message : "API接続に失敗しました",
        );
        setLatestPost(null);
      });
  }, [initialSummary]);

  useEffect(() => {
    if (!latestPost) return;

    drawPostImage(canvasRef.current, latestPost, summary).catch((error) =>
      setErrorMessage(
        error instanceof Error ? error.message : "投稿画像の作成に失敗しました",
      ),
    );
  }, [latestPost, summary]);

  const handleSavePostImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !latestPost) return;

    try {
      const blob = await canvasToBlob(canvas);
      const filename = `gyan-${latestPost.id}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      const canShareFile =
        typeof navigator.share === "function" &&
        (!navigator.canShare || navigator.canShare({ files: [file] }));

      if (canShareFile) {
        await navigator.share({
          files: [file],
          title: "帰るまでが冒険",
        });
        setSaveLabel("共有しました");
      } else {
        downloadBlob(blob, filename);
        setSaveLabel("保存しました");
      }

      window.setTimeout(() => setSaveLabel("投稿画像を保存"), 1200);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setErrorMessage(
        error instanceof Error ? error.message : "投稿画像の保存に失敗しました",
      );
    }
  };

  if (latestPost === undefined) {
    return null;
  }

  if (latestPost === null && !errorMessage) {
    return <Navigate to="/post" replace />;
  }

  return (
    <section className="screen result-screen">
      <div className="content-panel result-panel">
        <header className="screen-header">
          <h1>生成結果</h1>
        </header>
        {latestPost ? (
          <div id="result-content" className="result-content">
            <article className="result-post-card">
              <div className="post-image-preview">
                <canvas
                  ref={canvasRef}
                  width={POST_IMAGE_WIDTH}
                  height={POST_IMAGE_HEIGHT}
                  aria-label="投稿画像プレビュー"
                />
              </div>
            </article>

            <section className="result-report" aria-labelledby="report-heading">
              <h2 id="report-heading">レポート</h2>
              <div className="result-report-metrics">
                <div className="result-report-metric">
                  <span>速度</span>
                  <strong>{summary?.currentSpeed ?? latestPost.gyan}</strong>
                  <small>gyan/h</small>
                </div>
                <div className="result-report-metric">
                  <span>累計</span>
                  <strong>{summary?.totalGyan ?? latestPost.gyan}</strong>
                  <small>gyan</small>
                </div>
                <div className="result-report-metric">
                  <span>残り</span>
                  <strong>
                    {Math.max(
                      0,
                      Math.ceil(
                        (1 - (summary?.currentProgress ?? 0)) *
                          ROUTE_TARGET_GYAN,
                      ),
                    )}
                  </strong>
                  <small>km</small>
                </div>
              </div>
            </section>

            <section
              className="result-comment"
              aria-labelledby="comment-heading"
            >
              <h2 id="comment-heading">コメント</h2>
              <p>{latestPost.reaction}</p>
            </section>
          </div>
        ) : null}
        <div className="button-row">
          <button
            className="primary-button"
            type="button"
            onClick={handleSavePostImage}
          >
            {saveLabel}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => navigate("/")}
          >
            マップに戻る
          </button>
        </div>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </div>
    </section>
  );
}

async function drawPostImage(
  canvas: HTMLCanvasElement | null,
  post: AdventurePost,
  summary: PostSummary | null,
) {
  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("投稿画像の作成に失敗しました");
  }

  const image = await loadImage(post.imageUrl || post.photoDataUrl);
  await document.fonts.load('500 48px "Material Symbols Rounded"');
  const width = canvas.width;
  const height = canvas.height;
  const outerMargin = 80;
  const cardX = outerMargin;
  const cardY = 136;
  const cardWidth = 920;
  const cardHeight = height - cardY - 36;
  const padding = 40;
  const contentX = cardX + padding;
  const contentWidth = cardWidth - padding * 2;
  const imageY = cardY + 174;

  context.fillStyle = "#f3f4f6";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(cardX, cardY, cardWidth, cardHeight);

  context.fillStyle = "#d1d5db";
  context.beginPath();
  context.arc(contentX + 28, cardY + 64, 28, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#111827";
  context.font = "500 30px system-ui, sans-serif";
  context.fillText(
    `班 ${post.team} / ${post.nickname}`,
    contentX + 76,
    cardY + 74,
  );

  drawCoverImage(context, image, contentX, imageY, contentWidth, contentWidth);

  const metadataY = imageY + contentWidth + 55;
  drawMaterialIcon(
    context,
    "local_fire_department",
    contentX,
    metadataY,
    48,
    "#f97316",
  );
  context.fillStyle = "#111827";
  context.font = "700 26px system-ui, sans-serif";
  context.save();
  context.textBaseline = "middle";
  context.fillText(`+${post.gyan}`, contentX + 58, metadataY);
  context.restore();

  const currentCoordinate = sampleRouteCoordinate(
    summary?.currentProgress ?? 0,
  );
  drawMaterialIcon(
    context,
    "location_on",
    contentX + 210,
    metadataY,
    40,
    "#4b5563",
  );
  context.fillStyle = "#374151";
  context.font = "400 22px system-ui, sans-serif";
  context.save();
  context.textBaseline = "middle";
  context.fillText(
    formatCoordinate(currentCoordinate),
    contentX + 262,
    metadataY,
  );
  context.restore();

  context.fillStyle = "#111827";
  context.font = "500 30px system-ui, sans-serif";
  drawWrappedText(
    context,
    post.comment,
    contentX,
    metadataY + 90,
    contentWidth,
    38,
    2,
  );

  context.fillStyle = "#374151";
  context.font = "400 22px system-ui, sans-serif";
  context.fillText(
    `#帰るまでが冒険  #GYAN  #${post.team}班`,
    contentX,
    cardY + cardHeight - 58,
  );
}

function drawMaterialIcon(
  context: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  context.fillStyle = color;
  context.font = `500 ${size}px "Material Symbols Rounded"`;
  context.textBaseline = "middle";
  context.fillText(name, x, y);
}

function formatCoordinate([longitude, latitude]: [number, number]): string {
  const latitudeDirection = latitude >= 0 ? "N" : "S";
  const longitudeDirection = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(4)}°${latitudeDirection} / ${Math.abs(
    longitude,
  ).toFixed(4)}°${longitudeDirection}`;
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3,
) {
  const segments = Array.from(text);
  let line = "";
  let lineCount = 0;

  for (const segment of segments) {
    const nextLine = `${line}${segment}`;
    if (context.measureText(nextLine).width > maxWidth && line) {
      lineCount += 1;
      context.fillText(line, x, y);
      y += lineHeight;
      line = segment;
      if (lineCount >= maxLines) return;
    } else {
      line = nextLine;
    }
  }

  if (line && lineCount < maxLines) {
    context.fillText(line, x, y);
  }
}

async function loadImage(source: string): Promise<HTMLImageElement> {
  const response = await fetch(source);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("投稿画像の読み込みに失敗しました"));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("投稿画像の保存に失敗しました"));
      }
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
