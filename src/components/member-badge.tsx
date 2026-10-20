import type { memberBadge } from "@/lib/customers";

type Badge = NonNullable<Awaited<ReturnType<typeof memberBadge>>>;

const TIER_TONE: Record<string, string> = {
  Silver: "border-neutral-300 bg-neutral-100 text-neutral-700",
  Gold: "border-amber-300 bg-amber-100 text-amber-900",
  Platinum: "border-sky-300 bg-sky-100 text-sky-900",
  "Black Label": "border-neutral-800 bg-neutral-900 text-white",
};

function pct(from: number, nextMin: number) {
  if (nextMin <= 0) return 100;
  return Math.min(100, Math.round((from / nextMin) * 100));
}

/**
 * The Merit Club membership strip shown to a customer on the pages they reach
 * through their emailed link. Deliberately low-key: it thanks them, states the
 * tier and what it is worth, and shows how close the next tier is — which is the
 * nudge that keeps repeat bookings coming. Rendered dark (tour) or light (delivery).
 */
export default function MemberBadge({ badge, tone = "light" }: { badge: Badge; tone?: "light" | "dark" }) {
  const nextLabel = badge.nextTier ?? null;
  const progress = nextLabel ? pct(badge.shootCount, badge.shootCount + badge.toNext) : 100;
  const renews = new Date(badge.renewsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const dark = tone === "dark";
  const shell = dark
    ? "border-white/10 bg-white/5 text-neutral-200"
    : "border-neutral-200 bg-neutral-50 text-neutral-700";
  const heading = dark ? "text-white" : "text-neutral-900";
  const muted = dark ? "text-neutral-400" : "text-neutral-500";
  const track = dark ? "bg-white/10" : "bg-neutral-200";
  const fill = dark ? "bg-amber-400" : "bg-amber-500";

  return (
    <section className={`mx-auto w-full max-w-3xl rounded-xl border p-4 ${shell}`} aria-label="Merit Club membership">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${TIER_TONE[badge.tier] ?? TIER_TONE.Silver}`}>
            Merit Club · {badge.tier}
          </span>
          <span className={`text-sm font-semibold ${heading}`}>
            {badge.percentOff > 0 ? `${badge.percentOff}% off your one-time shoots` : "Member pricing active"}
          </span>
        </div>
        <span className={`text-xs ${muted}`}>Renews {renews}</span>
      </div>

      <p className={`mt-2 text-xs ${muted}`}>{badge.perk}</p>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className={`font-semibold ${heading}`}>
            {badge.shootCount} {badge.shootCount === 1 ? "shoot" : "shoots"} this year
          </span>
          <span className={muted}>
            {nextLabel ? `${badge.toNext} more to ${nextLabel}` : "Top tier — Black Label"}
          </span>
        </div>
        <div className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${track}`} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full ${fill}`} style={{ width: `${progress}%` }} />
        </div>
        <p className={`mt-1 text-[11px] ${muted}`}>
          Your 12-month reward window runs from your first shoot and is re-earned on that anniversary.
        </p>
      </div>
    </section>
  );
}
