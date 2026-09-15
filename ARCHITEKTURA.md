# Architektura i plan wdrożenia — system rezerwacji sprzątania

Status: dokument roboczy do wspólnego przeglądu. **Implementacja produkcyjna jeszcze się nie
rozpoczęła** — repo zawiera na razie tylko szkielet katalogów (patrz `package.json`, `apps/*`,
`packages/shared`, `prisma`).

---

## 1. Stack technologiczny i uzasadnienie

| Warstwa | Wybór | Uzasadnienie |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | jedno repo, trzy aplikacje + pakiet współdzielony; Turborepo cache'uje build/test między aplikacjami korzystającymi z tego samego `packages/shared` |
| Frontend (×3) | Next.js (App Router) + TypeScript | jeden framework dla wszystkich trzech interfejsów, ale każdy jako **osobna aplikacja** (osobny `next.config`, osobny deployment) — nie jedna responsywna aplikacja na wszystko, zgodnie z wymogiem różnego podejścia do designu per interfejs |
| Stylowanie | Tailwind CSS | szybkie różnicowanie layoutów Mobile First (client, worker) vs Desktop-first (admin) bez narzutu customowego CSS frameworku |
| Panel admina — dodatkowo | TanStack Table (tabele/filtrowanie zleceń) + biblioteka kalendarza (np. FullCalendar) do widoku dostępności pracowników | admin ma pracować głównie na danych tabelarycznych i kalendarzu — to jedyny interfejs, gdzie warto zainwestować w cięższe komponenty desktopowe |
| Baza danych | PostgreSQL (Neon lub Supabase — managed) | jedna wspólna baza pod trzy aplikacje, zgodnie z wymogiem; managed Postgres upraszcza branching/backup na start |
| ORM / schemat | Prisma, schemat w `/prisma` w katalogu głównym | jeden `schema.prisma` jako źródło prawdy, generowany klient importowany przez `packages/shared` i stamtąd używany przez wszystkie trzy aplikacje |
| Warstwa API | **Brak osobnej aplikacji `apps/api`** — każda z trzech aplikacji Next.js ma własne Route Handlers / Server Actions, ale cała logika domenowa (walidacja, reguły cenowe, reguły dostępności, generowanie zleceń cyklicznych) leży w `packages/shared` i jest tylko **wywoływana** z każdej aplikacji | prostsze niż utrzymywanie czwartej usługi na MVP; "jedno wspólne API" realizujemy przez współdzieloną logikę + współdzielony schemat, nie przez współdzieloną usługę sieciową. Da się to później wydzielić do osobnego serwisu bez zmiany modelu danych, jeśli zajdzie potrzeba |
| Autentykacja | Auth.js (NextAuth) z sesją opartą o cookie na wspólnej domenie nadrzędnej (`.mojastrona.pl`) | pozwala na jedno logowanie rozpoznawane pod wszystkimi trzema subdomenami; autoryzacja per rola (`CLIENT`/`ADMIN`/`WORKER`) sprawdzana w middleware każdej aplikacji |
| Subdomeny | trzy osobne projekty Vercel wskazujące na ten sam monorepo, każdy z innym "root directory" (`apps/client`, `apps/admin`, `apps/worker`) i inną subdomeną | Vercel natywnie wspiera taki układ (monorepo → wiele projektów); nie wymaga customowego reverse-proxy |
| Płatności | moduł `packages/shared/payments` z interfejsem niezależnym od dostawcy (`createPayment`, `handleWebhook`, `refund`) | dostawca (Przelewy24 / Tpay / Autopay) jeszcze nie wybrany biznesowo — projektujemy jako wymienialny adapter, żeby decyzja nie blokowała startu prac nad resztą systemu |
| Powiadomienia | moduł `packages/shared/notifications`, niezależny od rdzenia rezerwacji, wywoływany asynchronicznie (nie blokuje potwierdzenia rezerwacji) | email (np. Resend) od razu w MVP jako tańszy/prostszy kanał; SMS jako adapter dodawany później — **transakcyjne od razu, marketingowe dopiero po zebraniu osobnej zgody RODO** (patrz `ClientProfile.marketingSmsConsent`) |
| Zadania cykliczne / przypomnienia | Vercel Cron wywołujący dedykowany Route Handler (generowanie kolejnych zleceń z serii cyklicznych, wysyłka przypomnień) | brak potrzeby osobnej infrastruktury kolejkowej na etapie MVP |
| Testy | Vitest (logika domenowa w `packages/shared`), Playwright (ścieżka rezerwacji end-to-end) | najwyższe ryzyko biznesowe leży w regułach cenowych/dostępności/cyklicznych — to jest to, co warto pokryć testami jednostkowymi w pierwszej kolejności |
| CI/CD | GitHub Actions (lint/typecheck/test na PR) + auto-deploy Vercel per aplikacja na push do `main` | standardowy, tani setup dla tej skali projektu |

