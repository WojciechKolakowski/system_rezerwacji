import { STATUTORY_WITHDRAWAL_DAYS } from "./constants";

export type RefundType =
  | "FULL_SELF_SERVICE"
  | "FULL_STATUTORY_RIGHT"
  | "PARTIAL_POLICY";

export interface CancellationOutcome {
  /** Czy klient może anulować samoobsługowo w swoim koncie (przycisk aktywny). */
  selfServiceAllowed: boolean;
  /**
   * Czy rezerwacja podlega ustawowemu prawu odstąpienia konsumenta (art. 27
   * ustawy o prawach konsumenta) w chwili zgłoszenia anulacji. Tylko
   * miarodajne, gdy `selfServiceAllowed` jest false — w oknie operacyjnym
   * klient i tak dostaje pełny zwrot niezależnie od tej flagi.
   */
  statutoryWithdrawalEligible: boolean;
  refundType: RefundType;
  refundPercentage: number;
}

export interface DetermineCancellationOutcomeParams {
  /** Kiedy rezerwacja została utworzona (Booking.createdAt) — liczy się od zawarcia umowy, nie od terminu wizyty. */
  bookingCreatedAt: Date;
  /** Zaplanowany początek wizyty (Booking.scheduledStart). */
  scheduledStart: Date;
  /** Moment zgłoszenia anulacji (zwykle "teraz"), wstrzykiwany dla testowalności. */
  now: Date;
  /** Settings.operationalLockWindowHours (domyślnie 24). */
  operationalLockWindowHours: number;
  /** Settings.partialRefundPercentage (domyślnie 50). */
  partialRefundPercentage: number;
}

/**
 * Dwuprogowa logika anulacji/zwrotu — patrz ARCHITEKTURA.md sekcja 5 pkt 4.
 *
 * Próg 1 (operacyjny, `operationalLockWindowHours` przed wizytą):
 *   do tego momentu klient anuluje samoobsługowo, zwrot 100% automatyczny.
 *
 * Próg 2 (ustawowy, `STATUTORY_WITHDRAWAL_DAYS` od zawarcia umowy):
 *   po zamknięciu okna operacyjnego, jeśli od utworzenia rezerwacji minęło
 *   mniej niż ten termin, klientowi wciąż należy się pełny zwrot z mocy
 *   prawa (obsługiwany ręcznie przez admina, ale system jednoznacznie
 *   wskazuje wymagany wynik). Po upływie obu terminów — potrącenie wg
 *   `partialRefundPercentage`.
 *
 * WAŻNE: te dwa progi są od siebie NIEZALEŻNE — to nie jest jedna sztywna
 * reguła "50% jeśli <24h". Zob. też ⚠️ w ARCHITEKTURA.md o konieczności
 * potwierdzenia z prawnikiem zakresu ustawowego prawa odstąpienia dla usług
 * sprzątania przed wdrożeniem produkcyjnym.
 */
export function determineCancellationOutcome(
  params: DetermineCancellationOutcomeParams
): CancellationOutcome {
  const hoursUntilService =
    (params.scheduledStart.getTime() - params.now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilService >= params.operationalLockWindowHours) {
    return {
      selfServiceAllowed: true,
      statutoryWithdrawalEligible: true,
      refundType: "FULL_SELF_SERVICE",
      refundPercentage: 100,
    };
  }

  const daysSinceBooking =
    (params.now.getTime() - params.bookingCreatedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceBooking < STATUTORY_WITHDRAWAL_DAYS) {
    return {
      selfServiceAllowed: false,
      statutoryWithdrawalEligible: true,
      refundType: "FULL_STATUTORY_RIGHT",
      refundPercentage: 100,
    };
  }

  return {
    selfServiceAllowed: false,
    statutoryWithdrawalEligible: false,
    refundType: "PARTIAL_POLICY",
    refundPercentage: params.partialRefundPercentage,
  };
}
