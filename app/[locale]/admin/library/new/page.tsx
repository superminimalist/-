import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteLibraryItem } from "@/app/actions/admin";
import type { LibraryItem } from "@/lib/types";
import { LibraryForm } from "./LibraryForm";

export default async function AdminLibrary({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tt = await getTranslations("libraryTypes");
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("library_items")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<LibraryItem[]>();

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <LibraryForm />
      <ul className="divide-y divide-line self-start rounded-xl border border-line bg-panel text-sm">
        {(items ?? []).map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-2">
            <Link href={`/library/${it.id}`} className="min-w-0 truncate hover:underline" dir="auto">
              <span className="me-2 text-xs text-accent">{tt(it.type)}</span>
              {it.title}
            </Link>
            <form action={deleteLibraryItem}>
              <input type="hidden" name="id" value={it.id} />
              <button className="text-xs text-mute hover:text-live">{t("delete")}</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
