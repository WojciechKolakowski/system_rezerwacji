import { prisma } from "@system-rezerwacji/shared";
import { createPricingRule, togglePricingRuleActive } from "./actions";

export default async function PricingRulesPage() {
  const [rules, districts, serviceTypes] = await Promise.all([
    prisma.pricingRule.findMany({
      include: { district: true, serviceType: true },
      orderBy: [{ district: { name: "asc" } }, { sizeM2From: "asc" }],
    }),
    prisma.district.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.serviceType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const canCreate = districts.length > 0 && serviceTypes.length > 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Cennik</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Dzielnica</th>
              <th className="px-4 py-3">Rodzaj usługi</th>
              <th className="px-4 py-3">Przedział m²</th>
              <th className="px-4 py-3">Cena</th>
              <th className="px-4 py-3">Czas trwania</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="px-4 py-3">{rule.district.name}</td>
                <td className="px-4 py-3">{rule.serviceType.name}</td>
                <td className="px-4 py-3">
                  {rule.sizeM2From}–{rule.sizeM2To} m²
                </td>
                <td className="px-4 py-3">{Number(rule.price).toFixed(2)} zł</td>
                <td className="px-4 py-3">{rule.durationMinutes} min</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      rule.active
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                        : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                    }
                  >
                    {rule.active ? "aktywna" : "nieaktywna"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={togglePricingRuleActive}>
                    <input type="hidden" name="id" value={rule.id} />
                    <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
                      {rule.active ? "Dezaktywuj" : "Aktywuj"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Brak reguł cennika — dodaj pierwszą poniżej.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Dodaj regułę cennika</h2>
        {!canCreate ? (
          <p className="text-sm text-gray-500">
            Najpierw dodaj przynajmniej jedną aktywną dzielnicę i jeden aktywny rodzaj usługi.
          </p>
        ) : (
          <form action={createPricingRule} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <label htmlFor="districtId" className="text-sm text-gray-700">
                Dzielnica
              </label>
              <select
                id="districtId"
                name="districtId"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.city})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <label htmlFor="serviceTypeId" className="text-sm text-gray-700">
                Rodzaj usługi
              </label>
              <select
                id="serviceTypeId"
                name="serviceTypeId"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {serviceTypes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="sizeM2From" className="text-sm text-gray-700">
                m² od
              </label>
              <input
                id="sizeM2From"
                name="sizeM2From"
                type="number"
                min={0}
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="sizeM2To" className="text-sm text-gray-700">
                m² do
              </label>
              <input
                id="sizeM2To"
                name="sizeM2To"
                type="number"
                min={0}
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="price" className="text-sm text-gray-700">
                Cena (zł)
              </label>
              <input
                id="price"
                name="price"
                type="number"
                min={0}
                step="0.01"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="durationMinutes" className="text-sm text-gray-700">
                Czas trwania (min)
              </label>
              <input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={1}
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="col-span-2 mt-2 self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Dodaj
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
