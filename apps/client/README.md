# apps/client

Interfejs klienta (docelowo: mojastrona.pl). Next.js 16 (App Router), Mobile First. Korzysta z
`@system-rezerwacji/shared` (Prisma + logika domenowa).

## Uruchomienie lokalne

```bash
npm run dev --workspace=apps/client   # http://localhost:3002
```

Wymaga `.env` z `DATABASE_URL`, `DIRECT_URL`, opcjonalnie `SESSION_SECRET` (jak w `apps/admin`).

## Uwierzytelnianie

Ten sam wzorzec sesji cookie+JWT co `apps/admin` (patrz README tamtej aplikacji po uzasadnienie
odstępstwa od Auth.js z ARCHITEKTURA.md) — osobna instancja per aplikacja, rola `CLIENT`.

## Zaimplementowane ekrany (Etap 1)

- `/register`, `/login` — rejestracja i logowanie klienta
- `/` — pulpit: status weryfikacji, nadchodzące zlecenia
- `/onboarding` — zapytanie o rozpoczęcie współpracy (widoczne tylko dla `PENDING_VERIFICATION`)
- `/addresses` — zarządzanie adresami nieruchomości
- `/book` — standardowa rezerwacja (wybór adresu/usługi/m²/daty → wolne okienka → potwierdzenie).
  **Cena, czas trwania i dostępność są zawsze przeliczane od nowa po stronie serwera** w
  `book/actions.ts` — formularz nigdy nie jest źródłem prawdy dla tych wartości, żeby nie dało
  się ich podmienić w żądaniu.
- `/bookings` — historia zleceń + samoobsługowa anulacja (używa
  `cancellation.determineCancellationOutcome` z `packages/shared` — przycisk jest wyłączony, gdy
  okno operacyjne już minęło, zgodnie z ARCHITEKTURA.md sekcja 5 pkt 4)
- `/quote-request` — formularz indywidualnej wyceny dla dużych nieruchomości, **dostępny bez
  logowania** (zgodnie z modelem `QuoteRequest.clientId` nullable); jeśli zgłaszający jest
  zalogowany, zgłoszenie i tak zostaje powiązane z jego kontem

## Płatności — świadomy stub

Dostawca płatności (Przelewy24/Tpay/Autopay) nie został jeszcze wybrany biznesowo (patrz
ARCHITEKTURA.md sekcja 5 pkt 11). Do czasu integracji `confirmBooking` w `book/actions.ts`
zapisuje `Payment` ze statusem `PAID` i `provider: "STUB_MANUAL"` — wystarczające do testowania
reszty przepływu (w tym anulacji/zwrotów), ale **nie jest to prawdziwa płatność**. Zamienić na
realny adapter zgodny z kontraktem `PaymentProvider` z `packages/shared/src/payments.ts`.

## Zweryfikowane end-to-end (przeglądarka + realna baza Neon)

Rejestracja → `PENDING_VERIFICATION` → dodanie adresu → `OnboardingRequest` → zatwierdzenie w
`apps/admin` → `STANDARD` → wyszukanie terminu w `/book` → rezerwacja → `Payment` (stub) →
`/bookings` → anulacja samoobsługowa → `Payment.status=REFUNDED` z poprawnym
`refundType=FULL_SELF_SERVICE`.
