import { describe, expect, it } from "vitest";
import {
  computeAvailableSlots,
  groupSlotsByStartTime,
  type AvailableSlot,
} from "./availability";

// Konwencja czasu-bez-daty w całym systemie to UTC (patrz komentarz przy
// combineDateAndTime w availability.ts) — testy muszą używać tej samej
// konwencji co produkcyjny kod zapisujący/odczytujący z Prisma.
function time(hours: number, minutes = 0): Date {
  return new Date(Date.UTC(1970, 0, 1, hours, minutes));
}

const WEDNESDAY = new Date(2026, 0, 7); // 2026-01-07 to środa (dzień tygodnia = 3)

describe("computeAvailableSlots", () => {
  it("generuje okienka co 30 minut mieszczące pełny czas trwania usługi", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      districtId: "district-1",
      durationMinutes: 120,
      weeklyAvailability: [
        {
          employeeId: "emp-1",
          districtId: "district-1",
          dayOfWeek: 3,
          startTime: time(9),
          endTime: time(13),
          active: true,
        },
      ],
      exceptions: [],
      existingBookings: [],
    });

    expect(slots.map((s) => s.start.getHours() * 60 + s.start.getMinutes())).toEqual([
      9 * 60,
      9 * 60 + 30,
      10 * 60,
      10 * 60 + 30,
      11 * 60,
    ]);
  });

  it("pomija nieaktywne wpisy dostępności", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      districtId: "district-1",
      durationMinutes: 60,
      weeklyAvailability: [
        {
          employeeId: "emp-1",
          districtId: "district-1",
          dayOfWeek: 3,
          startTime: time(9),
          endTime: time(13),
          active: false,
        },
      ],
      exceptions: [],
      existingBookings: [],
    });
    expect(slots).toHaveLength(0);
  });

  it("filtruje po dzielnicy i dniu tygodnia", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      districtId: "district-1",
      durationMinutes: 60,
      weeklyAvailability: [
        { employeeId: "emp-wrong-district", districtId: "district-2", dayOfWeek: 3, startTime: time(9), endTime: time(13), active: true },
        { employeeId: "emp-wrong-day", districtId: "district-1", dayOfWeek: 4, startTime: time(9), endTime: time(13), active: true },
      ],
      exceptions: [],
      existingBookings: [],
    });
    expect(slots).toHaveLength(0);
  });

  it("DAY_OFF wyklucza pracownika całkowicie tego dnia", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      districtId: "district-1",
      durationMinutes: 60,
      weeklyAvailability: [
        { employeeId: "emp-1", districtId: "district-1", dayOfWeek: 3, startTime: time(9), endTime: time(13), active: true },
      ],
      exceptions: [{ employeeId: "emp-1", date: WEDNESDAY, type: "DAY_OFF" }],
      existingBookings: [],
    });
    expect(slots).toHaveLength(0);
  });

  it("CUSTOM_HOURS nadpisuje standardowe godziny tego dnia", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      districtId: "district-1",
      durationMinutes: 60,
      weeklyAvailability: [
        { employeeId: "emp-1", districtId: "district-1", dayOfWeek: 3, startTime: time(9), endTime: time(13), active: true },
      ],
      exceptions: [
        { employeeId: "emp-1", date: WEDNESDAY, type: "CUSTOM_HOURS", startTime: time(14), endTime: time(15) },
      ],
      existingBookings: [],
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].start.getHours()).toBe(14);
  });

  it("wyklucza okienka nachodzące na istniejące zlecenie", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      districtId: "district-1",
      durationMinutes: 60,
      weeklyAvailability: [
        { employeeId: "emp-1", districtId: "district-1", dayOfWeek: 3, startTime: time(9), endTime: time(12), active: true },
      ],
      exceptions: [],
      existingBookings: [
        {
          employeeId: "emp-1",
          scheduledStart: new Date(WEDNESDAY.getFullYear(), WEDNESDAY.getMonth(), WEDNESDAY.getDate(), 9, 30),
          scheduledEnd: new Date(WEDNESDAY.getFullYear(), WEDNESDAY.getMonth(), WEDNESDAY.getDate(), 10, 30),
        },
      ],
    });
    const starts = slots.map((s) => s.start.getHours() * 60 + s.start.getMinutes());
    // zajęte 9:30-10:30 -> odpadają starty 9:00 (koniec 10:00, nachodzi), 9:30, 10:00 (koniec 11:00, nachodzi na 10:30? 10:00-11:00 nachodzi na 9:30-10:30 bo 10:00<10:30)
    expect(starts).not.toContain(9 * 60);
    expect(starts).not.toContain(9 * 60 + 30);
    expect(starts).toContain(10 * 60 + 30);
  });
});

describe("groupSlotsByStartTime", () => {
  it("grupuje wielu pracowników dostępnych w tym samym okienku", () => {
    const start = new Date(2026, 0, 7, 9, 0);
    const end = new Date(2026, 0, 7, 11, 0);
    const slots: AvailableSlot[] = [
      { employeeId: "emp-1", start, end },
      { employeeId: "emp-2", start, end },
    ];
    const grouped = groupSlotsByStartTime(slots);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].employeeIds).toEqual(["emp-1", "emp-2"]);
  });

  it("zostawia osobne grupy dla różnych godzin startu", () => {
    const slots: AvailableSlot[] = [
      { employeeId: "emp-1", start: new Date(2026, 0, 7, 9, 0), end: new Date(2026, 0, 7, 11, 0) },
      { employeeId: "emp-1", start: new Date(2026, 0, 7, 9, 30), end: new Date(2026, 0, 7, 11, 30) },
    ];
    const grouped = groupSlotsByStartTime(slots);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].employeeIds).toEqual(["emp-1"]);
  });
});
