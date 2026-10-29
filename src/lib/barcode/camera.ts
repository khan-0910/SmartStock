// Camera barcode adapter. The rest of the app only sees startCameraScan();
// swap the decoder here without touching UI code.

import { BrowserMultiFormatOneDReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

export const SUPPORTED_FORMATS = ["EAN-13", "EAN-8", "UPC-A", "UPC-E", "Code 128"] as const;

const FORMATS = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128];

export type CameraErrorKind = "insecure" | "unsupported" | "denied" | "no_camera" | "busy" | "failed";

export class CameraError extends Error {
  constructor(public kind: CameraErrorKind, message: string) {
    super(message);
  }
}

export type CameraScan = { stop: () => void };

/** Check the environment before asking for permission. */
export function cameraSupport(): CameraErrorKind | null {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  return null;
}

function mapError(err: unknown): CameraError {
  const name = err instanceof DOMException || err instanceof Error ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return new CameraError("denied", "Camera permission was denied.");
    case "NotFoundError":
    case "OverconstrainedError":
      return new CameraError("no_camera", "No camera was found on this device.");
    case "NotReadableError":
    case "AbortError":
      return new CameraError("busy", "The camera is busy or could not be started.");
    default:
      return new CameraError("failed", "The camera could not be started.");
  }
}

/**
 * Start the camera and decode continuously into `video`. Calls onDecode once
 * per detected value. stop() always stops every media track. If stop() runs
 * before the camera finishes starting, the stream is stopped as soon as it
 * arrives.
 */
export async function startCameraScan(video: HTMLVideoElement, onDecode: (text: string) => void): Promise<CameraScan> {
  const unsupported = cameraSupport();
  if (unsupported === "insecure") throw new CameraError("insecure", "Camera needs HTTPS (or localhost).");
  if (unsupported) throw new CameraError("unsupported", "This browser does not support camera access.");

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (err) {
    throw mapError(err);
  }

  let stopped = false;
  let controls: { stop: () => void } | null = null;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    controls?.stop();
    for (const track of stream.getTracks()) track.stop();
    video.srcObject = null;
  };

  try {
    const hints = new Map<DecodeHintType, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, FORMATS],
      [DecodeHintType.TRY_HARDER, true],
    ]);
    const reader = new BrowserMultiFormatOneDReader(hints, { delayBetweenScanAttempts: 150 });
    controls = await reader.decodeFromStream(stream, video, (result) => {
      if (result && !stopped) onDecode(result.getText());
    });
    if (stopped) controls.stop();
  } catch (err) {
    stop();
    throw err instanceof CameraError ? err : new CameraError("failed", "The barcode decoder could not start.");
  }

  return { stop };
}
