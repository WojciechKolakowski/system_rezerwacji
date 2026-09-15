import { prisma } from "@system-rezerwacji/shared";

const TYPE_LABELS: Record<string, string> = {
  BOOKING_CONFIRMED: "Potwierdzenie rezerwacji",
  BOOKING_CANCELLED: "Anulowanie rezerwacji",
  BOOKING_REMINDER: "Przypomnienie przed wizytą",
  ONBOARDING_APPROVED: "Zatwierdzenie klienta",
  ONBOARDING_REJECTED: "Odrzucenie zapytania",
  QUOTE_READY: "Gotowa wycena",
};

export default async function NotificationsPage() {
  const logs = await prisma.notificationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Dziennik powiadomień</h1>
      <p className="mb-6 text-sm text-gray-500">
        Dostawca e-mail nie jest jeszcze wybrany (patrz ARCHITEKTURA.md) — to jest podgląd tego,
        co zostałoby wysłane, gdyby był podłączony realny dostawca. Ostatnie 100 wpisów.
      </p>

      <div className="flex flex-col gap-3">
        {logs.map((log) => (
          <div key={log.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                {TYPE_LABELS[log.type] ?? log.type}
              </span>
              <span className="text-xs text-gray-400">{log.createdAt.toLocaleString("pl-PL")}</span>
            </div>
            <p className="text-sm font-medium text-gray-900">
              Do: {log.recipientEmail} · {log.subject}
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-500">{log.body}</pre>
          </div>
        ))}
        {logs.length === 0 && (
          <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-400">
            Brak powiadomień.
          </p>
        )}
      </div>
    </div>
  );
}
