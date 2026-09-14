import { describe, expect, it } from "vitest";
import {
  computeGenerationWindow,
  generateOccurrenceDates,
  nextOccurrenceOnOrAfter,
} from "./recurring";

const DAY = 1000 * 60 * 60 * 24;

describe("computeGenerationWindow", () => {
  it("okno sięga miesiąc naprzód od 'teraz' domyślnie", () => {
    const now = new Date("2026-03-15T00:00:00");
    const { from, to } = computeGenerationWindow(now);
    expect(from).toEqual(now);
    expect(to).toEqual(new Date("2026-04-15T00:00:00"));
  });

  it("respektuje niestandardowy parametr monthsAhead", () => {
    const now = new Date("2026-03-15T00:00:00");
    const { to } = computeGenerationWindow(now, 2);
    expect(to).toEqual(new Date("2026-05-15T00:00:00"));
  });
});

describe("nextOccurrenceOnOrAfter", () => {
  it("zwraca tę samą datę, jeśli już wypada w preferowanym dniu tygodnia", () => {
    const wednesday = new Date(2026, 0, 7); // 2026-01-07 to środa
    expect(wednesday.getDay()).toBe(3);
    expect(nextOccurrenceOnOrAfter(wednesday, 3)).toEqual(wednesday);
  });

  it("przesuwa do najbliższego kolejnego wystąpienia preferowanego dnia", () => {
    const monday = new Date(2026, 0, 5); // 2026-01-05 to poniedziałek
    expect(monday.getDay()).toBe(1);
    const result = nextOccurrenceOnOrAfter(monday, 3); // środa
    expect(result).toEqual(new Date(2026, 0, 7));
  });
});

describe("generateOccurrenceDates", () => {
  const anchor = nextOccurrenceOnOrAfter(new Date(2026, 0, 1), 3); // pierwsza środa od 2026-01-01

  it("WEEKLY generuje wystąpienie co 7 dni w oknie", () => {
    const windowEnd = new Date(anchor.getTime() + 35 * DAY);
    const results = generateOccurrenceDates({
      frequency: "WEEKLY",
      preferredDayOfWeek: 3,
      anchorDate: anchor,
      windowStart: anchor,
      windowEnd,
      existingDates: [],
    });
    expect(results).toHaveLength(6);
    expect(results[0]).toEqual(anchor);
    expect(results[1].getTime() - results[0].getTime()).toBe(7 * DAY);
  });

  it("BIWEEKLY generuje wystąpienie co 14 dni, pomijając środkowe tygodnie", () => {
    const windowEnd = new Date(anchor.getTime() + 35 * DAY);
    const results = generateOccurrenceDates({
      frequency: "BIWEEKLY",
      preferredDayOfWeek: 3,
      anchorDate: anchor,
      windowStart: anchor,
      windowEnd,
      existingDates: [],
    });
    expect(results).toHaveLength(3);
    expect(results[1].getTime() - results[0].getTime()).toBe(14 * DAY);
  });

  it("pomija daty, dla których zlecenie już istnieje (idempotencja crona)", () => {
    const windowEnd = new Date(anchor.getTime() + 21 * DAY);
    const secondOccurrence = new Date(anchor.getTime() + 7 * DAY);
    const results = generateOccurrenceDates({
      frequency: "WEEKLY",
      preferredDayOfWeek: 3,
      anchorDate: anchor,
      windowStart: anchor,
      windowEnd,
      existingDates: [secondOccurrence],
    });
    // okno anchor..anchor+21d daje 4 kandydatów (0,7,14,21 dni) minus 1 wykluczony = 3
    expect(results).toHaveLength(3);
    expect(results.some((d) => d.getTime() === secondOccurrence.getTime())).toBe(false);
  });

  it("nie generuje dat sprzed kotwicy, nawet jeśli okno zaczyna się wcześniej", () => {
    const windowStart = new Date(anchor.getTime() - 14 * DAY);
    const windowEnd = new Date(anchor.getTime() + 7 * DAY);
    const results = generateOccurrenceDates({
      frequency: "WEEKLY",
      preferredDayOfWeek: 3,
      anchorDate: anchor,
      windowStart,
      windowEnd,
      existingDates: [],
    });
    expect(results.every((d) => d.getTime() >= anchor.getTime())).toBe(true);
  });
});
