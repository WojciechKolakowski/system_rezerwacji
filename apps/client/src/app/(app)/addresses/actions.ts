"use server";

import { prisma } from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createAddress(formData: FormData): Promise<void> {
  const { clientProfile } = await requireClientProfile();

  const label = String(formData.get("label") ?? "").trim();
  const districtId = String(formData.get("districtId") ?? "");
  const street = String(formData.get("street") ?? "").trim();
  const buildingNo = String(formData.get("buildingNo") ?? "").trim();
  const apartmentNo = String(formData.get("apartmentNo") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const defaultSizeM2Raw = formData.get("defaultSizeM2");
  const defaultSizeM2 = defaultSizeM2Raw ? Number(defaultSizeM2Raw) : null;

  if (!label || !districtId || !street || !buildingNo || !postalCode || !city) {
    throw new Error("Wszystkie pola poza numerem lokalu są wymagane.");
  }

  await prisma.propertyAddress.create({
    data: {
      clientId: clientProfile.id,
      label,
      districtId,
      street,
      buildingNo,
      apartmentNo: apartmentNo || null,
      postalCode,
      city,
      defaultSizeM2: defaultSizeM2 && Number.isFinite(defaultSizeM2) ? defaultSizeM2 : null,
    },
  });

  const redirectTo = String(formData.get("redirectTo") ?? "/addresses");
  revalidatePath(redirectTo);
  redirect(redirectTo);
}
