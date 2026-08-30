"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export interface FaceResult {
  descriptor: number[];
  liveness: "pending" | "ok" | "failed";
  /** JPEG data URL of the detected face (crop), used for admin viewing. */
  image?: string;
}

// The face recognition library is loaded at runtime from a self-hosted UMD
// bundle (public/face-api.js) via a <script> tag, NOT bundled by webpack. This
// is the reliable way to use @vladmandic/face-api (a maintained, tfjs-2/3/4
// compatible fork of face-api.js@0.22.2) in a Next.js client component — trying
// to bundle it through webpack resolves its node `require()` calls to "module
// not found" stubs and throws "r(...).addon is not a function".
//
// The script sets window.faceapi. If it fails to load, capture degrades
// gracefully and the parent form still works (face is an optional factor).
let faceapiPromise: Promise<any> | null = null;
function loadFaceApi(): Promise<any> {
  if (!faceapiPromise) {
    faceapiPromise = new Promise((resolve, reject) => {
      if ((window as any).faceapi) return resolve((window as any).faceapi);
      const s = document.createElement("script");
      s.src = "/face-api.js";
      s.async = true;
      s.onload = () => {
        if ((window as any).faceapi) resolve((window as any).faceapi);
        else reject(new Error("face-api loaded but window.faceapi missing"));
      };
      s.onerror = () => reject(new Error("Failed to load /face-api.js"));
      document.body.appendChild(s);
    }).catch((err) => {
      console.error("[FaceCapture] failed to load face-api:", err);
      throw err;
    });
  }
  return faceapiPromise;
}

// Seconds the face must stay detected before we auto-capture.
const AUTO_CAPTURE_DELAY = 1.5;

