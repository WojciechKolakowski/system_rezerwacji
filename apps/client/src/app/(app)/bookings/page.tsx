import { prisma } from "@system-rezerwacji/shared";
import { determineCancellationOutcome } from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";
import { cancelBooking, submitReview } from "./actions";

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
      include: { propertyAddress: true, serviceType: true, review: true },
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

            {booking.status === "COMPLETED" && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                {booking.review ? (
                  <div>
                    <p className="text-sm font-semibold text-amber-600">
                      {"★".repeat(booking.review.rating)}
                      {"☆".repeat(5 - booking.review.rating)}
                    </p>
                    {booking.review.comment && (
                      <p className="mt-1 text-sm text-gray-600">{booking.review.comment}</p>
                    )}
                  </div>
                ) : (
                  <form action={submitReview} className="flex flex-col gap-2">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <label className="text-xs text-gray-600">Oceń tę usługę</label>
                    <select name="rating" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                      <option value="5">★★★★★ (5)</option>
                      <option value="4">★★★★☆ (4)</option>
                      <option value="3">★★★☆☆ (3)</option>
                      <option value="2">★★☆☆☆ (2)</option>
                      <option value="1">★☆☆☆☆ (1)</option>
                    </select>
                    <textarea
                      name="comment"
                      rows={2}
                      placeholder="Komentarz (opcjonalnie)"
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white active:bg-emerald-700"
                    >
                      Wyślij ocenę
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
