# packages/shared

Wspólna logika domenowa i klient Prisma używane przez apps/client, apps/admin i apps/worker.
Konsumowane bezpośrednio jako TypeScript (bez kroku builda) przez Next.js (`transpilePackages`).

## Moduły

- `db.ts` — współdzielona instancja `PrismaClient`.
- `pricing.ts` — dopasowanie `PricingRule` (dzielnica × rodzaj usługi × m²) do ceny i czasu
  trwania wizyty; próg indywidualnej wyceny.
- `availability.ts` — wolne okienka pracowników w danej dzielnicy i dniu, z uwzględnieniem
  `EmployeeAvailability`, `AvailabilityException` i istniejących `Booking`; grupowanie okienek po
  czasie startu (reguła "jeden pracownik → auto-przypisanie, wielu → wybór klienta").
- `cancellation.ts` — dwuprogowa logika anulacji/zwrotu (okno operacyjne vs. ustawowe prawo
  odstąpienia) — patrz ARCHITEKTURA.md sekcja 5 pkt 4.
- `recurring.ts` — generowanie dat kolejnych wystąpień `RecurringSeries` w oknie miesięcznym,
  idempotentne względem już istniejących zleceń.
- `clientAccess.ts` — bramka `PENDING_VERIFICATION` / `STANDARD` / `TRUSTED_RECURRING`.
- `onboarding.ts` — maszyna stanów `OnboardingRequest` (NEW → MEETING_SCHEDULED → VISITED →
  APPROVED/REJECTED) i wspólna aktualizacja `ClientProfile` przy zatwierdzeniu (ten sam ślad
  audytowy niezależnie od tego, czy zatwierdzenie idzie przez formalne zgłoszenie, czy ręczną
  decyzję admina).
- `invite.ts` — token zaproszenia dla kont zakładanych ręcznie przez admina (7 dni ważności).
- `payments.ts` — kontrakt `PaymentProvider` niezależny od dostawcy (Przelewy24/Tpay/Autopay
  jeszcze nie wybrany) + wyliczanie kwoty zwrotu z procentu.

## Testy

`npm test --workspace=packages/shared` (Vitest). Logika w tym pakiecie jest celowo napisana jako
czyste funkcje (dane wejściowe jako zwykłe obiekty, nie zapytania Prisma) — testy jednostkowe nie
wymagają bazy danych.
