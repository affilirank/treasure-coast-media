import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/lib/reminders";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET".
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await sendDueReminders());
  } catch {
    return Response.json({ error: "Reminder run failed." }, { status: 500 });
  }
}
