"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env.public";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

const UNREACHABLE = "Can't reach the sign-in service. If you're running locally, start Supabase with `npm run db:start`.";

/** supabase-js reports network failures as status 0 (AuthRetryableFetchError) rather than throwing. */
function isUnreachable(error: { status?: number; name?: string }) {
  return !error.status || error.name === "AuthRetryableFetchError";
}

/** Only allow same-origin relative redirects to avoid open-redirects via ?next=. */
const SafeNext = z
  .string()
  .regex(/^\/(?!\/)/)
  .catch("/patients");

const MagicLinkInput = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  next: SafeNext,
});

export async function sendMagicLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = MagicLinkInput.safeParse({ email: formData.get("email"), next: formData.get("next") ?? undefined });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const callback = new URL("/auth/callback", publicEnv.NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("next", parsed.data.next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  });
  if (error) {
    const message = isUnreachable(error)
      ? UNREACHABLE
      : error.status === 429
        ? "Too many requests. Wait a minute and try again."
        : "We couldn't send the link. Try again.";
    return { status: "error", message, email: parsed.data.email };
  }
  return { status: "sent", email: parsed.data.email };
}

export async function signInAsGuest(): Promise<SignInState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInAnonymously({ options: { data: { full_name: "Guest Clinician" } } });
  if (error) {
    console.warn("[auth] anonymous sign-in failed", error.status, error.message);
    return {
      status: "error",
      message: isUnreachable(error)
        ? UNREACHABLE
        : error.status === 422
          ? "Guest access is turned off for this project (enable anonymous sign-ins in Supabase Auth)."
          : "Guest access is unavailable right now. Try again.",
    };
  }
  redirect("/patients");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
