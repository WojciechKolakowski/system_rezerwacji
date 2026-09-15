import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateUpcomingRecurringBookings } from "@system-rezerwacji/shared";

/**
 * Docelowo wywoływany co noc przez Vercel Cron (patrz vercel.json) —
 * generuje kolejne Booking z aktywnych RecurringSeries. Do czasu wdrożenia
 * projektu (patrz ARCHITEKTURA.md) jedyny sposób uruchomienia generowania to
 * ręczny przycisk w /recurring-series, który wywołuje tę samą funkcję
 * bezpośrednio (bez HTTP) — ten endpoint istnieje, żeby funkcja była
 * "gotowa do podłączenia" od razu po wdrożeniu, bez dalszej pracy.
 *
 * Autoryzacja: Vercel Cron wysyła `Authorization: Bearer $CRON_SECRET`
 * automatycznie, jeśli CRON_SECRET jest ustawiony w env — to samo sprawdzamy
 * tutaj, żeby ktoś z zewnątrz nie mógł wywołać generowania na żądanie.
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

  const result = await generateUpcomingRecurringBookings(new Date());
  return NextResponse.json(result);
}
