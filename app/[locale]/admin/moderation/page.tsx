import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { addBannedWord, removeBannedWord, unmuteUser } from "@/app/actions/admin";
import type { Profile } from "@/lib/types";

export default async function Moderation({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: words }, { data: muted }] = await Promise.all([
    supabase.from("banned_words").select("word").order("word"),
    supabase.from("profiles").select("*").eq("muted", true).returns<Profile[]>(),
  ]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="card space-y-4">
        <h2 className="font-semibold">{t("bannedWords")}</h2>
        <form action={addBannedWord} className="flex gap-2">
          <input name="word" required className="input" dir="auto" />
          <button className="btn">{t("addWord")}</button>
        </form>
        <ul className="flex flex-wrap gap-2">
          {(words ?? []).map(({ word }) => (
            <li key={word}>
              <form action={removeBannedWord} className="inline-flex items-center gap-1 rounded-full bg-line px-3 py-1 text-sm">
                <input type="hidden" name="word" value={word} />
                <span dir="auto">{word}</span>
                <button className="text-mute hover:text-live" aria-label={t("delete")}>×</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">{t("mutedUsers")}</h2>
        {muted && muted.length > 0 ? (
          <ul className="divide-y divide-line text-sm">
            {muted.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span>{p.display_name}</span>
                <form action={unmuteUser}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="btn-ghost">{t("unmute")}</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mute">{t("noMuted")}</p>
        )}
      </section>
    </div>
  );
}
