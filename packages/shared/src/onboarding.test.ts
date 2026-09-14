import { describe, expect, it } from "vitest";
import {
  InvalidOnboardingTransitionError,
  MeetingDateNotInFutureError,
  assertMeetingDateIsFuture,
  assertValidOnboardingTransition,
  buildClientApprovalUpdate,
} from "./onboarding";

describe("assertValidOnboardingTransition", () => {
  it("pozwala na pełną poprawną ścieżkę NEW -> MEETING_SCHEDULED -> VISITED -> APPROVED", () => {
    expect(() => assertValidOnboardingTransition("NEW", "MEETING_SCHEDULED")).not.toThrow();
    expect(() => assertValidOnboardingTransition("MEETING_SCHEDULED", "VISITED")).not.toThrow();
    expect(() => assertValidOnboardingTransition("VISITED", "APPROVED")).not.toThrow();
  });

  it("pozwala odrzucić zgłoszenie na każdym nieterminalnym etapie", () => {
    expect(() => assertValidOnboardingTransition("NEW", "REJECTED")).not.toThrow();
    expect(() => assertValidOnboardingTransition("MEETING_SCHEDULED", "REJECTED")).not.toThrow();
    expect(() => assertValidOnboardingTransition("VISITED", "REJECTED")).not.toThrow();
  });

  it("nie pozwala przeskoczyć etapu spotkania", () => {
    expect(() => assertValidOnboardingTransition("NEW", "APPROVED")).toThrow(
      InvalidOnboardingTransitionError
    );
    expect(() => assertValidOnboardingTransition("NEW", "VISITED")).toThrow(
      InvalidOnboardingTransitionError
    );
  });

  it("stany terminalne (APPROVED/REJECTED) nie pozwalają na żadne dalsze przejście", () => {
    expect(() => assertValidOnboardingTransition("APPROVED", "REJECTED")).toThrow(
      InvalidOnboardingTransitionError
    );
    expect(() => assertValidOnboardingTransition("REJECTED", "APPROVED")).toThrow(
      InvalidOnboardingTransitionError
    );
  });
});

describe("assertMeetingDateIsFuture", () => {
  it("nie rzuca dla daty w przyszłości", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(() =>
      assertMeetingDateIsFuture(new Date("2026-01-02T12:00:00Z"), now)
    ).not.toThrow();
  });

  it("rzuca dla daty w przeszłości lub dokładnie 'teraz'", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(() => assertMeetingDateIsFuture(now, now)).toThrow(MeetingDateNotInFutureError);
    expect(() =>
      assertMeetingDateIsFuture(new Date("2025-12-31T12:00:00Z"), now)
    ).toThrow(MeetingDateNotInFutureError);
  });
});

describe("buildClientApprovalUpdate", () => {
  it("zwraca STANDARD wraz z śladem audytowym kto i kiedy zatwierdził", () => {
    const now = new Date("2026-01-05T10:00:00Z");
    const result = buildClientApprovalUpdate({ approvedById: "admin-1", now });
    expect(result).toEqual({ status: "STANDARD", verifiedAt: now, verifiedById: "admin-1" });
  });
});
