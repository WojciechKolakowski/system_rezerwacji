# apps/admin

Panel zarządczy dla właściciela firmy (docelowo: panel.mojastrona.pl). Next.js 16 (App Router),
Desktop-first. Korzysta z `@system-rezerwacji/shared` (Prisma + logika domenowa).

## Uruchomienie lokalne

Wymaga `.env` z `DATABASE_URL`, `DIRECT_URL` (patrz `.env.example` w katalogu głównym repo) i
opcjonalnie `SESSION_SECRET` (w dev ma bezpieczny placeholder, w produkcji wymagany).

```bash
npm run dev --workspace=apps/admin   # http://localhost:3001
```

Konto administratora tworzy się przez seed: `npm run db:seed` w katalogu głównym repo (patrz
`prisma/seed.ts`) — domyślnie `admin@system-rezerwacji.local`.

## Uwierzytelnianie

Sesja oparta o podpisany JWT (biblioteka `jose`) w cookie `httpOnly`, weryfikowana w
`src/proxy.ts` (odpowiednik `middleware.ts` w Next.js 16) dla każdej trasy poza `/login`, oraz
ponownie w każdej mutującej Server Action przez `requireAdmin()` (`src/lib/authGuard.ts`) —
zgodnie z zaleceniem Next.js, żeby nie polegać wyłącznie na proxy.

**Odstępstwo od ARCHITEKTURA.md:** dokument architektury zakładał Auth.js (NextAuth). Ponieważ
ten projekt startuje na Next.js 16 (bardzo świeżym) i NextAuth v5 wciąż jest w becie, a
kombinacja obu na tym etapie niosła realne ryzyko niezgodności bez rozległych testów,
zaimplementowano lekką, w pełni kontrolowaną sesję cookie+JWT zamiast NextAuth. Model danych
(`User.passwordHash`, role) jest identyczny, więc przejście na Auth.js later nie wymaga migracji
danych, tylko wymiany warstwy sesji.

## Zaimplementowane ekrany (Etap 1)

- `/login` — logowanie (tylko rola ADMIN)
- `/` — pulpit z licznikami
- `/districts` — CRUD dzielnic
- `/service-types` — CRUD rodzajów usług
- `/pricing-rules` — cennik (dzielnica × rodzaj usługi × przedział m² → cena + czas trwania)
- `/employees` — pracownicy + ich dostępność tygodniowa (`EmployeeAvailability`)
- `/settings` — próg indywidualnej wyceny, okno operacyjne anulacji, procent zwrotu
- `/onboarding-requests` — zapytania o rozpoczęcie współpracy: planowanie spotkania, notatka z
  wizyty, zatwierdzenie (→ `ClientProfile.status = STANDARD`) albo odrzucenie

## Uwaga: czas-bez-daty (`@db.Time`)

Pola typu "sama godzina" (`EmployeeAvailability.startTime/endTime` itd.) są zapisywane i
odczytywane **wyłącznie przez metody UTC** (`Date.UTC(...)`, `getUTCHours()`/`getUTCMinutes()`),
nigdy przez lokalne odpowiedniki. Epoka `1970-01-01` leży w zimie, więc lokalna konstrukcja
zastosowałaby zimowy offset strefy czasowej serwera i przesunęłaby zapisaną godzinę — dokładnie
taki błąd wystąpił podczas testowania i został naprawiony (patrz `employees/actions.ts` i
`packages/shared/src/availability.ts`). Trzymaj się UTC przy każdym kolejnym miejscu zapisującym
pole `@db.Time` (np. przyszłe `RecurringSeries.preferredStartTime`,
`AvailabilityException.startTime/endTime`).
