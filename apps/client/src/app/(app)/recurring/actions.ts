"use server";

import { prisma, assertCanBookRecurring } from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

// Konwencja czasu-bez-daty w całym systemie to UTC — patrz
// packages/shared/src/availability.ts.
function parseTimeOfDay(value: string): Date {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes));
}

export async function createRecurringSeries(formData: FormData): Promise<void> {
  const { clientProfile } = await requireClientProfile();
  assertCanBookRecurring(clientProfile.status);

  const propertyAddressId = String(formData.get("propertyAddressId") ?? "");
  const serviceTypeId = String(formData.get("serviceTypeId") ?? "");
  const frequency = String(formData.get("frequency") ?? "");
  const preferredDayOfWeek = Number(formData.get("preferredDayOfWeek"));
  const preferredStartTime = String(formData.get("preferredStartTime") ?? "");
  const sizeM2 = Number(formData.get("sizeM2"));

  if (!propertyAddressId || !serviceTypeId || (frequency !== "WEEKLY" && frequency !== "BIWEEKLY")) {
    throw new Error("Wszystkie pola są wymagane.");
  }
  if (!Number.isFinite(preferredDayOfWeek) || preferredDayOfWeek < 0 || preferredDayOfWeek > 6) {
    throw new Error("Nieprawidłowy dzień tygodnia.");
  }
  if (!preferredStartTime) {
    throw new Error("Godzina jest wymagana.");
  }
  if (!Number.isFinite(sizeM2) || sizeM2 <= 0) {
    throw new Error("Nieprawidłowa wielkość nieruchomości.");
  }

  const address = await prisma.propertyAddress.findFirstOrThrow({
    where: { id: propertyAddressId, clientId: clientProfile.id },
  });

  await prisma.recurringSeries.create({
    data: {
      clientId: clientProfile.id,
      propertyAddressId: address.id,
      districtId: address.districtId,
      serviceTypeId,
      frequency,
      preferredDayOfWeek,
      preferredStartTime: parseTimeOfDay(preferredStartTime),
      sizeM2,
      createdBy: "CLIENT",
    },
  });

  revalidatePath("/recurring");
}

export async function cancelRecurringSeries(formData: FormData): Promise<void> {
  const { clientProfile } = await requireClientProfile();

  const id = String(formData.get("id") ?? "");
  await prisma.recurringSeries.updateMany({
    where: { id, clientId: clientProfile.id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/recurring");
}
