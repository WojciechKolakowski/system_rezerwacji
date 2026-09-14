export type ClientStatus = "PENDING_VERIFICATION" | "STANDARD" | "TRUSTED_RECURRING";

export class ClientNotVerifiedError extends Error {
  constructor() {
    super(
      "Klient nie został jeszcze zweryfikowany — status PENDING_VERIFICATION nie pozwala na standardową rezerwację."
    );
    this.name = "ClientNotVerifiedError";
  }
}

export class ClientNotTrustedRecurringError extends Error {
  constructor() {
    super(
      "Klient nie ma statusu TRUSTED_RECURRING — rezerwacja cykliczna jest niedostępna."
    );
    this.name = "ClientNotTrustedRecurringError";
  }
}

/**
 * Czy klient może w ogóle korzystać ze standardowej ścieżki rezerwacji.
 * Samo posiadanie konta już nie wystarcza od zmiany z 2026-09-14 — patrz
 * ARCHITEKTURA.md sekcja 5 pkt 13.
 */
export function canBookStandard(status: ClientStatus): boolean {
  return status === "STANDARD" || status === "TRUSTED_RECURRING";
}

/** Czy klient może zlecać usługę cykliczną. */
export function canBookRecurring(status: ClientStatus): boolean {
  return status === "TRUSTED_RECURRING";
}

/** Rzuca, jeśli klient nie ma prawa do standardowej rezerwacji — użyć na wejściu do akcji tworzącej Booking. */
export function assertCanBookStandard(status: ClientStatus): void {
  if (!canBookStandard(status)) {
    throw new ClientNotVerifiedError();
  }
}

/** Rzuca, jeśli klient nie ma prawa do rezerwacji cyklicznej — użyć na wejściu do akcji tworzącej RecurringSeries. */
export function assertCanBookRecurring(status: ClientStatus): void {
  if (!canBookRecurring(status)) {
    throw new ClientNotTrustedRecurringError();
  }
}
