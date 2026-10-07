"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Check, Copy, FileUp, Loader2, X } from "lucide-react";
import { makeWatermarkedPreview, makeWebRes } from "./image-tools";

type AssetType = "hdr_still" | "drone_aerial" | "floor_plan_pdf" | "floor_plan_img" | "walkthrough_video";
type UploadJob = { file: Blob; name: string; contentType: string; preview?: boolean };
type AssetPlan = { asset_type: AssetType; full: UploadJob; web: UploadJob; preview?: UploadJob };
type Links = { delivery: string; mls: string; showcase: string };

const PACKAGES = ["HDR Photos", "HDR Photos + Drone", "HDR Photos + Drone + Floor Plan", "Full Production (Photos, Drone, Floor Plan, Video)"];
type Booking = {
  referenceId: string; shootDate: string; address: string; zip: string; agentName: string; agentEmail: string; agentPhone: string;
  brokerage: string; package: string; total: number; deposit: number; balanceDue: number;
};

const input = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-amber-600 focus:outline-none";

function Dropzone({ label, hint, accept, multiple, files, onChange }: { label: string; hint: string; accept: string; multiple?: boolean; files: File[]; onChange: (files: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const allowed = accept.split(",");

  function add(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter((f) => allowed.includes(f.type));
    onChange(multiple ? [...files, ...next] : next.slice(0, 1));
  }
  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    add(event.dataTransfer.files);
  }

  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-neutral-800">{label}</p>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-5 text-center text-sm ${over ? "border-amber-600 bg-amber-50" : "border-neutral-300 bg-neutral-50"}`}
      >
        <FileUp className="mx-auto mb-2 h-5 w-5 text-neutral-500" aria-hidden />
        <p className="text-neutral-700">Drag & drop or click to choose</p>
        <p className="text-xs text-neutral-500">{hint}</p>
        <input ref={ref} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </div>
      {files.length > 0 && (
        <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-neutral-700">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
              <span className="truncate">{file.name}</span>
              <button type="button" aria-label={`Remove ${file.name}`} onClick={() => onChange(files.filter((_, i) => i !== index))}><X className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold text-neutral-800">{label}<div className="mt-1 font-normal">{children}</div></label>;
}

function CopyRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{label}</p>
      <div className="mt-1 flex gap-2">
        <input readOnly value={url} className={input} onFocus={(e) => e.target.select()} />
        <button
          type="button"
          onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center gap-1 rounded-md bg-neutral-900 px-3 text-sm text-white"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

async function presign(jobs: UploadJob[]) {
  const keys: { key: string; url: string }[] = [];
  for (let i = 0; i < jobs.length; i += 120) {
    const chunk = jobs.slice(i, i + 120);
    const response = await fetch("/api/admin/deliveries/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ files: chunk.map((j) => ({ name: j.name, contentType: j.contentType, preview: j.preview === true })) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not prepare uploads.");
    keys.push(...result.uploads);
  }
  return keys;
}

async function runPool<T>(items: T[], size: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  }));
}

