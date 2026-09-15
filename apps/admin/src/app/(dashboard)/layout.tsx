import Link from "next/link";
import { requireAdmin } from "@/lib/authGuard";
import { logout } from "./logout-action";

const NAV_ITEMS = [
  { href: "/", label: "Pulpit" },
  { href: "/districts", label: "Dzielnice" },
  { href: "/service-types", label: "Rodzaje usług" },
  { href: "/pricing-rules", label: "Cennik" },
  { href: "/employees", label: "Pracownicy" },
  { href: "/properties", label: "Nieruchomości" },
  { href: "/checklist-catalog", label: "Katalog czynności" },
  { href: "/checklist-packages", label: "Paczki czynności" },
  { href: "/onboarding-requests", label: "Zapytania o współpracę" },
  { href: "/quote-requests", label: "Wyceny" },
  { href: "/settings", label: "Ustawienia" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <p className="text-sm font-semibold text-gray-900">Panel administracyjny</p>
          <p className="text-xs text-gray-500">System rezerwacji sprzątania</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-gray-200 p-3">
          <p className="mb-2 truncate px-1 text-xs text-gray-500">{session.name}</p>
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Wyloguj się
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
