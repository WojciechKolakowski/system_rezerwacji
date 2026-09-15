import Link from "next/link";
import { prisma } from "@system-rezerwacji/shared";
import { canBookStandard } from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";

const STATUS_LABELS: Record<string, string> = {
  PENDING_VERIFICATION: "Oczekuje na weryfikację",
  STANDARD: "Zweryfikowany klient",
  TRUSTED_RECURRING: "Zweryfikowany klient (dostęp do rezerwacji cyklicznych)",
};

export default async function HomePage() {
  const { clientProfile } = await requireClientProfile();
  const canBook = canBookStandard(clientProfile.status);

  const upcomingBookings = canBook
    ? await prisma.booking.findMany({
        where: {
          clientId: clientProfile.id,
          status: { in: ["PENDING", "CONFIRMED"] },
          scheduledStart: { gte: new Date() },
        },
        include: { propertyAddress: true, serviceType: true },
        orderBy: { scheduledStart: "asc" },
        take: 3,
      })
    : [];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs uppercase text-gray-500">Status konta</p>
        <p className="mt-1 font-medium text-gray-900">{STATUS_LABELS[clientProfile.status]}</p>
      </div>

      {!canBook && (
        <Link
          href="/onboarding"
          className="rounded-lg bg-emerald-600 p-4 text-center text-sm font-medium text-white active:bg-emerald-700"
        >
          Złóż zapytanie o rozpoczęcie współpracy →
        </Link>
      )}

      {canBook && (
        <>
          <Link
            href="/book"
            className="rounded-lg bg-emerald-600 p-4 text-center text-sm font-medium text-white active:bg-emerald-700"
          >
            Zamów sprzątanie →
          </Link>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Nadchodzące zlecenia</h2>
              <Link href="/bookings" className="text-xs text-emerald-700 underline">
                Zobacz wszystkie
              </Link>
            </div>
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-gray-500">Brak nadchodzących zleceń.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcomingBookings.map((booking) => (
                  <li key={booking.id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-sm font-medium text-gray-900">
                      {booking.scheduledStart.toLocaleString("pl-PL")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {booking.serviceType.name} · {booking.propertyAddress.label}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
