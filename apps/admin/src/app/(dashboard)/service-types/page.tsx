import { prisma } from "@system-rezerwacji/shared";
import { createServiceType, toggleServiceTypeActive } from "./actions";

export default async function ServiceTypesPage() {
  const serviceTypes = await prisma.serviceType.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Rodzaje usług</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nazwa</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {serviceTypes.map((serviceType) => (
              <tr key={serviceType.id}>
                <td className="px-4 py-3">{serviceType.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      serviceType.active
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                        : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                    }
                  >
                    {serviceType.active ? "aktywny" : "nieaktywny"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={toggleServiceTypeActive}>
                    <input type="hidden" name="id" value={serviceType.id} />
                    <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
                      {serviceType.active ? "Dezaktywuj" : "Aktywuj"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {serviceTypes.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  Brak rodzajów usług — dodaj pierwszy poniżej.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Dodaj rodzaj usługi</h2>
        <form action={createServiceType} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm text-gray-700">
              Nazwa (np. standardowe, generalne/po remoncie)
            </label>
            <input
              id="name"
              name="name"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="mt-2 self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Dodaj
          </button>
        </form>
      </div>
    </div>
  );
}
