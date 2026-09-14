export type OnboardingRequestStatus =
  | "NEW"
  | "MEETING_SCHEDULED"
  | "VISITED"
  | "APPROVED"
  | "REJECTED";

const ALLOWED_TRANSITIONS: Record<OnboardingRequestStatus, OnboardingRequestStatus[]> = {
  NEW: ["MEETING_SCHEDULED", "REJECTED"],
  MEETING_SCHEDULED: ["VISITED", "REJECTED"],
  VISITED: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: [],
};

export class InvalidOnboardingTransitionError extends Error {
  constructor(from: OnboardingRequestStatus, to: OnboardingRequestStatus) {
    super(`Nie można przejść z ${from} do ${to} w OnboardingRequest.`);
    this.name = "InvalidOnboardingTransitionError";
  }
}

/** Rzuca, jeśli przejście stanu OnboardingRequest jest niedozwolone. */
export function assertValidOnboardingTransition(
  from: OnboardingRequestStatus,
  to: OnboardingRequestStatus
): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new InvalidOnboardingTransitionError(from, to);
  }
}

export class MeetingDateNotInFutureError extends Error {
  constructor() {
    super("Termin spotkania weryfikacyjnego musi być w przyszłości.");
    this.name = "MeetingDateNotInFutureError";
  }
}

/** Walidacja przy planowaniu spotkania (NEW -> MEETING_SCHEDULED). */
export function assertMeetingDateIsFuture(meetingScheduledAt: Date, now: Date): void {
  if (meetingScheduledAt.getTime() <= now.getTime()) {
    throw new MeetingDateNotInFutureError();
  }
}

export interface ClientProfileApprovalUpdate {
  status: "STANDARD";
  verifiedAt: Date;
  verifiedById: string;
}

/**
 * Aktualizacja ClientProfile do zastosowania przy zatwierdzeniu klienta —
 * niezależnie od tego, czy dzieje się to przez zatwierdzenie
 * OnboardingRequest (VISITED -> APPROVED), czy ręczną decyzję admina bez
 * formalnego zgłoszenia. Jedno spójne miejsce, żeby oba przepływy zapisywały
 * ten sam ślad audytowy (patrz ARCHITEKTURA.md sekcja 2, ClientProfile).
 */
export function buildClientApprovalUpdate(params: {
  approvedById: string;
  now: Date;
}): ClientProfileApprovalUpdate {
  return {
    status: "STANDARD",
    verifiedAt: params.now,
    verifiedById: params.approvedById,
  };
}