export function FaceCapture({
  onCapture,
  label = "Capture face",
}: {
  onCapture: (result: FaceResult | null) => void;
  label?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectTimer = useRef<number | null>(null);
  const autoTimer = useRef<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");
  const [faceFound, setFaceFound] = useState(false);
  const [captured, setCaptured] = useState<number[] | null>(null);
  const [autoCount, setAutoCount] = useState<number | null>(null);
  const [alreadyCapturing, setAlreadyCapturing] = useState(false);

  const clearAuto = useCallback(() => {
    if (autoTimer.current) {
      clearTimeout(autoTimer.current);
      autoTimer.current = null;
    }
    setAutoCount(null);
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (detectTimer.current) {
      clearInterval(detectTimer.current);
      detectTimer.current = null;
    }
    clearAuto();
  }, [clearAuto]);

  const start = useCallback(async () => {
    setMessage("");
    setCaptured(null);
    setAlreadyCapturing(false);
    setStatus("loading");
    try {
      const faceapi = await loadFaceApi();
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setStatus("ready");

      const video = videoRef.current!;
      detectTimer.current = window.setInterval(async () => {
        if (video.readyState < 2) return;
        const det = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();
        const found = !!det;
        setFaceFound(found);

        // Begin the auto-capture countdown as soon as a face appears.
        if (found && !alreadyCapturing && !captured) {
          if (!autoTimer.current) {
            setAutoCount(Math.ceil(AUTO_CAPTURE_DELAY));
            autoTimer.current = window.setTimeout(() => {
              capture();
            }, AUTO_CAPTURE_DELAY * 1000);
            // Simple ticking countdown for feedback.
            let remaining = AUTO_CAPTURE_DELAY;
            const tick = window.setInterval(() => {
              remaining -= 0.5;
              setAutoCount(Math.max(0, Math.ceil(remaining)));
              if (remaining <= 0) clearInterval(tick);
            }, 500);
          }
        } else if (!found) {
          clearAuto();
        }
      }, 350);
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Camera access denied."
          : "Face capture is unavailable right now. You can continue without it."
      );
      // Don't block the parent flow — face is an optional second factor.
      onCapture(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCapture, captured, alreadyCapturing, clearAuto]);

  useEffect(() => () => stop(), [stop]);

  async function capture() {
    if (alreadyCapturing || captured) return;
    clearAuto();
    setAlreadyCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState < 2) {
      setMessage("Camera is not ready. Please try again.");
      setAlreadyCapturing(false);
      return;
    }
    try {
      const faceapi = await loadFaceApi();
      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!result) {
        setMessage("No face detected. Position your face in the frame and retry.");
        setAlreadyCapturing(false);
        return;
      }

      // Liveness check: a real, live face has open eyes. A static printed
      // photo has closed/flat eyes. Compute the Eye Aspect Ratio (EAR) for both
      // eyes and reject if either reads as closed or the landmarks are missing.
      const landmarks = result.landmarks as {
        getLeftEye?: () => { x: number; y: number }[];
        getRightEye?: () => { x: number; y: number }[];
      };
      const left = landmarks.getLeftEye ? landmarks.getLeftEye() : [];
      const right = landmarks.getRightEye ? landmarks.getRightEye() : [];
      if (!left.length || !right.length) {
        setMessage("Could not read your eyes. Please face the camera directly and retry.");
        setAlreadyCapturing(false);
        return;
      }
      const eyeAspectRatio = (eye: { x: number; y: number }[]): number => {
        const p = eye;
        const v1 = Math.hypot(p[1].x - p[5].x, p[1].y - p[5].y);
        const v2 = Math.hypot(p[2].x - p[4].x, p[2].y - p[4].y);
        const h = Math.hypot(p[0].x - p[3].x, p[0].y - p[3].y);
        return (v1 + v2) / (2 * h);
      };
      const leftEAR = eyeAspectRatio(left);
      const rightEAR = eyeAspectRatio(right);
      if (leftEAR < 0.18 || rightEAR < 0.18) {
        setMessage("Your eyes appear closed or unsupported. Open your eyes fully and retry (helps prevent photo spoofing).");
        setAlreadyCapturing(false);
        return;
      }

      const descriptor = Array.from(result.descriptor as ArrayLike<number>);

      // Produce a small JPEG crop of the detected face for admin review.
      let image: string | undefined;
      try {
        const box = result.detection.box as { x: number; y: number; width: number; height: number };
        if (videoRef.current && canvasRef.current && box && box.width > 0) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            const pad = 0.3;
            let sx = Math.max(0, box.x - box.width * pad);
            let sy = Math.max(0, box.y - box.height * pad);
            let sw = box.width * (1 + pad * 2);
            let sh = box.height * (1 + pad * 2);
            const maxX = videoRef.current.videoWidth;
            const maxY = videoRef.current.videoHeight;
            if (sx + sw > maxX) sw = maxX - sx;
            if (sy + sh > maxY) sh = maxY - sy;
            canvasRef.current.width = 224;
            canvasRef.current.height = 224;
            ctx.drawImage(
              videoRef.current,
              sx,
              sy,
              sw,
              sh,
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );
            image = canvasRef.current.toDataURL("image/jpeg", 0.8);
          }
        }
      } catch {}

      setMessage("");
      setCaptured(descriptor);
      onCapture({ descriptor, liveness: "ok", image });
      stop();
    } catch (e) {
      setMessage("Face capture failed. Please try again.");
      onCapture(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="mb-2 text-sm font-medium text-ink">{label}</p>
      <div className="relative mx-auto w-full max-w-[260px]">
        {/* Face-shaped guide: an oval "spotlight" punched out of a dimming
            overlay so the user frames their face inside the oval. */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-900">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            autoPlay
            playsInline
          />
          {status === "ready" && (
            <>
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 45%, transparent 0 24%, rgba(15,23,42,0.45) 32%)",
                }}
              />
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <ellipse
                  cx="50"
                  cy="45"
                  rx="30"
                  ry="38"
                  fill="none"
                  stroke={faceFound ? "#34d399" : "#fff"}
                  strokeWidth="0.8"
                  strokeDasharray="2 1.5"
                  opacity="0.9"
                  className="transition-colors"
                />
              </svg>
              {autoCount !== null && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/90 text-2xl font-bold text-white shadow-lg">
                    {autoCount > 0 ? autoCount : "…"}
                  </span>
                </div>
              )}
            </>
          )}
          {status === "ready" && faceFound && (
            <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
              Face detected
            </span>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {message && <p className="mt-2 text-xs text-rose-600">{message}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {status !== "ready" && status !== "loading" && (
          <button type="button" className="btn-outline" onClick={start}>
            Start camera
          </button>
        )}
        {status === "loading" && (
          <span className="text-sm text-slate-500">Loading model…</span>
        )}
        {status === "ready" && !captured && (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={capture}
              disabled={!faceFound || alreadyCapturing}
            >
              {alreadyCapturing ? "Capturing…" : "Capture now"}
            </button>
            <button type="button" className="btn-ghost" onClick={stop}>
              Cancel
            </button>
          </>
        )}
        {captured && <span className="badge-green">Face captured</span>}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Your face is captured automatically once detected. Face data is processed
        in your browser and stored only as a mathematical template, used with your
        OTP as a second layer of verification.
      </p>
    </div>
  );
}
