import { redirect } from "next/navigation";
import { prisma } from "@system-rezerwacji/shared";
import { getSession, type SessionPayload } from "./session";

/**
 * Wymaga zalogowanego klienta — użyć na początku każdej chronionej strony
 * ORAZ na początku każdej mutującej Server Action (proxy chroni routing, ale
 * zgodnie z zaleceniem Next.js nie polegamy wyłącznie na nim).
 */
export async function requireClient(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") {
    redirect("/login");
  }
  return session;
}

/** Zwraca ClientProfile zalogowanego użytkownika (tworzy sesję+profil są rozdzielone, ale zawsze powinny współistnieć). */
export async function requireClientProfile() {
  const session = await requireClient();
  const clientProfile = await prisma.clientProfile.findUniqueOrThrow({
    where: { userId: session.userId },
  });
  return { session, clientProfile };
}
