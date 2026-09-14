import { describe, expect, it } from "vitest";
import {
  ClientNotTrustedRecurringError,
  ClientNotVerifiedError,
  assertCanBookRecurring,
  assertCanBookStandard,
  canBookRecurring,
  canBookStandard,
} from "./clientAccess";

describe("canBookStandard", () => {
  it("nowy, niezweryfikowany klient nie może rezerwować", () => {
    expect(canBookStandard("PENDING_VERIFICATION")).toBe(false);
  });

  it("zweryfikowany klient może rezerwować", () => {
    expect(canBookStandard("STANDARD")).toBe(true);
  });

  it("klient zaufany/cykliczny również może rezerwować standardowo", () => {
    expect(canBookStandard("TRUSTED_RECURRING")).toBe(true);
  });
});

describe("canBookRecurring", () => {
  it("tylko TRUSTED_RECURRING odblokowuje rezerwacje cykliczne", () => {
    expect(canBookRecurring("PENDING_VERIFICATION")).toBe(false);
    expect(canBookRecurring("STANDARD")).toBe(false);
    expect(canBookRecurring("TRUSTED_RECURRING")).toBe(true);
  });
});

describe("assertCanBookStandard", () => {
  it("rzuca ClientNotVerifiedError dla PENDING_VERIFICATION", () => {
    expect(() => assertCanBookStandard("PENDING_VERIFICATION")).toThrow(ClientNotVerifiedError);
  });

  it("nie rzuca dla STANDARD", () => {
    expect(() => assertCanBookStandard("STANDARD")).not.toThrow();
  });
});

describe("assertCanBookRecurring", () => {
  it("rzuca ClientNotTrustedRecurringError dla STANDARD", () => {
    expect(() => assertCanBookRecurring("STANDARD")).toThrow(ClientNotTrustedRecurringError);
  });

  it("nie rzuca dla TRUSTED_RECURRING", () => {
    expect(() => assertCanBookRecurring("TRUSTED_RECURRING")).not.toThrow();
  });
});
