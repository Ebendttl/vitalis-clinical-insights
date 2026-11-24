import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in clinician, memoised per request with React cache() so the layout,
 * page and actions share one lookup. getClaims() verifies the JWT signature
 * rather than trusting the cookie payload.
 */
export const getClinician = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: clinician } = await supabase.from("clinicians").select("*").eq("id", userId).maybeSingle();
  return clinician;
});

export async function requireClinician() {
  const clinician = await getClinician();
  if (!clinician) redirect("/sign-in");
  return clinician;
}
