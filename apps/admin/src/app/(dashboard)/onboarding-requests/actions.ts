"use server";

import { prisma } from "@system-rezerwacji/shared";
import {
  assertMeetingDateIsFuture,
  assertValidOnboardingTransition,
  buildClientApprovalUpdate,
  notifyOnboardingApproved,
  notifyOnboardingRejected,
} from "@system-rezerwacji/shared";
import { requireAdmin } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

export async function scheduleMeeting(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const meetingScheduledAt = new Date(String(formData.get("meetingScheduledAt") ?? ""));

  const request = await prisma.onboardingRequest.findUniqueOrThrow({ where: { id } });
  assertValidOnboardingTransition(request.status, "MEETING_SCHEDULED");
  assertMeetingDateIsFuture(meetingScheduledAt, new Date());

  await prisma.onboardingRequest.update({
    where: { id },
    data: {
      status: "MEETING_SCHEDULED",
      meetingScheduledAt,
      conductedById: admin.userId,
    },
  });

  revalidatePath("/onboarding-requests");
}

export async function markVisited(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const visitNotes = String(formData.get("visitNotes") ?? "").trim();

  const request = await prisma.onboardingRequest.findUniqueOrThrow({ where: { id } });
  assertValidOnboardingTransition(request.status, "VISITED");

  await prisma.onboardingRequest.update({
    where: { id },
    data: { status: "VISITED", visitNotes: visitNotes || null },
  });

  revalidatePath("/onboarding-requests");
}

export async function approveRequest(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const request = await prisma.onboardingRequest.findUniqueOrThrow({ where: { id } });
  assertValidOnboardingTransition(request.status, "APPROVED");

  const clientUpdate = buildClientApprovalUpdate({ approvedById: admin.userId, now: new Date() });

  await prisma.$transaction([
    prisma.onboardingRequest.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date(), approvedById: admin.userId },
    }),
    prisma.clientProfile.update({ where: { id: request.clientId }, data: clientUpdate }),
  ]);

  await notifyOnboardingApproved(request.id);

  revalidatePath("/onboarding-requests");
}

export async function rejectRequest(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();

  const request = await prisma.onboardingRequest.findUniqueOrThrow({ where: { id } });
  assertValidOnboardingTransition(request.status, "REJECTED");

  await prisma.onboardingRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason: rejectionReason || null,
      approvedById: admin.userId,
    },
  });

  await notifyOnboardingRejected(request.id);

  revalidatePath("/onboarding-requests");
}
