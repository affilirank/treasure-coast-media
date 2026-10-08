"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CalendarConfig, Reservation } from "@/lib/calendar";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

export default function CalendarEditor() {
  const [config, setConfig] = useState<CalendarConfig | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("09:00");

  useEffect(() => {
    fetch("/api/admin/calendar")
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!ok) return setMessage(result.error ?? "Could not load the calendar.");
        setConfig(result.config);
        setReservations(result.reservations);
      })
      .catch(() => setMessage("Could not load the calendar."));
  }, []);

  if (!config) return <div className="admin-calendar"><h1>Booking calendar</h1><p>{message || "Loading…"}</p></div>;

  const update = (patch: Partial<CalendarConfig>) => setConfig({ ...config, ...patch });
  const updateDay = (index: number, patch: Partial<CalendarConfig["weekly"][number]>) =>
    update({ weekly: config.weekly.map((day, dayIndex) => (dayIndex === index ? { ...day, ...patch } : day)) });

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/calendar", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ config }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setConfig(result.config);
      setMessage("Saved. The live booking calendar is updated.");
    } catch {
      setMessage("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function release(referenceId: string) {
    if (!window.confirm("Release this slot so it can be booked again? The customer's booking record is not deleted.")) return;
    const response = await fetch(`/api/admin/calendar?referenceId=${referenceId}`, { method: "DELETE" });
    const result = await response.json();
    if (response.ok) setReservations(result.reservations);
    else setMessage(result.error ?? "Could not release the slot.");
  }

  return (
    <div className="admin-calendar">
      <div className="admin-row" style={{ justifyContent: "space-between" }}>
        <h1>Booking calendar</h1>
        <Link href="/admin/deliveries">← Deliveries</Link>
      </div>
      <p>Customers pick from the open slots below on the website. Times are Eastern. Changes apply to the live site as soon as you save.</p>

      <section>
        <h2>Weekly hours</h2>
        {config.weekly.map((day, index) => (
          <div className="admin-row" key={DAY_NAMES[index]}>
            <strong>{DAY_NAMES[index]}</strong>
            <label><input type="checkbox" checked={day.enabled} onChange={(event) => updateDay(index, { enabled: event.target.checked })} /> Open</label>
            <input type="time" value={day.start} disabled={!day.enabled} onChange={(event) => updateDay(index, { start: event.target.value })} />
            <span>to</span>
            <input type="time" value={day.end} disabled={!day.enabled} onChange={(event) => updateDay(index, { end: event.target.value })} />
          </div>
        ))}
      </section>

      <section>
        <h2>Booking rules</h2>
        <div className="admin-row">
          <label>Shoot window length <select value={config.slotMinutes} onChange={(event) => update({ slotMinutes: Number(event.target.value) })}>
            {[60, 90, 120, 180, 240].map((minutes) => <option key={minutes} value={minutes}>{minutes / 60} hr</option>)}
          </select></label>
          <label>Minimum notice (hours) <input type="number" min={0} max={720} value={config.minLeadHours} onChange={(event) => update({ minLeadHours: Number(event.target.value) })} /></label>
          <label>Book up to (days ahead) <input type="number" min={1} max={365} value={config.maxAdvanceDays} onChange={(event) => update({ maxAdvanceDays: Number(event.target.value) })} /></label>
        </div>
      </section>

      <section>
        <h2>Days off / blocked dates</h2>
        <div className="admin-row">
          <input type="date" value={blockDate} onChange={(event) => setBlockDate(event.target.value)} />
          <button type="button" disabled={!blockDate} onClick={() => { update({ blockedDates: [...new Set([...config.blockedDates, blockDate])].sort() }); setBlockDate(""); }}>Block date</button>
        </div>
        <div className="admin-row">
          {config.blockedDates.length === 0 && <span>No blocked dates.</span>}
          {config.blockedDates.map((date) => <span className="admin-chip" key={date}>{date}<button type="button" aria-label={`Unblock ${date}`} onClick={() => update({ blockedDates: config.blockedDates.filter((item) => item !== date) })}>×</button></span>)}
        </div>
        <h2>Block a single time slot</h2>
        <div className="admin-row">
          <input type="date" value={slotDate} onChange={(event) => setSlotDate(event.target.value)} />
          <input type="time" value={slotTime} onChange={(event) => setSlotTime(event.target.value)} />
          <button type="button" disabled={!slotDate || !slotTime} onClick={() => { update({ blockedSlots: [...config.blockedSlots, { date: slotDate, time: slotTime }] }); setSlotDate(""); }}>Block slot</button>
        </div>
        <div className="admin-row">
          {config.blockedSlots.map((slot, index) => <span className="admin-chip" key={`${slot.date}-${slot.time}-${index}`}>{slot.date} {formatTime(slot.time)}<button type="button" aria-label="Unblock slot" onClick={() => update({ blockedSlots: config.blockedSlots.filter((_, slotIndex) => slotIndex !== index) })}>×</button></span>)}
        </div>
      </section>

      <div className="admin-row">
        <button type="button" className="button-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save calendar"}</button>
        {message && <span className="admin-status" role="status">{message}</span>}
      </div>

      <section>
        <h2>Upcoming reservations</h2>
        {reservations.length === 0 && <p>No upcoming bookings.</p>}
        {reservations.map((item) => (
          <div className="admin-row" key={item.referenceId}>
            <strong style={{ width: "auto" }}>{item.date} · {formatTime(item.time)}</strong>
            <span>{item.name} — {item.address}</span>
            <span className="admin-chip">{item.status === "confirmed" ? "Paid / confirmed" : "Awaiting deposit"}</span>
            <button type="button" onClick={() => release(item.referenceId)}>Release slot</button>
          </div>
        ))}
      </section>
    </div>
  );
}
