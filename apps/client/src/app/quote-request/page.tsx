import { prisma } from "@system-rezerwacji/shared";
import { submitQuoteRequest } from "./actions";

export default async function QuoteRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  const districts = await prisma.district.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Indywidualna wycena</h1>
      <p className="mb-6 text-sm text-gray-500">
        Dla dużych nieruchomości przygotujemy wycenę indywidualnie — nie wymaga to zakładania
        konta.
      </p>

      {sent && (
        <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Dziękujemy! Odezwiemy się z wyceną najszybciej jak to możliwe.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Wypełnij wszystkie wymagane pola.
        </p>
      )}

      {!sent && (
        <form action={submitQuoteRequest} className="flex flex-col gap-4">
          <Field id="contactName" name="contactName" label="Imię i nazwisko" required />
          <Field id="contactPhone" name="contactPhone" label="Telefon" type="tel" required />
          <Field id="contactEmail" name="contactEmail" label="E-mail" type="email" required />
          <div className="flex flex-col gap-1">
            <label htmlFor="districtId" className="text-sm font-medium text-gray-700">
              Dzielnica
            </label>
            <select
              id="districtId"
              name="districtId"
              required
              className="rounded-md border border-gray-300 px-3 py-3 text-base"
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.city})
                </option>
              ))}
            </select>
          </div>
          <Field id="sizeM2" name="sizeM2" label="Wielkość nieruchomości (m²)" type="number" required />
          <div className="flex flex-col gap-1">
            <label htmlFor="propertyDescription" className="text-sm font-medium text-gray-700">
              Opis nieruchomości (opcjonalnie)
            </label>
            <textarea
              id="propertyDescription"
              name="propertyDescription"
              rows={3}
              className="rounded-md border border-gray-300 px-3 py-3 text-base"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white active:bg-emerald-700"
          >
            Wyślij zapytanie
          </button>
        </form>
      )}
    </main>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  required,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        className="rounded-md border border-gray-300 px-3 py-3 text-base focus:border-emerald-500 focus:outline-none"
      />
    </div>
  );
}
