"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie } from "@/lib/session";

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
