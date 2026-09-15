"use server";

import { prisma } from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

export async function submitOnboardingRequest(formData: FormData): Promise<void> {
  const { clientProfile } = await requireClientProfile();

  const propertyAddressId = String(formData.get("propertyAddressId") ?? "");
  const clientMessage = String(formData.get("clientMessage") ?? "").trim();

  if (!propertyAddressId) {
    throw new Error("Wybierz adres.");
  }

  const address = await prisma.propertyAddress.findFirstOrThrow({
    where: { id: propertyAddressId, clientId: clientProfile.id },
  });

  await prisma.onboardingRequest.create({
    data: {
      clientId: clientProfile.id,
      propertyAddressId: address.id,
      clientMessage: clientMessage || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/onboarding");
}
