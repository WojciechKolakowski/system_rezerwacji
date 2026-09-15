import Link from "next/link";
import { prisma } from "@system-rezerwacji/shared";

export default async function PropertiesPage() {
  const properties = await prisma.propertyAddress.findMany({
    include: {
      client: { include: { user: true } },
      district: true,
      _count: { select: { checklistItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Nieruchomości</h1>
      <p className="mb-6 text-sm text-gray-500">
        Wszystkie adresy zgłoszone przez klientów — skonfiguruj checklistę dla każdej z osobna.
      </p>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Klient</th>
              <th className="px-4 py-3">Adres</th>
              <th className="px-4 py-3">Dzielnica</th>
              <th className="px-4 py-3">Pozycje checklisty</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {properties.map((property) => (
              <tr key={property.id}>
                <td className="px-4 py-3">
                  {property.client.user.name}
                  <div className="text-xs text-gray-500">{property.client.user.email}</div>
                </td>
                <td className="px-4 py-3">
                  {property.label} — {property.street} {property.buildingNo}
                </td>
                <td className="px-4 py-3">{property.district.name}</td>
                <td className="px-4 py-3">{property._count.checklistItems}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/properties/${property.id}`} className="text-xs text-emerald-700 underline">
                    Checklista →
                  </Link>
                </td>
              </tr>
            ))}
            {properties.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Brak nieruchomości.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