---

## 2. Model danych

```mermaid
erDiagram
    USER ||--o| CLIENT_PROFILE : "role=CLIENT"
    USER ||--o| EMPLOYEE : "role=WORKER"
    CLIENT_PROFILE ||--o{ PROPERTY_ADDRESS : "zapisuje"
    DISTRICT ||--o{ EMPLOYEE_AVAILABILITY : "ma"
    EMPLOYEE ||--o{ EMPLOYEE_AVAILABILITY : "ma"
    EMPLOYEE ||--o{ AVAILABILITY_EXCEPTION : "ma"
    DISTRICT ||--o{ PRICING_RULE : "ma"
    SERVICE_TYPE ||--o{ PRICING_RULE : "ma"
    DISTRICT ||--o{ BOOKING : "dotyczy"
    SERVICE_TYPE ||--o{ BOOKING : "dotyczy"
    EMPLOYEE ||--o{ BOOKING : "realizuje"
    PROPERTY_ADDRESS ||--o{ BOOKING : "adres zlecenia"
    CLIENT_PROFILE ||--o{ BOOKING : "zleca"
    CLIENT_PROFILE ||--o{ RECURRING_SERIES : "posiada"
    RECURRING_SERIES ||--o{ BOOKING : "generuje"
    CHECKLIST_TASK_CATALOG ||--o{ CHECKLIST_PACKAGE_ITEM : "należy do"
    CHECKLIST_PACKAGE ||--o{ CHECKLIST_PACKAGE_ITEM : "zawiera"
    PROPERTY_ADDRESS ||--o{ PROPERTY_CHECKLIST_ITEM : "ma checklistę"
    PROPERTY_CHECKLIST_ITEM ||--o{ BOOKING_CHECKLIST_ITEM : "wzorzec dla"
    BOOKING ||--o{ BOOKING_CHECKLIST_ITEM : "zawiera"
    BOOKING ||--o| REVIEW : "może mieć"
    BOOKING ||--o| PAYMENT : "może mieć"
    QUOTE_REQUEST ||--o| BOOKING : "po akceptacji staje się"
    CLIENT_PROFILE ||--o{ QUOTE_REQUEST : "składa"
    CLIENT_PROFILE ||--o{ ONBOARDING_REQUEST : "składa"
    PROPERTY_ADDRESS ||--o{ ONBOARDING_REQUEST : "adres do spotkania"
```

### Encje

**User** — wspólna tabela kont, `role: CLIENT | ADMIN | WORKER`, dane logowania. `passwordHash`
jest **nullable** — obsługuje konta zaproszone przez admina (patrz niżej), które istnieją, zanim
klient sam ustawi hasło. Pola zaproszenia: `inviteToken` (unikalny, do linku "ustaw hasło"),
`inviteTokenExpiresAt`, `invitedAt`, `invitedById` (który admin zaprosił).

**ClientProfile** (1:1 z User, role=CLIENT)
- `status: PENDING_VERIFICATION | STANDARD | TRUSTED_RECURRING` — **kluczowa zmiana**: nowy
  klient NIE zaczyna od `STANDARD`. Domyślny status po rejestracji to `PENDING_VERIFICATION` —
  w tym stanie klient ma konto i może się zalogować, ale **nie może** złożyć żadnej standardowej
  rezerwacji online. Dopiero ręczne przejście do `STANDARD` przez admina (patrz `OnboardingRequest`
  niżej) odblokowuje standardową ścieżkę rezerwacji; `TRUSTED_RECURRING` odblokowuje dodatkowo
  rezerwacje cykliczne — to pozostaje bez zmian względem wcześniejszych ustaleń, tylko teraz jest
  to trzeci, wyższy stopień zamiast drugiego.
- `verifiedAt`, `verifiedById` (FK do `User` — admin) — kiedy i przez kogo klient został
  przestawiony na `STANDARD`, niezależnie od tego, czy stało się to przez zatwierdzenie
  `OnboardingRequest`, czy ręczną decyzją admina bez formalnego zgłoszenia (patrz niżej) — jedno
  spójne pole audytowe dla obu ścieżek.
