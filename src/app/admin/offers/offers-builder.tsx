"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Service = {
  id: string; source_id: string | null; category: string; name: string; description: string | null;
  price: number | string; unit: string | null; billing: "once" | "monthly"; is_active: boolean;
};

type OfferItem = { source_id?: string | null; name: string; price: number; qty: number; free?: boolean };

type DiscountType = "percent" | "amount" | null;

type Offer = {
  id: string; name: string; headline: string | null; description: string | null; items: OfferItem[];
  subtotal: number | string; discount_type: DiscountType; discount_value: number | string; total: number | string;
  coupon_id: string | null; promotion_code: string | null; share_token: string; is_active: boolean; ai_generated: boolean; shareUrl: string;
};

const btn = "rounded-md border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 disabled:opacity-50";
const field = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900";
const money = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

function totalsFor(items: OfferItem[], discountType: DiscountType, discountValue: number) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const freeValue = items.reduce((sum, item) => (item.free ? sum + item.price * item.qty : sum), 0);
  const paidSubtotal = Math.max(0, subtotal - freeValue);
  const value = Number.isFinite(discountValue) ? Math.max(0, discountValue) : 0;
  const raw = discountType === "percent" ? paidSubtotal * (Math.min(100, value) / 100) : discountType === "amount" ? value : 0;
  const discountAmount = Math.min(paidSubtotal, Math.round(raw * 100) / 100);
  return { subtotal, freeValue, paidSubtotal, discountAmount, total: Math.max(0, paidSubtotal - discountAmount) };
}

