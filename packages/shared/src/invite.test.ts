import { describe, expect, it } from "vitest";
import {
  InviteTokenExpiredError,
  InviteTokenMissingError,
  assertInviteTokenValid,
  computeInviteExpiry,
  generateInviteToken,
} from "./invite";

describe("generateInviteToken", () => {
  it("generuje długi, unikalny token przy każdym wywołaniu", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});

describe("computeInviteExpiry", () => {
  it("ustawia ważność na 7 dni od teraz", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const expiry = computeInviteExpiry(now);
    expect(expiry).toEqual(new Date("2026-01-08T00:00:00Z"));
  });
});

describe("assertInviteTokenValid", () => {
  it("nie rzuca, gdy token jeszcze ważny", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(() =>
      assertInviteTokenValid({ expiresAt: new Date("2026-01-02T00:00:00Z"), now })
    ).not.toThrow();
  });

  it("rzuca InviteTokenExpiredError po terminie ważności", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    expect(() =>
      assertInviteTokenValid({ expiresAt: new Date("2026-01-08T00:00:00Z"), now })
    ).toThrow(InviteTokenExpiredError);
  });

  it("rzuca InviteTokenMissingError, gdy konto nie ma żadnego zaproszenia", () => {
    expect(() => assertInviteTokenValid({ expiresAt: null, now: new Date() })).toThrow(
      InviteTokenMissingError
    );
  });
});
