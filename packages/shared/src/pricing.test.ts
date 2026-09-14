import { describe, expect, it } from "vitest";
import {
  NoMatchingPricingRuleError,
  exceedsIndividualQuoteThreshold,
  resolvePrice,
  type PricingRuleInput,
} from "./pricing";

const rules: PricingRuleInput[] = [
  {
    id: "rule-small",
    districtId: "district-1",
    serviceTypeId: "service-standard",
    sizeM2From: 0,
    sizeM2To: 50,
    price: 150,
    durationMinutes: 120,
    active: true,
  },
  {
    id: "rule-medium",
    districtId: "district-1",
    serviceTypeId: "service-standard",
    sizeM2From: 51,
    sizeM2To: 65,
    price: 200,
    durationMinutes: 150,
    active: true,
  },
  {
    id: "rule-inactive",
    districtId: "district-1",
    serviceTypeId: "service-standard",
    sizeM2From: 66,
    sizeM2To: 100,
    price: 999,
    durationMinutes: 999,
    active: false,
  },
];

describe("resolvePrice", () => {
  it("dopasowuje regułę wg dolnej granicy przedziału", () => {
    const result = resolvePrice(rules, {
      districtId: "district-1",
      serviceTypeId: "service-standard",
      sizeM2: 0,
    });
    expect(result).toEqual({ pricingRuleId: "rule-small", price: 150, durationMinutes: 120 });
  });

  it("dopasowuje regułę wg górnej granicy przedziału", () => {
    const result = resolvePrice(rules, {
      districtId: "district-1",
      serviceTypeId: "service-standard",
      sizeM2: 50,
    });
    expect(result.pricingRuleId).toBe("rule-small");
  });

  it("przechodzi do kolejnego przedziału zaraz nad granicą", () => {
    const result = resolvePrice(rules, {
      districtId: "district-1",
      serviceTypeId: "service-standard",
      sizeM2: 51,
    });
    expect(result.pricingRuleId).toBe("rule-medium");
  });

  it("ignoruje nieaktywne reguły", () => {
    expect(() =>
      resolvePrice(rules, {
        districtId: "district-1",
        serviceTypeId: "service-standard",
        sizeM2: 70,
      })
    ).toThrow(NoMatchingPricingRuleError);
  });

  it("rzuca błąd, gdy brak reguły dla danej dzielnicy/rodzaju usługi", () => {
    expect(() =>
      resolvePrice(rules, {
        districtId: "district-nieznana",
        serviceTypeId: "service-standard",
        sizeM2: 30,
      })
    ).toThrow(NoMatchingPricingRuleError);
  });
});

describe("exceedsIndividualQuoteThreshold", () => {
  it("zwraca false dokładnie na progu", () => {
    expect(exceedsIndividualQuoteThreshold(50, 50)).toBe(false);
  });

  it("zwraca true tuż nad progiem", () => {
    expect(exceedsIndividualQuoteThreshold(50.01, 50)).toBe(true);
  });
});
