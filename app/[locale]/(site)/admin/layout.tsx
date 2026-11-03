import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSessionProfile, isStaff } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("admin");
  const { profile } = await getSessionProfile();
  if (!isStaff(profile)) return <p className="card text-live">{t("forbidden")}</p>;

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 text-sm">
        <Link href="/admin" className="btn-ghost">{t("majalis")}</Link>
        <Link href="/admin/majlis/new" className="btn-ghost">+ {t("newMajlis")}</Link>
        <Link href="/admin/series/new" className="btn-ghost">+ {t("newSeries")}</Link>
        <Link href="/admin/library/new" className="btn-ghost">{t("library")}</Link>
        <Link href="/admin/moderation" className="btn-ghost">{t("moderation")}</Link>
      </nav>
      {children}
    </div>
  );
}
