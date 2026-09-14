import { describe, expect, it } from "vitest";
import { determineCancellationOutcome } from "./cancellation";

const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;

describe("determineCancellationOutcome", () => {
  it("pozwala na samoobsługową anulację z pełnym zwrotem, gdy do wizyty jest więcej niż okno operacyjne", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const result = determineCancellationOutcome({
      bookingCreatedAt: new Date("2026-01-01T12:00:00Z"),
      scheduledStart: new Date(now.getTime() + 25 * HOUR),
      now,
      operationalLockWindowHours: 24,
      partialRefundPercentage: 50,
    });
    expect(result).toEqual({
      selfServiceAllowed: true,
      statutoryWithdrawalEligible: true,
      refundType: "FULL_SELF_SERVICE",
      refundPercentage: 100,
    });
  });

  it("pozwala na samoobsługową anulację dokładnie na granicy okna operacyjnego", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const result = determineCancellationOutcome({
      bookingCreatedAt: new Date("2026-01-01T12:00:00Z"),
      scheduledStart: new Date(now.getTime() + 24 * HOUR),
      now,
      operationalLockWindowHours: 24,
      partialRefundPercentage: 50,
    });
    expect(result.selfServiceAllowed).toBe(true);
  });

  it("po zamknięciu okna operacyjnego, ale przed upływem ustawowych 14 dni od rezerwacji, wymaga pełnego zwrotu z mocy prawa", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const result = determineCancellationOutcome({
      // rezerwacja zrobiona 5 dni temu — wciąż w ustawowym oknie 14 dni
      bookingCreatedAt: new Date(now.getTime() - 5 * DAY),
      scheduledStart: new Date(now.getTime() + 10 * HOUR),
      now,
      operationalLockWindowHours: 24,
      partialRefundPercentage: 50,
    });
    expect(result).toEqual({
      selfServiceAllowed: false,
      statutoryWithdrawalEligible: true,
      refundType: "FULL_STATUTORY_RIGHT",
      refundPercentage: 100,
    });
  });

  it("po zamknięciu okna operacyjnego i po upływie ustawowych 14 dni nalicza potrącenie wg polityki", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const result = determineCancellationOutcome({
      // rezerwacja zrobiona 20 dni temu — ustawowe 14 dni już minęło
      bookingCreatedAt: new Date(now.getTime() - 20 * DAY),
      scheduledStart: new Date(now.getTime() + 10 * HOUR),
      now,
      operationalLockWindowHours: 24,
      partialRefundPercentage: 50,
    });
    expect(result).toEqual({
      selfServiceAllowed: false,
      statutoryWithdrawalEligible: false,
      refundType: "PARTIAL_POLICY",
      refundPercentage: 50,
    });
  });

  it("rezerwacja zrobiona z dużym wyprzedzeniem (>14 dni temu), anulowana tuż przed wizytą, dostaje tylko częściowy zwrot", () => {
    // To jest kluczowy przypadek z korekty użytkownika: NIE "50% jeśli <24h"
    // bezwarunkowo — zależy też od tego, kiedy rezerwacja została złożona.
    const now = new Date("2026-02-01T12:00:00Z");
    const result = determineCancellationOutcome({
      bookingCreatedAt: new Date("2026-01-01T12:00:00Z"), // 31 dni temu
      scheduledStart: new Date(now.getTime() + 2 * HOUR),
      now,
      operationalLockWindowHours: 24,
      partialRefundPercentage: 50,
    });
    expect(result.refundType).toBe("PARTIAL_POLICY");
    expect(result.refundPercentage).toBe(50);
  });

  it("respektuje niestandardowy próg operacyjny i procent zwrotu ustawiony w Settings", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const result = determineCancellationOutcome({
      bookingCreatedAt: new Date(now.getTime() - 20 * DAY),
      scheduledStart: new Date(now.getTime() + 5 * HOUR),
      now,
      operationalLockWindowHours: 6,
      partialRefundPercentage: 30,
    });
    expect(result.selfServiceAllowed).toBe(false);
    expect(result.refundPercentage).toBe(30);
  });
});