- `marketingSmsConsent: boolean` + `marketingSmsConsentAt` — osobna zgoda RODO na SMS-y
  marketingowe, niezależna od transakcyjnych (potwierdzenia/przypomnienia nie jej wymagają).
- Konto jest **wymagane** przed pierwszą rezerwacją — brak ścieżki "rezerwacja jako gość". Nowe:
  samo posiadanie konta już nie wystarcza — trzeba też mieć status `STANDARD` lub wyższy.

**OnboardingRequest** (Zapytanie o rozpoczęcie współpracy) — **osobny typ zgłoszenia**, odrębny
od `QuoteRequest` (ten dotyczy wyceny dużych nieruchomości, nie weryfikacji tożsamości/relacji
z nowym klientem — różne powody, różne listy w panelu admina). Ścieżka standardowa:
- Nowy klient zakłada konto (rejestracja z hasłem od razu — inaczej niż `QuoteRequest`, tu klient
  **ma** konto już na starcie, tylko w statusie `PENDING_VERIFICATION`) i składa
  `OnboardingRequest`: `clientId`, `propertyAddressId` (adres, pod którym ma się odbyć spotkanie),
  opcjonalny `clientMessage` (opis potrzeb).
- `status: NEW | MEETING_SCHEDULED | VISITED | APPROVED | REJECTED`.
- `meetingScheduledAt` — termin spotkania fizycznego, widoczny w kalendarzu admina obok zleceń.
- `conductedById` (FK do `User` — kto faktycznie przeprowadził spotkanie, admin lub pracownik).
- `visitNotes` — notatka ze spotkania: wyposażenie, stan zabrudzenia nieruchomości, szczególne
  uwarunkowania/zmienne istotne przy przyszłych zleceniach.
- `approvedAt`, `approvedById` (FK do `User` — admin, który podjął decyzję), albo `rejectedAt` +
  `rejectionReason`.
- Zatwierdzenie (`APPROVED`) ustawia `ClientProfile.status = STANDARD` oraz
  `verifiedAt`/`verifiedById`.

**Druga, uproszczona ścieżka weryfikacji (bez formalnego zgłoszenia):** admin może ręcznie
założyć konto klienta, podając tylko jego e-mail — `User` powstaje z `passwordHash = null` i
`inviteToken`; klient dostaje e-mail z linkiem do ustawienia własnego hasła. Admin może od razu,
niezależnie od tego czy `OnboardingRequest` w ogóle istnieje, ręcznie zmienić
`ClientProfile.status` na `STANDARD` (np. dla poleconego klienta, znajomego, kontaktu
telefonicznego) — `verifiedAt`/`verifiedById` ustawiane tak samo jak przy zatwierdzeniu
zgłoszenia, więc panel admina ma jeden spójny widok "kto i kiedy zweryfikował danego klienta"
niezależnie od tego, którą ścieżką to się stało.

**PropertyAddress** (Adres nieruchomości) — klient może zapisać wiele adresów na koncie
(`clientId`, etykieta, ulica/nr, `districtId`, ewentualnie domyślne m²) i wybrać jeden z listy
przy kolejnych rezerwacjach zamiast wpisywać go od nowa. **Dzielnica jest atrybutem adresu**
(adres fizycznie leży w konkretnej dzielnicy) — przy wyborze zapisanego adresu `districtId` w
rezerwacji ustawia się automatycznie z adresu, klient nie wybiera dzielnicy osobno.

**Employee** (1:1 z User, role=WORKER) — dane pracownika.

**District** (Dzielnica) — obszar obsługi.

**EmployeeAvailability** (Dostępność pracownika) — trójka `pracownik + dzielnica + dzień/godziny`,
cykliczny harmonogram tygodniowy. Jeden pracownik w danym terminie pracuje w **jednej**
dzielnicy — model celowo nie zakłada przemieszczania się między dzielnicami w ciągu dnia.

**AvailabilityException** (Wyjątek w dostępności) — nadpisuje harmonogram tygodniowy dla
konkretnej daty: `employeeId`, `date`, `type: DAY_OFF | CUSTOM_HOURS`, opcjonalnie
`startTime/endTime` przy `CUSTOM_HOURS` (np. urlop, L4, skrócony dzień pracy).

**ServiceType** (Rodzaj usługi) — osobna tabela edytowalna przez admina (np. "standardowe",
"generalne/po remoncie"), nie sztywny enum w kodzie — spójne z tym, że reszta cennika też jest
w pełni konfigurowalna z panelu, bez potrzeby wdrożenia nowej wersji kodu przy dodaniu rodzaju
usługi.

