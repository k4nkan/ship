import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { fetchPostSummary } from "../api/postsApi";
import type { AdventurePost, PostSummary } from "../types";

const POST_IMAGE_WIDTH = 1080;
const POST_IMAGE_HEIGHT = 1350;

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

  const handleSavePostImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !latestPost) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `gyan-${latestPost.id}.png`;
    link.click();
    setSaveLabel("保存しました");
    window.setTimeout(() => setSaveLabel("投稿画像を保存"), 1200);
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
            <div className="result-grid">
              <dl className="result-summary">
                <div>
                  <dt>班</dt>
                  <dd>{latestPost.team}</dd>
                </div>
                <div>
                  <dt>ニックネーム</dt>
                  <dd>{latestPost.nickname}</dd>
                </div>
                <div>
                  <dt>コメント</dt>
                  <dd>{latestPost.comment}</dd>
                </div>
                <div>
                  <dt>獲得GYAN</dt>
                  <dd>{latestPost.gyan}</dd>
                </div>
                <div>
                  <dt>リアクション</dt>
                  <dd>{latestPost.reaction}</dd>
                </div>
              </dl>
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
  const padding = 72;

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#111827";
  context.fillRect(0, 0, width, 132);

  context.fillStyle = "#ffffff";
  context.font = "700 34px system-ui, sans-serif";
  context.fillText("帰るまでが冒険", padding, 78);
  context.font = "700 22px system-ui, sans-serif";
  context.fillText(`班 ${post.team}`, width - 150, 78);

  drawCoverImage(context, image, padding, 178, width - padding * 2, 640);

  context.fillStyle = "#111827";
  context.font = "800 52px system-ui, sans-serif";
  context.fillText(`+${post.gyan} GYAN`, padding, 910);
  context.font = "700 24px system-ui, sans-serif";
  context.fillStyle = "#4b5563";
  context.fillText(
    `速度 ${summary?.currentSpeed ?? post.gyan} GYAN/時 / 累計 ${
      summary?.totalGyan ?? post.gyan
    } GYAN`,
    padding,
    954,
  );

  context.fillStyle = "#111827";
  context.font = "700 30px system-ui, sans-serif";
  context.fillText(post.nickname, padding, 1030);
  context.font = "400 30px system-ui, sans-serif";
  drawWrappedText(
    context,
    post.comment,
    padding,
    1084,
    width - padding * 2,
    42,
    5,
  );

  context.fillStyle = "#374151";
  context.font = "700 22px system-ui, sans-serif";
  context.fillText("帰るまでが冒険", padding, 1290);
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
