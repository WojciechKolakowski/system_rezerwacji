# apps/worker

Panel pracownika (docelowo: serwis.mojastrona.pl). Next.js 16 (App Router), Mobile First
(jedyne środowisko użycia to telefon w terenie — desktop nie jest scenariuszem). Korzysta z
`@system-rezerwacji/shared`.

## Uruchomienie lokalne

```bash
npm run dev --workspace=apps/worker   # http://localhost:3003
```

Konta pracowników zakłada admin w `apps/admin` (`/employees`) — nie ma tu samodzielnej
rejestracji, tylko logowanie.

## Uwierzytelnianie

Ten sam wzorzec sesji cookie+JWT co pozostałe dwie aplikacje (patrz `apps/admin/README.md` po
uzasadnienie odstępstwa od Auth.js), rola `WORKER`.

## Zaimplementowane ekrany (Etap 1)

- `/login` — logowanie pracownika
- `/` — "Mój dzień": zlecenia przypisane na wybrany dzień (nawigacja poprzedni/następny), tylko
  te należące do zalogowanego pracownika (`Employee.userId`)
- `/bookings/[id]` — szczegóły zlecenia: adres, dane klienta, checklista (odhaczanie pozycji
  skopiowanych z `PropertyChecklistItem` nieruchomości w momencie rezerwacji), obowiązkowe
  potwierdzenie wykonania (status → `COMPLETED`) albo zgłoszenie problemu (status → `ISSUE`,
  wymaga opisu) — obie akcje działają tylko dopóki zlecenie jest `PENDING`/`CONFIRMED`

## Uwaga: daty kalendarzowe — wyłącznie metody lokalne

Nawigacja "Mój dzień" (poprzedni/następny dzień) musi liczyć dni **lokalnie**
(`getFullYear()/getMonth()/getDate()`), nigdy przez `toISOString().slice(0,10)` (UTC). W Polsce
(strefa wyprzedzająca UTC) użycie UTC do wyznaczenia kalendarzowego "dziś"/"jutro" potrafi cofnąć
dzień o jeden — dokładnie taki błąd wystąpił podczas testowania (linki „poprzedni”/„następny”
wskazywały dwa dni różnicy w złą stronę) i został naprawiony. To lustrzane odwrócenie zasady z
`apps/admin` dla pól `@db.Time` (tam poprawna jest wyłącznie UTC, bo epoka 1970-01-01 nie ma
znaczenia kalendarzowego) — nie kopiować tamtej konwencji tutaj.
