import { prisma } from "@system-rezerwacji/shared";
import { createDistrict, toggleDistrictActive } from "./actions";

export default async function DistrictsPage() {
  const districts = await prisma.district.findMany({ orderBy: [{ city: "asc" }, { name: "asc" }] });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Dzielnice</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nazwa</th>
              <th className="px-4 py-3">Miasto</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {districts.map((district) => (
              <tr key={district.id}>
                <td className="px-4 py-3">{district.name}</td>
                <td className="px-4 py-3">{district.city}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      district.active
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                        : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                    }
                  >
                    {district.active ? "aktywna" : "nieaktywna"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={toggleDistrictActive}>
                    <input type="hidden" name="id" value={district.id} />
                    <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
                      {district.active ? "Dezaktywuj" : "Aktywuj"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {districts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Brak dzielnic — dodaj pierwszą poniżej.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Dodaj dzielnicę</h2>
        <form action={createDistrict} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm text-gray-700">
              Nazwa dzielnicy
            </label>
            <input
              id="name"
              name="name"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="city" className="text-sm text-gray-700">
              Miasto
            </label>
            <input
              id="city"
              name="city"
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
