"use server";

import { prisma } from "@system-rezerwacji/shared";
import {
  assertCanBookStandard,
  computeAvailableSlots,
  exceedsIndividualQuoteThreshold,
  groupSlotsByStartTime,
  resolvePrice,
} from "@system-rezerwacji/shared";
import { requireClientProfile } from "@/lib/authGuard";
import { redirect } from "next/navigation";

export async function confirmBooking(formData: FormData): Promise<void> {
  const { clientProfile } = await requireClientProfile();
  assertCanBookStandard(clientProfile.status);

  const propertyAddressId = String(formData.get("propertyAddressId") ?? "");
  const serviceTypeId = String(formData.get("serviceTypeId") ?? "");
  const sizeM2 = Number(formData.get("sizeM2"));
  const scheduledStartIso = String(formData.get("scheduledStart") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");

  if (!propertyAddressId || !serviceTypeId || !scheduledStartIso || !employeeId) {
    throw new Error("Brakuje wymaganych danych rezerwacji.");
  }
  if (!Number.isFinite(sizeM2) || sizeM2 <= 0) {
    throw new Error("Nieprawidłowa wielkość nieruchomości.");
  }

  const address = await prisma.propertyAddress.findFirstOrThrow({
    where: { id: propertyAddressId, clientId: clientProfile.id },
  });

  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if (exceedsIndividualQuoteThreshold(sizeM2, settings.individualQuoteThresholdM2)) {
    throw new Error("Ta wielkość nieruchomości wymaga indywidualnej wyceny.");
  }

  // Cena i czas trwania są ZAWSZE liczone od nowa po stronie serwera — nigdy
  // nie ufamy wartościom przysłanym z formularza (mogłyby zostać podmienione).
  const activeRules = await prisma.pricingRule.findMany({ where: { active: true } });
  const { price, durationMinutes } = resolvePrice(
    activeRules.map((rule) => ({ ...rule, price: Number(rule.price) })),
    {
      districtId: address.districtId,
      serviceTypeId,
      sizeM2,
    }
  );

  const scheduledStart = new Date(scheduledStartIso);
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000);
  const dayStart = new Date(scheduledStart);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // Ponowna weryfikacja dostępności co do sekundy przed zapisem — zapobiega
  // rezerwacji terminu, który w międzyczasie przestał być wolny, oraz próbie
  // podstawienia dowolnego employeeId/godziny wprost w formularzu.
  const [weeklyAvailability, exceptions, existingBookings] = await Promise.all([
    prisma.employeeAvailability.findMany({ where: { districtId: address.districtId, active: true } }),
    prisma.availabilityException.findMany({
      where: { date: { gte: dayStart, lt: dayEnd } },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledStart: { gte: dayStart, lt: dayEnd },
      },
      select: { employeeId: true, scheduledStart: true, scheduledEnd: true },
    }),
  ]);

  const slots = computeAvailableSlots({
    date: scheduledStart,
    districtId: address.districtId,
    durationMinutes,
    weeklyAvailability,
    exceptions,
    existingBookings: existingBookings.filter(
      (b): b is typeof b & { employeeId: string } => b.employeeId !== null
    ),
  });
  const grouped = groupSlotsByStartTime(slots);
  const matchingSlot = grouped.find((slot) => slot.start.getTime() === scheduledStart.getTime());

  if (!matchingSlot || !matchingSlot.employeeIds.includes(employeeId)) {
    throw new Error("Wybrany termin nie jest już dostępny — wróć i wybierz inny.");
  }

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        clientId: clientProfile.id,
        employeeId,
        districtId: address.districtId,
        propertyAddressId: address.id,
        serviceTypeId,
        sizeM2,
        scheduledStart,
        scheduledEnd,
        price,
        status: "CONFIRMED",
        source: "ONLINE_STANDARD",
      },
    });

    // Brak jeszcze wybranego dostawcy płatności (patrz ARCHITEKTURA.md sekcja
    // 5 pkt 11) — do czasu integracji realnego PSP płatność jest oznaczana
    // jako opłacona wprost, żeby nie blokować testowania reszty przepływu.
    await tx.payment.create({
      data: {
        bookingId: created.id,
        clientId: clientProfile.id,
        provider: "STUB_MANUAL",
        providerPaymentId: `stub_${created.id}`,
        status: "PAID",
        amount: price,
        type: "BOOKING_PAYMENT",
      },
    });

    // Checklista jest własnością nieruchomości, nie jednym globalnym
    // szablonem (ARCHITEKTURA.md sekcja 2) — kopiujemy z PropertyChecklistItem
    // tego konkretnego adresu, nie z jakiejkolwiek globalnej tabeli.
    const propertyChecklistItems = await tx.propertyChecklistItem.findMany({
      where: { propertyAddressId: address.id, active: true },
      orderBy: { sortOrder: "asc" },
    });
    if (propertyChecklistItems.length > 0) {
      await tx.bookingChecklistItem.createMany({
        data: propertyChecklistItems.map((item) => ({
          bookingId: created.id,
          label: item.label,
          sortOrder: item.sortOrder,
        })),
      });
    }

    return created;
  });

  redirect(`/bookings?confirmed=${booking.id}`);
}
