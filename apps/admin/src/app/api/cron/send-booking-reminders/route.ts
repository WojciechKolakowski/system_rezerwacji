import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sendUpcomingBookingReminders } from "@system-rezerwacji/shared";

/**
 * Docelowo wywoływany co noc przez Vercel Cron (patrz vercel.json) —
 * wysyła przypomnienia dla zleceń zaplanowanych na następny dzień. Ta sama
 * autoryzacja przez CRON_SECRET co
 * /api/cron/generate-recurring-bookings — patrz tamten plik po uzasadnienie.
 */
export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET nie jest skonfigurowany na serwerze." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const result = await sendUpcomingBookingReminders(new Date());
  return NextResponse.json(result);
}
