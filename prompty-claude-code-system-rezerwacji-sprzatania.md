# Prompty dla Claude Code — system rezerwacji sprzątania

## PROMPT 1 — Głęboka analiza nakiedy.pl

```
Chcę, żebyś przeprowadził dogłębną analizę serwisu nakiedy.pl — to system
rezerwacji online (booking engine) dla firm usługowych (fryzjerzy, lekarze,
fizjoterapeuci, zajęcia grupowe).

Zadania:

1. Przejrzyj publicznie dostępne strony serwisu (nakiedy.pl, w tym podstrony
   /funkcje.html, /system-rezerwacji-wizyt.html, /wtyczki.html, /dla-kogo-*,
   /blog) i opisz dokładnie:
   - pełny przepływ rezerwacji z perspektywy klienta końcowego (krok po
     kroku: od wejścia na stronę do potwierdzenia)
   - jakie dane wejściowe zbiera system przed rezerwacją (usługa, pracownik,
     termin, dane kontaktowe, zgody RODO)
   - jak działa panel zarządczy dla właściciela firmy (zarządzanie
     pracownikami, usługami, cennikiem, kalendarzem, statusami wizyt,
     uprawnieniami)
   - model płatności (tryby: pełna kwota / zadatek / dowolna kwota,
     integracja z Przelewy24, koszyk rezerwacji)
   - sposoby osadzania systemu na zewnętrznej stronie (widget, przycisk HTML,
     wtyczka WordPress, zakładka Facebook)
   - model cenowy/abonamentowy i model self-service (rejestracja →
     konfigurator → własna subdomena)

2. Na tej podstawie sporządź listę: "co z tego modelu nadaje się do
   bezpośredniego przeniesienia" vs "czego w tym modelu brakuje względem
   systemu rezerwacji usług sprzątania ze zmienną liczbą pracowników,
   lokalizacją (dzielnicą) jako kryterium wyboru, checklistami zadań w
   terenie i obowiązkowym potwierdzeniem wykonania usługi przez pracownika".

3. Nie kopiuj żadnych treści ani kodu z nakiedy.pl — to ma być analiza
   funkcjonalna i wnioski, nie odtwarzanie serwisu.

4. Wynik zapisz jako krótki dokument (analiza-nakiedy.md), który posłuży
   jako punkt odniesienia przy projektowaniu naszego systemu.
```

---

## PROMPT 2 — Brief startowy projektu (do architektury i planu implementacji)

