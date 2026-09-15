import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Panel pracownika</h1>
      <p className="mb-6 text-sm text-gray-500">System rezerwacji sprzątania</p>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Nieprawidłowy e-mail lub hasło.
        </p>
      )}

      <form action={login} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-gray-300 px-3 py-3 text-base focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Hasło
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-gray-300 px-3 py-3 text-base focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="mt-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white active:bg-emerald-700"
        >
          Zaloguj się
        </button>
      </form>
    </main>
  );
}
