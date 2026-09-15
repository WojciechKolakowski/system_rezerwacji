"use server";

import { prisma } from "@system-rezerwacji/shared";
import { requireEmployeeProfile } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

async function assertOwnedByEmployee(bookingId: string, employeeId: string) {
  const booking = await prisma.booking.findFirstOrThrow({
    where: { id: bookingId, employeeId },
  });
  return booking;
}

export async function toggleChecklistItem(formData: FormData): Promise<void> {
  const { employee } = await requireEmployeeProfile();

  const itemId = String(formData.get("itemId") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "");
  await assertOwnedByEmployee(bookingId, employee.id);

  const item = await prisma.bookingChecklistItem.findFirstOrThrow({
    where: { id: itemId, bookingId },
  });

  await prisma.bookingChecklistItem.update({
    where: { id: item.id },
    data: {
      completed: !item.completed,
      completedAt: !item.completed ? new Date() : null,
    },
  });

  revalidatePath(`/bookings/${bookingId}`);
}

export async function completeBooking(formData: FormData): Promise<void> {
  const { employee } = await requireEmployeeProfile();

  const bookingId = String(formData.get("bookingId") ?? "");
  const completionNote = String(formData.get("completionNote") ?? "").trim();
  const booking = await assertOwnedByEmployee(bookingId, employee.id);

  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new Error("To zlecenie nie może już zostać potwierdzone.");
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completionNote: completionNote || null,
    },
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/");
}

export async function markIssue(formData: FormData): Promise<void> {
  const { employee } = await requireEmployeeProfile();

  const bookingId = String(formData.get("bookingId") ?? "");
  const completionNote = String(formData.get("completionNote") ?? "").trim();
  const booking = await assertOwnedByEmployee(bookingId, employee.id);

  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new Error("To zlecenie nie może już zostać oznaczone jako problem.");
  }
  if (!completionNote) {
    throw new Error("Opisz, na czym polegał problem.");
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "ISSUE",
      completedAt: new Date(),
      completionNote,
    },
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/");
}
