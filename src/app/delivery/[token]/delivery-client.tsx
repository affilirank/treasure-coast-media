"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Check, Download, Link2, Loader2, Lock, Upload, User } from "lucide-react";

export type GalleryImage = { id: string; src: string };
type Kind = "mls" | "print" | "floorplan";
type Props = {
  token: string;
  address: string;
  amount: number;
  isPaid: boolean;
  hasCardOnFile: boolean;
  returnedFromCheckout: boolean;
  returnedTip: boolean;
  images: GalleryImage[];
  hasFloorPlan: boolean;
  hasVideo: boolean;
  mlsLink: string;
  showcaseLink: string;
  headline: string;
  description: string;
  headshotUrl: string | null;
  socialPackage: string | null;
  returnedSocial: boolean;
  memberBadgeSlot?: React.ReactNode;
};

const ZIP_NAMES: Record<Kind, string> = { mls: "MLS-Ready", print: "Full-Res-Print", floorplan: "Floor-Plan" };

/** Client-side resize so the headshot uploads fast and renders crisp on the tour page. */
async function toHeadshotJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = 640;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not process that image — try a JPEG or PNG."))), "image/jpeg", 0.85),
  );
}

async function fetchDownloads(token: string, kind: Kind | "video") {
  const response = await fetch(`/api/delivery/${token}/downloads?kind=${kind}`, { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Download unavailable.");
  return result.files as { name: string; url: string }[];
}

export default function DeliveryClient({ token, address, amount, isPaid, hasCardOnFile, returnedFromCheckout, returnedTip, images, hasFloorPlan, hasVideo, mlsLink, showcaseLink, headline: initialHeadline, description: initialDescription, headshotUrl: initialHeadshot, socialPackage, returnedSocial, memberBadgeSlot }: Props) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [tipBusy, setTipBusy] = useState(false);
  const [tipError, setTipError] = useState("");
  const [tipCustom, setTipCustom] = useState("");
  const [headline, setHeadline] = useState(initialHeadline);
  const [description, setDescription] = useState(initialDescription);
  const [headshotUrl, setHeadshotUrl] = useState(initialHeadshot);
  const [headshotFile, setHeadshotFile] = useState<File | null>(null);
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);
  const [tourBusy, setTourBusy] = useState(false);
  const [tourSaved, setTourSaved] = useState(false);
  const [tourError, setTourError] = useState("");
  const [socialBusy, setSocialBusy] = useState<string | null>(null);
  const [socialError, setSocialError] = useState("");

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
      // If a card was held on file at booking, try to capture it first (no redirect).
      if (hasCardOnFile) {
        const charge = await fetch("/api/delivery/charge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
        const charged = await charge.json().catch(() => ({}));
        if (charge.ok && charged.captured) {
          router.replace(`${window.location.pathname}?paid=1`);
          router.refresh();
          return;
        }
        // Otherwise fall through to hosted Checkout (card needs authentication, etc.).
      }
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

  // One-time social media upsell: starts Stripe checkout for the chosen package.
  async function claimSocial(plan: "starter" | "reels") {
    setSocialBusy(plan);
    setSocialError("");
    try {
      const response = await fetch("/api/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, package: plan }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error ?? "Unable to start checkout.");
      window.location.assign(result.url);
    } catch (cause) {
      setSocialError(cause instanceof Error ? cause.message : "Unable to start checkout.");
      setSocialBusy(null);
    }
  }

  async function payTip(value: number) {
    if (!Number.isFinite(value) || value < 1) return setTipError("Choose a thank-you of at least $1.");
    setTipBusy(true);
    setTipError("");
    try {
      const response = await fetch("/api/tip", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, amount: value }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error ?? "Unable to start the thank-you checkout.");
      window.location.assign(result.url);
    } catch (cause) {
      setTipError(cause instanceof Error ? cause.message : "Unable to start the thank-you checkout.");
      setTipBusy(false);
    }
  }

  function pickHeadshot(file: File | null) {
    setTourSaved(false);
    setTourError("");
    if (headshotPreview) URL.revokeObjectURL(headshotPreview);
    setHeadshotFile(file);
    setHeadshotPreview(file ? URL.createObjectURL(file) : null);
  }

  // Personalize the branded tour page: text fields save directly, a new headshot is
  // resized here, uploaded to storage, then referenced by the same save call.
  async function saveTourPage() {
    setTourBusy(true);
    setTourSaved(false);
    setTourError("");
    try {
      let headshotKey: string | undefined;
      if (headshotFile) {
        const jpeg = await toHeadshotJpeg(headshotFile);
        const presign = await fetch(`/api/delivery/${token}/headshot`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contentType: "image/jpeg" }),
        });
        const signed = await presign.json();
        if (!presign.ok || !signed.url) throw new Error(signed.error ?? "Headshot uploads are unavailable right now.");
        const put = await fetch(signed.url, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: jpeg });
        if (!put.ok) throw new Error("Could not upload the headshot. Please try another photo.");
        headshotKey = signed.key;
      }
      const response = await fetch(`/api/delivery/${token}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ headline, description, ...(headshotKey ? { headshotKey } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save your changes.");
      setHeadshotUrl(result.headshotUrl ?? headshotUrl);
      pickHeadshot(null);
      setTourSaved(true);
      setTimeout(() => setTourSaved(false), 5000);
    } catch (cause) {
      setTourError(cause instanceof Error ? cause.message : "Could not save your changes.");
    } finally {
      setTourBusy(false);
    }
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
            {paying && <Loader2 className="h-4 w-4 animate-spin" />} {hasCardOnFile ? "Pay Now with Card on File" : "Pay Now with Card / Apple Pay"}
          </button>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-5 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/_next/image?url=%2Fimages%2Fmerit-logo.png&w=128&q=75" alt="Merit Media & Marketing" width={64} height={64} className="mb-3 h-16 w-16 rounded-lg" />
        <p className="text-xs uppercase tracking-[0.2em] text-[#c4a16a]">Merit Media Delivery</p>
        <h1 className="mb-6 mt-1 text-3xl font-semibold">{address}</h1>
        {memberBadgeSlot}
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

        {isPaid && (
          <section className="mb-10 rounded-lg border border-[#c4a16a]/30 bg-[#c4a16a]/5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#e1c697]">Make the tour page yours</h2>
                <p className="mt-1 max-w-2xl text-sm text-neutral-300">
                  These photos come with a branded tour page you can share anywhere. Add a headline, the property story and your agent headshot — updates go live on the tour page immediately.
                </p>
              </div>
              <a href={showcaseLink} target="_blank" rel="noreferrer" className={`${btn} shrink-0 border-[#c4a16a] text-[#e1c697] hover:bg-[#c4a16a]/15`}>
                Preview tour page <Link2 className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto]">
              <div className="grid gap-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Headline
                  <input
                    value={headline}
                    maxLength={160}
                    placeholder="e.g. Coastal elegance in the heart of Vero Beach"
                    onChange={(event) => { setHeadline(event.target.value); setTourSaved(false); }}
                    className="mt-1 w-full rounded-md border border-neutral-600 bg-transparent px-3 py-3 text-sm font-normal normal-case tracking-normal text-neutral-100 placeholder:text-neutral-500"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Property description
                  <textarea
                    value={description}
                    maxLength={4000}
                    rows={5}
                    placeholder="Tell the story of this home — buyers will see it on the tour page."
                    onChange={(event) => { setDescription(event.target.value); setTourSaved(false); }}
                    className="mt-1 w-full rounded-md border border-neutral-600 bg-transparent px-3 py-3 text-sm font-normal normal-case tracking-normal text-neutral-100 placeholder:text-neutral-500"
                  />
                </label>
              </div>
              <div className="grid justify-items-center gap-3 self-start">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#c4a16a]/40 bg-neutral-900">
                  {headshotPreview || headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={headshotPreview ?? headshotUrl ?? ""} alt="Agent headshot" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-neutral-600" aria-hidden />
                  )}
                </div>
                <label className={`${btn} cursor-pointer border-[#c4a16a] text-[#e1c697] hover:bg-[#c4a16a]/15`}>
                  <Upload className="h-4 w-4" /> {headshotFile ? "Chosen — save to apply" : "Choose headshot"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => pickHeadshot(event.target.files?.[0] ?? null)} />
                </label>
                <p className="max-w-[13rem] text-center text-xs text-neutral-500">Shown on the tour page beside your contact card. Photos are resized automatically.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button className={`${btn} border-[#c4a16a] bg-[#c4a16a] text-[#14201e]`} disabled={tourBusy} onClick={saveTourPage}>
                {tourBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save &amp; update tour page
              </button>
              {tourSaved && <p className="text-sm text-emerald-300">✓ Saved — your tour page is updated.</p>}
              {tourError && <p role="alert" className="rounded-md bg-red-900/40 p-2 text-sm text-red-200">{tourError}</p>}
            </div>
          </section>
        )}

        {isPaid && (
          <section className="mb-10 rounded-lg border border-[#c4a16a]/30 bg-[#c4a16a]/5 p-5">
            {returnedTip && (
              <p className="mb-3 rounded-md bg-emerald-900/40 p-3 text-sm text-emerald-200">
                Thank you — your thank-you went through. It genuinely means a lot. 🙏
              </p>
            )}
            <h2 className="text-lg font-semibold text-[#e1c697]">Loved the work?</h2>
            <p className="mt-1 text-sm text-neutral-300">A thank-you is completely optional — your invoice is already settled, and there is never any obligation.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {[10, 25, 50].map((value) => (
                <button
                  key={value}
                  disabled={tipBusy}
                  onClick={() => payTip(value)}
                  className={`${btn} border-[#c4a16a] text-[#e1c697] hover:bg-[#c4a16a]/15`}
                >
                  {tipBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} ${value}
                </button>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-400">$</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  placeholder="Custom"
                  value={tipCustom}
                  onChange={(event) => setTipCustom(event.target.value)}
                  className="w-24 rounded-md border border-neutral-600 bg-transparent px-3 py-3 text-sm text-neutral-100 placeholder:text-neutral-500"
                />
                <button
                  disabled={tipBusy || tipCustom === ""}
                  onClick={() => payTip(Number(tipCustom))}
                  className={`${btn} border-[#c4a16a] bg-[#c4a16a] text-[#14201e]`}
                >
                  Send a thank-you
                </button>
              </div>
            </div>
            {tipError && <p role="alert" className="mt-3 rounded-md bg-red-900/40 p-3 text-sm text-red-200">{tipError}</p>}
          </section>
        )}

        {isPaid && (
          <section className="mb-10 rounded-lg border border-[#c4a16a]/30 bg-[#c4a16a]/5 p-5">
            <h2 className="text-lg font-semibold text-[#e1c697]">One-time offer — 30 days of social media for this listing</h2>
            <p className="mt-1 max-w-2xl text-sm text-neutral-300">
              Hand off the posting grind. We run this property on Facebook and Instagram for a full month — branded with your
              name and brokerage. Claim it right here, once, for this listing.
            </p>
            {socialPackage || returnedSocial ? (
              <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-900/20 p-4">
                <p className="font-semibold text-emerald-300">✓ Claimed — your 30-day social plan is booked.</p>
                <p className="mt-1 text-sm text-neutral-300">
                  Your receipt is on its way from Stripe, and we&apos;ll reach out within one business day to line up the posts
                  and get your 30 days on Facebook and Instagram started.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="grid gap-3 rounded-md border border-[#c4a16a]/25 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">30-Day Social Plan</p>
                  <p className="text-3xl font-semibold text-neutral-100">$99 <span className="text-sm font-normal text-neutral-400">one-time</span></p>
                  <ul className="grid list-disc gap-1 pl-5 text-sm text-neutral-300">
                    <li>30 days of ready-to-post content for Facebook &amp; Instagram</li>
                    <li>Branded with your name and brokerage</li>
                    <li>Captions, hashtags and posting schedule included</li>
                  </ul>
                  <button
                    disabled={socialBusy !== null}
                    onClick={() => claimSocial("starter")}
                    className={`${btn} mt-1 justify-center border-[#c4a16a] text-[#e1c697] hover:bg-[#c4a16a]/15`}
                  >
                    {socialBusy === "starter" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Claim for $99
                  </button>
                </div>
                <div className="relative grid gap-3 rounded-md border border-[#c4a16a] bg-[#c4a16a]/10 p-4">
                  <span className="absolute -top-2.5 right-3 rounded-full bg-[#c4a16a] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#14201e]">
                    Best value
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#e1c697]">30-Day Social Plan + 7 Premium Reels</p>
                  <p className="text-3xl font-semibold text-neutral-100">$169 <span className="text-sm font-normal text-neutral-400">one-time</span></p>
                  <ul className="grid list-disc gap-1 pl-5 text-sm text-neutral-300">
                    <li>Everything in the 30-Day Social Plan</li>
                    <li><strong className="text-[#e1c697]">7 premium branded reels</strong> — vertical and Reels/TikTok-ready</li>
                    <li>Ideal for launch-week momentum</li>
                  </ul>
                  <button
                    disabled={socialBusy !== null}
                    onClick={() => claimSocial("reels")}
                    className={`${btn} mt-1 justify-center border-[#c4a16a] bg-[#c4a16a] text-[#14201e]`}
                  >
                    {socialBusy === "reels" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Claim for $169
                  </button>
                </div>
              </div>
            )}
            {socialError && <p role="alert" className="mt-3 rounded-md bg-red-900/40 p-3 text-sm text-red-200">{socialError}</p>}
          </section>
        )}

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
