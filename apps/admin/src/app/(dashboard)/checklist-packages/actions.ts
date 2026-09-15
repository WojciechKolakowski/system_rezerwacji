"use server";

import { prisma } from "@system-rezerwacji/shared";
import { requireAdmin } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

export async function createPackage(formData: FormData): Promise<void> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");

  if (!name || (type !== "STANDARD" && type !== "ADDITIONAL")) {
    throw new Error("Nazwa i typ paczki są wymagane.");
  }

  await prisma.checklistPackage.create({ data: { name, type } });
  revalidatePath("/checklist-packages");
}

export async function toggleChecklistPackageActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const pkg = await prisma.checklistPackage.findUniqueOrThrow({ where: { id } });
  await prisma.checklistPackage.update({ where: { id }, data: { active: !pkg.active } });
  revalidatePath("/checklist-packages");
}

/**
 * Ustawia daną paczkę jako domyślną paczkę STANDARD (kopiowaną automatycznie
 * do nowej nieruchomości) — dokładnie jedna paczka STANDARD może nią być
 * naraz, więc odznaczamy pozostałe w tej samej transakcji.
 */
export async function setDefaultPackage(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const pkg = await prisma.checklistPackage.findUniqueOrThrow({ where: { id } });
  if (pkg.type !== "STANDARD") {
    throw new Error("Domyślna może być tylko paczka typu STANDARD.");
  }

  await prisma.$transaction([
    prisma.checklistPackage.updateMany({
      where: { type: "STANDARD", isDefault: true },
      data: { isDefault: false },
    }),
    prisma.checklistPackage.update({ where: { id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/checklist-packages");
}

export async function toggleTaskInPackage(formData: FormData): Promise<void> {
  await requireAdmin();

  const packageId = String(formData.get("packageId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");

  const existing = await prisma.checklistPackageItem.findUnique({
    where: { packageId_taskId: { packageId, taskId } },
  });

  if (existing) {
    await prisma.checklistPackageItem.delete({ where: { id: existing.id } });
  } else {
    const count = await prisma.checklistPackageItem.count({ where: { packageId } });
    await prisma.checklistPackageItem.create({ data: { packageId, taskId, sortOrder: count } });
  }

  revalidatePath(`/checklist-packages/${packageId}`);
}
