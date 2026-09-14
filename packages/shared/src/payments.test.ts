import { describe, expect, it } from "vitest";
import { computeRefundAmountMinor } from "./payments";

describe("computeRefundAmountMinor", () => {
  it("liczy pełny zwrot", () => {
    expect(computeRefundAmountMinor(15000, 100)).toBe(15000);
  });

  it("liczy zwrot częściowy i zaokrągla do pełnych groszy", () => {
    // 149,99 zł * 50% = 74,995 zł -> zaokrąglone do 7500 groszy (75,00 zł)
    expect(computeRefundAmountMinor(14999, 50)).toBe(7500);
  });

  it("zwraca 0 przy braku uprawnienia do zwrotu", () => {
    expect(computeRefundAmountMinor(20000, 0)).toBe(0);
  });
});