export default function NewDeliveryForm() {
  const [fields, setFields] = useState({
    property_address: "", city: "Vero Beach", state: "FL", zip_code: "", agent_name: "", agent_email: "", agent_phone: "",
    brokerage_name: "", agent_headshot_url: "", package_type: PACKAGES[2], invoice_amount: "",
  });
  const [hdr, setHdr] = useState<File[]>([]);
  const [drone, setDrone] = useState<File[]>([]);
  const [planPdf, setPlanPdf] = useState<File[]>([]);
  const [planImg, setPlanImg] = useState<File[]>([]);
  const [video, setVideo] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [links, setLinks] = useState<Links | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    fetch("/api/admin/bookings")
      .then((response) => (response.ok ? response.json() : { bookings: [] }))
      .then((result) => setBookings(result.bookings ?? []))
      .catch(() => undefined);
  }, []);

  const selected = bookings.find((booking) => booking.referenceId === bookingId);

  function pickBooking(id: string) {
    setBookingId(id);
    const booking = bookings.find((b) => b.referenceId === id);
    if (!booking) return;
    setFields((f) => ({
      ...f,
      property_address: booking.address,
      zip_code: booking.zip || f.zip_code,
      agent_name: booking.agentName,
      agent_email: booking.agentEmail,
      agent_phone: booking.agentPhone,
      brokerage_name: booking.brokerage,
      package_type: booking.package || f.package_type,
      invoice_amount: booking.balanceDue > 0 ? String(booking.balanceDue) : "",
    }));
  }

  const set = (name: keyof typeof fields) => (e: { target: { value: string } }) => setFields((f) => ({ ...f, [name]: e.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLinks(null);
    if (hdr.length === 0) return setError("Add at least one HDR still.");

    setBusy(true);
    try {
      setStatus("Optimizing images…");
      const plans: AssetPlan[] = [];
      for (const [type, files] of [["hdr_still", hdr], ["drone_aerial", drone]] as const) {
        for (const file of files) {
          const base = file.name.replace(/\.[^.]+$/, "");
          const [web, preview] = await Promise.all([makeWebRes(file), makeWatermarkedPreview(file)]);
          plans.push({
            asset_type: type,
            full: { file, name: file.name, contentType: file.type },
            web: { file: web, name: `web-${base}.jpg`, contentType: "image/jpeg" },
            preview: { file: preview, name: `${base}.jpg`, contentType: "image/jpeg", preview: true },
          });
        }
      }
      for (const [type, files] of [["floor_plan_pdf", planPdf], ["floor_plan_img", planImg], ["walkthrough_video", video]] as const) {
        for (const file of files) {
          const job = { file, name: file.name, contentType: file.type };
          plans.push({ asset_type: type, full: job, web: job });
        }
      }

      // Unique blobs only: floor plans/video reuse one object for full and web.
      const jobs = [...new Set(plans.flatMap((p) => [p.full, p.web, p.preview].filter((j): j is UploadJob => Boolean(j))))];
      setStatus("Preparing uploads…");
      const signed = await presign(jobs);
      const keyOf = new Map(jobs.map((job, i) => [job, signed[i]]));

      let done = 0;
      await runPool(jobs, 3, async (job) => {
        const { url } = keyOf.get(job)!;
        const response = await fetch(url, { method: "PUT", headers: { "content-type": job.contentType }, body: job.file });
        if (!response.ok) throw new Error(`Upload failed for ${job.name}. Check the R2 bucket CORS rules.`);
        setStatus(`Uploading ${++done} of ${jobs.length} files…`);
      });

      setStatus("Saving delivery…");
      const response = await fetch("/api/admin/deliveries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listing: fields,
          assets: plans.map((p) => ({
            asset_type: p.asset_type,
            full_key: keyOf.get(p.full)!.key,
            web_key: keyOf.get(p.web)!.key,
            preview_key: p.preview ? keyOf.get(p.preview)!.key : null,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save the delivery.");
      setLinks(result.links);
      setStatus("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-2xl font-bold text-neutral-900">New Delivery</h1>
      <p className="mb-8 text-sm text-neutral-600">Upload a shoot, then share the generated links.</p>

      <form onSubmit={submit} className="space-y-8">
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <Field label="Start from a paid booking">
            <select className={input} value={bookingId} onChange={(e) => pickBooking(e.target.value)}>
              <option value="">{bookings.length ? "Select a booking to prefill…" : "No paid bookings found — enter details manually"}</option>
              {bookings.map((b) => <option key={b.referenceId} value={b.referenceId}>{b.address} — {b.agentName}{b.shootDate ? ` (${b.shootDate})` : ""}</option>)}
            </select>
          </Field>
          {selected && (
            <p className="mt-2 text-xs text-neutral-700">
              Booking total ${selected.total.toLocaleString()} − deposit paid ${selected.deposit.toLocaleString()} = <strong>balance due ${selected.balanceDue.toLocaleString()}</strong>. Edit the invoice total below if needed.
            </p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Property Address"><input required className={input} value={fields.property_address} onChange={set("property_address")} /></Field></div>
          <Field label="City"><input required className={input} value={fields.city} onChange={set("city")} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="State"><input required maxLength={2} className={input} value={fields.state} onChange={set("state")} /></Field>
            <Field label="ZIP"><input required className={input} value={fields.zip_code} onChange={set("zip_code")} /></Field>
          </div>
          <Field label="Agent Name"><input required className={input} value={fields.agent_name} onChange={set("agent_name")} /></Field>
          <Field label="Agent Email"><input required type="email" className={input} value={fields.agent_email} onChange={set("agent_email")} /></Field>
          <Field label="Agent Phone"><input type="tel" className={input} value={fields.agent_phone} onChange={set("agent_phone")} /></Field>
          <Field label="Brokerage"><input className={input} value={fields.brokerage_name} onChange={set("brokerage_name")} /></Field>
          <Field label="Agent Headshot URL (https, optional)"><input type="url" className={input} value={fields.agent_headshot_url} onChange={set("agent_headshot_url")} /></Field>
          <Field label="Package">
            <input required list="packages" className={input} value={fields.package_type} onChange={set("package_type")} />
            <datalist id="packages">{PACKAGES.map((p) => <option key={p} value={p} />)}</datalist>
          </Field>
          <Field label="Invoice Total ($)"><input required type="number" min="0.01" step="0.01" className={input} value={fields.invoice_amount} onChange={set("invoice_amount")} /></Field>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Dropzone label="HDR Stills (batch)" hint="JPG/PNG/WebP. Web-size and watermarked previews are generated automatically." accept="image/jpeg,image/png,image/webp" multiple files={hdr} onChange={setHdr} />
          </div>
          <Dropzone label="Drone Stills" hint="JPG/PNG/WebP" accept="image/jpeg,image/png,image/webp" multiple files={drone} onChange={setDrone} />
          <Dropzone label="Walkthrough Reel (MP4)" hint="MP4 only" accept="video/mp4" files={video} onChange={setVideo} />
          <Dropzone label="CubiCasa Floor Plan (PDF)" hint="PDF" accept="application/pdf" files={planPdf} onChange={setPlanPdf} />
          <Dropzone label="CubiCasa Floor Plan (PNG)" hint="PNG" accept="image/png" files={planImg} onChange={setPlanImg} />
        </section>

        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="flex items-center gap-2 rounded-md bg-neutral-900 px-6 py-3 text-sm font-semibold text-amber-200 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? status || "Working…" : "Create Delivery"}
        </button>
      </form>

      {links && (
        <section className="mt-10 space-y-4 rounded-lg border border-emerald-300 bg-emerald-50 p-5">
          <h2 className="font-bold text-emerald-900">Delivery created</h2>
          <CopyRow label="Agent Delivery / Payment Portal" url={links.delivery} />
          <CopyRow label="Unbranded MLS Virtual Tour Link" url={links.mls} />
          <CopyRow label="Branded Public Marketing Showcase" url={links.showcase} />
          <p className="text-xs text-emerald-900">The MLS and showcase links go live once the invoice is paid.</p>
        </section>
      )}
    </main>
  );
}
