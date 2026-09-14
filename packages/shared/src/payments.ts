/**
 * Kontrakt adaptera płatności — niezależny od konkretnego dostawcy
 * (Przelewy24 / Tpay / Autopay, wybór jeszcze nie podjęty biznesowo, patrz
 * ARCHITEKTURA.md sekcja 5 pkt 11). Konkretna implementacja (np.
 * `Przelewy24Provider implements PaymentProvider`) powstanie dopiero po
 * wyborze dostawcy — na razie tylko kontrakt, żeby reszta systemu
 * (tworzenie Booking, obsługa webhooków, zwroty) mogła być pisana przeciwko
 * interfejsowi, a nie konkretnemu SDK.
 */

export interface CreatePaymentParams {
  /** Kwota w groszach/najmniejszej jednostce waluty, żeby uniknąć błędów zaokrągleń. */
  amountMinor: number;
  currency: "PLN";
  clientId: string;
  /** Nullable zgodnie z modelem Payment — przyszłe faktury nie muszą być powiązane z Booking. */
  bookingId: string | null;
  description: string;
  returnUrl: string;
}

export interface CreatePaymentResult {
  providerPaymentId: string;
  /** URL, na który należy przekierować klienta do dokończenia płatności (np. wybór BLIK/karta). */
  redirectUrl: string;
}

export interface WebhookVerificationResult {
  providerPaymentId: string;
  status: "PAID" | "FAILED";
}

export interface RefundParams {
  providerPaymentId: string;
  amountMinor: number;
}

export interface RefundResult {
  success: boolean;
  providerRefundId?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  /** Weryfikuje podpis/autentyczność webhooka i zwraca znormalizowany wynik. */
  verifyWebhook(rawBody: string, headers: Record<string, string>): WebhookVerificationResult;
  refund(params: RefundParams): Promise<RefundResult>;
}

/**
 * Kwota zwrotu na podstawie procentu wyliczonego przez
 * `cancellation.determineCancellationOutcome` — zaokrąglona do pełnych
 * groszy, żeby uniknąć błędów zmiennoprzecinkowych przy operacjach na
 * pieniądzach.
 */
export function computeRefundAmountMinor(originalAmountMinor: number, refundPercentage: number): number {
  return Math.round((originalAmountMinor * refundPercentage) / 100);
}
