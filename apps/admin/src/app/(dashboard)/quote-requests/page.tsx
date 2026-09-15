import { prisma } from "@system-rezerwacji/shared";
import {
  convertQuoteToBooking,
  markInReview,
  rejectQuote,
  setQuote,
} from "./actions";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nowe",
  IN_REVIEW: "W trakcie rozpatrywania",
  QUOTED: "Wycenione",
  CONVERTED: "Skonwertowane",
  REJECTED: "Odrzucone",
};

export default async function QuoteRequestsPage() {
  const [requests, serviceTypes, employees] = await Promise.all([
    prisma.quoteRequest.findMany({
      include: {
        district: true,
        client: { include: { user: true, addresses: true } },
        convertedBooking: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.serviceType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { active: true }, include: { user: true } }),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">
        Zapytania o indywidualną wycenę
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Zgłoszenia dla nieruchomości przekraczających próg standardowej rezerwacji online —
        osobne od zapytań o rozpoczęcie współpracy.
      </p>

      <div className="flex flex-col gap-4">
        {requests.map((request) => (
          <div key={request.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{request.contactName}</p>
                <p className="text-sm text-gray-500">
                  {request.contactEmail} · {request.contactPhone}
                </p>
                <p className="text-sm text-gray-500">
                  {request.district.name} · {request.sizeM2} m²
                </p>
                {request.client ? (
                  <p className="text-xs text-emerald-700">
                    Ma konto: {request.client.user.email}
                  </p>
                ) : (
                  <p className="text-xs text-amber-700">Zgłoszenie bez konta (gość)</p>
                )}
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                {STATUS_LABELS[request.status]}
              </span>
            </div>

            {request.propertyDescription && (
              <p className="mb-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                {request.propertyDescription}
              </p>
            )}

            {request.quotedPrice !== null && (
              <p className="mb-3 text-sm text-gray-700">
                Wyceniona cena: <strong>{Number(request.quotedPrice).toFixed(2)} zł</strong>
              </p>
            )}

            {request.status === "CONVERTED" && request.convertedBooking && (
              <p className="mb-3 text-sm text-emerald-700">
                Przekształcone w zlecenie na{" "}
                {request.convertedBooking.scheduledStart.toLocaleString("pl-PL")}.
              </p>
            )}

            {request.status === "NEW" && (
              <div className="flex gap-3">
                <form action={markInReview}>
                  <input type="hidden" name="id" value={request.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Rozpocznij rozpatrywanie
                  </button>
                </form>
                <RejectForm id={request.id} />
              </div>
            )}

            {request.status === "IN_REVIEW" && (
              <form action={setQuote} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={request.id} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Wyceniona cena (zł)</label>
                  <input
                    type="number"
                    name="quotedPrice"
                    min={0}
                    step="0.01"
                    required
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Zapisz wycenę
                </button>
                <RejectForm id={request.id} />
              </form>
            )}

            {request.status === "QUOTED" && (
              <>
                {!request.clientId ? (
                  <p className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                    To zgłoszenie nie ma konta klienta — skontaktuj się z osobą ręcznie i, jeśli
                    potrzeba, załóż jej konto osobno (panel Pracownicy działa analogicznie dla
                    klientów przez zaproszenie), zanim skonwertujesz to zapytanie.
                  </p>
                ) : request.client!.addresses.length === 0 ? (
                  <p className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                    Klient nie ma jeszcze zapisanego adresu — poproś, żeby dodał go w swoim
                    koncie, zanim skonwertujesz to zapytanie.
                  </p>
                ) : (
                  <form action={convertQuoteToBooking} className="grid grid-cols-2 gap-3">
                    <input type="hidden" name="id" value={request.id} />
                    <input
                      type="hidden"
                      name="price"
                      value={request.quotedPrice ? Number(request.quotedPrice) : 0}
                    />
                    <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                      <label className="text-xs text-gray-600">Adres klienta</label>
                      <select
                        name="propertyAddressId"
                        required
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        {request.client!.addresses.map((address) => (
                          <option key={address.id} value={address.id}>
                            {address.label} — {address.street} {address.buildingNo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                      <label className="text-xs text-gray-600">Rodzaj usługi</label>
                      <select
                        name="serviceTypeId"
                        required
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        {serviceTypes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                      <label className="text-xs text-gray-600">Pracownik / ekipa</label>
                      <select
                        name="employeeId"
                        required
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-600">Termin</label>
                      <input
                        type="datetime-local"
                        name="scheduledStart"
                        required
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-600">Czas trwania (min)</label>
                      <input
                        type="number"
                        name="durationMinutes"
                        min={1}
                        required
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="col-span-2 mt-2 self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Utwórz zlecenie
                    </button>
                  </form>
                )}
                <div className="mt-2">
                  <RejectForm id={request.id} />
                </div>
              </>
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
    <form action={rejectQuote}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Odrzuć
      </button>
    </form>
  );
}