**PricingRule** (Cennik) — stawka i czas trwania wizyty zależne łącznie od `districtId`,
`serviceTypeId` i przedziału `sizeM2From–sizeM2To`: pola `price` oraz `durationMinutes`
(np. do 50 m² → X minut, 50–65 m² → Y minut, 65–75 m² → Z minut, itd. — ta sama logika
przedziałowa napędza jednocześnie cenę i długość okienka w kalendarzu pracownika).

**Settings** — pojedynczy rekord konfiguracyjny:
- `individualQuoteThresholdM2` (próg m², domyślnie 50, edytowalny przez admina)
- `operationalLockWindowHours` (domyślnie 24h, edytowalny przez admina) — po przekroczeniu tego
  progu przed wizytą przycisk samoobsługowej anulacji w koncie klienta jest wyszarzony
- `partialRefundPercentage` (domyślnie 50%, edytowalny przez admina) — procent zwrotu przy
  anulacji "po zamknięciu okna operacyjnego", ale **tylko** gdy rezerwacja nie podlega już
  ustawowemu prawu odstąpienia (patrz niżej)
- ustawowy termin odstąpienia konsumenta (14 dni, art. 27 ustawy o prawach konsumenta) jest
  **stałą aplikacyjną, nieedytowalną przez admina** (świadomie brak pola w Settings — to wymóg
  prawny, nie parametr biznesowy; admin nie powinien mieć możliwości przypadkowego złamania
  prawa poprzez zmianę tej wartości)

**Booking** (Zlecenie)
- `clientId`, `employeeId` (przypisany automatycznie lub ręcznie), `districtId`,
  `propertyAddressId`, `serviceType`, `sizeM2`, `scheduledStart/End` (długość wyliczona z
  `PricingRule.durationMinutes` w momencie rezerwacji), `price`, `createdAt`
- `status: PENDING | CONFIRMED | COMPLETED | CANCELLED | ISSUE`
- `source: ONLINE_STANDARD | RECURRING_GENERATED | FROM_QUOTE | ADMIN_MANUAL`
- `recurringSeriesId` (nullable) — powiązanie z serią, jeśli wygenerowane cyklicznie
- pola potwierdzenia realizacji: `completedAt`, `completionNote`, `completionPhotoUrl`
- pola anulacji: `cancelledAt`, `cancelledBy`, `statutoryWithdrawalEligibleAtCancellation`
  (boolean, nullable — snapshot wyniku reguły ustawowej **w momencie zgłoszenia anulacji**;
  status `ISSUE` służy osobno do ręcznego oznaczenia przez admina sytuacji spornej, np.
  pracownik się nie stawił — patrz sekcja 5 pkt 4 dla pełnej logiki zwrotu)

**Checklisty — model per nieruchomość, nie jeden globalny szablon (zmiana z 2026-09-15).**
Pierwotnie zakładano jeden globalny `ChecklistTemplateItem` dla wszystkich zleceń. Docelowo
zakres sprzątania różni się między nieruchomościami tego samego klienta, więc checklista jest
własnością konkretnego adresu (`PropertyAddress`), nie stałą globalną:

- **ChecklistTaskCatalog** — globalna pula możliwych czynności ("Umyj okna", "Wyczyść lodówkę"
  itd.), edytowalna przez admina. To jest *słownik*, z którego admin wybiera — sam w sobie
  nie jest jeszcze niczyją checklistą.
- **ChecklistPackage** — nazwany zestaw czynności z katalogu ("paczka"), `type: STANDARD |
  ADDITIONAL`, opcjonalnie `isDefault` (dokładnie jedna paczka STANDARD może być domyślna).
  Paczka to **wyłącznie skrót przy konfigurowaniu checklisty nieruchomości** — kliknięcie
  paczki dodaje jej czynności do płaskiej listy danej nieruchomości; nie ma trwałego związku
  "ta nieruchomość używa paczki X", więc odpięcie/zmiana paczki później nie usuwa już
  dodanych pozycji ani ich nie synchronizuje wstecznie.
- **PropertyChecklistItem** — faktyczna, płaska checklista danej nieruchomości (`propertyAddressId`,
  `label`, `sortOrder`, `active`). Admin konfiguruje ją w dwóch miejscach: (a) jako krok przy
  zatwierdzaniu `OnboardingRequest` (naturalny moment, bo admin i tak jest "przy temacie" po
  wizycie), oraz (b) w każdej chwili później w osobnym ekranie (np. gdy klient zmienia zakres
  usługi). **Nowa nieruchomość dostaje automatycznie czynności z domyślnej paczki STANDARD**
  w momencie jej utworzenia przez klienta — nie zaczyna pusta.
