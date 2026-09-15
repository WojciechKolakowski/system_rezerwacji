import Link from "next/link";
import { prisma, canBookRecurring } from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";
import { cancelRecurringSeries, createRecurringSeries } from "./actions";

const WEEKDAY_LABELS = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
const FREQUENCY_LABELS: Record<string, string> = { WEEKLY: "Co tydzień", BIWEEKLY: "Co dwa tygodnie" };
const STATUS_LABELS: Record<string, string> = { ACTIVE: "Aktywna", PAUSED: "Wstrzymana", CANCELLED: "Anulowana" };

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

export default async function RecurringPage() {
  const { clientProfile } = await requireClientProfile();

  if (!canBookRecurring(clientProfile.status)) {
    return (
      <div className="mx-auto max-w-md">
        <p className="text-sm text-gray-500">
          Rezerwacje cykliczne są dostępne po nadaniu statusu zaufanego klienta przez naszą firmę.
          Skontaktuj się z nami, jeśli jesteś zainteresowany/a stałym sprzątaniem.
        </p>
      </div>
    );
  }

  const [series, addresses, serviceTypes] = await Promise.all([
    prisma.recurringSeries.findMany({
      where: { clientId: clientProfile.id },
      include: { propertyAddress: true, serviceType: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.propertyAddress.findMany({ where: { clientId: clientProfile.id } }),
    prisma.serviceType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold text-gray-900">Sprzątanie cykliczne</h1>

      {series.length > 0 && (
        <ul className="flex flex-col gap-2">
          {series.map((s) => (
            <li key={s.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {FREQUENCY_LABELS[s.frequency]} · {WEEKDAY_LABELS[s.preferredDayOfWeek]},{" "}
                    {formatTime(s.preferredStartTime)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {s.serviceType.name} · {s.propertyAddress.label} · {s.sizeM2} m²
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {STATUS_LABELS[s.status]}
                </span>
              </div>
              {s.status === "ACTIVE" && (
                <form action={cancelRecurringSeries} className="mt-2">
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="text-xs text-red-600 underline">
                    Anuluj serię
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {addresses.length === 0 ? (
        <p className="text-sm text-gray-500">
          Najpierw{" "}
          <Link href="/addresses" className="text-emerald-700 underline">
            dodaj adres nieruchomości
          </Link>
          .
        </p>
      ) : (
        <form action={createRecurringSeries} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Zleć nową serię</h2>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Adres</label>
            <select
              name="propertyAddressId"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-base"
            >
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label} — {address.street} {address.buildingNo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Rodzaj usługi</label>
            <select
              name="serviceTypeId"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-base"
            >
              {serviceTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Wielkość (m²)</label>
            <input
              type="number"
              name="sizeM2"
              min={1}
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Częstotliwość</label>
            <select
              name="frequency"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-base"
            >
              <option value="WEEKLY">Co tydzień</option>
              <option value="BIWEEKLY">Co dwa tygodnie</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Dzień tygodnia</label>
            <select
              name="preferredDayOfWeek"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-base"
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <option key={index} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Preferowana godzina</label>
            <input
              type="time"
              name="preferredStartTime"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white active:bg-emerald-700"
          >
            Zleć serię
          </button>
        </form>
      )}
    </div>
  );
}
