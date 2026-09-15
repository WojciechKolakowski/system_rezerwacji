import { prisma } from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";
import AddressForm from "./AddressForm";

export default async function AddressesPage() {
  const { clientProfile } = await requireClientProfile();

  const [addresses, districts] = await Promise.all([
    prisma.propertyAddress.findMany({
      where: { clientId: clientProfile.id },
      include: { district: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.district.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold text-gray-900">Twoje adresy</h1>

      {addresses.length > 0 && (
        <ul className="flex flex-col gap-2">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-sm font-medium text-gray-900">{address.label}</p>
              <p className="text-sm text-gray-500">
                {address.street} {address.buildingNo}
                {address.apartmentNo ? `/${address.apartmentNo}` : ""}, {address.postalCode}{" "}
                {address.city} · {address.district.name}
              </p>
            </li>
          ))}
        </ul>
      )}

      {districts.length === 0 ? (
        <p className="text-sm text-gray-500">
          Obecnie nie obsługujemy żadnej dzielnicy — skontaktuj się z nami bezpośrednio.
        </p>
      ) : (
        <AddressForm districts={districts} redirectTo="/addresses" />
      )}
    </div>
  );
}
