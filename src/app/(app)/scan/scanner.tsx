"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { StockMovementForm } from "@/components/stock-movement-form";
import { Alert, Button, Card, describedBy, inputClass, LinkButton, LowStockBadge, StatusBadge } from "@/components/ui";
import { CameraError, type CameraErrorKind, type CameraScan, startCameraScan, SUPPORTED_FORMATS } from "@/lib/barcode/camera";
import { formatInt } from "@/lib/format";
import { lookupBarcode, type LookupResult } from "../products/actions";

const NO_DECODE_TIMEOUT_MS = 30_000;

const CAMERA_HELP: Record<CameraErrorKind | "timeout", string> = {
  insecure: "The camera only works over HTTPS (or on localhost). Type the barcode instead.",
  unsupported: "This browser does not support camera scanning. Type the barcode or use a USB/Bluetooth scanner.",
  denied: "Camera permission was denied. Allow camera access in your browser settings, or type the barcode.",
  no_camera: "No camera was found. Type the barcode or use a USB/Bluetooth scanner.",
  busy: "The camera is in use by another app or tab. Close it and try again, or type the barcode.",
  failed: "The camera could not be started. Try again, or type the barcode.",
  timeout: "No barcode detected for 30 seconds, so the camera was turned off. Try better light, hold steady, or type the code.",
};

type CameraState = "off" | "starting" | "on";

