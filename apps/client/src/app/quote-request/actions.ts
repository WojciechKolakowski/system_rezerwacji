"use server";

import { prisma } from "@system-rezerwacji/shared";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function submitQuoteRequest(formData: FormData): Promise<void> {
  // Celowo NIE wymagamy zalogowania — to lekki formularz kontaktowy (patrz
  // ARCHITEKTURA.md, QuoteRequest.clientId jest nullable). Jeśli zgłaszający
  // jest jednak zalogowany, powiążemy zgłoszenie z jego kontem.
  const session = await getSession();
  let clientId: string | null = null;
  if (session?.role === "CLIENT") {
    const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: session.userId } });
    clientId = clientProfile?.id ?? null;
  }

  const contactName = String(formData.get("contactName") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const propertyDescription = String(formData.get("propertyDescription") ?? "").trim();
  const sizeM2 = Number(formData.get("sizeM2"));
  const districtId = String(formData.get("districtId") ?? "");

  if (!contactName || !contactPhone || !contactEmail || !districtId || !Number.isFinite(sizeM2)) {
    redirect("/quote-request?error=1");
  }

  await prisma.quoteRequest.create({
    data: {
      clientId,
      contactName,
      contactPhone,
      contactEmail,
      propertyDescription,
      sizeM2,
      districtId,
    },
  });

  redirect("/quote-request?sent=1");
}
