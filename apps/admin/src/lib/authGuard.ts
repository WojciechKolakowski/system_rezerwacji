import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

/**
 * Wymaga zalogowanego admina — użyć na początku każdej chronionej strony
 * (Server Component) ORAZ na początku każdej mutującej Server Action.
 * Proxy już blokuje niezalogowany dostęp na poziomie routingu, ale zgodnie
 * z zaleceniem Next.js ("zawsze weryfikuj auth wewnątrz Server Function,
 * nie polegaj wyłącznie na proxy") powtarzamy sprawdzenie tutaj.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }
  return session;
}