export function Scanner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanRef = useRef<CameraScan | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [code, setCode] = useState("");
  const [camera, setCamera] = useState<CameraState>("off");
  const [cameraError, setCameraError] = useState<CameraErrorKind | "timeout" | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [announce, setAnnounce] = useState("");
  const [pending, startTransition] = useTransition();

  // Bumped on every stop/unmount so a camera that finishes starting late is shut down.
  const generationRef = useRef(0);

  const stopCamera = useCallback(() => {
    generationRef.current += 1;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    scanRef.current?.stop();
    scanRef.current = null;
    setCamera("off");
  }, []);

  // Stop the camera on unmount (includes route changes) and when the tab is hidden.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") stopCamera();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      generationRef.current += 1;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      scanRef.current?.stop();
      scanRef.current = null;
    };
  }, [stopCamera]);

  const lookup = useCallback((raw: string) => {
    const value = raw.trim();
    if (!value) {
      setResult({ status: "error", code: "", message: "Enter or scan a barcode." });
      return;
    }
    startTransition(async () => {
      try {
        const res = await lookupBarcode(value);
        setResult(res);
        setAnnounce(
          res.status === "found"
            ? `Found ${res.product.name}, ${res.product.quantity_on_hand} ${res.product.unit} on hand.`
            : res.status === "not_found"
              ? `No product found for barcode ${res.code}.`
              : res.message,
        );
      } catch {
        setResult({ status: "error", code: value, message: "Could not reach the server. Check your connection and try again." });
      }
    });
  }, []);

  async function startCamera() {
    if (!videoRef.current || scanRef.current) return;
    setCameraError(null);
    setResult(null);
    setCamera("starting");
    const generation = generationRef.current;
    try {
      const scan = await startCameraScan(videoRef.current, (text) => {
        // First decode wins: stop immediately so repeat detections are ignored.
        stopCamera();
        setCode(text);
        setAnnounce(`Scanned ${text}.`);
        lookup(text);
      });
      if (generation !== generationRef.current) {
        // Stopped or unmounted while the camera was starting.
        scan.stop();
        return;
      }
      scanRef.current = scan;
      setCamera("on");
      timeoutRef.current = setTimeout(() => {
        stopCamera();
        setCameraError("timeout");
      }, NO_DECODE_TIMEOUT_MS);
    } catch (err) {
      if (generation !== generationRef.current) return;
      setCamera("off");
      setCameraError(err instanceof CameraError ? err.kind : "failed");
      inputRef.current?.focus();
    }
  }

  function reset() {
    setResult(null);
    setCode("");
    inputRef.current?.focus();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookup(code);
            }}
            className="space-y-3"
          >
            <label htmlFor="barcode" className="block text-sm font-medium text-slate-800">
              Barcode
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                id="barcode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                autoComplete="off"
                inputMode="numeric"
                maxLength={64}
                className={`${inputClass} font-mono`}
                {...describedBy("barcode", { hint: true })}
              />
              <Button type="submit" disabled={pending}>
                {pending ? "Looking…" : "Look up"}
              </Button>
            </div>
            <p id="barcode-hint" className="text-xs text-slate-500">
              Type or paste a code and press Enter. USB and Bluetooth scanners work here too: keep this field focused and scan.
            </p>
          </form>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Camera</h2>
              <p className="text-xs text-slate-500">Reads {SUPPORTED_FORMATS.join(", ")}.</p>
            </div>
            {camera === "off" ? (
              <Button type="button" variant="secondary" onClick={startCamera}>
                Scan with camera
              </Button>
            ) : (
              <Button type="button" variant="danger" onClick={stopCamera}>
                Stop camera
              </Button>
            )}
          </div>
          {camera === "off" && !cameraError && (
            <p className="mt-3 text-sm text-slate-600">
              Your browser will ask for camera permission. Video stays on this device; nothing is recorded or uploaded.
            </p>
          )}
          {cameraError && (
            <div className="mt-3">
              <Alert tone="warning" role="alert">
                {CAMERA_HELP[cameraError]}
              </Alert>
            </div>
          )}
          <div className={camera === "off" ? "hidden" : "relative mt-4 overflow-hidden rounded-lg bg-black"}>
            <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline aria-label="Camera preview" />
            <div aria-hidden className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
            {camera === "starting" && <p className="absolute inset-0 flex items-center justify-center text-sm text-white">Starting camera…</p>}
          </div>
        </Card>
      </div>

      <div>
        <p className="sr-only" aria-live="assertive" aria-atomic="true">
          {announce}
        </p>
        {!result && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            Scan or enter a barcode to find a product. Scanning only selects the product; stock changes need your confirmation.
          </div>
        )}
        {result?.status === "error" && (
          <Alert tone="error" role="alert">
            {result.message}
          </Alert>
        )}
        {result?.status === "not_found" && (
          <Card>
            <h2 className="font-semibold">No product found</h2>
            <p className="mt-1 text-sm text-slate-600">
              Nothing in this workspace has barcode <span className="font-mono font-semibold text-slate-900">{result.code}</span>.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <LinkButton href={`/products/new?barcode=${encodeURIComponent(result.code)}`}>Create product with this barcode</LinkButton>
              <Button type="button" variant="secondary" onClick={reset}>
                Scan another
              </Button>
            </div>
          </Card>
        )}
        {result?.status === "found" && (
          <Card>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Match for {result.code}</p>
                <h2 className="text-lg font-semibold">
                  <Link href={`/products/${result.product.id}`} className="hover:underline">
                    {result.product.name}
                  </Link>
                </h2>
                <p className="text-sm text-slate-600">SKU {result.product.sku}</p>
                <div className="mt-1 flex gap-1">
                  {result.product.is_low_stock && <LowStockBadge />}
                  {!result.product.is_active && <StatusBadge active={false} />}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold tabular-nums">{formatInt(result.product.quantity_on_hand)}</p>
                <p className="text-xs text-slate-500">{result.product.unit} on hand</p>
              </div>
            </div>
            <StockMovementForm
              key={result.product.id}
              product={{
                id: result.product.id,
                name: result.product.name,
                sku: result.product.sku,
                unit: result.product.unit,
                quantity_on_hand: result.product.quantity_on_hand,
                is_active: result.product.is_active,
                locationLabel: result.product.location ? `${result.product.location.code} — ${result.product.location.name}` : null,
              }}
              onRecorded={(r) =>
                setResult((prev) =>
                  prev?.status === "found" ? { ...prev, product: { ...prev.product, quantity_on_hand: r.balanceAfter, is_low_stock: prev.product.is_active && prev.product.reorder_level > 0 && r.balanceAfter <= prev.product.reorder_level } } : prev,
                )
              }
            />
            <div className="mt-4 border-t border-slate-100 pt-4">
              <Button type="button" variant="secondary" onClick={reset}>
                Scan another
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
