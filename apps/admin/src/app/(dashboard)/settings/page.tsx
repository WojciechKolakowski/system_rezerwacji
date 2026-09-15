import { prisma } from "@system-rezerwacji/shared";
import { updateSettings } from "./actions";

export default async function SettingsPage() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Ustawienia</h1>

      <div className="max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <form action={updateSettings} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="individualQuoteThresholdM2" className="text-sm font-medium text-gray-700">
              Próg indywidualnej wyceny (m²)
            </label>
            <p className="text-xs text-gray-500">
              Powyżej tej wielkości nieruchomości standardowa rezerwacja online jest niedostępna —
              klient dostaje formularz zapytania o wycenę.
            </p>
            <input
              id="individualQuoteThresholdM2"
              name="individualQuoteThresholdM2"
              type="number"
              min={1}
              defaultValue={settings.individualQuoteThresholdM2}
              required
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="operationalLockWindowHours" className="text-sm font-medium text-gray-700">
              Okno operacyjne anulacji (godziny przed wizytą)
            </label>
            <p className="text-xs text-gray-500">
              Do tylu godzin przed wizytą klient anuluje samoobsługowo, zwrot 100% automatyczny.
            </p>
            <input
              id="operationalLockWindowHours"
              name="operationalLockWindowHours"
              type="number"
              min={1}
              defaultValue={settings.operationalLockWindowHours}
              required
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="partialRefundPercentage" className="text-sm font-medium text-gray-700">
              Procent zwrotu po zamknięciu okna operacyjnego (%)
            </label>
            <p className="text-xs text-gray-500">
              Stosowany tylko, gdy rezerwacja nie podlega już ustawowemu 14-dniowemu prawu
              odstąpienia (to jest stała prawna, nieedytowalna tutaj).
            </p>
            <input
              id="partialRefundPercentage"
              name="partialRefundPercentage"
              type="number"
              min={0}
              max={100}
              defaultValue={settings.partialRefundPercentage}
              required
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="mt-2 self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Zapisz
          </button>
        </form>
      </div>
    </div>
  );
}
