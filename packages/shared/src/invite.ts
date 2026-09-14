import { randomBytes } from "node:crypto";

/** Ważność linku zaproszenia (admin zakłada konto klienta -> e-mail z linkiem do ustawienia hasła). */
export const INVITE_TOKEN_TTL_HOURS = 24 * 7; // 7 dni

/** Losowy token zaproszenia — wystarczająco długi, by nie dało się go zgadnąć. */
export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function computeInviteExpiry(now: Date): Date {
  return new Date(now.getTime() + INVITE_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

export class InviteTokenExpiredError extends Error {
  constructor() {
    super("Link zaproszenia wygasł — poproś administratora o nowe zaproszenie.");
    this.name = "InviteTokenExpiredError";
  }
}

export class InviteTokenMissingError extends Error {
  constructor() {
    super("To konto nie ma aktywnego zaproszenia do ustawienia hasła.");
    this.name = "InviteTokenMissingError";
  }
}

/**
 * Waliduje token zaproszenia w momencie, gdy klient klika link i próbuje
 * ustawić hasło. `expiresAt` to User.inviteTokenExpiresAt.
 */
export function assertInviteTokenValid(params: { expiresAt: Date | null; now: Date }): void {
  if (!params.expiresAt) {
    throw new InviteTokenMissingError();
  }
  if (params.now.getTime() >= params.expiresAt.getTime()) {
    throw new InviteTokenExpiredError();
  }
}