export default function OffersBuilder() {
  const [services, setServices] = useState<Service[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<OfferItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [code, setCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);

  const totals = useMemo(() => totalsFor(items, discountType, discountValue), [items, discountType, discountValue]);

  const loadServices = useCallback(async () => {
    const response = await fetch("/api/admin/services");
    const result = await response.json();
    if (response.ok) setServices(result.services ?? []);
    else setMessage(result.error ?? "Could not load services.");
  }, []);

  const loadOffers = useCallback(async () => {
    const response = await fetch("/api/admin/offers");
    const result = await response.json();
    if (response.ok) setOffers(result.offers ?? []);
    else setMessage(result.error ?? "Could not load offers.");
  }, []);

  useEffect(() => {
    fetch("/api/admin/services").then((response) => response.json()).then((result) => setServices(result.services ?? [])).catch(() => setMessage("Could not load services."));
    fetch("/api/admin/offers").then((response) => response.json()).then((result) => setOffers(result.offers ?? [])).catch(() => setMessage("Could not load offers."));
  }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setHeadline("");
    setDescription("");
    setItems([]);
    setDiscountType(null);
    setDiscountValue(0);
    setCode("");
    setAiGenerated(false);
    setAiPrompt("");
  }

  function addService(service: Service) {
    setItems((current) => {
      const index = current.findIndex((item) => item.source_id && item.source_id === service.source_id);
      if (index >= 0) {
        const next = [...current];
        next[index] = { ...next[index], qty: next[index].qty + 1 };
        return next;
      }
      return [...current, { source_id: service.source_id, name: service.name, price: Number(service.price), qty: 1, free: false }];
    });
  }

  function updateItem(index: number, patch: Partial<OfferItem>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function draftWithAi() {
    setBusy("ai");
    setMessage("");
    const response = await fetch("/api/admin/offers/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: aiPrompt }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(result.error ?? "The AI builder failed.");
    const draft = result.draft;
    setName(draft.name ?? "");
    setHeadline(draft.headline ?? "");
    setDescription(draft.description ?? "");
    setItems(draft.items ?? []);
    setDiscountType(draft.discount_type ?? null);
    setDiscountValue(Number(draft.discount_value) || 0);
    setCode(draft.code ?? "");
    setAiGenerated(true);
    setMessage("AI draft ready. Review and edit, then save.");
  }

  async function saveOffer() {
    if (!name.trim()) return setMessage("Add an offer name.");
    if (items.length === 0) return setMessage("Add at least one service.");
    setBusy("save");
    setMessage("");
    const payload = { name, headline, description, items, discount_type: discountType, discount_value: discountValue, code, ai_generated: aiGenerated };
    const response = await fetch(editingId ? `/api/admin/offers/${editingId}` : "/api/admin/offers", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(result.error ?? "Could not save the offer.");
    setMessage(`Saved “${result.offer.name}”. Share link: ${result.offer.shareUrl}`);
    resetForm();
    await loadOffers();
  }

  function editOffer(offer: Offer) {
    setEditingId(offer.id);
    setName(offer.name);
    setHeadline(offer.headline ?? "");
    setDescription(offer.description ?? "");
    setItems(offer.items ?? []);
    setDiscountType(offer.discount_type ?? null);
    setDiscountValue(Number(offer.discount_value) || 0);
    setCode(offer.promotion_code ?? "");
    setAiGenerated(offer.ai_generated);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleActive(offer: Offer) {
    setBusy(offer.id);
    const response = await fetch(`/api/admin/offers/${offer.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_active: !offer.is_active }),
    });
    setBusy("");
    if (response.ok) await loadOffers();
  }

  async function deleteOffer(offer: Offer) {
    if (!window.confirm(`Delete the offer “${offer.name}”? The share link will stop working.`)) return;
    setBusy(offer.id);
    const response = await fetch(`/api/admin/offers/${offer.id}`, { method: "DELETE" });
    setBusy("");
    if (response.ok) await loadOffers();
    else setMessage("Could not delete the offer.");
  }

  const activeServices = services.filter((service) => service.is_active);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Offers &amp; Services</h1>
        <div className="flex gap-2">
          <a href="/admin/deliveries" className={btn}>Deliveries</a>
          <a href="/admin/customers" className={btn}>Customers</a>
        </div>
      </div>
      {message && <p role="status" className="mb-4 break-words rounded-md bg-amber-50 p-3 text-sm text-neutral-800">{message}</p>}

      <section className="mb-10 rounded-lg border border-neutral-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-neutral-900">{editingId ? "Edit offer" : "Build an offer"}</h2>
          {editingId && <button className={btn} onClick={resetForm}>Cancel edit</button>}
        </div>

        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50/60 p-3">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-amber-800">Describe it with AI</label>
          <div className="flex flex-wrap gap-2">
            <input className={`${field} flex-1`} placeholder="e.g. Spring listing launch bundle with a free twilight upgrade" value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} />
            <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-amber-200 disabled:opacity-50" disabled={busy !== ""} onClick={draftWithAi}>
              {busy === "ai" ? "Drafting…" : "Draft with AI"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Offer name<input className={field} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="text-sm">Headline<input className={field} value={headline} onChange={(event) => setHeadline(event.target.value)} /></label>
        </div>
        <label className="mt-3 block text-sm">Description<textarea className={`${field} mt-1`} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} /></label>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Add a service</label>
          <select
            className={field}
            value=""
            onChange={(event) => {
              const service = activeServices.find((item) => item.id === event.target.value);
              if (service) addService(service);
            }}
          >
            <option value="">Select a service…</option>
            {activeServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.category} · {service.name} · ${Number(service.price).toLocaleString()}{service.billing === "monthly" ? "/mo" : ""}
              </option>
            ))}
          </select>
        </div>

        <ul className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li key={`${item.source_id ?? item.name}-${index}`} className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 p-2 text-sm">
              <input className={`${field} flex-1`} value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} />
              <label className="flex items-center gap-1 text-xs text-neutral-600">
                $
                <input
                  className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  type="number"
                  min={0}
                  value={item.price}
                  onChange={(event) => updateItem(index, { price: Number(event.target.value) || 0 })}
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-neutral-600">
                Qty
                <input
                  className="w-14 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  type="number"
                  min={1}
                  value={item.qty}
                  onChange={(event) => updateItem(index, { qty: Math.max(1, Number(event.target.value) || 1) })}
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-neutral-600">
                <input type="checkbox" checked={item.free === true} onChange={(event) => updateItem(index, { free: event.target.checked })} />
                Free bonus
              </label>
              <button className={`${btn} border-red-300 text-red-700`} onClick={() => removeItem(index)}>Remove</button>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-neutral-500">No services added yet.</li>}
        </ul>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Discount
            <select className={`${field} mt-1`} value={discountType ?? "none"} onChange={(event) => setDiscountType(event.target.value === "none" ? null : (event.target.value as "percent" | "amount"))}>
              <option value="none">None</option>
              <option value="percent">Percent off</option>
              <option value="amount">Dollar amount off</option>
            </select>
          </label>
          <label className="text-sm">
            Value
            <input className={`${field} mt-1`} type="number" min={0} value={discountValue} onChange={(event) => setDiscountValue(Number(event.target.value) || 0)} disabled={discountType === null} />
          </label>
          <label className="text-sm">
            Promo code (optional)
            <input className={`${field} mt-1`} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="SPRING25" />
          </label>
        </div>

        <div className="mt-5 rounded-md bg-neutral-50 p-4 text-sm">
          <div className="flex justify-between"><span className="text-neutral-500">List value</span><span className="text-neutral-900">{money(totals.subtotal)}</span></div>
          {totals.freeValue > 0 && <div className="flex justify-between"><span className="text-neutral-500">Free bonuses</span><span className="text-emerald-700">−{money(totals.freeValue)}</span></div>}
          {totals.discountAmount > 0 && <div className="flex justify-between"><span className="text-neutral-500">Discount</span><span className="text-emerald-700">−{money(totals.discountAmount)}</span></div>}
          <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 font-bold text-neutral-900"><span>Offer price</span><span>{totals.total === 0 ? "Free" : money(totals.total)}</span></div>
        </div>

        <div className="mt-4 flex gap-2">
          <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-amber-200 disabled:opacity-50" disabled={busy !== ""} onClick={saveOffer}>
            {busy === "save" ? "Saving…" : editingId ? "Save changes" : "Create offer"}
          </button>
          <button className={btn} onClick={resetForm}>Clear</button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">Saved offers · {offers.length}</h2>
        <ul className="space-y-3">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-900">{offer.name} {offer.ai_generated && <span className="ml-1 text-[10px] uppercase text-amber-700">AI</span>}</p>
                  {offer.headline && <p className="text-sm text-neutral-600">{offer.headline}</p>}
                  <p className="text-xs text-neutral-500">{offer.items.length} item{offer.items.length === 1 ? "" : "s"} · <span className={offer.is_active ? "text-emerald-700" : "text-neutral-400"}>{offer.is_active ? "Active" : "Inactive"}</span>{offer.promotion_code && ` · code ${offer.promotion_code}`}</p>
                </div>
                <p className="text-right font-semibold text-neutral-900">
                  {Number(offer.discount_value) > 0 && <span className="mr-1 text-xs font-normal text-neutral-400 line-through">{money(Number(offer.subtotal))}</span>}
                  {Number(offer.total) === 0 ? "Free" : money(Number(offer.total))}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a className={btn} href={offer.shareUrl} target="_blank" rel="noreferrer">View offer</a>
                <button className={btn} onClick={() => navigator.clipboard.writeText(offer.shareUrl)}>Copy link</button>
                <button className={btn} onClick={() => editOffer(offer)}>Edit</button>
                <button className={btn} disabled={busy !== ""} onClick={() => toggleActive(offer)}>{offer.is_active ? "Deactivate" : "Activate"}</button>
                <button className={`${btn} border-red-300 text-red-700`} disabled={busy !== ""} onClick={() => deleteOffer(offer)}>Delete</button>
              </div>
            </li>
          ))}
          {offers.length === 0 && <li className="text-sm text-neutral-500">No offers yet.</li>}
        </ul>
      </section>

      <ServiceCatalog services={services} onChanged={loadServices} onMessage={setMessage} addService={addService} />
    </main>
  );
}

function ServiceCatalog({ services, onChanged, onMessage, addService }: {
  services: Service[];
  onChanged: () => Promise<void>;
  onMessage: (value: string) => void;
  addService: (service: Service) => void;
}) {
  const [draft, setDraft] = useState({ name: "", price: "", category: "custom", unit: "", billing: "once" as "once" | "monthly" });
  const [busy, setBusy] = useState("");

  async function save(id: string, patch: Record<string, unknown>) {
    setBusy(id);
    const response = await fetch(`/api/admin/services/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    setBusy("");
    if (response.ok) await onChanged();
    else onMessage("Could not update the service.");
  }

  async function archive(id: string, name: string) {
    if (!window.confirm(`Archive “${name}”? It will be hidden but existing offers keep their line items.`)) return;
    setBusy(id);
    const response = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    setBusy("");
    if (response.ok) await onChanged();
    else onMessage("Could not archive the service.");
  }

  async function add() {
    if (!draft.name.trim()) return onMessage("Add a service name.");
    setBusy("new");
    const response = await fetch("/api/admin/services", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    setBusy("");
    if (response.ok) {
      setDraft({ name: "", price: "", category: "custom", unit: "", billing: "once" });
      await onChanged();
    } else onMessage("Could not add the service.");
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">Service catalog · {services.length}</h2>
      <div className="mb-4 grid gap-2 rounded-md bg-neutral-50 p-3 sm:grid-cols-5">
        <input className={field} placeholder="New service name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <input className={field} placeholder="Price" type="number" min={0} value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} />
        <input className={field} placeholder="Unit (per photo…)" value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} />
        <select className={field} value={draft.billing} onChange={(event) => setDraft({ ...draft, billing: event.target.value as "once" | "monthly" })}>
          <option value="once">One-time</option>
          <option value="monthly">Monthly</option>
        </select>
        <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-amber-200 disabled:opacity-50" disabled={busy !== ""} onClick={add}>Add service</button>
      </div>
      <ul className="max-h-96 space-y-1 overflow-y-auto">
        {services.map((service) => (
          <li key={service.id} className={`flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm ${service.is_active ? "border-neutral-200" : "border-neutral-100 opacity-60"}`}>
            <input className={`${field} flex-1`} defaultValue={service.name} onBlur={(event) => event.target.value !== service.name && save(service.id, { name: event.target.value })} />
            <input className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm" type="number" min={0} defaultValue={Number(service.price)} onBlur={(event) => Number(event.target.value) !== Number(service.price) && save(service.id, { price: Number(event.target.value) })} />
            <span className="text-xs text-neutral-400">{service.billing === "monthly" ? "/mo" : "once"}</span>
            <input className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-xs" placeholder="unit" defaultValue={service.unit ?? ""} onBlur={(event) => event.target.value !== (service.unit ?? "") && save(service.id, { unit: event.target.value })} />
            <button className={btn} onClick={() => addService(service)}>+ Offer</button>
            {service.is_active
              ? <button className={`${btn} border-red-300 text-red-700`} disabled={busy !== ""} onClick={() => archive(service.id, service.name)}>Archive</button>
              : <button className={btn} disabled={busy !== ""} onClick={() => save(service.id, { is_active: true })}>Restore</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
