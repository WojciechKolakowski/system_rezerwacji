// Ustawowy termin odstąpienia konsumenta od umowy zawartej na odległość
// (art. 27 ustawy o prawach konsumenta). To CELOWO stała aplikacyjna, a nie
// pole w Settings edytowalne przez admina — patrz ARCHITEKTURA.md sekcja 5
// pkt 4. Admin nie ma możliwości przypadkowego złamania prawa poprzez zmianę
// tej wartości w panelu.
export const STATUTORY_WITHDRAWAL_DAYS = 14;
