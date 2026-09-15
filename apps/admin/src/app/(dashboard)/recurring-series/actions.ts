"use server";

import { prisma, generateUpcomingRecurringBookings } from "@system-rezerwacji/shared";
import { requireAdmin } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Konwencja czasu-bez-daty w całym systemie to UTC — patrz
// packages/shared/src/availability.ts i apps/admin/README.md.
function parseTimeOfDay(value: string): Date {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes));
}

export async function createRecurringSeries(formData: FormData): Promise<void> {
  await requireAdmin();

  const propertyAddressId = String(formData.get("propertyAddressId") ?? "");
  const serviceTypeId = String(formData.get("serviceTypeId") ?? "");
  const frequency = String(formData.get("frequency") ?? "");
  const preferredDayOfWeek = Number(formData.get("preferredDayOfWeek"));
  const preferredStartTime = String(formData.get("preferredStartTime") ?? "");
  const sizeM2 = Number(formData.get("sizeM2"));
  const preferredEmployeeId = String(formData.get("preferredEmployeeId") ?? "") || null;

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

  const address = await prisma.propertyAddress.findUniqueOrThrow({
    where: { id: propertyAddressId },
  });

  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: address.clientId } });
  if (client.status !== "TRUSTED_RECURRING") {
    throw new Error(
      "Klient musi mieć status zaufany/cykliczny, zanim admin utworzy mu serię ręcznie."
    );
  }

  await prisma.recurringSeries.create({
    data: {
      clientId: address.clientId,
      propertyAddressId: address.id,
      districtId: address.districtId,
      serviceTypeId,
      frequency,
      preferredDayOfWeek,
      preferredStartTime: parseTimeOfDay(preferredStartTime),
      sizeM2,
      preferredEmployeeId,
      createdBy: "ADMIN",
    },
  });

  revalidatePath("/recurring-series");
}

export async function pauseSeries(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.recurringSeries.update({ where: { id }, data: { status: "PAUSED" } });
  revalidatePath("/recurring-series");
}

export async function resumeSeries(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.recurringSeries.update({ where: { id }, data: { status: "ACTIVE" } });
  revalidatePath("/recurring-series");
}

export async function cancelSeries(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.recurringSeries.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/recurring-series");
}

export async function runGenerationNow(): Promise<void> {
  await requireAdmin();
  const result = await generateUpcomingRecurringBookings(new Date());
  revalidatePath("/recurring-series");

  const params = new URLSearchParams({
    processed: String(result.seriesProcessed),
    created: String(result.bookingsCreated),
    skipped: String(result.skipped.length),
  });
  redirect(`/recurring-series?${params.toString()}`);
}
