import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { fetchPostSummary } from "../api/postsApi";
import type { AdventurePost, PostSummary } from "../types";

const POST_IMAGE_WIDTH = 1080;
const POST_IMAGE_HEIGHT = 1160;

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
      <div className="content-panel">
        <header className="screen-header">
          <p className="eyebrow">生成結果</p>
          <h1>獲得したGYAN</h1>
        </header>
        {latestPost ? (
          <div id="result-content">
            <div className="post-image-preview">
              <canvas
                ref={canvasRef}
                width={POST_IMAGE_WIDTH}
                height={POST_IMAGE_HEIGHT}
                aria-label="投稿画像プレビュー"
              />
            </div>
            <div className="impact-strip">
              <div>
                <span>今回</span>
                <strong>+{latestPost.gyan} GYAN</strong>
              </div>
              <div>
                <span>速度</span>
                <strong>
                  {summary?.currentSpeed ?? latestPost.gyan} GYAN/時
                </strong>
              </div>
              <div>
                <span>累計</span>
                <strong>{summary?.totalGyan ?? latestPost.gyan}</strong>
              </div>
            </div>
            <div className="gyan-report">
              <div className="gyan-report-header">
                <span>GYANレポート</span>
                <strong>{latestPost.gyanLevel}</strong>
              </div>
              <p>{latestPost.reaction}</p>
            </div>
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
  const width = canvas.width;
  const height = canvas.height;
  const padding = 64;

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#111827";
  context.fillRect(0, 0, width, 112);

  context.fillStyle = "#ffffff";
  context.font = "700 30px system-ui, sans-serif";
  context.fillText("帰るまでが冒険", padding, 68);
  context.font = "700 20px system-ui, sans-serif";
  context.fillText(`班 ${post.team}`, width - 136, 68);

  drawCoverImage(context, image, padding, 154, width - padding * 2, 560);

  context.fillStyle = "#111827";
  context.font = "800 46px system-ui, sans-serif";
  context.fillText(`+${post.gyan} GYAN`, padding, 780);
  context.font = "700 22px system-ui, sans-serif";
  context.fillStyle = "#4b5563";
  context.fillText(
    `速度 ${summary?.currentSpeed ?? post.gyan} GYAN/時 / 累計 ${
      summary?.totalGyan ?? post.gyan
    } GYAN`,
    padding,
    822,
  );

  context.fillStyle = "#111827";
  context.font = "700 26px system-ui, sans-serif";
  context.fillText(post.nickname, padding, 888);
  context.font = "400 26px system-ui, sans-serif";
  drawWrappedText(
    context,
    post.comment,
    padding,
    934,
    width - padding * 2,
    34,
    4,
  );

  context.fillStyle = "#374151";
  context.font = "700 20px system-ui, sans-serif";
  context.fillText("帰るまでが冒険", padding, 1110);
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
