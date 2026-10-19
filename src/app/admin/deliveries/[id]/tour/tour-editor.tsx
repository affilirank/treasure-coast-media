"use client";

import { useEffect, useState } from "react";

type Facts = {
  beds: number | null; baths: number | null; sqft: number | null; lotSize: string | null;
  yearBuilt: number | null; listPrice: number | null; propertyType: string | null; mlsNumber: string | null;
  headline: string | null; description: string | null; features: string[]; agentBio: string | null; showingUrl: string | null;
};

const field = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900";
const btn = "rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50";

function toText(value: number | null) {
  return value === null || value === undefined ? "" : String(value);
}

export default function TourEditor({ listingId }: { listingId: string }) {
  const [facts, setFacts] = useState<Facts | null>(null);
  const [address, setAddress] = useState("");
  const [featureText, setFeatureText] = useState("");
  const [mlsText, setMlsText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    fetch(`/api/admin/deliveries/${listingId}/details`)
      .then((response) => response.json())
      .then((result) => {
        if (result.details) {
          setFacts(result.details);
          setFeatureText((result.details.features ?? []).join("\n"));
          setAddress(result.address ?? "");
          setToken(result.accessToken ?? "");
        } else setMessage(result.error ?? "Could not load the tour details.");
      })
      .catch(() => setMessage("Could not load the tour details."));
  }, [listingId]);

  function set<K extends keyof Facts>(key: K, value: Facts[K]) {
    setFacts((current) => (current ? { ...current, [key]: value } : current));
  }

  function payload() {
    if (!facts) return null;
    return { ...facts, features: featureText.split("\n").map((line) => line.trim()).filter(Boolean) };
  }

  async function save() {
    const body = payload();
    if (!body) return;
    setBusy("save");
    setMessage("");
    const response = await fetch(`/api/admin/deliveries/${listingId}/details`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy("");
    setMessage(response.ok ? "Saved. The tour page updates immediately." : (await response.json()).error ?? "Could not save.");
  }

  async function ai(mode: "extract" | "write") {
    setBusy(mode);
    setMessage("");
    const response = await fetch(`/api/admin/deliveries/${listingId}/details/ai`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mode === "extract" ? { mode, text: mlsText } : { mode, facts: payload() }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(result.error ?? "The AI request failed.");
    if (mode === "extract") {
      const f = result.facts as Partial<Facts>;
      setFacts((current) => (current ? { ...current, ...f } : current));
      setMessage("Extracted facts — review and adjust, then save.");
    } else {
      const copy = result.copy as { headline: string | null; description: string | null; features: string[] };
      setFacts((current) => (current ? { ...current, headline: copy.headline ?? current.headline, description: copy.description ?? current.description } : current));
      if (copy.features?.length) setFeatureText(copy.features.join("\n"));
      setMessage("Wrote a headline and description — edit as you like, then save.");
    }
  }

  if (!facts) {
    return <main className="mx-auto max-w-3xl px-5 py-10"><p className="text-sm text-neutral-600">{message || "Loading…"}</p></main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Listing tour editor</h1>
          <p className="text-sm text-neutral-600">{address}</p>
        </div>
        <div className="flex gap-2">
          <a className={btn} href="/admin/deliveries">Back to deliveries</a>
          {token && <a className={btn} href={`/showcase/${token}`} target="_blank" rel="noreferrer">Preview branded</a>}
          {token && <a className={btn} href={`/mls/${token}`} target="_blank" rel="noreferrer">Preview MLS</a>}
          <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-amber-200 disabled:opacity-50" disabled={busy !== ""} onClick={save}>
            {busy === "save" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {message && <p role="status" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-neutral-800">{message}</p>}

      <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-amber-800">Paste MLS remarks / listing description → Extract with AI</label>
        <textarea className={`${field} mt-1`} rows={5} value={mlsText} onChange={(event) => setMlsText(event.target.value)} placeholder="Paste the full listing remarks here. AI pulls out beds, baths, sqft, lot size, year built, price, type, MLS# and a headline." />
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-amber-200 disabled:opacity-50" disabled={busy !== ""} onClick={() => ai("extract")}>
            {busy === "extract" ? "Extracting…" : "Extract cards with AI"}
          </button>
          <button className={btn} disabled={busy !== ""} onClick={() => ai("write")}>
            {busy === "write" ? "Writing…" : "Write description & features with AI"}
          </button>
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Beds<input className={field} type="number" min={0} value={toText(facts.beds)} onChange={(event) => set("beds", event.target.value === "" ? null : Number(event.target.value))} /></label>
        <label className="text-sm">Baths<input className={field} type="number" min={0} step={0.5} value={toText(facts.baths)} onChange={(event) => set("baths", event.target.value === "" ? null : Number(event.target.value))} /></label>
        <label className="text-sm">Interior sqft<input className={field} type="number" min={0} value={toText(facts.sqft)} onChange={(event) => set("sqft", event.target.value === "" ? null : Number(event.target.value))} /></label>
        <label className="text-sm">Lot size<input className={field} value={facts.lotSize ?? ""} onChange={(event) => set("lotSize", event.target.value || null)} placeholder="0.42 acres" /></label>
        <label className="text-sm">Year built<input className={field} type="number" min={1800} value={toText(facts.yearBuilt)} onChange={(event) => set("yearBuilt", event.target.value === "" ? null : Number(event.target.value))} /></label>
        <label className="text-sm">List price ($)<input className={field} type="number" min={0} value={toText(facts.listPrice)} onChange={(event) => set("listPrice", event.target.value === "" ? null : Number(event.target.value))} /></label>
        <label className="text-sm">Property type<input className={field} value={facts.propertyType ?? ""} onChange={(event) => set("propertyType", event.target.value || null)} placeholder="Single Family" /></label>
        <label className="text-sm">MLS #<input className={field} value={facts.mlsNumber ?? ""} onChange={(event) => set("mlsNumber", event.target.value || null)} /></label>
        <label className="text-sm">Showing / booking URL<input className={field} value={facts.showingUrl ?? ""} onChange={(event) => set("showingUrl", event.target.value || null)} placeholder="https://calendly.com/…" /></label>
      </section>

      <section className="mb-6">
        <label className="text-sm">Headline<input className={field} value={facts.headline ?? ""} onChange={(event) => set("headline", event.target.value || null)} placeholder="Waterfront Living at Its Finest" /></label>
        <label className="mt-3 block text-sm">Description<textarea className={`${field} mt-1`} rows={7} value={facts.description ?? ""} onChange={(event) => set("description", event.target.value || null)} /></label>
        <label className="mt-3 block text-sm">Features (one per line)<textarea className={`${field} mt-1`} rows={6} value={featureText} onChange={(event) => setFeatureText(event.target.value)} placeholder={"Chef's kitchen\nHeated pool\n3-car garage"} /></label>
        <label className="mt-3 block text-sm">Agent bio (branded tour)<textarea className={`${field} mt-1`} rows={3} value={facts.agentBio ?? ""} onChange={(event) => set("agentBio", event.target.value || null)} /></label>
      </section>

      <div className="flex gap-2">
        <button className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-semibold text-amber-200 disabled:opacity-50" disabled={busy !== ""} onClick={save}>{busy === "save" ? "Saving…" : "Save tour details"}</button>
      </div>
    </main>
  );
}
