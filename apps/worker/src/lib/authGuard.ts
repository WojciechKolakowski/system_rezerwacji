import { redirect } from "next/navigation";
import { prisma } from "@system-rezerwacji/shared";
import { getSession, type SessionPayload } from "./session";

export async function requireWorker(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    redirect("/login");
  }
  return session;
}

/** Zwraca rekord Employee zalogowanego pracownika. */
export async function requireEmployeeProfile() {
  const session = await requireWorker();
  const employee = await prisma.employee.findUniqueOrThrow({ where: { userId: session.userId } });
  return { session, employee };
}
