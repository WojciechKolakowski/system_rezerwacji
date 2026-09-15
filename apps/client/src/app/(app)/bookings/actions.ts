"use server";

import { prisma } from "@system-rezerwacji/shared";
import { determineCancellationOutcome, computeRefundAmountMinor } from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

export async function cancelBooking(formData: FormData): Promise<void> {
  const { clientProfile } = await requireClientProfile();

  const bookingId = String(formData.get("bookingId") ?? "");
  const booking = await prisma.booking.findFirstOrThrow({
    where: { id: bookingId, clientId: clientProfile.id },
  });

  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new Error("Tego zlecenia nie można już anulować.");
  }

  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const now = new Date();

  const outcome = determineCancellationOutcome({
    bookingCreatedAt: booking.createdAt,
    scheduledStart: booking.scheduledStart,
    now,
    operationalLockWindowHours: settings.operationalLockWindowHours,
    partialRefundPercentage: settings.partialRefundPercentage,
  });

  if (!outcome.selfServiceAllowed) {
    throw new Error(
      "Do rozpoczęcia usługi zostało mniej niż okno operacyjne — samodzielna anulacja online nie jest już możliwa. Skontaktuj się z administratorem."
    );
  }

  const payment = await prisma.payment.findFirst({ where: { bookingId: booking.id } });

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledBy: "CLIENT",
        statutoryWithdrawalEligibleAtCancellation: outcome.statutoryWithdrawalEligible,
      },
    });

    if (payment) {
      const refundAmountMinor = computeRefundAmountMinor(
        Math.round(Number(payment.amount) * 100),
        outcome.refundPercentage
      );
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "REFUNDED",
          refundedAt: now,
          refundPercentage: outcome.refundPercentage,
          refundType: outcome.refundType,
          refundReason: `Anulacja samoobsługowa, zwrot ${(refundAmountMinor / 100).toFixed(2)} zł`,
        },
      });
    }
  });

  revalidatePath("/bookings");
}
