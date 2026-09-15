import Link from "next/link";
import { prisma } from "@system-rezerwacji/shared";
import { revertToStandard, setTrustedRecurring } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  PENDING_VERIFICATION: "Oczekuje na weryfikację",
  STANDARD: "Standardowy",
  TRUSTED_RECURRING: "Zaufany / cykliczny",
};

export default async function ClientsPage() {
  const clients = await prisma.clientProfile.findMany({
    include: { user: true, _count: { select: { addresses: true, bookings: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Klienci</h1>
      <p className="mb-6 text-sm text-gray-500">
        Status &bdquo;zaufany / cykliczny&rdquo; odblokowuje klientowi rezerwacje cykliczne —
        wymaga wcześniejszego statusu &bdquo;standardowy&rdquo;.
      </p>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Klient</th>
              <th className="px-4 py-3">Adresy</th>
              <th className="px-4 py-3">Zlecenia</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="px-4 py-3">
                  {client.user.name}
                  <div className="text-xs text-gray-500">{client.user.email}</div>
                </td>
                <td className="px-4 py-3">{client._count.addresses}</td>
                <td className="px-4 py-3">{client._count.bookings}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {STATUS_LABELS[client.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {client.status === "STANDARD" && (
                    <form action={setTrustedRecurring}>
                      <input type="hidden" name="id" value={client.id} />
                      <button type="submit" className="text-xs text-blue-600 hover:text-blue-800">
                        Nadaj status cykliczny
                      </button>
                    </form>
                  )}
                  {client.status === "TRUSTED_RECURRING" && (
                    <form action={revertToStandard}>
                      <input type="hidden" name="id" value={client.id} />
                      <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
                        Cofnij do standardowego
                      </button>
                    </form>
                  )}
                  {client.status === "PENDING_VERIFICATION" && (
                    <Link href="/onboarding-requests" className="text-xs text-emerald-700 underline">
                      Zapytania →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Brak klientów.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