- **BookingChecklistItem** — pozycje checklisty per zlecenie, kopiowane (snapshot) z
  `PropertyChecklistItem` danego adresu w momencie utworzenia `Booking` + status wykonania
  (checkbox). Późniejsza edycja checklisty nieruchomości nie zmienia checklisty już
  utworzonych zleceń — te same zasady snapshotu co wcześniej przy globalnym szablonie.

**RecurringSeries** (Seria/subskrypcja cykliczna)
- `clientId`, `districtId`, `preferredEmployeeId` (nullable), `frequency: WEEKLY | BIWEEKLY`,
  `preferredDayOfWeek`, `preferredStartTime`, `sizeM2`, `status: ACTIVE | PAUSED | CANCELLED`,
  `createdBy: CLIENT | ADMIN` — z serii generowane są kolejne pojedyncze `Booking`.

**QuoteRequest** (Zapytanie o indywidualną wycenę) — osobna encja/status, niezależna od
standardowego `Booking`. **Nie wymaga zalogowania** — to lekki formularz kontaktowy (niższy próg
wejścia dla dużych nieruchomości), więc `clientId` jest **nullable**, a dane kontaktowe
(`contactName`, `contactPhone`, `contactEmail`) są zbierane wprost w formularzu niezależnie od
tego, czy zgłaszający ma już konto. Dalej: opis nieruchomości, `sizeM2`, `districtId`,
`status: NEW | IN_REVIEW | QUOTED | CONVERTED | REJECTED`, `quotedPrice`, `convertedBookingId`.
To tutaj admin ręcznie decyduje o ewentualnej większej ekipie — nie modelujemy encji "zespół" w
MVP.

**Payment** — zawsze **pełna kwota z góry** przy standardowej rezerwacji (bez zadatków/dowolnych
kwot w MVP). `bookingId` jest **nullable** celowo: przyszły moduł faktur dla stałych klientów
(płatność BLIK niepowiązana ze standardową rezerwacją online) nie będzie wymagał zmiany modelu.
`provider`, `providerPaymentId`, `status: PENDING | PAID | REFUNDED | PARTIALLY_REFUNDED | FAILED`,
`amount`, `type: BOOKING_PAYMENT | INVOICE (przyszłość)`, `refundedAt`, `refundPercentage`
(nullable — 100 albo `partialRefundPercentage` z Settings), `refundType: FULL_SELF_SERVICE |
FULL_STATUTORY_RIGHT | PARTIAL_POLICY | MANUAL_ISSUE` (nullable), `refundReason` (notatka admina,
istotna zwłaszcza przy `MANUAL_ISSUE`).

**Review** (Ocena) — `bookingId`, `rating`, `comment`, jeden per zakończone zlecenie.

---

## 3. Kluczowe przepływy (user flows)

### Klient — weryfikacja nowego klienta (poprzedza jakąkolwiek rezerwację)
1. Rejestracja (konto + hasło) **lub** klient loguje się do konta założonego wcześniej przez
   admina (link z e-maila zaproszenia → ustawienie hasła). W obu przypadkach startowy status to
   `PENDING_VERIFICATION`.