```
KROK 0 — repozytorium: repozytorium GitHub zostało już założone ręcznie
przez interfejs GitHub i sklonowane lokalnie do
C:\Users\Wojtek\system_rezerwacji — Ty pracujesz wewnątrz tego już
istniejącego, sklonowanego repozytorium. Nie zakładaj nowego repozytorium
zdalnego ani nie inicjalizuj go od nowa. Twoim zadaniem jest zbudowanie
w nim struktury katalogów monorepo (dopasuj do wybranego stacku, ale
zachowaj zasadę: jedno repozytorium, jedna wspólna baza/schemat, trzy
oddzielne aplikacje frontowe), mniej więcej takiej:
  /apps/client   → interfejs klienta (mojastrona.pl, Mobile First)
  /apps/admin    → panel zarządczy (panel.mojastrona.pl, Desktop)
  /apps/worker   → panel pracownika (serwis.mojastrona.pl, Mobile First, PWA)
  /packages/shared → wspólne typy i logika domenowa używana przez apps/*
  /prisma (lub odpowiednik) → wspólny schemat bazy danych
oraz wykonanie pierwszego commita z tą strukturą.

Buduję system rezerwacji usług sprzątania nieruchomości (mieszkania, domy)
złożony z trzech powiązanych interfejsów działających na wspólnej bazie
danych i wspólnym API:

1. STRONA KLIENTA (docelowo: mojastrona.pl)
   - klient wybiera dzielnicę, w której znajduje się nieruchomość
   - podaje wielkość nieruchomości w m² — to kluczowa zmienna decydująca
     o dalszej ścieżce (patrz reguła progu poniżej)
   - system pokazuje dostępność pracowników PRZYPISANYCH DO TEJ DZIELNICY —
     UWAGA, ważne uproszczenie modelu: pracownik nie jest zasobem "pływającym"
     między dzielnicami w ciągu dnia, tylko ma z góry przypisane dni/godziny
     pracy w konkretnej dzielnicy (logistycznie nie przeskakuje między
     obszarami). Klient widzi więc konkretne wolne okienka czasowe dostępne
     w wybranej dzielnicy; jeśli w danym okienku dostępna jest więcej niż
     jedna osoba, klient wybiera, którą preferuje; jeśli tylko jedna —
     system przypisuje ją automatycznie bez pokazywania wyboru
   - NIE MA wyboru liczby osób/zespołu przez klienta w standardowej ścieżce —
     każda standardowa rezerwacja to jeden pracownik. Sytuacje wymagające
     większej ekipy (duże nieruchomości) obsługiwane są wyłącznie ręcznie
     przez admina w ramach ścieżki indywidualnej wyceny (patrz niżej)
   - REGUŁA PROGU WIELKOŚCI: jeśli podana wielkość nieruchomości przekracza
     konfigurowalny próg (domyślnie 50 m², wartość ustawiana przez admina
     w panelu zarządczym), standardowa ścieżka rezerwacji z płatnością
     online NIE jest dostępna — zamiast tego wyświetla się przycisk
     "Indywidualna wycena usługi", który kieruje do formularza zapytania
     (dane kontaktowe + opis nieruchomości), a nie do płatności. Zapytanie
     trafia do panelu admina jako osobny typ zgłoszenia do ręcznej wyceny
     (to również miejsce, gdzie admin ustala ręcznie, czy potrzebna jest
     większa ekipa, i organizuje to poza standardowym systemem rezerwacji)
   - jeśli wielkość mieści się w progu: klient wybiera dostępne okienko
     czasowe (dzień + godzina + pracownik, zgodnie z opisem wyżej), opłaca
     usługę online od razu przy rezerwacji, otrzymuje potwierdzenie
     przyjęcia zamówienia
   - REZERWACJE CYKLICZNE (stałe sprzątanie) — WAŻNY ELEMENT ZAKRESU, ale
     NIE dostępny domyślnie dla każdego klienta: opcja "zleć usługę
     cykliczną" (np. co tydzień/co dwa tygodnie, ten sam dzień/godzina/
     pracownik w miarę możliwości) pojawia się w koncie klienta TYLKO gdy
     admin ręcznie nada temu klientowi status "zaufany/cykliczny" w panelu
     zarządczym (patrz niżej). To nie jest samoobsługowe dla nowych/
     nieznanych klientów — wymaga wcześniejszej relacji i ręcznej decyzji
     admina. Dopuszczalne jest też, że admin uruchamia taką usługę cykliczną
     całkowicie ręcznie po swojej stronie (bez akcji klienta)
   - ma indywidualne konto z historią zleceń, w którym po zakończonej
     usłudze może wystawić ocenę (skala) i/lub komentarz

2. PANEL ZARZĄDCZY (docelowo: panel.mojastrona.pl) — dla właściciela firmy
   - zarządzanie dzielnicami obsługi i cennikiem (cennik zależny co najmniej
     od wielkości nieruchomości m²; BEZ zmiennej "liczba osób w zespole" —
     patrz uproszczenie modelu powyżej)
   - zarządzanie pracownikami: KAŻDY pracownik ma przypisane dni/godziny
     pracy W KONKRETNEJ DZIELNICY (nie "pływa" między dzielnicami w ciągu
     dnia) — to jest podstawowy model dostępności, z którego korzysta
     kalendarz po stronie klienta
   - ustawianie progu wielkości nieruchomości, powyżej którego rezerwacja
     online jest zastępowana ścieżką "indywidualna wycena"
   - lista przychodzących zapytań o indywidualną wycenę (osobno od
     standardowych zleceń), z możliwością ręcznego ustalenia ceny,
     ręcznego zorganizowania większej ekipy jeśli potrzeba, i
     przekształcenia zapytania w zlecenie
   - status klienta: możliwość ręcznego oznaczenia klienta jako
     "zaufany/cykliczny", co odblokowuje mu w koncie klienta opcję
     rezerwacji cyklicznej (stałe sprzątanie); domyślnie każdy nowy klient
     ma dostęp tylko do rezerwacji jednorazowych
   - możliwość ręcznego uruchomienia usługi cyklicznej dla klienta bez
     udziału klienta (admin ustawia to bezpośrednio)
   - podgląd i zarządzanie wszystkimi zleceniami (statusy, zmiany, anulacje),
     w tym zleceniami wynikającymi z rezerwacji cyklicznych
   - podgląd płatności
   - podgląd ocen i komentarzy klientów

3. PANEL PRACOWNIKA (docelowo: serwis.mojastrona.pl) — dla osoby sprzątającej
   - widok "mój dzień": lista zleceń na dany dzień z adresem klienta
   - zakres obowiązków/checklist do wykonania pod danym adresem
   - obowiązkowe potwierdzenie realizacji usługi (np. przycisk + ewentualnie
     zdjęcie/notatka)
   - ma działać dobrze na telefonie (docelowo jako PWA), projektowana
     wyłącznie Mobile First — patrz sekcja "Wymagania niefunkcjonalne"

Wymagania niefunkcjonalne:
- PODEJŚCIE DO DESIGNU PER INTERFEJS (ważne, nie domyślne responsywne
  "jedno na wszystko"):
  - STRONA KLIENTA (mojastrona.pl) — projektowana Mobile First: układ,
    interakcje i kolejność elementów projektowane najpierw pod telefon,
    dopiero potem skalowane w górę na desktop
  - PANEL ZARZĄDCZY (panel.mojastrona.pl) — projektowany w modelu Desktop:
    priorytetem jest wygodna praca na komputerze (tabele, filtrowanie,
    widoki wielu zleceń naraz, kalendarz pracowników); dostęp z telefonu
    ma działać, ale nie jest priorytetem projektowym
  - PANEL PRACOWNIKA (serwis.mojastrona.pl) — projektowany Mobile First:
    to interfejs używany wyłącznie w terenie, na telefonie; desktop nie
    jest scenariuszem użycia
- jedna wspólna baza danych i API pod trzema interfejsami (nie trzy osobne
  systemy), routing po subdomenach
- trzy role użytkownika: klient, admin, pracownik, z odpowiednim
  uwierzytelnianiem i autoryzacją
- płatności online z polskim dostawcą wspierającym BLIK (do ustalenia:
  Przelewy24 / Tpay / Autopay) — na tym etapie zaprojektuj integrację
  modułowo, tak by dostawcę dało się podmienić
- powiadomienia SMS/email jako przydatny element (przypomnienie przed
  wizytą, potwierdzenie rezerwacji) — dostawca SMS do ustalenia później,
  zaprojektuj to jako moduł niezależny od rdzenia rezerwacji, nie blokujący
  MVP
- architektura ma być rozbudowywalna (kolejne miasta/dzielnice, kolejni
  pracownicy, ewentualnie przyszła apka mobilna)

Twoje zadanie na tym etapie (przed pisaniem kodu produkcyjnego):
1. Zaproponuj stack technologiczny (framework, baza danych, hosting,
   sposób obsługi trzech subdomen w jednym repo) wraz z uzasadnieniem —
   uwzględniając, że strona klienta i panel pracownika mają być projektowane
   Mobile First, a panel zarządczy w modelu Desktop.
2. Zaprojektuj model danych — uwzględniając poniższe kluczowe reguły:
   - encje: klienci (w tym status "standardowy" / "zaufany-cykliczny"),
     pracownicy, dzielnice, DOSTĘPNOŚĆ PRACOWNIKA jako przypisanie
     pracownik + dzielnica + dzień/godziny (jeden pracownik pracuje w danym
     terminie w JEDNEJ dzielnicy — nie modeluj przemieszczania się między
     dzielnicami w ciągu dnia), zlecenia, pozycje checklisty, płatności,
     oceny
   - KAŻDE standardowe zlecenie przypisane jest do dokładnie JEDNEGO
     pracownika — nie projektuj encji "zespół/ekipa" jako części
     standardowego przepływu rezerwacji; przypadki wymagające większej
     ekipy obsługiwane są ręcznie przez admina w ramach zapytania o
     indywidualną wycenę i nie muszą być modelowane jako osobna struktura
     danych w MVP
   - REZERWACJE CYKLICZNE: potrzebna jest koncepcja "serii/subskrypcji
     sprzątania" (częstotliwość, preferowany dzień/godzina/pracownik),
     z której generowane są kolejne pojedyncze zlecenia; dostępność tej
     opcji w koncie klienta zależy od statusu klienta ("zaufany-cykliczny"),
     ustawianego ręcznie przez admina
   - wielkość nieruchomości jako atrybut zlecenia, próg wielkości jako
     ustawienie konfigurowalne, zapytania o indywidualną wycenę jako
     osobna encja/status
   wraz z relacjami między powyższymi.
3. Opisz kluczowe przepływy (user flows) dla każdej z trzech ról.
4. Zaproponuj podział na etapy/iteracje wdrożenia (MVP → kolejne
   rozszerzenia), z rekomendacją co wchodzi w zakres pierwszej działającej
   wersji.
5. Zadaj mi pytania doprecyzowujące tam, gdzie specyfikacja biznesowa
   (np. sposób naliczania ceny, zakres checklisty, reguły anulacji) nie
   jest jeszcze jednoznaczna — nie zgaduj kluczowych reguł biznesowych.

Nie zaczynaj jeszcze implementacji — na tym etapie chcę dokument z
architekturą i planem, do wspólnego przejrzenia przed przejściem do kodu.

DODATKOWO — funkcja świadomie odłożona na późniejszy etap (nie projektuj
jej szczegółowo teraz, ale uwzględnij w architekturze płatności tyle, by
dało się ją dodać bez przebudowy modelu danych):
- dla stałych klientów, z którymi ustalona jest już indywidualna cena,
  firma powinna móc w przyszłości wysyłać przez panel klienta faktury do
  zapłacenia, z płatnością BLIK. To osobny, przyszły moduł — na tym etapie
  wystarczy, żeby model płatności nie zakładał na sztywno, że każda
  płatność jest powiązana wyłącznie z rezerwacją zrobioną w standardowej
  ścieżce online.
```

---

## Jak z tego korzystać

1. Uruchom **PROMPT 1** jako osobną sesję/zadanie — efektem będzie
   `analiza-nakiedy.md`, który warto potem przejrzeć wspólnie ze mną.
2. Załóż nowe, osobne repozytorium dla tego projektu przez interfejs
   GitHub (prywatne, niepowiązane z innymi Twoimi projektami) i sklonuj je
   lokalnie do `C:\Users\Wojtek\system_rezerwacji`.
3. Uruchom **PROMPT 2** wewnątrz tego sklonowanego repozytorium — poproś
   Claude Code, by dołączył
   wnioski z `analiza-nakiedy.md` jako kontekst.
4. Zanim Claude Code zacznie pisać kod produkcyjny, warto żebyśmy
   wspólnie przeszli przez odpowiedzi na pytania doprecyzowujące z punktu 5
   promptu 2 — to jest moment, w którym błędy są najtańsze do poprawienia.
