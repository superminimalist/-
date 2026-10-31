import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Profile } from "@/lib/types";

export async function createClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // called from a Server Component — middleware refreshes the session instead
          }
        },
      },
    },
  );
}

/** bypasses RLS — server routes only, after you've checked permissions yourself */
export function createServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function getSessionProfile(): Promise<{ userId: string | null; profile: Profile | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, profile: null };
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  return { userId: user.id, profile: data };
}

export function isStaff(p: Profile | null) {
  return p?.role === "host" || p?.role === "admin";
}
