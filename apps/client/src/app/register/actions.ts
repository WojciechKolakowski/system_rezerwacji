"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@system-rezerwacji/shared";
import { createSessionToken, setSessionCookie } from "@/lib/session";

export async function register(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !name || password.length < 8) {
    redirect("/register?error=1");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/register?error=exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      phone: phone || null,
      role: "CLIENT",
      passwordHash,
      clientProfile: { create: {} },
    },
  });

  const token = await createSessionToken({ userId: user.id, role: "CLIENT", name: user.name });
  await setSessionCookie(token);
  redirect("/");
}
