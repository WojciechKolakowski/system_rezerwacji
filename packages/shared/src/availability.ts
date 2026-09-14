export interface WeeklyAvailabilityInput {
  employeeId: string;
  districtId: string;
  dayOfWeek: number;
  /** Tylko godzina/minuta mają znaczenie (Prisma @db.Time). */
  startTime: Date;
  endTime: Date;
  active: boolean;
}

export interface AvailabilityExceptionInput {
  employeeId: string;
  date: Date;
  type: "DAY_OFF" | "CUSTOM_HOURS";
  startTime?: Date | null;
  endTime?: Date | null;
}

export interface ExistingBookingInput {
  employeeId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
}

export interface AvailableSlot {
  employeeId: string;
  start: Date;
  end: Date;
}

export interface GroupedSlot {
  start: Date;
  end: Date;
  employeeIds: string[];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function combineDateAndTime(date: Date, time: Date): Date {
  const result = new Date(date);
  result.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return result;
}

export interface ComputeAvailableSlotsParams {
  date: Date;
  districtId: string;
  durationMinutes: number;
  /** Krok siatki godzin startowych — domyślnie 30 minut. */
  slotIntervalMinutes?: number;
  weeklyAvailability: WeeklyAvailabilityInput[];
  exceptions: AvailabilityExceptionInput[];
  existingBookings: ExistingBookingInput[];
}

/**
 * Wolne okienka dla danego dnia i dzielnicy, per pracownik — na podstawie
 * cyklicznego harmonogramu (EmployeeAvailability), pomniejszone o
 * AvailabilityException (urlop/L4/inne godziny danego dnia) i istniejące
 * zlecenia. Jeden pracownik pracuje w danym terminie w JEDNEJ dzielnicy —
 * dlatego filtrowanie po districtId dzieje się już na poziomie
 * harmonogramu, nie osobno.
 */
export function computeAvailableSlots(params: ComputeAvailableSlotsParams): AvailableSlot[] {
  const slotInterval = params.slotIntervalMinutes ?? 30;
  const dayOfWeek = params.date.getDay();

  const relevantAvailability = params.weeklyAvailability.filter(
    (a) => a.active && a.districtId === params.districtId && a.dayOfWeek === dayOfWeek
  );

  const results: AvailableSlot[] = [];

  for (const avail of relevantAvailability) {
    const exception = params.exceptions.find(
      (e) => e.employeeId === avail.employeeId && isSameDay(e.date, params.date)
    );

    if (exception?.type === "DAY_OFF") {
      continue;
    }

    const workStart =
      exception?.type === "CUSTOM_HOURS" && exception.startTime
        ? combineDateAndTime(params.date, exception.startTime)
        : combineDateAndTime(params.date, avail.startTime);
    const workEnd =
      exception?.type === "CUSTOM_HOURS" && exception.endTime
        ? combineDateAndTime(params.date, exception.endTime)
        : combineDateAndTime(params.date, avail.endTime);

    const employeeBookings = params.existingBookings.filter(
      (b) => b.employeeId === avail.employeeId
    );

    let cursor = new Date(workStart);
    const durationMs = params.durationMinutes * 60 * 1000;
    while (cursor.getTime() + durationMs <= workEnd.getTime()) {
      const slotEnd = new Date(cursor.getTime() + durationMs);
      const overlaps = employeeBookings.some(
        (b) =>
          cursor.getTime() < b.scheduledEnd.getTime() && slotEnd.getTime() > b.scheduledStart.getTime()
      );
      if (!overlaps) {
        results.push({ employeeId: avail.employeeId, start: new Date(cursor), end: slotEnd });
      }
      cursor = new Date(cursor.getTime() + slotInterval * 60 * 1000);
    }
  }

  return results;
}

/**
 * Grupuje okienka po dokładnym czasie startu — wprost odpowiada regule z
 * ARCHITEKTURA.md: "jeśli w danym okienku dostępny jest więcej niż jeden
 * pracownik, klient wybiera; jeśli jeden, system przypisuje automatycznie".
 */
export function groupSlotsByStartTime(slots: AvailableSlot[]): GroupedSlot[] {
  const byStart = new Map<number, GroupedSlot>();
  for (const slot of slots) {
    const key = slot.start.getTime();
    const existing = byStart.get(key);
    if (existing) {
      existing.employeeIds.push(slot.employeeId);
    } else {
      byStart.set(key, { start: slot.start, end: slot.end, employeeIds: [slot.employeeId] });
    }
  }
  return Array.from(byStart.values()).sort((a, b) => a.start.getTime() - b.start.getTime());
}
