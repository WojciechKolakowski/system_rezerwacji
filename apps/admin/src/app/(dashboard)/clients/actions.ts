"use server";

import { prisma } from "@system-rezerwacji/shared";
import { requireAdmin } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

export async function setTrustedRecurring(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id } });

  if (client.status !== "STANDARD") {
    throw new Error("Status cykliczny wymaga wcześniejszego statusu STANDARD.");
  }

  await prisma.clientProfile.update({ where: { id }, data: { status: "TRUSTED_RECURRING" } });
  revalidatePath("/clients");
}

export async function revertToStandard(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id } });

  if (client.status !== "TRUSTED_RECURRING") {
    throw new Error("Tylko klient ze statusem cyklicznym może zostać cofnięty do standardowego.");
  }

  await prisma.clientProfile.update({ where: { id }, data: { status: "STANDARD" } });
  revalidatePath("/clients");
}
