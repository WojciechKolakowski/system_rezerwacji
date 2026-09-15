"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@system-rezerwacji/shared";
import { createSessionToken, setSessionCookie } from "@/lib/session";

export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.role !== "ADMIN" || !user.passwordHash) {
    redirect("/login?error=1");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    redirect("/login?error=1");
  }

  const token = await createSessionToken({ userId: user.id, role: user.role, name: user.name });
  await setSessionCookie(token);
  redirect("/");
}
