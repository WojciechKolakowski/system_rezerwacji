import { prisma } from "@system-rezerwacji/shared";
import { determineCancellationOutcome } from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";
import { cancelBooking } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Oczekujące",
  CONFIRMED: "Potwierdzone",
  COMPLETED: "Zrealizowane",
  CANCELLED: "Anulowane",
  ISSUE: "Zgłoszony problem",
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { clientProfile } = await requireClientProfile();
  const { confirmed } = await searchParams;

  const [bookings, settings] = await Promise.all([
    prisma.booking.findMany({
      where: { clientId: clientProfile.id },
      include: { propertyAddress: true, serviceType: true },
      orderBy: { scheduledStart: "desc" },
    }),
    prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
  ]);

  const now = new Date();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">Twoje zlecenia</h1>

      {confirmed && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Rezerwacja potwierdzona!
        </div>
      )}

      {bookings.length === 0 && <p className="text-sm text-gray-500">Brak zleceń.</p>}

      {bookings.map((booking) => {
        const canCancel =
          (booking.status === "PENDING" || booking.status === "CONFIRMED") &&
          determineCancellationOutcome({
            bookingCreatedAt: booking.createdAt,
            scheduledStart: booking.scheduledStart,
            now,
            operationalLockWindowHours: settings.operationalLockWindowHours,
            partialRefundPercentage: settings.partialRefundPercentage,
          }).selfServiceAllowed;

        return (
          <div key={booking.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {booking.scheduledStart.toLocaleString("pl-PL")}
                </p>
                <p className="text-sm text-gray-500">
                  {booking.serviceType.name} · {booking.propertyAddress.label} · {booking.sizeM2} m²
                </p>
                <p className="text-sm text-gray-500">{Number(booking.price).toFixed(2)} zł</p>
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                {STATUS_LABELS[booking.status]}
              </span>
            </div>

            {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
              <div className="mt-3">
                {canCancel ? (
                  <form action={cancelBooking}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button type="submit" className="text-sm text-red-600 underline">
                      Anuluj (pełny zwrot)
                    </button>
                  </form>
                ) : (
                  <p className="text-xs text-gray-500">
                    Do rozpoczęcia usługi zostało mniej niż {settings.operationalLockWindowHours}h —
                    samodzielna anulacja online nie jest już możliwa. Aby odwołać usługę, skontaktuj
                    się z administratorem.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
