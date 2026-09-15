"use server";

import { prisma } from "@system-rezerwacji/shared";
import { requireAdmin } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

export async function updateSettings(formData: FormData): Promise<void> {
  await requireAdmin();

  const individualQuoteThresholdM2 = Number(formData.get("individualQuoteThresholdM2"));
  const operationalLockWindowHours = Number(formData.get("operationalLockWindowHours"));
  const partialRefundPercentage = Number(formData.get("partialRefundPercentage"));

  if (
    !Number.isFinite(individualQuoteThresholdM2) ||
    !Number.isFinite(operationalLockWindowHours) ||
    !Number.isFinite(partialRefundPercentage) ||
    partialRefundPercentage < 0 ||
    partialRefundPercentage > 100
  ) {
    throw new Error("Nieprawidłowe wartości ustawień.");
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: { individualQuoteThresholdM2, operationalLockWindowHours, partialRefundPercentage },
    create: {
      id: 1,
      individualQuoteThresholdM2,
      operationalLockWindowHours,
      partialRefundPercentage,
    },
  });

  revalidatePath("/settings");
}
