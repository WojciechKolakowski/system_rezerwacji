import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@system-rezerwacji/shared";
import { requireEmployeeProfile } from "@/lib/authGuard";
import { completeBooking, markIssue, toggleChecklistItem } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Oczekujące",
  CONFIRMED: "Potwierdzone",
  COMPLETED: "Zrealizowane",
  CANCELLED: "Anulowane",
  ISSUE: "Zgłoszony problem",
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { employee } = await requireEmployeeProfile();
  const { id } = await params;

  const booking = await prisma.booking.findFirst({
    where: { id, employeeId: employee.id },
    include: {
      propertyAddress: true,
      serviceType: true,
      client: { include: { user: true } },
      checklistItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!booking) {
    notFound();
  }

  const canAct = booking.status === "PENDING" || booking.status === "CONFIRMED";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Link href="/" className="text-sm text-emerald-700 underline">
        ← Mój dzień
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-start justify-between">
          <p className="text-sm font-medium text-gray-900">
            {booking.scheduledStart.toLocaleString("pl-PL")}
          </p>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
            {STATUS_LABELS[booking.status]}
          </span>
        </div>
        <p className="text-sm text-gray-700">
          {booking.propertyAddress.street} {booking.propertyAddress.buildingNo}
          {booking.propertyAddress.apartmentNo ? `/${booking.propertyAddress.apartmentNo}` : ""}
        </p>
        <p className="text-sm text-gray-500">
          {booking.propertyAddress.postalCode} {booking.propertyAddress.city}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {booking.serviceType.name} · {booking.sizeM2} m²
        </p>
        <p className="text-sm text-gray-500">
          Klient: {booking.client.user.name}
          {booking.client.user.phone ? ` · ${booking.client.user.phone}` : ""}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Checklista</h2>
        {booking.checklistItems.length === 0 ? (
          <p className="text-sm text-gray-500">Brak pozycji checklisty dla tej nieruchomości.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {booking.checklistItems.map((item) => (
              <li key={item.id}>
                <form action={toggleChecklistItem}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button
                    type="submit"
                    disabled={!canAct}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <span
                      className={
                        item.completed
                          ? "flex h-5 w-5 shrink-0 items-center justify-center rounded border border-emerald-600 bg-emerald-600 text-xs text-white"
                          : "h-5 w-5 shrink-0 rounded border border-gray-300"
                      }
                    >
                      {item.completed ? "✓" : ""}
                    </span>
                    <span className={item.completed ? "text-gray-400 line-through" : "text-gray-900"}>
                      {item.label}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canAct && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Zakończ zlecenie</h2>
          <form action={completeBooking} className="flex flex-col gap-3">
            <input type="hidden" name="bookingId" value={booking.id} />
            <textarea
              name="completionNote"
              rows={2}
              placeholder="Notatka (opcjonalnie)"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white active:bg-emerald-700"
            >
              Potwierdź wykonanie
            </button>
          </form>

          <form action={markIssue} className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3">
            <input type="hidden" name="bookingId" value={booking.id} />
            <textarea
              name="completionNote"
              rows={2}
              required
              placeholder="Opisz problem (wymagane) — np. brak dostępu do mieszkania"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md border border-red-300 px-4 py-3 text-sm font-medium text-red-600 active:bg-red-50"
            >
              Zgłoś problem — usługa niewykonana
            </button>
          </form>
        </div>
      )}

      {booking.completionNote && !canAct && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          Notatka: {booking.completionNote}
        </div>
      )}
    </div>
  );
}
