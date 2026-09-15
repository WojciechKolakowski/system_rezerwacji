import Link from "next/link";
import { prisma } from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";
import { submitOnboardingRequest } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nowe — czekamy na kontakt z naszej strony",
  MEETING_SCHEDULED: "Spotkanie zaplanowane",
  VISITED: "Po wizycie — czekamy na decyzję",
  APPROVED: "Zatwierdzone",
  REJECTED: "Odrzucone",
};

export default async function OnboardingPage() {
  const { clientProfile } = await requireClientProfile();

  const [addresses, existingRequests] = await Promise.all([
    prisma.propertyAddress.findMany({ where: { clientId: clientProfile.id } }),
    prisma.onboardingRequest.findMany({
      where: { clientId: clientProfile.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hasActiveRequest = existingRequests.some((r) => r.status !== "REJECTED");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold text-gray-900">Zapytanie o rozpoczęcie współpracy</h1>
      <p className="text-sm text-gray-500">
        Zanim będziesz mógł zamówić usługę online, umówimy się na krótkie spotkanie pod Twoim
        adresem. Dopiero po nim odblokujemy standardową rezerwację.
      </p>

      {existingRequests.map((request) => (
        <div key={request.id} className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-900">{STATUS_LABELS[request.status]}</p>
          {request.meetingScheduledAt && (
            <p className="mt-1 text-sm text-gray-500">
              Termin spotkania: {request.meetingScheduledAt.toLocaleString("pl-PL")}
            </p>
          )}
          {request.status === "REJECTED" && request.rejectionReason && (
            <p className="mt-1 text-sm text-red-600">Powód: {request.rejectionReason}</p>
          )}
        </div>
      ))}

      {!hasActiveRequest &&
        (addresses.length === 0 ? (
          <p className="text-sm text-gray-500">
            Najpierw{" "}
            <Link href="/addresses" className="text-emerald-700 underline">
              dodaj adres nieruchomości
            </Link>
            , żeby złożyć zapytanie.
          </p>
        ) : (
          <form action={submitOnboardingRequest} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="propertyAddressId" className="text-sm text-gray-700">
                Adres
              </label>
              <select
                id="propertyAddressId"
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
              <label htmlFor="clientMessage" className="text-sm text-gray-700">
                Wiadomość (opcjonalnie)
              </label>
              <textarea
                id="clientMessage"
                name="clientMessage"
                rows={3}
                className="rounded-md border border-gray-300 px-3 py-2 text-base"
              />
            </div>
            <button
              type="submit"
              className="mt-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white active:bg-emerald-700"
            >
              Wyślij zapytanie
            </button>
          </form>
        ))}
    </div>
  );
}
