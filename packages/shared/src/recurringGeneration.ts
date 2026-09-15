import { prisma } from "./db";
import { NoMatchingPricingRuleError, resolvePrice } from "./pricing";
import { combineDateAndTime, computeAvailableSlots, groupSlotsByStartTime } from "./availability";
import { computeGenerationWindow, generateOccurrenceDates, nextOccurrenceOnOrAfter } from "./recurring";

export interface RecurringGenerationSkip {
  seriesId: string;
  date: string;
  reason: string;
}

export interface RecurringGenerationResult {
  seriesProcessed: number;
  bookingsCreated: number;
  skipped: RecurringGenerationSkip[];
}

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED"] as const;

/**
 * Orkiestracja generowania kolejnych Booking z aktywnych RecurringSeries, w
 * oknie miesięcznym względem `now` (ARCHITEKTURA.md sekcja 5 pkt 10).
 * Idempotentna — bezpieczna do wielokrotnego wywołania (np. co noc z crona):
 * generateOccurrenceDates pomija daty, dla których zlecenie już istnieje.
 *
 * Świadomie impura (dotyka bazy przez współdzielony `prisma`) — to jedna
 * kanoniczna implementacja wywoływana zarówno z ręcznego przycisku w
 * adminie (dopóki nie ma wdrożenia/crona), jak i docelowo z Route Handlera
 * podpiętego pod Vercel Cron.
 */
export async function generateUpcomingRecurringBookings(
  now: Date = new Date()
): Promise<RecurringGenerationResult> {
  const result: RecurringGenerationResult = { seriesProcessed: 0, bookingsCreated: 0, skipped: [] };
  const window = computeGenerationWindow(now);

  const activeSeries = await prisma.recurringSeries.findMany({ where: { status: "ACTIVE" } });

  for (const series of activeSeries) {
    result.seriesProcessed += 1;

    // Kotwica liczona zawsze z createdAt serii — deterministyczna, nie
    // zależy od tego, czy poprzednie wystąpienia zostały anulowane.
    const anchor = nextOccurrenceOnOrAfter(series.createdAt, series.preferredDayOfWeek);

    const existingBookings = await prisma.booking.findMany({
      where: {
        recurringSeriesId: series.id,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      select: { scheduledStart: true },
    });

    const occurrenceDates = generateOccurrenceDates({
      frequency: series.frequency,
      preferredDayOfWeek: series.preferredDayOfWeek,
      anchorDate: anchor,
      windowStart: window.from,
      windowEnd: window.to,
      existingDates: existingBookings.map((b) => b.scheduledStart),
    });

    if (occurrenceDates.length === 0) {
      continue;
    }

    const activeRules = await prisma.pricingRule.findMany({ where: { active: true } });
    let priceInfo;
    try {
      priceInfo = resolvePrice(
        activeRules.map((rule) => ({ ...rule, price: Number(rule.price) })),
        { districtId: series.districtId, serviceTypeId: series.serviceTypeId, sizeM2: series.sizeM2 }
      );
    } catch (error) {
      if (error instanceof NoMatchingPricingRuleError) {
        result.skipped.push({
          seriesId: series.id,
          date: "*",
          reason: "Brak reguły cennika dla dzielnicy/rodzaju usługi/metrażu tej serii.",
        });
        continue;
      }
      throw error;
    }

    for (const date of occurrenceDates) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [weeklyAvailability, exceptions, dayBookings] = await Promise.all([
        prisma.employeeAvailability.findMany({
          where: { districtId: series.districtId, active: true },
        }),
        prisma.availabilityException.findMany({ where: { date: { gte: dayStart, lt: dayEnd } } }),
        prisma.booking.findMany({
          where: {
            status: { in: ["PENDING", "CONFIRMED"] },
            scheduledStart: { gte: dayStart, lt: dayEnd },
          },
          select: { employeeId: true, scheduledStart: true, scheduledEnd: true },
        }),
      ]);

      const slots = computeAvailableSlots({
        date,
        districtId: series.districtId,
        durationMinutes: priceInfo.durationMinutes,
        weeklyAvailability,
        exceptions,
        existingBookings: dayBookings.filter(
          (b): b is typeof b & { employeeId: string } => b.employeeId !== null
        ),
      });
      const grouped = groupSlotsByStartTime(slots);

      const desiredStart = combineDateAndTime(date, series.preferredStartTime);
      const matchingSlot = grouped.find((slot) => slot.start.getTime() === desiredStart.getTime());

      let employeeId: string | null = null;
      if (matchingSlot) {
        if (series.preferredEmployeeId) {
          if (matchingSlot.employeeIds.includes(series.preferredEmployeeId)) {
            employeeId = series.preferredEmployeeId;
          }
        } else {
          employeeId = matchingSlot.employeeIds[0];
        }
      }

      if (!employeeId) {
        result.skipped.push({
          seriesId: series.id,
          date: date.toISOString().slice(0, 10),
          reason: matchingSlot
            ? "Preferowany pracownik niedostępny w tym terminie."
            : "Brak wolnego terminu o preferowanej godzinie tego dnia.",
        });
        continue;
      }

      const scheduledStart = desiredStart;
      const scheduledEnd = new Date(scheduledStart.getTime() + priceInfo.durationMinutes * 60 * 1000);

      await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.create({
          data: {
            clientId: series.clientId,
            employeeId: employeeId!,
            districtId: series.districtId,
            propertyAddressId: series.propertyAddressId,
            serviceTypeId: series.serviceTypeId,
            sizeM2: series.sizeM2,
            scheduledStart,
            scheduledEnd,
            price: priceInfo.price,
            status: "CONFIRMED",
            source: "RECURRING_GENERATED",
            recurringSeriesId: series.id,
          },
        });

        // Jak w standardowej ścieżce klienta: brak jeszcze wybranego
        // dostawcy płatności, więc stub zamiast realnej integracji.
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            clientId: series.clientId,
            provider: "STUB_MANUAL",
            providerPaymentId: `stub_${booking.id}`,
            status: "PAID",
            amount: priceInfo.price,
            type: "BOOKING_PAYMENT",
          },
        });

        const checklistItems = await tx.propertyChecklistItem.findMany({
          where: { propertyAddressId: series.propertyAddressId, active: true },
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
      });

      result.bookingsCreated += 1;
    }
  }

  return result;
}
