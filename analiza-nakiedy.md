# Analiza funkcjonalna nakiedy.pl

Analiza sporządzona na podstawie publicznie dostępnych stron serwisu nakiedy.pl
(strona główna, /funkcje.html, /wtyczki.html, /dla-kogo-rezerwacje-wizyt.html,
/blog, /zarejestruj.html na app.nakiedy.pl). To opis funkcjonalny i wnioski —
bez kopiowania treści ani kodu ze źródła. Punkt odniesienia do projektowania
systemu rezerwacji usług sprzątania.

## 1. Przepływ rezerwacji z perspektywy klienta

Na podstawie opisu funkcji (kalendarz rezerwacji, koszyk rezerwacji, statusy
wizyt) przepływ wygląda następująco:

1. Klient trafia na widget/stronę rezerwacji (osadzoną na stronie firmy,
   zakładce Facebook lub jako samodzielna podstrona).
2. Wybiera usługę (opcjonalnie pogrupowaną w kategorie).
3. Wybiera pracownika (lub zostawia system, by przydzielił dowolnego
   dostępnego) — pracowników można też "ukrywać" z widoku klienta.
4. Wybiera termin z kalendarza (widok miesiąc / dzień / lista), zgodnie z
   grafikiem pracy danego pracownika.
5. Opcjonalnie dodaje kolejne usługi/terminy do "koszyka rezerwacji" (można
   rezerwować i płacić za wiele wizyt naraz) lub zaznacza rezerwację cykliczną
   (te same godziny, kolejne tygodnie).
6. Podaje dane kontaktowe (formularz — zakres nieznany ze strony publicznej,
   ale wprost wspomniane są "zasady rezerwacji" i potwierdzenie danych
   kontaktowych klienta jako mechanizm ochrony biznesu przed nieuczciwymi
   rezerwacjami). Możliwe logowanie/rejestracja klienta przez Facebook.
7. Jeśli firma ma włączone płatności online (Przelewy24) — klient płaci pełną
   kwotę, zadatek lub dowolną kwotę bezpośrednio na etapie rezerwacji.
8. Klient otrzymuje potwierdzenie (mail/SMS), a przed wizytą — przypomnienie
   (email/SMS, treść i termin wysyłki konfigurowalne przez właściciela); może
   też (wg tytułu jednego z wpisów blogowych) potwierdzić lub odwołać wizytę
   przez SMS.
9. Rezerwacja trafia do kalendarza ze statusem, który właściciel/pracownik
   akceptuje lub zmienia jednym kliknięciem.

Dane zbierane przed/przy rezerwacji (na podstawie opisu funkcji, bez dostępu
do samego formularza): usługa, pracownik, termin, dane kontaktowe klienta,
zgoda na regulamin/zasady rezerwacji i polityki anulowania, opcjonalnie dane
płatnicze (obsługiwane przez Przelewy24, nie bezpośrednio przez system).
RODO jest adresowane osobnym wpisem blogowym (umowa powierzenia, dodatkowe
zgody) — sugeruje to oddzielną zgodę RODO przy rezerwacji/rejestracji.

## 2. Panel zarządczy właściciela

- **Pracownicy**: definiowanie grafików pracy (także na konkretne tygodnie/
  daty), indywidualne logowanie do panelu (e-mail + hasło), nadawanie
  uprawnień na różnych poziomach, powiadomienia o nowych rezerwacjach,
  drukowanie/eksport grafików do PDF, sortowanie kolejności pracowników.
- **Usługi**: cennik, kategorie usług, sortowanie, dodatkowy czas po usłudze
  (bufor na sprzątanie/przygotowanie stanowiska), skrócona nazwa usługi do
  SMS-ów, opcja ukrycia czasu trwania usługi.
- **Kalendarz i statusy wizyt**: 3 widoki (miesiąc/dzień/lista), edycja/
  usuwanie/akceptacja jednym kliknięciem, blokowanie terminów, statusy przed
  wizytą (potwierdzona/oczekująca) i po wizycie (odbyła się / nie odbyła się).
- **Klienci**: kartoteka z pełną historią wizyt, wyszukiwanie, możliwość
  zablokowania wybranych klientów (ochrona przed nadużyciami).
- **Statystyki i raporty**: ogólne statystyki systemu, statystyki per
  pracownik/usługa/klient, eksport listy rezerwacji, filtrowanie po dacie,
  statusie, pracowniku, usłudze.
- **Płatności**: zestawienie płatności online z filtrowaniem.
- **Zajęcia grupowe**: osobny tryb rezerwacji z limitem miejsc (kursy,
  zajęcia, wykłady) obok standardowych wizyt 1:1.

## 3. Model płatności

