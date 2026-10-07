"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Check, Download, Link2, Loader2, Lock } from "lucide-react";

export type GalleryImage = { id: string; src: string };
type Kind = "mls" | "print" | "floorplan";
type Props = {
  token: string;
  address: string;
  amount: number;
  isPaid: boolean;
  returnedFromCheckout: boolean;
  images: GalleryImage[];
  hasFloorPlan: boolean;
  hasVideo: boolean;
  mlsLink: string;
  showcaseLink: string;
};

const ZIP_NAMES: Record<Kind, string> = { mls: "MLS-Ready", print: "Full-Res-Print", floorplan: "Floor-Plan" };

async function fetchDownloads(token: string, kind: Kind | "video") {
  const response = await fetch(`/api/delivery/${token}/downloads?kind=${kind}`, { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Download unavailable.");
  return result.files as { name: string; url: string }[];
}

export default function DeliveryClient({ token, address, amount, isPaid, returnedFromCheckout, images, hasFloorPlan, hasVideo, mlsLink, showcaseLink }: Props) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  // After Stripe redirects back, the webhook may take a few seconds to mark the listing paid.
  useEffect(() => {
    if (isPaid || !returnedFromCheckout) return;
    let attempts = 0;
    const timer = setInterval(() => {
      if (++attempts > 15) clearInterval(timer);
      else router.refresh();
    }, 3000);
    return () => clearInterval(timer);
  }, [isPaid, returnedFromCheckout, router]);

  async function pay() {
    setPaying(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error ?? "Unable to start checkout.");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start checkout.");
      setPaying(false);
    }
  }

  // Files are fetched straight from storage and zipped in the browser, so no serverless function is involved.
  async function downloadZip(kind: Kind) {
    setBusy(kind);
    setError("");
    try {
      const files = await fetchDownloads(token, kind);
      if (files.length === 0) throw new Error("No files available for this download.");
      const zip = new JSZip();
      let done = 0;
      let next = 0;
      const worker = async () => {
        while (next < files.length) {
          const file = files[next++];
          const response = await fetch(file.url);
          if (!response.ok) throw new Error(`Could not download ${file.name}.`);
          zip.file(file.name, await response.blob(), { binary: true });
          setProgress(`Fetching ${++done} of ${files.length}`);
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, files.length) }, worker));
      const blob = await zip.generateAsync({ type: "blob", compression: "STORE", streamFiles: true }, (meta) => setProgress(`Packaging ${Math.round(meta.percent)}%`));
      const slug = address.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
      saveAs(blob, `${slug}-${ZIP_NAMES[kind]}.zip`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Download failed.");
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  async function downloadVideo() {
    setBusy("video");
    setError("");
    try {
      const [file] = await fetchDownloads(token, "video");
      if (file) window.location.assign(file.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  }

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  }

  const btn = "flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-h-screen bg-[#0d0f10] text-neutral-100">
      {isPaid ? (
        <div className="sticky top-0 z-20 flex items-center justify-center gap-2 bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white">
          <Check className="h-4 w-4" aria-hidden /> Payment Confirmed — All assets ready for MLS and print.
        </div>
      ) : (
        <div className="sticky top-0 z-20 flex flex-col items-center justify-center gap-3 border-b border-[#c4a16a]/40 bg-[#0d0f10] px-4 py-3 text-center text-sm sm:flex-row">
          <p className="text-[#e1c697]">
            Invoice Due: <strong>${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong> — Complete payment to unlock full-resolution downloads &amp; MLS files.
          </p>
          <button onClick={pay} disabled={paying} className="flex items-center gap-2 rounded-md bg-gradient-to-b from-[#e1c697] to-[#c4a16a] px-5 py-2 font-bold text-[#14201e] disabled:opacity-60">
            {paying && <Loader2 className="h-4 w-4 animate-spin" />} Pay Now with Card / Apple Pay
          </button>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-5 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/_next/image?url=%2Fimages%2Fmerit-logo.png&w=128&q=80" alt="Merit Media & Marketing" width={64} height={64} className="mb-3 h-16 w-16 rounded-lg" />
        <p className="text-xs uppercase tracking-[0.2em] text-[#c4a16a]">Merit Media Delivery</p>
        <h1 className="mb-6 mt-1 text-3xl font-semibold">{address}</h1>
        {!isPaid && returnedFromCheckout && <p className="mb-4 rounded-md bg-[#c4a16a]/15 p-3 text-sm text-[#e1c697]">Confirming your payment… this page updates automatically.</p>}
        {error && <p role="alert" className="mb-4 rounded-md bg-red-900/40 p-3 text-sm text-red-200">{error}</p>}

        <section className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isPaid ? (
            <>
              <button className={`${btn} border-[#c4a16a] bg-[#c4a16a] text-[#14201e]`} disabled={busy !== null} onClick={() => downloadZip("mls")}>
                {busy === "mls" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download MLS-Ready ZIP (&lt;2048px)
              </button>
              <button className={`${btn} border-[#c4a16a] bg-[#c4a16a] text-[#14201e]`} disabled={busy !== null} onClick={() => downloadZip("print")}>
                {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download Full-Res Print ZIP
              </button>
              <button className={`${btn} border-neutral-600`} disabled={busy !== null || !hasFloorPlan} onClick={() => downloadZip("floorplan")}>
                {busy === "floorplan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download Floor Plan (PDF &amp; PNG)
              </button>
              <button className={`${btn} border-neutral-600`} onClick={() => copy("mls", mlsLink)}>
                {copied === "mls" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} {copied === "mls" ? "Copied" : "Copy Unbranded MLS Tour Link"}
              </button>
              <button className={`${btn} border-neutral-600`} onClick={() => copy("showcase", showcaseLink)}>
                {copied === "showcase" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} {copied === "showcase" ? "Copied" : "Copy Branded Social Tour Link"}
              </button>
              {hasVideo && (
                <button className={`${btn} border-neutral-600`} disabled={busy !== null} onClick={downloadVideo}>
                  {busy === "video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download Walkthrough Video
                </button>
              )}
              {progress && <p className="self-center text-sm text-neutral-300" aria-live="polite">{progress}</p>}
            </>
          ) : (
            ["Download All", "Download Web Size", "Download Print Size"].map((label) => (
              <button key={label} disabled className={`${btn} border-neutral-700 text-neutral-400`}>
                <Lock className="h-4 w-4" aria-hidden /> {label}
              </button>
            ))
          )}
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((image) => (
            <figure
              key={image.id}
              className="relative aspect-[3/2] select-none overflow-hidden rounded-md bg-neutral-900"
              onContextMenu={isPaid ? undefined : (e) => e.preventDefault()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt={`Photo of ${address}`}
                loading="lazy"
                draggable={false}
                onDragStart={isPaid ? undefined : (e) => e.preventDefault()}
                className={`h-full w-full object-cover ${isPaid ? "" : "pointer-events-none"}`}
              />
              {!isPaid && (
                <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-black/10 backdrop-blur-[1px]">
                  <span className="-rotate-30 whitespace-nowrap text-lg font-bold tracking-widest text-white/60 sm:text-2xl">PREVIEW ONLY - MERIT MEDIA</span>
                </div>
              )}
            </figure>
          ))}
        </section>
      </main>
    </div>
  );
}
