"use server";

import { prisma } from "@system-rezerwacji/shared";
import { requireAdmin } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

export async function createPricingRule(formData: FormData): Promise<void> {
  await requireAdmin();

  const districtId = String(formData.get("districtId") ?? "");
  const serviceTypeId = String(formData.get("serviceTypeId") ?? "");
  const sizeM2From = Number(formData.get("sizeM2From"));
  const sizeM2To = Number(formData.get("sizeM2To"));
  const price = Number(formData.get("price"));
  const durationMinutes = Number(formData.get("durationMinutes"));

  if (!districtId || !serviceTypeId) {
    throw new Error("Dzielnica i rodzaj usługi są wymagane.");
  }
  if (!Number.isFinite(sizeM2From) || !Number.isFinite(sizeM2To) || sizeM2From > sizeM2To) {
    throw new Error("Nieprawidłowy przedział m².");
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Nieprawidłowa cena.");
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Nieprawidłowy czas trwania.");
  }

  await prisma.pricingRule.create({
    data: { districtId, serviceTypeId, sizeM2From, sizeM2To, price, durationMinutes },
  });
  revalidatePath("/pricing-rules");
}

export async function togglePricingRuleActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const rule = await prisma.pricingRule.findUniqueOrThrow({ where: { id } });
  await prisma.pricingRule.update({ where: { id }, data: { active: !rule.active } });
  revalidatePath("/pricing-rules");
}
