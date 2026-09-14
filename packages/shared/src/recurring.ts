export type RecurringFrequency = "WEEKLY" | "BIWEEKLY";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

/**
 * Okno generowania zleceń z serii cyklicznej: od "teraz" do +1 miesiąc —
 * cron dopełnia to okno na bieżąco w miarę jak starsze zlecenia się
 * realizują (patrz ARCHITEKTURA.md sekcja 5 pkt 10).
 */
export function computeGenerationWindow(now: Date, monthsAhead = 1): { from: Date; to: Date } {
  const to = new Date(now);
  to.setMonth(to.getMonth() + monthsAhead);
  return { from: now, to };
}

/**
 * Pierwsze wystąpienie preferowanego dnia tygodnia w dniu `date` albo po
 * nim. Używane do wyznaczenia "kotwicy" (pierwszego wystąpienia) serii —
 * generateOccurrenceDates liczy parzystość BIWEEKLY względem tej kotwicy,
 * więc kotwica MUSI wypadać w preferredDayOfWeek.
 */
export function nextOccurrenceOnOrAfter(date: Date, preferredDayOfWeek: number): Date {
  const day = startOfDay(date);
  const diff = (preferredDayOfWeek - day.getDay() + 7) % 7;
  day.setDate(day.getDate() + diff);
  return day;
}

export interface GenerateOccurrenceDatesParams {
  frequency: RecurringFrequency;
  preferredDayOfWeek: number;
  /** Pierwsze wystąpienie serii — patrz nextOccurrenceOnOrAfter. Musi wypadać w preferredDayOfWeek. */
  anchorDate: Date;
  windowStart: Date;
  windowEnd: Date;
  /** Daty (dowolna godzina — liczy się tylko dzień), dla których Booking już istnieje — pomijane. */
  existingDates: Date[];
}

/**
 * Generuje daty kolejnych wystąpień serii cyklicznej w zadanym oknie,
 * pomijając te, dla których zlecenie już istnieje (idempotentne wywołania
 * z crona nie tworzą duplikatów).
 */
export function generateOccurrenceDates(params: GenerateOccurrenceDatesParams): Date[] {
  const intervalDays = params.frequency === "WEEKLY" ? 7 : 14;
  const existingDayKeys = new Set(params.existingDates.map((d) => startOfDay(d).getTime()));

  const results: Date[] = [];
  let cursor = startOfDay(params.windowStart);
  const end = startOfDay(params.windowEnd);

  while (cursor.getTime() <= end.getTime()) {
    if (cursor.getDay() === params.preferredDayOfWeek) {
      const diff = daysBetween(params.anchorDate, cursor);
      if (diff >= 0 && diff % intervalDays === 0 && !existingDayKeys.has(cursor.getTime())) {
        results.push(new Date(cursor));
      }
    }
    cursor = new Date(cursor.getTime() + 1000 * 60 * 60 * 24);
  }

  return results;
}
