"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@system-rezerwacji/shared";
import { requireAdmin } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export async function createEmployee(formData: FormData): Promise<void> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !name || password.length < 8) {
    throw new Error("E-mail, imię i nazwisko oraz hasło (min. 8 znaków) są wymagane.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name,
      role: "WORKER",
      passwordHash,
      employee: { create: {} },
    },
  });

  revalidatePath("/employees");
}

export async function toggleEmployeeActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id } });
  await prisma.employee.update({ where: { id }, data: { active: !employee.active } });
  revalidatePath("/employees");
}

// Konwencja czasu-bez-daty (@db.Time) w całym systemie to UTC — patrz
// packages/shared/src/availability.ts. Data 1970-01-01 leży w zimie, więc
// konstrukcja przez lokalny `new Date(1970,0,1,h,m)` zastosowałaby offset
// strefy czasowej serwera i przesunęłaby zapisaną godzinę.
function parseTimeOfDay(value: string): Date {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes));
}

export async function createAvailability(formData: FormData): Promise<void> {
  await requireAdmin();

  const employeeId = String(formData.get("employeeId") ?? "");
  const districtId = String(formData.get("districtId") ?? "");
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");

  if (!employeeId || !districtId || !WEEKDAYS.includes(dayOfWeek) || !startTime || !endTime) {
    throw new Error("Wszystkie pola dostępności są wymagane.");
  }
  if (startTime >= endTime) {
    throw new Error("Godzina rozpoczęcia musi być wcześniejsza niż zakończenia.");
  }

  await prisma.employeeAvailability.create({
    data: {
      employeeId,
      districtId,
      dayOfWeek,
      startTime: parseTimeOfDay(startTime),
      endTime: parseTimeOfDay(endTime),
    },
  });

  revalidatePath("/employees");
}

export async function deleteAvailability(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  await prisma.employeeAvailability.delete({ where: { id } });
  revalidatePath("/employees");
}
