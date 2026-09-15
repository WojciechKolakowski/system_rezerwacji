"use server";

import { prisma } from "@system-rezerwacji/shared";
import { requireAdmin } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

export async function createServiceType(formData: FormData): Promise<void> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Nazwa jest wymagana.");
  }

  await prisma.serviceType.create({ data: { name } });
  revalidatePath("/service-types");
}

export async function toggleServiceTypeActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const serviceType = await prisma.serviceType.findUniqueOrThrow({ where: { id } });
  await prisma.serviceType.update({ where: { id }, data: { active: !serviceType.active } });
  revalidatePath("/service-types");
}