- Integracja z Przelewy24 (przelewy online, karty, PayPal za pośrednictwem
  Przelewy24) — konfiguracja przez wpisanie dwóch pól z panelu Przelewy24 do
  Nakiedy (system nie jest własnym PSP, tylko nakładką).
- 3 tryby ustalania ceny przy rezerwacji: pełna kwota, zadatek, dowolna kwota.
- Koszyk rezerwacji: możliwość wybrania i opłacenia wielu terminów/usług w
  jednej transakcji.
- Płatności działają zarówno na stronie WWW klienta, jak i w zakładce
  Facebook — jeden wspólny system płatności/kalendarza dla obu kanałów.

## 4. Osadzanie systemu na zewnętrznej stronie

- **Wtyczka WordPress**: instalacja jak zwykła wtyczka z repozytorium
  (wyszukanie po nazwie, instalacja, wklejenie klucza API z panelu Nakiedy,
  wstawienie na nową podstronę).
- **Aplikacja Facebook**: osobna zakładka na stronie firmowej Facebook,
  współdzieląca usługi/ceny/terminy z resztą systemu (ważna uwaga: od
  6 kwietnia 2019 Facebook zablokował dodawanie nowych aplikacji tego typu —
  funkcja była w praktyce częściowo martwa w momencie publikacji tej treści).
- **Przycisk HTML** i **widget na stronę WWW** — lżejsze formy osadzenia niż
  pełna wtyczka, prawdopodobnie fragment kodu (iframe/skrypt) do wklejenia.
- Brak wzmianki o dedykowanych wtyczkach do innych CMS-ów niż WordPress.

## 5. Model cenowy i self-service

- Model SaaS z 14-dniowym okresem próbnym: "Bez opłat. Bez umów. Zrezygnuj
  kiedy chcesz." — sugeruje subskrypcję miesięczną bez długoterminowych
  umów, prawdopodobnie z limitami (np. limit SMS-ów — na stronie wtyczek
  widoczna wzmianka "14 dniowy okres testowy. 30 SMSów na próbę.").
- Rejestracja self-service na app.nakiedy.pl/zarejestruj.html: formularz z
  polami *nazwa konta* (staje się subdomeną `nazwa.nakiedy.pl`), *nazwa
  firmy*, *email*, *hasło*, akceptacja regulaminu — czyli model
  multi-tenant, każda firma dostaje własną subdomenę/instancję od razu po
  rejestracji, bez procesu wdrożeniowego czy kontaktu ze sprzedażą.
- Serwis kierowany do bardzo szerokiej gamy branż jednoosobowych/małych
  usługowych (salony urody, medycyna, sport/fitness, wolne zawody, usługi
  techniczne, inne firmy) — pozycjonowany jako uniwersalny booking engine,
  nie branżowy system dedykowany.

## 6. Co nadaje się do bezpośredniego przeniesienia

Elementy modelu nakiedy.pl, które pasują wprost do systemu rezerwacji usług
sprzątania (nawet z wieloma pracownikami i lokalizacją jako kryterium):

- **Kalendarz z wieloma widokami** (miesiąc/dzień/lista) i szybką
  akceptacją/edycją/blokowaniem terminów.
- **Statusy wizyt** przed i po realizacji — bezpośrednio przydatne, tylko
  trzeba rozszerzyć status "po wizycie" o wynik checklisty (patrz pkt 7).
- **Grafiki pracy pracowników** definiowane na konkretne tygodnie/daty —
  pasuje do zmiennej liczby sprzątaczek/ekip w danym tygodniu.
- **Logowanie pracowników z własnymi poziomami uprawnień** — potrzebne, by
  pracownik w terenie widział tylko swoje zlecenia i mógł odhaczać zadania.
- **Kartoteka klientów z historią wizyt** — przydatna 1:1 (adres, dostęp do
  lokalu, preferencje sprzątania, historia usług).
- **Przypomnienia email/SMS z konfigurowalną treścią i terminem** —
  przenosi się wprost (przypomnienie klientowi + potwierdzenie/odwołanie
  przez SMS).
- **Płatności online w trybach pełna kwota / zadatek / dowolna kwota** przez
  zewnętrzny PSP (odpowiednik Przelewy24 w Polsce, np. Przelewy24/Stripe) —
  model dobrze pasuje też do usług sprzątania (zadatek przy rezerwacji
  jednorazowego sprzątania generalnego).
- **Koszyk rezerwacji / rezerwacje cykliczne** — bardzo istotne dla
  sprzątania (stałe sprzątanie co tydzień/dwa tygodnie to typowy model
  usługi, nie jednorazowa wizyta).
- **Statystyki i eksport z filtrowaniem** po dacie/pracowniku/usłudze/statusie
  — przenosi się wprost do raportowania obłożenia ekip.
- **Self-service onboarding** (rejestracja → subdomena → konfiguracja) — jako
  wzorzec, jeśli produkt ma być sprzedawany wielu firmom sprzątającym (SaaS),
  a nie jednej.
