"use server";

import { prisma } from "@system-rezerwacji/shared";
import { requireAdmin } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

export async function createDistrict(formData: FormData): Promise<void> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();

  if (!name || !city) {
    throw new Error("Nazwa i miasto są wymagane.");
  }

  await prisma.district.create({ data: { name, city } });
  revalidatePath("/districts");
}

export async function toggleDistrictActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const district = await prisma.district.findUniqueOrThrow({ where: { id } });
  await prisma.district.update({ where: { id }, data: { active: !district.active } });
  revalidatePath("/districts");
}
