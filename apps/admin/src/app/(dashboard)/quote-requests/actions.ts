"use server";

import { prisma } from "@system-rezerwacji/shared";
import { requireAdmin } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

export async function markInReview(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const request = await prisma.quoteRequest.findUniqueOrThrow({ where: { id } });
  if (request.status !== "NEW") {
    throw new Error("To zapytanie nie jest już nowe.");
  }

  await prisma.quoteRequest.update({ where: { id }, data: { status: "IN_REVIEW" } });
  revalidatePath("/quote-requests");
}

export async function setQuote(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const quotedPrice = Number(formData.get("quotedPrice"));

  const request = await prisma.quoteRequest.findUniqueOrThrow({ where: { id } });
  if (request.status !== "IN_REVIEW") {
    throw new Error("Wycenę można ustawić tylko dla zapytania w trakcie rozpatrywania.");
  }
  if (!Number.isFinite(quotedPrice) || quotedPrice < 0) {
    throw new Error("Nieprawidłowa cena.");
  }

  await prisma.quoteRequest.update({ where: { id }, data: { status: "QUOTED", quotedPrice } });
  revalidatePath("/quote-requests");
}

export async function rejectQuote(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const request = await prisma.quoteRequest.findUniqueOrThrow({ where: { id } });
  if (request.status === "CONVERTED" || request.status === "REJECTED") {
    throw new Error("To zapytanie zostało już zamknięte.");
  }

  await prisma.quoteRequest.update({ where: { id }, data: { status: "REJECTED" } });
  revalidatePath("/quote-requests");
}

export async function convertQuoteToBooking(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const propertyAddressId = String(formData.get("propertyAddressId") ?? "");
  const serviceTypeId = String(formData.get("serviceTypeId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  const scheduledStartRaw = String(formData.get("scheduledStart") ?? "");
  const durationMinutes = Number(formData.get("durationMinutes"));
  const priceRaw = Number(formData.get("price"));

  const request = await prisma.quoteRequest.findUniqueOrThrow({ where: { id } });
  if (request.status !== "QUOTED") {
    throw new Error("Konwersja jest możliwa tylko dla wycenionego zapytania.");
  }
  if (!request.clientId) {
    throw new Error(
      "To zapytanie zostało złożone bez konta — najpierw skontaktuj się z osobą i, jeśli " +
        "potrzeba, załóż jej konto klienta osobno, zanim skonwertujesz zapytanie na zlecenie."
    );
  }
  if (!propertyAddressId || !serviceTypeId || !employeeId || !scheduledStartRaw) {
    throw new Error("Wszystkie pola są wymagane.");
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Nieprawidłowy czas trwania.");
  }
  if (!Number.isFinite(priceRaw) || priceRaw < 0) {
    throw new Error("Nieprawidłowa cena.");
  }

  const address = await prisma.propertyAddress.findFirstOrThrow({
    where: { id: propertyAddressId, clientId: request.clientId },
  });

  const scheduledStart = new Date(scheduledStartRaw);
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        clientId: request.clientId!,
        employeeId,
        districtId: address.districtId,
        propertyAddressId: address.id,
        serviceTypeId,
        sizeM2: request.sizeM2,
        scheduledStart,
        scheduledEnd,
        price: priceRaw,
        status: "CONFIRMED",
        source: "FROM_QUOTE",
      },
    });

    await tx.payment.create({
      data: {
        bookingId: booking.id,
        clientId: request.clientId!,
        provider: "MANUAL_QUOTE",
        providerPaymentId: `quote_${booking.id}`,
        status: "PENDING",
        amount: priceRaw,
        type: "BOOKING_PAYMENT",
      },
    });

    const checklistItems = await tx.propertyChecklistItem.findMany({
      where: { propertyAddressId: address.id, active: true },
      orderBy: { sortOrder: "asc" },
    });
    if (checklistItems.length > 0) {
      await tx.bookingChecklistItem.createMany({
        data: checklistItems.map((item) => ({
          bookingId: booking.id,
          label: item.label,
          sortOrder: item.sortOrder,
        })),
      });
    }

    await tx.quoteRequest.update({
      where: { id: request.id },
      data: { status: "CONVERTED", convertedBookingId: booking.id },
    });
  });

  revalidatePath("/quote-requests");
}
