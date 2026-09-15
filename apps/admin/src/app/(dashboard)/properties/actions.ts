"use server";

import { prisma } from "@system-rezerwacji/shared";
import { requireAdmin } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

export async function addChecklistTask(formData: FormData): Promise<void> {
  await requireAdmin();

  const propertyAddressId = String(formData.get("propertyAddressId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");

  const task = await prisma.checklistTaskCatalog.findUniqueOrThrow({ where: { id: taskId } });
  const count = await prisma.propertyChecklistItem.count({ where: { propertyAddressId } });

  await prisma.propertyChecklistItem.create({
    data: { propertyAddressId, label: task.label, sortOrder: count },
  });

  revalidatePath(`/properties/${propertyAddressId}`);
}

/** Kopiuje wszystkie czynności paczki do checklisty nieruchomości — bez trwałego związku z paczką, patrz ARCHITEKTURA.md. */
export async function applyPackageToProperty(formData: FormData): Promise<void> {
  await requireAdmin();

  const propertyAddressId = String(formData.get("propertyAddressId") ?? "");
  const packageId = String(formData.get("packageId") ?? "");

  const [pkg, existingLabels] = await Promise.all([
    prisma.checklistPackage.findUniqueOrThrow({
      where: { id: packageId },
      include: { items: { include: { task: true } } },
    }),
    prisma.propertyChecklistItem.findMany({
      where: { propertyAddressId },
      select: { label: true },
    }),
  ]);

  const existing = new Set(existingLabels.map((i) => i.label));
  const newLabels = pkg.items.map((item) => item.task.label).filter((label) => !existing.has(label));

  if (newLabels.length > 0) {
    const count = await prisma.propertyChecklistItem.count({ where: { propertyAddressId } });
    await prisma.propertyChecklistItem.createMany({
      data: newLabels.map((label, index) => ({
        propertyAddressId,
        label,
        sortOrder: count + index,
      })),
    });
  }

  revalidatePath(`/properties/${propertyAddressId}`);
}

export async function removeChecklistItem(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const propertyAddressId = String(formData.get("propertyAddressId") ?? "");
  await prisma.propertyChecklistItem.delete({ where: { id } });
  revalidatePath(`/properties/${propertyAddressId}`);
}