2. W statusie `PENDING_VERIFICATION` klient **nie widzi** opcji standardowej rezerwacji — może
   jedynie dodać adres nieruchomości i złożyć `OnboardingRequest` ("zapytanie o rozpoczęcie
   współpracy").
3. Admin ustala termin spotkania fizycznego pod wskazanym adresem (`meetingScheduledAt`,
   widoczne w jego kalendarzu), po spotkaniu wpisuje `visitNotes` (wyposażenie, stan
   zabrudzenia, uwarunkowania) i podejmuje decyzję: `APPROVED` → `ClientProfile.status =
   STANDARD`, albo `REJECTED` (z powodem).
4. Alternatywnie: admin ręcznie zmienia status klienta na `STANDARD` bez formalnego zgłoszenia
   (np. klient polecony) — patrz opis w sekcji 2.
5. Dopiero od tego momentu klient widzi i może korzystać ze standardowej ścieżki rezerwacji
   (i, jeśli dodatkowo nadany, ze ścieżki cyklicznej — to kolejny, osobny próg jak dotychczas).

### Klient — ścieżka standardowa (wymaga statusu `STANDARD` lub `TRUSTED_RECURRING`)
0. Logowanie (konto i status `STANDARD`+ są wymagane przed rezerwacją) → wybór zapisanego
   `PropertyAddress` albo dodanie nowego.
1. Wybór dzielnicy → podanie m² i rodzaju usługi (`serviceType`) nieruchomości.
2. Jeśli `sizeM2 > individualQuoteThresholdM2` → przycisk "Indywidualna wycena" → formularz
   `QuoteRequest` (bez płatności) → koniec ścieżki standardowej.
3. Jeśli w progu → system liczy cenę i czas trwania z `PricingRule` (dzielnica + rodzaj usługi +
   przedział m²) i pokazuje wolne okienka **w wybranej dzielnicy**, oparte o
   `EmployeeAvailability` i `AvailabilityException`, pomniejszone o istniejące `Booking`.
4. Jeśli w danym okienku dostępny jest więcej niż jeden pracownik → klient wybiera; jeśli jeden →
   przypisanie automatyczne, bez wyboru.
5. Płatność online od razu, pełna kwota → utworzenie `Booking(status=CONFIRMED)` →
   potwierdzenie.
6. Anulacja — patrz pełna logika w sekcji 5 pkt 4 (dwa niezależne progi: okno operacyjne 24h i
   ustawowe prawo odstąpienia 14 dni). W skrócie: do `operationalLockWindowHours` przed wizytą
   klient anuluje samoobsługowo, zwrot 100% automatyczny; po tym progu przycisk jest wyszarzony,
   a decyzję (pełny zwrot z mocy prawa albo potrącenie wg `partialRefundPercentage`) podejmuje
   admin na podstawie flagi wyliczonej przez system.
7. Po realizacji: klient może wystawić `Review`.

### Klient — ścieżka cykliczna (tylko status `TRUSTED_RECURRING`)
1. W koncie klienta pojawia się opcja "zleć usługę cykliczną" (widoczna wyłącznie po ręcznym
   nadaniu statusu przez admina).
2. Klient ustawia częstotliwość + preferowany dzień/godzinę/pracownika → powstaje
   `RecurringSeries`.
3. Cron generuje kolejne `Booking(source=RECURRING_GENERATED)` z **miesięcznym wyprzedzeniem**
   względem bieżącej daty (zawsze dopełnia okno do +1 miesiąc, w miarę jak starsze zlecenia się
   realizują).
4. Alternatywnie: admin tworzy/steruje serią całkowicie ręcznie, bez udziału klienta.

### Admin
- Zarządzanie dzielnicami, cennikiem (m² × dzielnica × rodzaj usługi, wraz z czasem trwania),
  progiem m².
- Zarządzanie katalogiem czynności (`ChecklistTaskCatalog`) i paczkami (`ChecklistPackage`,
  `STANDARD`/`ADDITIONAL`, jedna paczka `STANDARD` może być domyślna dla nowych nieruchomości).
- Konfiguracja checklisty per nieruchomość (`PropertyChecklistItem`) — przy zatwierdzaniu
  `OnboardingRequest` oraz w każdej chwili później z listy nieruchomości.
- Zarządzanie pracownikami, ich `EmployeeAvailability` (cykliczny harmonogram per dzielnica) oraz
  `AvailabilityException` (urlopy/L4/zmiany godzin per dzień).
- Lista `OnboardingRequest` (osobno od `QuoteRequest`) → planowanie spotkania fizycznego →
  notatki z wizyty → zatwierdzenie (`STANDARD`) lub odrzucenie nowego klienta. Alternatywnie:
  ręczne założenie konta klienta (e-mail → zaproszenie) i/lub ręczna zmiana statusu na
  `STANDARD` bez formalnego zgłoszenia.
- Lista `QuoteRequest` (osobno od zleceń standardowych) → ręczna wycena → ewentualna organizacja
  większej ekipy poza systemem → konwersja do `Booking`.
- Nadawanie/cofanie statusu `TRUSTED_RECURRING` klientom (wymaga uprzedniego `STANDARD`).
- Ręczne tworzenie/edycja `RecurringSeries` dla klienta.
- Podgląd i zarządzanie wszystkimi zleceniami (w tym generowanymi cyklicznie) i płatnościami;
  ręczne oznaczanie zlecenia jako `ISSUE` (np. pracownik się nie stawił) i ręczne zatwierdzanie
  zwrotu w takich spornych przypadkach (odróżnia to od automatycznego zwrotu przy zwykłej
  anulacji przez klienta do 24h przed wizytą).
- Podgląd ocen klientów.

### Pracownik
1. Logowanie → widok "Mój dzień": lista `Booking` przypisanych na dany dzień z adresem
   (z `PropertyAddress`).
2. Wejście w zlecenie → checklista (`BookingChecklistItem`, skopiowana z checklisty tej
   konkretnej nieruchomości w momencie utworzenia zlecenia) do odhaczenia.
3. Obowiązkowe potwierdzenie wykonania (przycisk + opcjonalna notatka/zdjęcie) →
   `Booking.status = COMPLETED`. Jeśli usługa nie została wykonana, pracownik/admin oznacza
   zlecenie jako `ISSUE` zamiast `COMPLETED` — dalsza decyzja (zwrot, ponowny termin) należy do
   admina.

---

## 4. Etapy wdrożenia

**Etap 0 — szkielet.** Trzy puste aplikacje wdrożone na subdomenach, schemat Prisma, logowanie
i role, `packages/shared` z typami bazowymi. *(ten etap odpowiada obecnemu punktowi w repo)*

**Etap 1 — MVP: weryfikacja klienta + ścieżka standardowa.**
Admin: CRUD dzielnic, cennika, dostępności pracowników, progu m².
Klient: rejestracja → `PENDING_VERIFICATION` → `OnboardingRequest` (albo ręczne
zaproszenie/aktywacja przez admina) → po zatwierdzeniu (`STANDARD`) pełna ścieżka standardowa
(wybór dzielnicy/m²/terminu, płatność online, potwierdzenie).
Pracownik: "Mój dzień", checklista, potwierdzenie realizacji.
Admin: lista `OnboardingRequest` z planowaniem spotkań i notatkami, podgląd zleceń i płatności.
→ To jest pierwsza wersja, którą można realnie uruchomić komercyjnie dla jednoosobowych zleceń.
Weryfikacja klienta musi wejść już tutaj, a nie w późniejszym etapie — bez niej nikt nowy nie
może w ogóle skorzystać ze ścieżki standardowej.

**Etap 2 — indywidualna wycena.** Formularz `QuoteRequest` po stronie klienta + panel obsługi
zapytań i konwersji do zlecenia po stronie admina.

**Etap 3 — rezerwacje cykliczne.** Status `TRUSTED_RECURRING`, `RecurringSeries`, generator
kolejnych zleceń (cron), opcja cykliczna w koncie klienta oraz ręczne tworzenie serii przez
admina.

**Etap 4 — oceny i powiadomienia.** `Review` po stronie klienta + podgląd ocen w adminie;
moduł powiadomień e-mail/SMS (potwierdzenia, przypomnienia przed wizytą).

**Etap 5 — rozszerzenia.** Moduł faktur z płatnością BLIK dla stałych klientów o ustalonej
indywidualnej cenie; dopracowanie PWA panelu pracownika; kolejne miasta/dzielnice.

---

## 5. Ustalone decyzje biznesowe

Poniższe reguły zostały potwierdzone i są już odzwierciedlone w modelu danych i przepływach
powyżej — nie są to już otwarte pytania.

1. **Cennik:** stawka zależy łącznie od dzielnicy, rodzaju usługi i przedziału m² (`PricingRule`).
2. **Model płatności:** zawsze pełna kwota z góry przy standardowej rezerwacji — bez zadatków ani
   dowolnych kwot w MVP.
3. **Checklista:** per nieruchomość (`PropertyChecklistItem`), nie jeden globalny szablon
   (zmiana z 2026-09-15) — admin wybiera czynności z katalogu (`ChecklistTaskCatalog`),
   opcjonalnie przez paczki-skróty (`ChecklistPackage`); nowa nieruchomość dostaje domyślną
   paczkę STANDARD automatycznie. Kopiowana do `BookingChecklistItem` w momencie utworzenia
   zlecenia (snapshot, jak dotąd).
4. **Anulacja i zwrot — dwa niezależne progi, nie jedna sztywna reguła:**
   - `operationalLockWindowHours` (domyślnie 24h przed wizytą, edytowalne w Settings) — próg
     **operacyjny**: do tego momentu klient anuluje samoobsługowo w koncie, zwrot **100%
     automatyczny**. Po przekroczeniu progu przycisk anulacji w panelu klienta jest wyszarzony,
     z komunikatem kierującym do kontaktu z administratorem (bez podawania z góry wysokości
     zwrotu w UI — bo zależy to od pkt niżej).
   - `statutoryWithdrawalDays` = **14 dni od zawarcia umowy** (czyli od `Booking.createdAt`,
     nie od terminu wizyty) — **ustawowe** prawo odstąpienia konsumenta (art. 27 ustawy o
     prawach konsumenta), stała aplikacyjna, **nieedytowalna** przez admina.
   - Logika po stronie systemu, gdy klient zgłasza anulację **po** zamknięciu okna
     operacyjnego: jeśli od utworzenia rezerwacji minęło mniej niż `statutoryWithdrawalDays`,
     system oznacza rezerwację flagą **"podlega ustawowemu prawu odstąpienia — należny pełny
     zwrot"** w panelu admina (admin obsługuje ręcznie, ale system wskazuje mu jednoznacznie
     wymagany wynik, nie zostawia tego "na oko"); jeśli minęło więcej — flaga **"poza okresem
     ochronnym — możliwe potrącenie zgodnie z regulaminem"**, a zwrot = `partialRefundPercentage`.
   - Wynik tej reguły jest zapisywany jako snapshot na `Booking.statutoryWithdrawalEligibleAtCancellation`
     w momencie zgłoszenia anulacji (nie przeliczany później retroaktywnie), a faktycznie
     wykonany zwrot opisuje `Payment.refundType` / `refundPercentage`.
   - Rekompensata dla pracownika za "puste okno" w grafiku przy anulacjach objętych pełnym
     zwrotem klienta to **osobny, niepowiązany mechanizm** (nie wpływa na logikę zwrotu klienta)
     — świadomie odłożony poza zakres MVP, do rozważenia w dalszych etapach.
   - ⚠️ Zakres ustawowego prawa odstąpienia dla usług sprzątania (czy nie zachodzi tu któryś z
     wyjątków z art. 38 ustawy o prawach konsumenta) warto potwierdzić z prawnikiem przed
     wdrożeniem produkcyjnym — model danych jest przygotowany na obie interpretacje, ale sama
     reguła prawna nie jest tu przez nas asertowana jako pewnik.
