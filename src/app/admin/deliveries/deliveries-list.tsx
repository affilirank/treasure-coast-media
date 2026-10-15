"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Delivery = {
  id: string; created_at: string; property_address: string; agent_name: string; agent_email: string;
  invoice_amount: number | string; is_paid: boolean; reminder_count: number; last_reminder_at: string | null;
  discount_amount: number | string | null; promo_code: string | null; is_comp: boolean | null;
  links: { delivery: string; mls: string; showcase: string };
};

const btn = "rounded-md border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 disabled:opacity-50";

function tone(isPaid: boolean) {
  return isPaid ? "text-emerald-700" : "text-amber-700";
}

export default function DeliveriesList() {
  const [rows, setRows] = useState<Delivery[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/deliveries");
    const result = await response.json();
    if (response.ok) setRows(result.deliveries);
    else setMessage(result.error ?? "Could not load deliveries.");
  }, []);

  useEffect(() => {
    fetch("/api/admin/deliveries")
      .then((response) => response.json())
      .then((result) => setRows(result.deliveries ?? []))
      .catch(() => setMessage("Could not load deliveries."));
  }, []);

  async function send(row: Delivery, kind: "request" | "reminder") {
    setBusy(row.id + kind);
    setMessage("");
    const response = await fetch(`/api/admin/deliveries/${row.id}/remind?kind=${kind}`, { method: "POST" });
    const result = await response.json();
    setMessage(response.ok ? `${kind === "request" ? "Payment request" : "Reminder"} sent to ${row.agent_email}.` : result.error ?? "Failed to send.");
    setBusy("");
    await load();
  }

  async function remove(row: Delivery) {
    if (!window.confirm(`Delete the delivery for ${row.property_address}? This removes the listing, its assets, and uploaded files. This cannot be undone.`)) return;
    setBusy(row.id + "delete");
    setMessage("");
    const response = await fetch(`/api/admin/deliveries/${row.id}`, { method: "DELETE" });
    const result = await response.json();
    setMessage(response.ok ? `Deleted delivery for ${row.property_address}.` : result.error ?? "Could not delete.");
    setBusy("");
    await load();
  }

  async function waive(row: Delivery) {
    if (!window.confirm(`Waive payment for ${row.property_address}? This unlocks the delivery for free and is recorded as pro bono (Blessings).`)) return;
    setBusy(row.id + "waive");
    setMessage("");
    const response = await fetch(`/api/admin/deliveries/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "waive" }),
    });
    const result = await response.json();
    setMessage(response.ok ? `Payment waived for ${row.property_address}.` : result.error ?? "Could not waive.");
    setBusy("");
    await load();
  }

  async function applyDiscount(row: Delivery) {
    const input = window.prompt(`Discount amount (in dollars) for ${row.property_address}:`, String(Number(row.discount_amount ?? 0) || ""));
    if (input === null) return;
    const discountAmount = Number(input);
    if (!Number.isFinite(discountAmount) || discountAmount < 0) return setMessage("Enter a valid discount amount.");
    const promoCode = window.prompt("Promo code / reason (optional, e.g. GOODWILL):", row.promo_code ?? "") ?? "";
    const notes = window.prompt("Description shown to the customer in the discount email (optional):", "") ?? "";
    setBusy(row.id + "discount");
    setMessage("");
    const response = await fetch(`/api/admin/deliveries/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "discount", discountAmount, promoCode, notes }),
    });
    const result = await response.json();
    const emailNote = result.email === "sent" ? " The customer was emailed the new price." : result.email === "preview" ? " (Email not configured — not sent.)" : result.email === "failed" ? " (Customer email could not be sent.)" : "";
    setMessage(response.ok ? `Discount of $${discountAmount.toLocaleString()} applied.${emailNote}` : result.error ?? "Could not apply discount.");
    setBusy("");
    await load();
  }

  function rowItem(row: Delivery) {
    const invoice = Number(row.invoice_amount);
    const discount = Number(row.discount_amount ?? 0);
    const due = Math.max(0, invoice - discount);
    return (
      <li key={row.id} className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-neutral-900">{row.property_address}</p>
            <p className="text-sm text-neutral-600">{row.agent_name} · {row.agent_email}</p>
            <p className="text-xs text-neutral-500">
              Created {new Date(row.created_at).toLocaleDateString()}
              {!row.is_paid && ` · ${row.reminder_count} reminder${row.reminder_count === 1 ? "" : "s"} sent`}
              {row.last_reminder_at && ` · last email ${new Date(row.last_reminder_at).toLocaleDateString()}`}
            </p>
          </div>
          <div className="text-right">
            {discount > 0 ? (
              <p className="font-semibold text-neutral-900">
                <span className="mr-1 text-xs font-normal text-neutral-400 line-through">${invoice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                ${due.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            ) : (
              <p className="font-semibold text-neutral-900">${invoice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            )}
            <span className={`text-xs font-bold ${tone(row.is_paid)}`}>{row.is_comp ? "PRO BONO" : row.is_paid ? "PAID" : "UNPAID"}</span>
            {row.promo_code && <p className="text-[10px] uppercase tracking-wide text-neutral-500">{row.promo_code}</p>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className={btn} href={row.links.delivery} target="_blank" rel="noreferrer">Open portal</a>
          <button className={btn} onClick={() => navigator.clipboard.writeText(row.links.delivery)}>Copy link</button>
          {!row.is_paid && (
            <>
              <button className={btn} disabled={busy !== ""} onClick={() => send(row, "request")}>Resend payment request</button>
              <button className={btn} disabled={busy !== ""} onClick={() => send(row, "reminder")}>Send reminder</button>
              <button className={`${btn} border-amber-400 text-amber-800`} disabled={busy !== ""} onClick={() => applyDiscount(row)}>Apply discount</button>
              <button className={`${btn} border-emerald-400 text-emerald-800`} disabled={busy !== ""} onClick={() => waive(row)}>{busy === row.id + "waive" ? "Waiving…" : "Waive (Blessings)"}</button>
            </>
          )}
          <button className={`${btn} border-red-300 text-red-700`} disabled={busy !== ""} onClick={() => remove(row)}>
            {busy === row.id + "delete" ? "Deleting…" : "Delete"}
          </button>
        </div>
      </li>
    );
  }

  const unpaid = rows.filter((row) => !row.is_paid);
  const paid = rows.filter((row) => row.is_paid);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Deliveries</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/calendar" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800">Booking calendar</Link>
          <Link href="/admin/offers" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800">Offers</Link>
          <Link href="/admin/customers" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800">Customers</Link>
          <Link href="/admin/deliveries/new" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-amber-200">+ New Delivery</Link>
        </div>
      </div>
      <p className="mb-4 text-sm text-neutral-600">Unpaid deliveries are reminded automatically 2 days after creation, then every 3 days, up to 3 reminders.</p>
      {message && <p role="status" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-neutral-800">{message}</p>}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-700">Unpaid · {unpaid.length}</h2>
        <ul className="space-y-3">
          {unpaid.map(rowItem)}
          {unpaid.length === 0 && <li className="text-sm text-neutral-500">No unpaid deliveries.</li>}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-emerald-700">Paid · {paid.length}</h2>
        <ul className="space-y-3">
          {paid.map(rowItem)}
          {paid.length === 0 && <li className="text-sm text-neutral-500">No paid deliveries yet.</li>}
        </ul>
      </section>
    </main>
  );
}
