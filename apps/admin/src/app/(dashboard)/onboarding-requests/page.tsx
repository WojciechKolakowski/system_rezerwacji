import { prisma } from "@system-rezerwacji/shared";
import { approveRequest, markVisited, rejectRequest, scheduleMeeting } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nowe",
  MEETING_SCHEDULED: "Spotkanie zaplanowane",
  VISITED: "Po wizycie",
  APPROVED: "Zatwierdzone",
  REJECTED: "Odrzucone",
};

export default async function OnboardingRequestsPage() {
  const requests = await prisma.onboardingRequest.findMany({
    include: {
      client: { include: { user: true } },
      propertyAddress: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Zapytania o rozpoczęcie współpracy</h1>
      <p className="mb-6 text-sm text-gray-500">
        Nowy klient nie może zamówić usługi od razu — dopiero po spotkaniu fizycznym i zatwierdzeniu
        tutaj zyskuje status STANDARD i dostęp do standardowej rezerwacji.
      </p>

      <div className="flex flex-col gap-4">
        {requests.map((request) => (
          <div key={request.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{request.client.user.name}</p>
                <p className="text-sm text-gray-500">{request.client.user.email}</p>
                <p className="text-sm text-gray-500">
                  {request.propertyAddress.street} {request.propertyAddress.buildingNo},{" "}
                  {request.propertyAddress.city}
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                {STATUS_LABELS[request.status]}
              </span>
            </div>

            {request.clientMessage && (
              <p className="mb-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                „{request.clientMessage}”
              </p>
            )}

            {request.meetingScheduledAt && (
              <p className="mb-3 text-sm text-gray-600">
                Termin spotkania: {request.meetingScheduledAt.toLocaleString("pl-PL")}
              </p>
            )}

            {request.visitNotes && (
              <p className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                Notatka z wizyty: {request.visitNotes}
              </p>
            )}

            {request.status === "REJECTED" && request.rejectionReason && (
              <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                Powód odrzucenia: {request.rejectionReason}
              </p>
            )}

            {request.status === "NEW" && (
              <form action={scheduleMeeting} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={request.id} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Termin spotkania</label>
                  <input
                    type="datetime-local"
                    name="meetingScheduledAt"
                    required
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Zaplanuj spotkanie
                </button>
                <RejectForm id={request.id} />
              </form>
            )}

            {request.status === "MEETING_SCHEDULED" && (
              <form action={markVisited} className="flex flex-col gap-3">
                <input type="hidden" name="id" value={request.id} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">
                    Notatka z wizyty (wyposażenie, stan zabrudzenia, szczególne uwarunkowania)
                  </label>
                  <textarea
                    name="visitNotes"
                    rows={3}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Oznacz jako po wizycie
                  </button>
                  <RejectForm id={request.id} />
                </div>
              </form>
            )}

            {request.status === "VISITED" && (
              <div className="flex gap-3">
                <form action={approveRequest}>
                  <input type="hidden" name="id" value={request.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Zatwierdź (status STANDARD)
                  </button>
                </form>
                <RejectForm id={request.id} />
              </div>
            )}
          </div>
        ))}

        {requests.length === 0 && (
          <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-400">
            Brak zapytań.
          </p>
        )}
      </div>
    </div>
  );
}

function RejectForm({ id }: { id: string }) {
  return (
    <form action={rejectRequest} className="flex items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        type="text"
        name="rejectionReason"
        placeholder="Powód odrzucenia (opcjonalnie)"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Odrzuć
      </button>
    </form>
  );
}
