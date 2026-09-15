import Link from "next/link";
import { register } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  "1": "Wypełnij wszystkie wymagane pola (hasło min. 8 znaków).",
  exists: "Konto z tym adresem e-mail już istnieje — zaloguj się.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Załóż konto</h1>
      <p className="mb-6 text-sm text-gray-500">
        Po rejestracji poprosimy Cię o krótkie zapytanie o rozpoczęcie współpracy — dopiero po
        spotkaniu z naszym zespołem odblokujemy rezerwację online.
      </p>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? "Wystąpił błąd."}
        </p>
      )}

      <form action={register} className="flex flex-col gap-4">
        <Field id="name" name="name" label="Imię i nazwisko" required autoComplete="name" />
        <Field id="email" name="email" label="E-mail" type="email" required autoComplete="email" />
        <Field id="phone" name="phone" label="Telefon" type="tel" autoComplete="tel" />
        <Field
          id="password"
          name="password"
          label="Hasło (min. 8 znaków)"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <button
          type="submit"
          className="mt-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white active:bg-emerald-700"
        >
          Zarejestruj się
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Masz już konto?{" "}
        <Link href="/login" className="text-emerald-700 underline">
          Zaloguj się
        </Link>
      </p>
    </main>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  required,
  minLength,
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
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
        minLength={minLength}
        autoComplete={autoComplete}
        className="rounded-md border border-gray-300 px-3 py-3 text-base focus:border-emerald-500 focus:outline-none"
      />
    </div>
  );
}
