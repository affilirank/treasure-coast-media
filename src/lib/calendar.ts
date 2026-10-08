import { getPrivateJson, putPrivateJson } from "@/lib/private-blob";

export type DayHours = { enabled: boolean; start: string; end: string };

export type CalendarConfig = {
  timezone: string;
  slotMinutes: number;
  minLeadHours: number;
  maxAdvanceDays: number;
  holdMinutes: number;
  weekly: DayHours[];
  blockedDates: string[];
  blockedSlots: { date: string; time: string }[];
};

export type Reservation = {
  referenceId: string;
  date: string;
  time: string;
  name: string;
  address: string;
  status: "hold" | "confirmed";
  createdAt: string;
  holdUntil: string | null;
};

export const defaultCalendarConfig: CalendarConfig = {
  timezone: "America/New_York",
  slotMinutes: 120,
  minLeadHours: 24,
  maxAdvanceDays: 60,
  holdMinutes: 35,
  // Index 0 is Sunday.
  weekly: [
    { enabled: false, start: "09:00", end: "17:00" },
    ...Array.from({ length: 6 }, () => ({ enabled: true, start: "09:00", end: "17:00" })),
  ],
  blockedDates: [],
  blockedSlots: [],
};

const CONFIG_PATH = "calendar/config.json";
const RESERVATIONS_PATH = "calendar/reservations.json";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isDateString = (value: unknown): value is string =>
  typeof value === "string" && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
export const isTimeString = (value: unknown): value is string => typeof value === "string" && TIME_PATTERN.test(value);

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function normalizeConfig(input: unknown): CalendarConfig {
  const source = (typeof input === "object" && input !== null ? input : {}) as Partial<CalendarConfig>;
  const base = defaultCalendarConfig;
  const int = (value: unknown, fallback: number, min: number, max: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
  const weekly = base.weekly.map((fallback, index) => {
    const day = Array.isArray(source.weekly) ? source.weekly[index] : undefined;
    if (!day || typeof day !== "object") return fallback;
    const start = isTimeString(day.start) ? day.start : fallback.start;
    const end = isTimeString(day.end) ? day.end : fallback.end;
    return { enabled: Boolean(day.enabled), start, end };
  });
  return {
    timezone: base.timezone,
    slotMinutes: int(source.slotMinutes, base.slotMinutes, 30, 480),
    minLeadHours: int(source.minLeadHours, base.minLeadHours, 0, 720),
    maxAdvanceDays: int(source.maxAdvanceDays, base.maxAdvanceDays, 1, 365),
    holdMinutes: base.holdMinutes,
    weekly,
    blockedDates: Array.isArray(source.blockedDates) ? [...new Set(source.blockedDates.filter(isDateString))].sort() : [],
    blockedSlots: Array.isArray(source.blockedSlots)
      ? source.blockedSlots.filter((slot) => slot && isDateString(slot.date) && isTimeString(slot.time)).map((slot) => ({ date: slot.date, time: slot.time }))
      : [],
  };
}

export async function loadCalendarConfig() {
  return normalizeConfig(await getPrivateJson<CalendarConfig>(CONFIG_PATH));
}

export async function saveCalendarConfig(config: CalendarConfig) {
  await putPrivateJson(CONFIG_PATH, config);
}

function liveReservations(reservations: Reservation[], now = Date.now()) {
  return reservations.filter((item) => item.status === "confirmed" || (item.holdUntil !== null && Date.parse(item.holdUntil) > now));
}

export async function loadReservations() {
  const stored = await getPrivateJson<Reservation[]>(RESERVATIONS_PATH);
  return Array.isArray(stored) ? stored : [];
}

async function saveReservations(reservations: Reservation[]) {
  await putPrivateJson(RESERVATIONS_PATH, reservations);
}

// "Now" expressed in the studio's local clock as comparable strings.
function localNow(timezone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function daySlots(config: CalendarConfig, date: string) {
  if (config.blockedDates.includes(date)) return [];
  const hours = config.weekly[new Date(`${date}T00:00:00Z`).getUTCDay()];
  if (!hours?.enabled) return [];
  const slots: string[] = [];
  for (let minute = toMinutes(hours.start); minute + config.slotMinutes <= toMinutes(hours.end); minute += config.slotMinutes) {
    slots.push(toTime(minute));
  }
  return slots;
}

function slotIsOpen(config: CalendarConfig, reservations: Reservation[], date: string, time: string) {
  const now = localNow(config.timezone);
  const leadMinutes = config.minLeadHours * 60;
  const dayOffset = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${now.date}T00:00:00Z`)) / 86_400_000);
  if (dayOffset < 0 || dayOffset > config.maxAdvanceDays) return false;
  if (dayOffset * 1440 + toMinutes(time) - now.minutes < leadMinutes) return false;
  if (!daySlots(config, date).includes(time)) return false;
  if (config.blockedSlots.some((slot) => slot.date === date && slot.time === time)) return false;
  return !reservations.some((item) => item.date === date && item.time === time);
}

export async function getAvailability(days?: number) {
  const [config, stored] = await Promise.all([loadCalendarConfig(), loadReservations()]);
  const reservations = liveReservations(stored);
  const start = localNow(config.timezone).date;
  const count = Math.min(days ?? config.maxAdvanceDays, config.maxAdvanceDays) + 1;
  const result = Array.from({ length: count }, (_, index) => {
    const date = addDays(start, index);
    return { date, slots: daySlots(config, date).filter((time) => slotIsOpen(config, reservations, date, time)) };
  });
  return { timezone: config.timezone, slotMinutes: config.slotMinutes, days: result };
}

export async function holdSlot(input: { referenceId: string; date: string; time: string; name: string; address: string }) {
  const [config, stored] = await Promise.all([loadCalendarConfig(), loadReservations()]);
  const reservations = liveReservations(stored);
  if (!slotIsOpen(config, reservations, input.date, input.time)) return false;
  const now = new Date();
  reservations.push({
    ...input,
    status: "hold",
    createdAt: now.toISOString(),
    holdUntil: new Date(now.getTime() + config.holdMinutes * 60_000).toISOString(),
  });
  await saveReservations(reservations);
  return true;
}

export async function confirmSlot(referenceId: string, fallback?: Omit<Reservation, "status" | "createdAt" | "holdUntil">) {
  const reservations = await loadReservations();
  const existing = reservations.find((item) => item.referenceId === referenceId);
  if (existing) {
    existing.status = "confirmed";
    existing.holdUntil = null;
  } else if (fallback) {
    reservations.push({ ...fallback, status: "confirmed", createdAt: new Date().toISOString(), holdUntil: null });
  } else {
    return;
  }
  await saveReservations(liveReservations(reservations));
}

export async function releaseSlot(referenceId: string, onlyHolds = false) {
  const reservations = await loadReservations();
  const remaining = reservations.filter((item) => item.referenceId !== referenceId || (onlyHolds && item.status === "confirmed"));
  if (remaining.length !== reservations.length) await saveReservations(remaining);
}

export async function listUpcomingReservations() {
  const config = await loadCalendarConfig();
  const today = localNow(config.timezone).date;
  return liveReservations(await loadReservations())
    .filter((item) => item.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}
