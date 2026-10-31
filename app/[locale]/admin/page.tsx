import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteMajlis } from "@/app/actions/admin";
import { LocalTime } from "@/components/LocalTime";
import { StatusBadge } from "@/components/StatusBadge";
import type { Majlis } from "@/lib/types";

export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data: majalis } = await supabase
    .from("majlis")
    .select("*")
    .order("starts_at", { ascending: false })
    .limit(100)
    .returns<Majlis[]>();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">{t("majalis")}</h1>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line">
            {(majalis ?? []).map((m) => (
              <tr key={m.id} className="bg-panel">
                <td className="px-4 py-3">
                  <Link href={`/majlis/${m.id}`} className="font-medium hover:underline">{m.title}</Link>
                  <div className="text-xs text-mute">{m.speaker}</div>
                </td>
                <td className="px-4 py-3"><LocalTime iso={m.starts_at} /></td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {m.status !== "ended" && (
                      <Link href={`/admin/majlis/${m.id}/host`} className="btn">{t("host")}</Link>
                    )}
                    <form action={deleteMajlis}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="btn-ghost hover:border-live">{t("delete")}</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
