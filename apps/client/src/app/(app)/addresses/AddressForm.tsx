import { createAddress } from "./actions";

export default function AddressForm({
  districts,
  redirectTo,
}: {
  districts: { id: string; name: string; city: string }[];
  redirectTo: string;
}) {
  return (
    <form action={createAddress} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="flex flex-col gap-1">
        <label htmlFor="label" className="text-sm text-gray-700">
          Etykieta (np. „Mieszkanie”, „Dom rodziców”)
        </label>
        <input
          id="label"
          name="label"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="districtId" className="text-sm text-gray-700">
          Dzielnica
        </label>
        <select
          id="districtId"
          name="districtId"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
        >
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.city})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 flex flex-col gap-1">
          <label htmlFor="street" className="text-sm text-gray-700">
            Ulica
          </label>
          <input
            id="street"
            name="street"
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="buildingNo" className="text-sm text-gray-700">
            Nr
          </label>
          <input
            id="buildingNo"
            name="buildingNo"
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="apartmentNo" className="text-sm text-gray-700">
            Nr lokalu (opcjonalnie)
          </label>
          <input
            id="apartmentNo"
            name="apartmentNo"
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="defaultSizeM2" className="text-sm text-gray-700">
            Metraż (opcjonalnie)
          </label>
          <input
            id="defaultSizeM2"
            name="defaultSizeM2"
            type="number"
            min={1}
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="postalCode" className="text-sm text-gray-700">
            Kod pocztowy
          </label>
          <input
            id="postalCode"
            name="postalCode"
            required
            placeholder="00-000"
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
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
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
      </div>
      <button
        type="submit"
        className="mt-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white active:bg-emerald-700"
      >
        Dodaj adres
      </button>
    </form>
  );
}
