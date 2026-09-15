import Link from "next/link";
import { canBookStandard, canBookRecurring } from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";
import { logout } from "./logout-action";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, clientProfile } = await requireClientProfile();
  const canBook = canBookStandard(clientProfile.status);
  const canRecurring = canBookRecurring(clientProfile.status);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/" className="text-sm font-semibold text-gray-900">
          Rezerwacja sprzątania
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{session.name}</span>
          <form action={logout}>
            <button type="submit" className="text-xs text-gray-500 underline">
              Wyloguj
            </button>
          </form>
        </div>
      </header>
      <nav className="flex gap-4 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2 text-sm">
        <Link href="/" className="text-gray-700">
          Pulpit
        </Link>
        <Link href="/addresses" className="text-gray-700">
          Adresy
        </Link>
        {canBook && (
          <>
            <Link href="/book" className="text-gray-700">
              Zamów
            </Link>
            <Link href="/bookings" className="text-gray-700">
              Zlecenia
            </Link>
          </>
        )}
        {canRecurring && (
          <Link href="/recurring" className="text-gray-700">
            Cyklicznie
          </Link>
        )}
        {!canBook && (
          <Link href="/onboarding" className="text-gray-700">
            Zapytanie
          </Link>
        )}
      </nav>
      <main className="flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
