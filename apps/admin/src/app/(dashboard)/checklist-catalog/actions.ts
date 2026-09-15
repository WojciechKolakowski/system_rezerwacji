"use server";

import { prisma } from "@system-rezerwacji/shared";
import { requireAdmin } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

export async function createTask(formData: FormData): Promise<void> {
  await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) {
    throw new Error("Treść czynności jest wymagana.");
  }

  await prisma.checklistTaskCatalog.create({ data: { label } });
  revalidatePath("/checklist-catalog");
}

export async function toggleTaskActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const task = await prisma.checklistTaskCatalog.findUniqueOrThrow({ where: { id } });
  await prisma.checklistTaskCatalog.update({ where: { id }, data: { active: !task.active } });
  revalidatePath("/checklist-catalog");
}
