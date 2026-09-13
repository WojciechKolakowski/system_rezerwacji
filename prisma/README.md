# prisma

Wspólny schemat bazy danych (jedna baza dla wszystkich trzech aplikacji).

Schemat: `schema.prisma`, odwzorowujący model danych opisany w ARCHITEKTURA.md (sekcja 2 i 5)
w katalogu głównym repo. Migracje jeszcze nie uruchomione — wymaga `DATABASE_URL` do bazy
PostgreSQL (Neon/Supabase) i `npx prisma migrate dev`.