5. **Niewykonanie usługi:** admin ręcznie oznacza zlecenie jako `ISSUE` i ręcznie decyduje o
   zwrocie — brak automatyzacji dla tego przypadku (celowo odróżnione od zwrotu przy zwykłej
   anulacji).
6. **Adresy klienta:** klient może zapisać wiele adresów (`PropertyAddress`) i wybierać z listy.
7. **Konto:** wymagane przed pierwszą rezerwacją — brak ścieżki "gość".
8. **Czas trwania wizyty:** wynika z tych samych przedziałów m² co cena (`PricingRule.durationMinutes`),
   różny w zależności od dzielnicy/rodzaju usługi.
9. **Wyjątki w dostępności:** potrzebne w MVP — admin edytuje wyjątki per dzień
   (`AvailabilityException`), niezależnie od cyklicznego harmonogramu tygodniowego.
10. **Generowanie zleceń cyklicznych:** z wyprzedzeniem całego miesiąca względem bieżącej daty
    (cron dopełnia okno na bieżąco).
11. **Dostawca płatności:** jeszcze nie wybrany — moduł płatności projektujemy jako wymienialny
    adapter (Przelewy24 / Tpay / Autopay do wyboru później, bez zmiany reszty systemu).
12. **Powiadomienia SMS:** zbieramy osobną zgodę marketingową RODO (`marketingSmsConsent`) już od
    MVP, niezależną od transakcyjnych przypomnień/potwierdzeń, które jej nie wymagają.
13. **Weryfikacja nowego klienta przed pierwszą rezerwacją (zmiana z 2026-09-14):** samo
    założenie konta już nie wystarcza do złożenia standardowej rezerwacji. Nowy status
    `PENDING_VERIFICATION` jest domyślny po rejestracji; dopiero ręczne przejście do `STANDARD`
    (przez zatwierdzenie `OnboardingRequest` po spotkaniu fizycznym, albo bezpośrednią decyzją
    admina bez formalnego zgłoszenia) odblokowuje ścieżkę standardową. `OnboardingRequest` to
    **osobny typ zgłoszenia**, niezależny od `QuoteRequest` (inny powód, inna lista w adminie).
    Admin może też sam założyć klientowi konto (e-mail → zaproszenie z linkiem do ustawienia
    hasła) i od razu ręcznie go zweryfikować. Spotkanie fizyczne dokumentujemy w systemie:
    termin (widoczny w kalendarzu admina), notatka o wyposażeniu/stanie nieruchomości/
    uwarunkowaniach, oraz kto podjął decyzję i kiedy.