- **Osadzanie widgetem/przyciskiem na stronie WWW** — dobry wzorzec
  integracji z istniejącą stroną firmy sprzątającej.

## 7. Czego brakuje względem systemu rezerwacji usług sprzątania

Braki w modelu nakiedy.pl względem wymagań: zmienna liczba pracowników,
dzielnica/lokalizacja jako kryterium wyboru, checklisty zadań w terenie,
obowiązkowe potwierdzenie wykonania usługi przez pracownika.

- **Brak natywnej obsługi wielu lokalizacji/dzielnic.** Własny wpis blogowy
  ("Jak radzić sobie z wieloma lokalizacjami") wprost przyznaje, że Nakiedy
  *nie* wspiera tego natywnie i wymaga obejść konfiguracyjnych. Dla usługi
  sprzątania, gdzie dzielnica/obszar dojazdu decyduje o tym, którzy
  pracownicy/ekipy są w ogóle dostępni, to kluczowa luka — potrzebny jest
  osobny model danych: adres/dzielnica zlecenia + promień/lista obszarów
  obsługiwanych przez każdego pracownika/ekipę, wpływający na dostępne
  terminy już na etapie wyszukiwania (nie tylko na etapie przypisania).
- **Brak przypisywania na podstawie geografii/trasy.** System dobiera
  pracownika po grafiku i usłudze, nie po lokalizacji względem innych
  zleceń tego dnia — brak elementów trasowania/optymalizacji dojazdów, które
  są istotne przy sprzątaniu (wiele adresów dziennie na ekipę).
- **Brak checklist zadań w terenie.** Nakiedy operuje na poziomie
  usługi/wizyty jako całości (status: odbyła się / nie odbyła się), nie ma
  wzmianki o rozkładaniu usługi na listę zadań (np. "kuchnia", "łazienka",
  "okna") ani o narzędziu dla pracownika do odhaczania ich w terenie
  (mobilny widok checklisty per zlecenie).
- **Brak obowiązkowego potwierdzenia wykonania usługi przez pracownika.**
  Statusy wizyt w Nakiedy są ustawiane głównie przez właściciela/panel
  administracyjny; nie ma opisanego mechanizmu wymuszającego, by to sam
  pracownik w terenie potwierdził zakończenie (np. przyciskiem w aplikacji
  mobilnej, z opcjonalnym zdjęciem "przed/po" lub podpisem klienta) — a to
  jest jeden z wymogów systemu docelowego.
- **Brak koncepcji zmiennej/elastycznej obsady per zlecenie.** Grafiki pracy
  są per pracownik, ale nie widać mechanizmu przypisania **zespołu**
  (np. 2-3 osoby na jedno sprzątanie) do pojedynczej rezerwacji — sprzątanie
  często wymaga ekipy, nie jednej osoby na wizytę.
- **Brak natywnej aplikacji mobilnej dla pracownika w terenie** — panel
  wygląda na webowy, zorientowany na komputer/tablet w gabinecie, a nie na
  telefon używany w trasie (co jest naturalnym środowiskiem pracy ekipy
  sprzątającej).
- **Model płatności zakłada usługę w gabinecie/miejscu usługodawcy**, nie
  usługę dojazdową z kosztem dojazdu zależnym od dzielnicy/odległości — brak
  wzmianki o dynamicznej wycenie zależnej od lokalizacji lub metrażu.
- **Ograniczenie SMS-ów do numerów polskich** i limit SMS-ów w okresie
  próbnym — akceptowalne ograniczenie techniczne, ale trzeba świadomie
  wybrać dostawcę SMS przy projektowaniu (nie kopiować tego ograniczenia bez
  potrzeby, jeśli celujemy też w klientów zagranicznych).
- **Kanał Facebook jako integracja był w dużej mierze zablokowany przez
  politykę Facebooka** (informacja z 2019 r. na stronie) — nie warto
  projektować tego jako głównego kanału dystrybucji na starcie.

## 8. Wniosek

Nakiedy.pl to dobry wzorzec ogólnego booking engine (kalendarz, płatności,
przypomnienia, panel wieloosobowy, self-service SaaS), ale zaprojektowany pod
usługi świadczone w stałym miejscu (gabinet, salon) przez pojedynczą osobę na
wizytę. System rezerwacji sprzątania wymaga dodatkowej warstwy, której w
Nakiedy brak: geografia/dzielnica jako filtr dostępności, przypisanie
zespołu/ekipy zamiast jednej osoby, checklisty zadań w terenie i obowiązkowe
potwierdzenie wykonania usługi (najlepiej z poziomu aplikacji mobilnej
pracownika). Te elementy powinny być projektowane od zera, nie adaptowane z
istniejącego modelu.
