export interface PricingRuleInput {
  id: string;
  districtId: string;
  serviceTypeId: string;
  sizeM2From: number;
  sizeM2To: number;
  price: number;
  durationMinutes: number;
  active: boolean;
}

export interface ResolvedPrice {
  pricingRuleId: string;
  price: number;
  durationMinutes: number;
}

export class NoMatchingPricingRuleError extends Error {
  constructor(params: { districtId: string; serviceTypeId: string; sizeM2: number }) {
    super(
      `Brak reguły cenowej dla dzielnicy ${params.districtId}, rodzaju usługi ${params.serviceTypeId} i ${params.sizeM2} m²`
    );
    this.name = "NoMatchingPricingRuleError";
  }
}

/**
 * Znajduje regułę cenową pasującą do dzielnicy, rodzaju usługi i przedziału
 * m² (sizeM2From <= sizeM2 <= sizeM2To). Zwraca cenę i czas trwania wizyty
 * jednocześnie — obie wartości pochodzą z tej samej reguły, zgodnie z
 * ARCHITEKTURA.md ("ta sama logika przedziałowa napędza jednocześnie cenę i
 * długość okienka w kalendarzu pracownika").
 */
export function resolvePrice(
  rules: PricingRuleInput[],
  params: { districtId: string; serviceTypeId: string; sizeM2: number }
): ResolvedPrice {
  const match = rules.find(
    (rule) =>
      rule.active &&
      rule.districtId === params.districtId &&
      rule.serviceTypeId === params.serviceTypeId &&
      params.sizeM2 >= rule.sizeM2From &&
      params.sizeM2 <= rule.sizeM2To
  );

  if (!match) {
    throw new NoMatchingPricingRuleError(params);
  }

  return {
    pricingRuleId: match.id,
    price: match.price,
    durationMinutes: match.durationMinutes,
  };
}

/**
 * Sprawdza, czy dana wielkość nieruchomości przekracza próg indywidualnej
 * wyceny — powyżej progu standardowa ścieżka rezerwacji online jest
 * niedostępna (patrz Settings.individualQuoteThresholdM2).
 */
export function exceedsIndividualQuoteThreshold(
  sizeM2: number,
  individualQuoteThresholdM2: number
): boolean {
  return sizeM2 > individualQuoteThresholdM2;
}
