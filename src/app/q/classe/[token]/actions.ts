"use server";

import { redirect } from "next/navigation";

import { CLAIM_MESSAGES } from "@/lib/quiz/class-access";
import { claimName } from "@/lib/quiz/class-public";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Choix du nom : en cas de succès, redirige vers le lien personnel tout neuf. */
export async function chooseName(token: string, formData: FormData): Promise<void> {
  const attemptId = String(formData.get("attemptId") ?? "");
  if (!UUID.test(attemptId)) redirect(`/q/classe/${token}?problem=taken`);
  const res = await claimName(token, attemptId);
  if (res.status === "ok" && res.token) redirect(`/q/${res.token}`);
  const key = res.status === "ok" ? "unavailable" : res.status;
  redirect(`/q/classe/${token}?problem=${key in CLAIM_MESSAGES ? key : "unavailable"}`);
}
