import Link from "next/link";
import { prisma } from "@system-rezerwacji/shared";
import { requireEmployeeProfile } from "@/lib/authGuard";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Oczekujące",
  CONFIRMED: "Potwierdzone",
  COMPLETED: "Zrealizowane",
  CANCELLED: "Anulowane",
  ISSUE: "Zgłoszony problem",
};

// Konwencja: daty kalendarzowe (bez godziny) zawsze przez metody LOKALNE,
// nigdy UTC. Mieszanie ich (lokalna konstrukcja + UTC przy odczycie przez
// toISOString) potrafi cofnąć/przesunąć dzień o jeden w strefach
// wyprzedzających UTC (np. Polska) — dokładnie ten sam rodzaj błędu co przy
// polach @db.Time, opisany w apps/admin/README.md, tylko odwrotna konwencja
// (tam poprawna jest wyłącznie UTC, bo epoka to 1970-01-01; tu poprawna jest
// wyłącznie lokalna, bo liczy się kalendarzowy "dziś" pracownika).
function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

export default async function MyDayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { employee } = await requireEmployeeProfile();
  const { date } = await searchParams;
  const dateIso = date ?? toIsoDate(new Date());

  const dayStart = new Date(`${dateIso}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const bookings = await prisma.booking.findMany({
    where: {
      employeeId: employee.id,
      scheduledStart: { gte: dayStart, lt: dayEnd },
      status: { in: ["PENDING", "CONFIRMED", "COMPLETED", "ISSUE"] },
    },
    include: { propertyAddress: true, serviceType: true, client: { include: { user: true } } },
    orderBy: { scheduledStart: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/?date=${addDays(dateIso, -1)}`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
        >
          ← Poprzedni
        </Link>
        <p className="text-sm font-medium text-gray-900">
          {dayStart.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <Link
          href={`/?date=${addDays(dateIso, 1)}`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
        >
          Następny →
        </Link>
      </div>

      {bookings.length === 0 && (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          Brak zleceń tego dnia.
        </p>
      )}

      {bookings.map((booking) => (
        <Link
          key={booking.id}
          href={`/bookings/${booking.id}`}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {booking.scheduledStart.toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" – "}
                {booking.scheduledEnd.toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-sm text-gray-700">
                {booking.propertyAddress.street} {booking.propertyAddress.buildingNo}
                {booking.propertyAddress.apartmentNo ? `/${booking.propertyAddress.apartmentNo}` : ""}
                , {booking.propertyAddress.city}
              </p>
              <p className="text-xs text-gray-500">
                {booking.serviceType.name} · {booking.sizeM2} m² · {booking.client.user.name}
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              {STATUS_LABELS[booking.status]}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
