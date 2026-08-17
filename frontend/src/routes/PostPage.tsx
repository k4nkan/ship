import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPost, fetchJourney } from "../api/postsApi";
import { LoadingScreen } from "../components/LoadingScreen";
import { captureVideoFrame, readPhotoFile } from "../features/posts/photoFile";
import { TEAM_OPTIONS } from "../features/posts/teamOptions";
import { getSavedNickname, saveNickname } from "../lib/nicknameStorage";
import { savePreviousProgress } from "../lib/routeProgressStorage";

export function PostPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const initialTeam = searchParams.get("team");
  const [team, setTeam] = useState(
    initialTeam && TEAM_OPTIONS.includes(initialTeam) ? initialTeam : "A",
  );
  const [nickname, setNickname] = useState("");
  const [comment, setComment] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const stopCamera = (updateState = true) => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (updateState) {
      setIsCameraOpen(false);
    }
  };

  useEffect(() => {
    setNickname(getSavedNickname());
    return () => stopCamera(false);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = cameraStreamRef.current;
    if (!isCameraOpen || !video || !stream) return;

    video.srcObject = stream;
    video.play().catch((error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "カメラ映像を再生できません",
      );
      stopCamera();
    });
  }, [isCameraOpen]);

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage("");
    try {
      setPhotoDataUrl(await readPhotoFile(file));
    } catch (error) {
      setPhotoDataUrl("");
      setErrorMessage(
        error instanceof Error ? error.message : "画像変換に失敗しました",
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleStartCamera = () => {
    setErrorMessage("");

    if (shouldUseNativeCameraInput()) {
      cameraInputRef.current?.click();
      return;
    }

    void startBrowserCamera();
  };

  const startBrowserCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("このブラウザではカメラを起動できません");
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "カメラを起動できませんでした",
      );
      stopCamera();
    }
  };

  const handleCapturePhoto = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMessage("カメラ映像を読み込めませんでした");
      return;
    }

    setErrorMessage("");
    try {
      setPhotoDataUrl(await captureVideoFrame(video));
      stopCamera();
    } catch (error) {
      setPhotoDataUrl("");
      setErrorMessage(
        error instanceof Error ? error.message : "画像変換に失敗しました",
      );
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nickname.trim() || !comment.trim()) return;
    if (!photoDataUrl) {
      setErrorMessage("写真を選択または撮影してください");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const journey = await fetchJourney();
      savePreviousProgress(journey.progress);
      saveNickname(nickname.trim());
      const summary = await createPost({
        team,
        nickname: nickname.trim(),
        comment: comment.trim(),
        photoDataUrl,
      });
      navigate("/result", { state: { summary } });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "投稿に失敗しました",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return <LoadingScreen message="GYANを生成中…" />;
  }

  return (
    <section className="screen form-screen">
      <div className="content-panel">
        <header className="screen-header">
          <p className="eyebrow">投稿作成</p>
          <h1>GYANを送る</h1>
        </header>
        <form className="post-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>班</span>
            <select
              id="team"
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              required
            >
              {TEAM_OPTIONS.map((teamOption) => (
                <option key={teamOption} value={teamOption}>
                  班 {teamOption}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>ニックネーム</span>
            <input
              id="nickname"
              type="text"
              autoComplete="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              required
            />
          </label>
          <div className="field">
            <span>写真</span>
            <div className="photo-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={handleStartCamera}
              >
                カメラを起動
              </button>
              <label className="secondary-button upload-button" htmlFor="photo">
                画像をアップロード
              </label>
              <input
                id="photo"
                className="visually-hidden"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              <input
                ref={cameraInputRef}
                id="camera"
                className="visually-hidden"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
              />
            </div>
          </div>
          <div className="camera-controls">
            {isCameraOpen ? (
              <>
                <button
                  className="primary-button"
                  type="button"
                  onClick={handleCapturePhoto}
                >
                  撮影
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => stopCamera()}
                >
                  停止
                </button>
              </>
            ) : null}
          </div>
          {isCameraOpen ? (
            <video
              ref={videoRef}
              className="camera-preview"
              playsInline
              muted
              aria-label="カメラプレビュー"
            />
          ) : null}
          <div id="photo-preview" className="photo-preview">
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="選択した写真のプレビュー" />
            ) : null}
          </div>
          <label className="field">
            <span>コメント</span>
            <textarea
              id="comment"
              rows={5}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              required
            />
          </label>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <div className="button-row">
            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              投稿する
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => navigate("/")}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function shouldUseNativeCameraInput(): boolean {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia?.("(pointer: coarse)").matches === true
  );
}
