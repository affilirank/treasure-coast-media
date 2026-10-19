"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CalendarConfig, Reservation } from "@/lib/calendar";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const GRID_DAYS = 21;

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Mirrors the server's slot generation so the grid shows exactly what customers see. */
function daySlotTimes(config: CalendarConfig, date: string) {
  const hours = config.weekly[new Date(`${date}T00:00:00Z`).getUTCDay()];
  if (!hours?.enabled) return [];
  const slots: string[] = [];
  for (let minute = toMinutes(hours.start); minute + config.slotMinutes <= toMinutes(hours.end); minute += config.slotMinutes) {
    slots.push(toTime(minute));
  }
  return slots;
}

export default function CalendarEditor() {
  const [config, setConfig] = useState<CalendarConfig | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

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

  const today = useMemo(
    () => (config ? new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone }).format(new Date()) : ""),
    [config],
  );
  const dates = useMemo(() => (today ? Array.from({ length: GRID_DAYS }, (_, index) => addDays(today, index)) : []), [today]);

  // Default the grid to the first day that actually has slots; a click overrides it.
  const defaultDate = useMemo(
    () => (config ? (dates.find((date) => daySlotTimes(config, date).length > 0 && !config.blockedDates.includes(date)) ?? dates[0] ?? "") : ""),
    [config, dates],
  );
  const activeDate = selectedDate || defaultDate;

  if (!config) return <div className="admin-calendar"><h1>Booking calendar</h1><p>{message || "Loading…"}</p></div>;

  const update = (patch: Partial<CalendarConfig>) => setConfig({ ...config, ...patch });
  const updateDay = (index: number, patch: Partial<CalendarConfig["weekly"][number]>) =>
    update({ weekly: config.weekly.map((day, dayIndex) => (dayIndex === index ? { ...day, ...patch } : day)) });

  const selectedDay = activeDate ? new Date(`${activeDate}T00:00:00Z`).getUTCDay() : 0;
  const selectedSlots = activeDate ? daySlotTimes(config, activeDate) : [];
  const selectedIsBlocked = activeDate ? config.blockedDates.includes(activeDate) : false;
  const selectedIsClosed = selectedSlots.length === 0 && !selectedIsBlocked;
  const bookedAt = (date: string, time: string) => reservations.some((item) => item.date === date && item.time === time);
  const isBlockedSlot = (date: string, time: string) => config.blockedSlots.some((slot) => slot.date === date && slot.time === time);

  const toggleSlot = (date: string, time: string) => {
    if (bookedAt(date, time)) return;
    update({
      blockedSlots: isBlockedSlot(date, time)
        ? config.blockedSlots.filter((slot) => !(slot.date === date && slot.time === time))
        : [...config.blockedSlots, { date, time }],
    });
  };

  const save = async () => {
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
  };

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
      <p>
        Customers pick from the open times below on the website. Each day shows one time per shoot window between your open hours — with the default 2-hour windows a 9–5 day offers four times.
        Times are Eastern. Changes go live when you press <strong>Save calendar</strong>.
      </p>

      <section>
        <h2>Availability grid — tap a time to block it</h2>
        <div className="cal-date-strip" role="group" aria-label="Choose a date">
          {dates.map((date) => {
            const day = new Date(`${date}T00:00:00Z`).getUTCDay();
            const closed = config.weekly[day]?.enabled === false;
            const blocked = config.blockedDates.includes(date);
            const openCount = daySlotTimes(config, date).filter((time) => !bookedAt(date, time) && !isBlockedSlot(date, time)).length;
            return (
              <button
                type="button"
                key={date}
                className={`cal-date${activeDate === date ? " is-selected" : ""}${closed || blocked ? " is-closed" : ""}`}
                aria-pressed={activeDate === date}
                onClick={() => setSelectedDate(date)}
              >
                <span>{DAY_NAMES[day]}</span>
                <strong>{Number(date.slice(8))}</strong>
                <small>{closed ? "Closed" : blocked ? "Blocked" : `${openCount} open`}</small>
              </button>
            );
          })}
        </div>

        {activeDate && (
          <div className="cal-day">
            <h3>{DAY_LABELS[selectedDay]}, {activeDate}</h3>
            {selectedIsBlocked && (
              <p className="cal-closed-note">
                This whole day is blocked off.{" "}
                <button type="button" onClick={() => update({ blockedDates: config.blockedDates.filter((item) => item !== activeDate) })}>Unblock this day</button>
              </p>
            )}
            {selectedIsClosed && !selectedIsBlocked && (
              <p className="cal-closed-note">
                You are closed on {DAY_LABELS[selectedDay]}s — open it up under <strong>Weekly hours</strong> below.
              </p>
            )}
            {selectedSlots.length > 0 && (
              <>
                <div className="cal-slot-grid" role="group" aria-label={`Times on ${activeDate}`}>
                  {selectedSlots.map((time) => {
                    const booked = bookedAt(activeDate, time);
                    const blocked = isBlockedSlot(activeDate, time);
                    return (
                      <button
                        type="button"
                        key={time}
                        disabled={booked}
                        aria-pressed={blocked}
                        title={booked ? "Already booked" : blocked ? "Blocked — tap to reopen" : "Open — tap to block"}
                        className={`cal-slot${blocked ? " is-blocked" : booked ? " is-booked" : ""}`}
                        onClick={() => toggleSlot(activeDate, time)}
                      >
                        {formatTime(time)}
                        <small>{booked ? "Booked" : blocked ? "Blocked" : "Open"}</small>
                      </button>
                    );
                  })}
                </div>
                <p className="cal-legend"><span className="cal-dot is-open" /> Open <span className="cal-dot is-blocked" /> Blocked (tap to reopen) <span className="cal-dot is-booked" /> Booked</p>
              </>
            )}
          </div>
        )}
      </section>

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
            {[30, 45, 60, 90, 120, 180, 240].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`}</option>)}
          </select></label>
          <label>Minimum notice (hours) <input type="number" min={0} max={720} value={config.minLeadHours} onChange={(event) => update({ minLeadHours: Number(event.target.value) })} /></label>
          <label>Book up to (days ahead) <input type="number" min={1} max={365} value={config.maxAdvanceDays} onChange={(event) => update({ maxAdvanceDays: Number(event.target.value) })} /></label>
        </div>
        <p className="cal-hint">Shorter windows &amp; longer days = more slots for clients to grab. Minimum notice keeps last-minute bookings from surprising you.</p>
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
        <h2>Blocked times ({config.blockedSlots.length})</h2>
        <div className="admin-row">
          {config.blockedSlots.length === 0 && <span>No blocked times — tap times in the grid above to block them.</span>}
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
            <span className="admin-chip">{item.status === "confirmed" ? "Confirmed" : "Held"}</span>
            <button type="button" onClick={() => release(item.referenceId)}>Release slot</button>
          </div>
        ))}
      </section>
    </div>
  );
}
