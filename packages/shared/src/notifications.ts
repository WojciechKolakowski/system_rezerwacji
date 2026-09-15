import { prisma } from "./db";

export type NotificationType =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_REMINDER"
  | "ONBOARDING_APPROVED"
  | "ONBOARDING_REJECTED"
  | "QUOTE_READY";

interface SendNotificationParams {
  type: NotificationType;
  recipientEmail: string;
  userId?: string | null;
  subject: string;
  body: string;
  bookingId?: string | null;
}

/**
 * Punkt wejścia "wysyłki" — dostawca e-mail (np. Resend) nie jest jeszcze
 * wybrany biznesowo, więc na razie to świadomy stub: zapisujemy
 * NotificationLog (zawsze status=SENT) i logujemy na konsolę, zamiast
 * faktycznie wysyłać. Cała logika wyzwalania powiadomień poniżej jest już
 * w pełni gotowa — podmiana tej jednej funkcji na prawdziwego dostawcę nie
 * wymaga zmian gdzie indziej.
 */
async function sendNotificationStub(params: SendNotificationParams): Promise<void> {
  console.log(
    `[notification:stub] ${params.type} -> ${params.recipientEmail}\nTemat: ${params.subject}\n${params.body}`
  );

  await prisma.notificationLog.create({
    data: {
      type: params.type,
      recipientEmail: params.recipientEmail,
      userId: params.userId ?? null,
      subject: params.subject,
      body: params.body,
      bookingId: params.bookingId ?? null,
      status: "SENT",
    },
  });
}

export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      client: { include: { user: true } },
      propertyAddress: true,
      serviceType: true,
    },
  });

  const subject = `Potwierdzenie rezerwacji — ${booking.scheduledStart.toLocaleDateString("pl-PL")}`;
  const body = [
    `Cześć ${booking.client.user.name},`,
    "",
    `Twoja rezerwacja została potwierdzona:`,
    `${booking.serviceType.name} · ${booking.propertyAddress.label} (${booking.propertyAddress.street} ${booking.propertyAddress.buildingNo})`,
    `Termin: ${booking.scheduledStart.toLocaleString("pl-PL")}`,
    `Cena: ${Number(booking.price).toFixed(2)} zł`,
  ].join("\n");

  await sendNotificationStub({
    type: "BOOKING_CONFIRMED",
    recipientEmail: booking.client.user.email,
    userId: booking.client.userId,
    subject,
    body,
    bookingId: booking.id,
  });
}

export async function notifyBookingCancelled(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { client: { include: { user: true } }, propertyAddress: true },
  });

  const subject = `Anulowano rezerwację — ${booking.scheduledStart.toLocaleDateString("pl-PL")}`;
  const body = [
    `Cześć ${booking.client.user.name},`,
    "",
    `Twoja rezerwacja na ${booking.scheduledStart.toLocaleString("pl-PL")} (${booking.propertyAddress.label}) została anulowana.`,
  ].join("\n");

  await sendNotificationStub({
    type: "BOOKING_CANCELLED",
    recipientEmail: booking.client.user.email,
    userId: booking.client.userId,
    subject,
    body,
    bookingId: booking.id,
  });
}

export async function notifyOnboardingApproved(onboardingRequestId: string): Promise<void> {
  const request = await prisma.onboardingRequest.findUniqueOrThrow({
    where: { id: onboardingRequestId },
    include: { client: { include: { user: true } } },
  });

  const subject = "Twoje konto zostało zweryfikowane";
  const body = [
    `Cześć ${request.client.user.name},`,
    "",
    "Miło nam poinformować, że Twoje konto zostało zweryfikowane — od teraz możesz zamawiać sprzątanie online.",
  ].join("\n");

  await sendNotificationStub({
    type: "ONBOARDING_APPROVED",
    recipientEmail: request.client.user.email,
    userId: request.client.userId,
    subject,
    body,
  });
}

export async function notifyOnboardingRejected(onboardingRequestId: string): Promise<void> {
  const request = await prisma.onboardingRequest.findUniqueOrThrow({
    where: { id: onboardingRequestId },
    include: { client: { include: { user: true } } },
  });

  const subject = "Informacja o Twoim zapytaniu o współpracę";
  const body = [
    `Cześć ${request.client.user.name},`,
    "",
    "Dziękujemy za zainteresowanie. Niestety nie możemy na tym etapie potwierdzić rozpoczęcia współpracy.",
    request.rejectionReason ? `Powód: ${request.rejectionReason}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await sendNotificationStub({
    type: "ONBOARDING_REJECTED",
    recipientEmail: request.client.user.email,
    userId: request.client.userId,
    subject,
    body,
  });
}

export async function notifyQuoteReady(quoteRequestId: string): Promise<void> {
  const request = await prisma.quoteRequest.findUniqueOrThrow({ where: { id: quoteRequestId } });

  const subject = "Twoja indywidualna wycena jest gotowa";
  const body = [
    `Cześć ${request.contactName},`,
    "",
    `Przygotowaliśmy wycenę dla zgłoszonej nieruchomości: ${Number(request.quotedPrice ?? 0).toFixed(2)} zł.`,
    "Skontaktujemy się, aby ustalić szczegóły i termin.",
  ].join("\n");

  await sendNotificationStub({
    type: "QUOTE_READY",
    recipientEmail: request.contactEmail,
    userId: null,
    subject,
    body,
  });
}

async function notifyBookingReminder(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { client: { include: { user: true } }, propertyAddress: true },
  });

  const subject = `Przypomnienie: jutro sprzątanie — ${booking.scheduledStart.toLocaleDateString("pl-PL")}`;
  const body = [
    `Cześć ${booking.client.user.name},`,
    "",
    `Przypominamy o zaplanowanej wizycie: ${booking.scheduledStart.toLocaleString("pl-PL")}`,
    `Adres: ${booking.propertyAddress.street} ${booking.propertyAddress.buildingNo}, ${booking.propertyAddress.city}`,
  ].join("\n");

  await sendNotificationStub({
    type: "BOOKING_REMINDER",
    recipientEmail: booking.client.user.email,
    userId: booking.client.userId,
    subject,
    body,
    bookingId: booking.id,
  });
}

export interface ReminderRunResult {
  candidatesFound: number;
  remindersSent: number;
}

/**
 * Wysyła przypomnienia dla zleceń zaplanowanych w oknie
 * [now+windowStartHours, now+windowEndHours) — domyślnie ok. 20–28h
 * naprzód, żeby jedno uruchomienie crona raz dziennie na pewno złapało
 * każde zlecenie z jutra niezależnie o której dokładnie porze cron
 * odpala. Idempotentne: pomija zlecenia, które już mają zapisane
 * powiadomienie BOOKING_REMINDER w dzienniku.
 */
export async function sendUpcomingBookingReminders(
  now: Date = new Date(),
  windowStartHours = 20,
  windowEndHours = 28
): Promise<ReminderRunResult> {
  const windowStart = new Date(now.getTime() + windowStartHours * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + windowEndHours * 60 * 60 * 1000);

  const candidates = await prisma.booking.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledStart: { gte: windowStart, lt: windowEnd },
      notificationLogs: { none: { type: "BOOKING_REMINDER" } },
    },
    select: { id: true },
  });

  for (const candidate of candidates) {
    await notifyBookingReminder(candidate.id);
  }

  return { candidatesFound: candidates.length, remindersSent: candidates.length };
}
