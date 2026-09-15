import Link from "next/link";
import { prisma } from "@system-rezerwacji/shared";
import { createPackage, setDefaultPackage, toggleChecklistPackageActive } from "./actions";

const TYPE_LABELS: Record<string, string> = {
  STANDARD: "Standardowa",
  ADDITIONAL: "Dodatkowa",
};

export default async function ChecklistPackagesPage() {
  const packages = await prisma.checklistPackage.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Paczki czynności</h1>
      <p className="mb-6 text-sm text-gray-500">
        Paczka to tylko skrót przy konfigurowaniu checklisty nieruchomości — dodanie jej kopiuje
        czynności do płaskiej listy tej nieruchomości, bez trwałego związku z paczką. Dokładnie
        jedna paczka standardowa może być domyślna dla nowych nieruchomości.
      </p>

      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nazwa</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Czynności</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {packages.map((pkg) => (
              <tr key={pkg.id}>
                <td className="px-4 py-3">
                  <Link href={`/checklist-packages/${pkg.id}`} className="text-emerald-700 underline">
                    {pkg.name}
                  </Link>
                  {pkg.isDefault && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                      domyślna
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{TYPE_LABELS[pkg.type]}</td>
                <td className="px-4 py-3">{pkg._count.items}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      pkg.active
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                        : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                    }
                  >
                    {pkg.active ? "aktywna" : "nieaktywna"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    {pkg.type === "STANDARD" && !pkg.isDefault && (
                      <form action={setDefaultPackage}>
                        <input type="hidden" name="id" value={pkg.id} />
                        <button type="submit" className="text-xs text-blue-600 hover:text-blue-800">
                          Ustaw jako domyślną
                        </button>
                      </form>
                    )}
                    <form action={toggleChecklistPackageActive}>
                      <input type="hidden" name="id" value={pkg.id} />
                      <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
                        {pkg.active ? "Dezaktywuj" : "Aktywuj"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {packages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Brak paczek — dodaj pierwszą poniżej.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Dodaj paczkę</h2>
        <form action={createPackage} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm text-gray-700">
              Nazwa
            </label>
            <input
              id="name"
              name="name"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="type" className="text-sm text-gray-700">
              Typ
            </label>
            <select
              id="type"
              name="type"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="STANDARD">Standardowa</option>
              <option value="ADDITIONAL">Dodatkowa</option>
            </select>
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
