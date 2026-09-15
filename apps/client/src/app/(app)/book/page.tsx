import Link from "next/link";
import { prisma } from "@system-rezerwacji/shared";
import {
  computeAvailableSlots,
  exceedsIndividualQuoteThreshold,
  groupSlotsByStartTime,
  resolvePrice,
  NoMatchingPricingRuleError,
} from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";
import { confirmBooking } from "./actions";

interface SearchParams {
  addressId?: string;
  serviceTypeId?: string;
  sizeM2?: string;
  date?: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { clientProfile } = await requireClientProfile();
  const params = await searchParams;

  const [addresses, serviceTypes, settings] = await Promise.all([
    prisma.propertyAddress.findMany({ where: { clientId: clientProfile.id } }),
    prisma.serviceType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
  ]);

  if (addresses.length === 0) {
    return (
      <div className="mx-auto max-w-md">
        <p className="text-sm text-gray-500">
          Najpierw{" "}
          <Link href="/addresses" className="text-emerald-700 underline">
            dodaj adres nieruchomości
          </Link>
          .
        </p>
      </div>
    );
  }

  const addressId = params.addressId ?? addresses[0].id;
  const serviceTypeId = params.serviceTypeId ?? serviceTypes[0]?.id ?? "";
  const sizeM2 = params.sizeM2 ? Number(params.sizeM2) : undefined;
  const date = params.date ?? todayIso();

  const selectedAddress = addresses.find((a) => a.id === addressId);

  let searchResult:
    | { kind: "oversized" }
    | { kind: "no-rule" }
    | { kind: "slots"; price: number; durationMinutes: number; groups: { start: Date; end: Date; employeeIds: string[] }[] }
    | null = null;

  if (selectedAddress && serviceTypeId && sizeM2 && sizeM2 > 0) {
    if (exceedsIndividualQuoteThreshold(sizeM2, settings.individualQuoteThresholdM2)) {
      searchResult = { kind: "oversized" };
    } else {
      const activeRules = await prisma.pricingRule.findMany({ where: { active: true } });
      try {
        const { price, durationMinutes } = resolvePrice(
          activeRules.map((rule) => ({ ...rule, price: Number(rule.price) })),
          {
            districtId: selectedAddress.districtId,
            serviceTypeId,
            sizeM2,
          }
        );

        const searchDate = new Date(`${date}T00:00:00`);
        const dayEnd = new Date(searchDate);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const [weeklyAvailability, exceptions, existingBookings] = await Promise.all([
          prisma.employeeAvailability.findMany({
            where: { districtId: selectedAddress.districtId, active: true },
          }),
          prisma.availabilityException.findMany({ where: { date: { gte: searchDate, lt: dayEnd } } }),
          prisma.booking.findMany({
            where: {
              status: { in: ["PENDING", "CONFIRMED"] },
              scheduledStart: { gte: searchDate, lt: dayEnd },
            },
            select: { employeeId: true, scheduledStart: true, scheduledEnd: true },
          }),
        ]);

        const slots = computeAvailableSlots({
          date: searchDate,
          districtId: selectedAddress.districtId,
          durationMinutes,
          weeklyAvailability,
          exceptions,
          existingBookings: existingBookings.filter(
            (b): b is typeof b & { employeeId: string } => b.employeeId !== null
          ),
        });

        searchResult = { kind: "slots", price, durationMinutes, groups: groupSlotsByStartTime(slots) };
      } catch (error) {
        if (error instanceof NoMatchingPricingRuleError) {
          searchResult = { kind: "no-rule" };
        } else {
          throw error;
        }
      }
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold text-gray-900">Zamów sprzątanie</h1>

      <form method="GET" className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="addressId" className="text-sm text-gray-700">
            Adres
          </label>
          <select
            id="addressId"
            name="addressId"
            defaultValue={addressId}
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
          >
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} — {a.street} {a.buildingNo}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="serviceTypeId" className="text-sm text-gray-700">
            Rodzaj usługi
          </label>
          <select
            id="serviceTypeId"
            name="serviceTypeId"
            defaultValue={serviceTypeId}
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
          >
            {serviceTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="sizeM2" className="text-sm text-gray-700">
              Wielkość (m²)
            </label>
            <input
              id="sizeM2"
              name="sizeM2"
              type="number"
              min={1}
              required
              defaultValue={params.sizeM2 ?? selectedAddress?.defaultSizeM2 ?? undefined}
              className="rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="date" className="text-sm text-gray-700">
              Data
            </label>
            <input
              id="date"
              name="date"
              type="date"
              min={todayIso()}
              defaultValue={date}
              className="rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white active:bg-emerald-700"
        >
          Szukaj terminów
        </button>
      </form>

      {searchResult?.kind === "oversized" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Ta wielkość nieruchomości przekracza próg standardowej rezerwacji online. Prosimy o{" "}
          <Link href="/quote-request" className="underline">
            zapytanie o indywidualną wycenę
          </Link>
          .
        </div>
      )}

      {searchResult?.kind === "no-rule" && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Brak oferty dla tej kombinacji dzielnicy, rodzaju usługi i metrażu.
        </div>
      )}

      {searchResult?.kind === "slots" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600">
            Cena: <strong>{searchResult.price.toFixed(2)} zł</strong> · czas trwania:{" "}
            {searchResult.durationMinutes} min
          </p>
          {searchResult.groups.length === 0 ? (
            <p className="text-sm text-gray-500">Brak wolnych terminów tego dnia — spróbuj inną datę.</p>
          ) : (
            searchResult.groups.map((group) => (
              <form
                key={group.start.toISOString()}
                action={confirmBooking}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
              >
                <input type="hidden" name="propertyAddressId" value={addressId} />
                <input type="hidden" name="serviceTypeId" value={serviceTypeId} />
                <input type="hidden" name="sizeM2" value={sizeM2} />
                <input type="hidden" name="scheduledStart" value={group.start.toISOString()} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {group.start.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {group.employeeIds.length > 1 ? (
                    <select
                      name="employeeId"
                      className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
                    >
                      {group.employeeIds.map((id) => (
                        <option key={id} value={id}>
                          Pracownik {id.slice(-4)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="hidden" name="employeeId" value={group.employeeIds[0]} />
                  )}
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white active:bg-emerald-700"
                >
                  Zarezerwuj
                </button>
              </form>
            ))
          )}
        </div>
      )}
    </div>
  );
}
