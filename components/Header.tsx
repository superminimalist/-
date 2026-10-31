import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSessionProfile, isStaff } from "@/lib/supabase/server";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { signOut } from "@/app/actions/auth";

export async function Header() {
  const t = await getTranslations("nav");
  const ts = await getTranslations("site");
  const { userId, profile } = await getSessionProfile();

  return (
    <header className="border-b border-line bg-panel/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span aria-hidden className="inline-block h-6 w-1.5 rounded-sm bg-accent" />
          {ts("name")}
        </Link>
        <nav className="flex items-center gap-4 text-sm text-mute">
          <Link href="/world" className="font-medium text-accent hover:brightness-125">{t("world")}</Link>
          <Link href="/schedule" className="hover:text-text">{t("schedule")}</Link>
          <Link href="/library" className="hover:text-text">{t("library")}</Link>
          {isStaff(profile) && (
            <Link href="/admin" className="text-gold hover:brightness-110">{t("admin")}</Link>
          )}
        </nav>
        <div className="ms-auto flex items-center gap-3 text-sm">
          <Suspense fallback={null}><LocaleSwitcher /></Suspense>
          {userId ? (
            <form action={signOut} className="flex items-center gap-3">
              <span className="text-mute">{profile?.display_name}</span>
              <button className="btn-ghost">{t("logout")}</button>
            </form>
          ) : (
            <Link href="/login" className="btn-ghost">{t("login")}</Link>
          )}
        </div>
      </div>
    </header>
  );
}
