"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Delivery = {
  id: string; created_at: string; property_address: string; agent_name: string; agent_email: string;
  invoice_amount: number | string; is_paid: boolean; reminder_count: number; last_reminder_at: string | null;
  links: { delivery: string; mls: string; showcase: string };
};

const btn = "rounded-md border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 disabled:opacity-50";

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

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Deliveries</h1>
        <Link href="/admin/deliveries/new" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-amber-200">+ New Delivery</Link>
      </div>
      <p className="mb-4 text-sm text-neutral-600">Unpaid deliveries are reminded automatically 2 days after creation, then every 3 days, up to 3 reminders.</p>
      {message && <p role="status" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-neutral-800">{message}</p>}
      <ul className="space-y-3">
        {rows.map((row) => (
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
                <p className="font-semibold text-neutral-900">${Number(row.invoice_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                <span className={`text-xs font-bold ${row.is_paid ? "text-emerald-700" : "text-amber-700"}`}>{row.is_paid ? "PAID" : "UNPAID"}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className={btn} href={row.links.delivery} target="_blank" rel="noreferrer">Open portal</a>
              <button className={btn} onClick={() => navigator.clipboard.writeText(row.links.delivery)}>Copy link</button>
              {!row.is_paid && (
                <>
                  <button className={btn} disabled={busy !== ""} onClick={() => send(row, "request")}>Resend payment request</button>
                  <button className={btn} disabled={busy !== ""} onClick={() => send(row, "reminder")}>Send reminder</button>
                </>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-neutral-500">No deliveries yet.</li>}
      </ul>
    </main>
  );
}
