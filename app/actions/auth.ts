"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export type MagicLinkState = { ok: boolean; error?: string } | null;

export async function sendMagicLink(_prev: MagicLinkState, form: FormData): Promise<MagicLinkState> {
  const email = String(form.get("email") ?? "").trim();
  const displayName = String(form.get("display_name") ?? "").trim();
  if (!email) return { ok: false, error: "email" };

  const locale = await getLocale();
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/${locale}`,
      data: displayName ? { display_name: displayName } : undefined,
    },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/", locale: await getLocale() });
}
