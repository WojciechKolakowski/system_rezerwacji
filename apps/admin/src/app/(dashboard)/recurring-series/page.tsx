import Link from "next/link";
import { prisma } from "@system-rezerwacji/shared";
import {
  cancelSeries,
  createRecurringSeries,
  pauseSeries,
  resumeSeries,
  runGenerationNow,
} from "./actions";

const WEEKDAY_LABELS = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
const FREQUENCY_LABELS: Record<string, string> = { WEEKLY: "Co tydzień", BIWEEKLY: "Co dwa tygodnie" };
const STATUS_LABELS: Record<string, string> = { ACTIVE: "Aktywna", PAUSED: "Wstrzymana", CANCELLED: "Anulowana" };

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

export default async function RecurringSeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ processed?: string; created?: string; skipped?: string }>;
}) {
  const { processed, created, skipped } = await searchParams;

  const [series, trustedAddresses, serviceTypes, employees] = await Promise.all([
    prisma.recurringSeries.findMany({
      include: {
        client: { include: { user: true } },
        propertyAddress: true,
        serviceType: true,
        preferredEmployee: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.propertyAddress.findMany({
      where: { client: { status: "TRUSTED_RECURRING" } },
      include: { client: { include: { user: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.serviceType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { active: true }, include: { user: true } }),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Rezerwacje cykliczne</h1>
      <p className="mb-6 text-sm text-gray-500">
        Serie dostępne wyłącznie dla klientów ze statusem zaufany/cykliczny (patrz{" "}
        <Link href="/clients" className="text-emerald-700 underline">
          Klienci
        </Link>
        ). Kolejne zlecenia generowane są z miesięcznym wyprzedzeniem.
      </p>

      {processed !== undefined && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Przetworzono {processed} serii, utworzono {created} nowych zleceń
          {Number(skipped) > 0 ? `, pominięto ${skipped} (brak dostępności lub cennika)` : ""}.
        </div>
      )}

      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Klient</th>
              <th className="px-4 py-3">Adres</th>
              <th className="px-4 py-3">Częstotliwość</th>
              <th className="px-4 py-3">Termin</th>
              <th className="px-4 py-3">Pracownik</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {series.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  {s.client.user.name}
                  <div className="text-xs text-gray-500">{s.client.user.email}</div>
                </td>
                <td className="px-4 py-3">
                  {s.propertyAddress.label} — {s.propertyAddress.street} {s.propertyAddress.buildingNo}
                </td>
                <td className="px-4 py-3">{FREQUENCY_LABELS[s.frequency]}</td>
                <td className="px-4 py-3">
                  {WEEKDAY_LABELS[s.preferredDayOfWeek]}, {formatTime(s.preferredStartTime)}
                </td>
                <td className="px-4 py-3">
                  {s.preferredEmployee ? s.preferredEmployee.user.name : "dowolny dostępny"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {STATUS_LABELS[s.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {s.status === "ACTIVE" && (
                    <form action={pauseSeries} className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="mr-3 text-xs text-gray-500 hover:text-gray-900">
                        Wstrzymaj
                      </button>
                    </form>
                  )}
                  {s.status === "PAUSED" && (
                    <form action={resumeSeries} className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="mr-3 text-xs text-emerald-700 hover:text-emerald-900">
                        Wznów
                      </button>
                    </form>
                  )}
                  {s.status !== "CANCELLED" && (
                    <form action={cancelSeries} className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                        Anuluj
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {series.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Brak serii cyklicznych.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-8">
        <form action={runGenerationNow}>
          <button
            type="submit"
            className="rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Uruchom generowanie zleceń teraz
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-500">
          Docelowo uruchamiane automatycznie co noc (Vercel Cron) — na razie, przed wdrożeniem,
          wywołuj ręcznie tym przyciskiem, żeby przetestować generowanie.
        </p>
      </div>

      <div className="max-w-xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Utwórz serię ręcznie</h2>
        {trustedAddresses.length === 0 ? (
          <p className="text-sm text-gray-500">
            Brak klientów ze statusem zaufany/cykliczny z zapisanym adresem — nadaj status w{" "}
            <Link href="/clients" className="text-emerald-700 underline">
              Klienci
            </Link>
            .
          </p>
        ) : (
          <form action={createRecurringSeries} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm text-gray-700">Klient / adres</label>
              <select
                name="propertyAddressId"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {trustedAddresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.client.user.name} — {address.label} ({address.street}{" "}
                    {address.buildingNo})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <label className="text-sm text-gray-700">Rodzaj usługi</label>
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
              <label className="text-sm text-gray-700">Wielkość (m²)</label>
              <input
                type="number"
                name="sizeM2"
                min={1}
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Częstotliwość</label>
              <select
                name="frequency"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {WEEKDAY_LABELS.map((label, index) => (
                  <option key={index} value={index}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Godzina</label>
              <input
                type="time"
                name="preferredStartTime"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Preferowany pracownik (opcjonalnie)</label>
              <select
                name="preferredEmployeeId"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Dowolny dostępny</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.user.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="col-span-2 mt-2 self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Utwórz serię
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
