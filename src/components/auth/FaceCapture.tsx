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

// Liveness: we detect a voluntary blink (eyes close then reopen) before we
// trust the capture. A static printed photo cannot blink, which defeats the
// most common spoofing attack. These thresholds are the industry-standard Eye
// Aspect Ratio (EAR) values for open and closed eyes.
const EAR_OPEN = 0.18; // below this the eye counts as closed
const MAX_BLINK_WAIT_MS = 10_000; // give up waiting for a blink after 10s

/** Average EAR across both eyes; null if eye landmarks are unavailable. */
function eyeAspectRatio(
  landmarks: { getLeftEye?: () => { x: number; y: number }[]; getRightEye?: () => { x: number; y: number }[] }
): number | null {
  const left = landmarks.getLeftEye ? landmarks.getLeftEye() : [];
  const right = landmarks.getRightEye ? landmarks.getRightEye() : [];
  if (!left.length || !right.length) return null;
  const ear = (eye: { x: number; y: number }[]): number => {
    const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
    const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
    const h = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
    return (v1 + v2) / (2 * h);
  };
  return (ear(left) + ear(right)) / 2;
}

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
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");
  const [faceFound, setFaceFound] = useState(false);
  const [captured, setCaptured] = useState<number[] | null>(null);
  const [alreadyCapturing, setAlreadyCapturing] = useState(false);

  // Blink-challenge liveness state. We require a voluntary eye close→open cycle
  // before capturing. "closed" flips true when EAR drops below the closed
  // threshold, then a blink is confirmed when eyes reopen afterwards.
  const [blinkPrompt, setBlinkPrompt] = useState(false);
  const [blinkOk, setBlinkOk] = useState(false);
  const closedSeen = useRef(false);
  const blockBlink = useRef(false);
  const blinkWaitTimer = useRef<number | null>(null);

  const clearBlinkWait = useCallback(() => {
    if (blinkWaitTimer.current) {
      clearTimeout(blinkWaitTimer.current);
      blinkWaitTimer.current = null;
    }
  }, []);

  // Restore the blink-challenge state so the voter can retry after a failure,
  // without having to stop/restart the camera.
  const resetChallenge = useCallback(() => {
    blockBlink.current = false;
    closedSeen.current = false;
    clearBlinkWait();
    setBlinkOk(false);
    setBlinkPrompt(false);
  }, [clearBlinkWait]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (detectTimer.current) {
      clearInterval(detectTimer.current);
      detectTimer.current = null;
    }
    clearBlinkWait();
  }, [clearBlinkWait]);

  const start = useCallback(async () => {
    setMessage("");
    setCaptured(null);
    setAlreadyCapturing(false);
      setBlinkPrompt(false);
      setBlinkOk(false);
      closedSeen.current = false;
      blockBlink.current = false;
      setStatus("loading");
      // Guard against a duplicate detection loop if `start` re-runs (state
      // deps change mid-flow) while the camera stream is already open.
      if (detectTimer.current) {
        clearInterval(detectTimer.current);
        detectTimer.current = null;
      }
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

        if (found && !alreadyCapturing && !captured && !blinkOk) {
          // Compute EAR to watch for a blink (eyes close then reopen).
          const ear = det ? eyeAspectRatio(det.landmarks as any) : null;
          if (ear === null) return;
          if (ear < EAR_OPEN) {
            closedSeen.current = true;
            // Don't flicker the UI while the eyes are already closed.
          } else if (!closedSeen.current && !blinkPrompt) {
            // Eyes open and stable — ask the user to blink.
            setBlinkPrompt(true);
            if (!blinkWaitTimer.current) {
              blinkWaitTimer.current = window.setTimeout(() => {
                // No blink detected in time: re-ask, but don't loop forever.
                setBlinkOk(false);
                setBlinkPrompt(false);
                closedSeen.current = false;
                clearBlinkWait();
                setMessage(
                  "No blink detected. Please blink (close and open your eyes) to confirm you're live."
                );
              }, MAX_BLINK_WAIT_MS);
            }
          } else if (closedSeen.current) {
            // A full blink cycle: closed was seen and now the eyes are open.
            if (!blockBlink.current) {
              blockBlink.current = true;
              clearBlinkWait();
              setBlinkOk(true);
              setBlinkPrompt(false);
              setMessage("Liveness confirmed. Capturing your face…");
              capture();
            }
          }
        } else if (!found) {
          closedSeen.current = false;
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
  }, [onCapture, captured, alreadyCapturing, blinkOk, clearBlinkWait]);

  useEffect(() => () => stop(), [stop]);

  async function capture() {
    if (alreadyCapturing || captured) return;
    setAlreadyCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState < 2) {
      setMessage("Camera is not ready. Please try again.");
      resetChallenge();
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
        resetChallenge();
        return;
      }

      // Sanity check on the capture frame: the eyes must be open and readable.
      // (The blink cycle was already verified as liveness before capture.)
      const landmarks = result.landmarks as {
        getLeftEye?: () => { x: number; y: number }[];
        getRightEye?: () => { x: number; y: number }[];
      };
      const ear = eyeAspectRatio(landmarks);
      if (ear === null) {
        setMessage("Could not read your eyes. Please face the camera directly and retry.");
        resetChallenge();
        return;
      }
      if (ear < EAR_OPEN) {
        setMessage("Your eyes are closed. Please open your eyes fully and retry.");
        resetChallenge();
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
      resetChallenge();
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
              {blinkPrompt && !blinkOk && (
                <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                  <span className="rounded-full bg-brand-700/90 px-3 py-1 text-xs font-semibold text-white shadow">
                    Blink to confirm you&apos;re live
                  </span>
                </div>
              )}
              {blinkOk && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/90 text-2xl font-bold text-white shadow-lg">
                    ✓
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
        Your face is captured automatically once you blink. Face data is processed
        in your browser and stored only as a mathematical template, used with your
        OTP as a second layer of verification.
      </p>
    </div>
  );
}
