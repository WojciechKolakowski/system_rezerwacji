import { requireEmployeeProfile } from "@/lib/authGuard";
import { logout } from "./logout-action";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requireEmployeeProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <span className="text-sm font-semibold text-gray-900">Mój dzień</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{session.name}</span>
          <form action={logout}>
            <button type="submit" className="text-xs text-gray-500 underline">
              Wyloguj
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
