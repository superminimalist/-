import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { itemViews } from "@/lib/mafatih/items";
import { DAILY, FAMOUS, ITEMS, MOMENT_ITEMS, WEEK, type ItemKey, type Weekday } from "@/lib/mafatih/plan";
import { TodayHero, WeekSection, ContinueReading } from "@/components/mafatih/Today";
import { ItemPoster, ItemTile, SectionTitle } from "@/components/mafatih/ui";
import { MfLocaleMenu } from "@/components/mafatih/LocaleMenu";
import { IconChevron } from "@/components/mafatih/icons";

export default async function MafatihHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("mafatih");
  const ts = await getTranslations("site");

  const views = await itemViews(Object.keys(ITEMS) as ItemKey[]);
  const owners = Object.fromEntries(([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => [d, t(`owners.${d}`)]));
  const moments = Object.fromEntries(Object.keys(MOMENT_ITEMS).map((m) => [m, t(`moment.${m}`)]));

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-36" style={{ paddingTop: "max(20px, var(--mf-sat))" }}>
      <header className="flex items-center justify-between gap-3 pt-2">
        <Link href="/" className="text-[0.8rem] font-semibold text-mf-mute">
          {ts("name")}
        </Link>
        <MfLocaleMenu />
      </header>

      <TodayHero
        views={views}
        momentItems={MOMENT_ITEMS}
        moments={moments}
        labels={{
          title: t("today.title"),
          now: t("today.now"),
          start: t("today.start"),
          fridayEve: t("today.fridayEve"),
          fridayEveSub: t("today.fridayEveSub"),
        }}
      />

      <ContinueReading label={t("today.continue")} />

      <WeekSection
        views={views}
        week={WEEK}
        owners={owners}
        labels={{
          title: t("today.week"),
          dedicated: t.raw("today.dedicated") as string,
          dua: t("today.dua"),
          ziyarah: t("today.ziyarah"),
          special: t("today.special"),
        }}
      />

      <SectionTitle>{t("today.daily")}</SectionTitle>
      <p className="-mt-2 mb-3 px-1 text-[0.9rem] text-mf-mute">{t("today.dailySub")}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {DAILY.map((k) => (
          <ItemTile key={k} it={views[k]} />
        ))}
      </div>

      <SectionTitle>{t("today.famous")}</SectionTitle>
      <div className="mf-noscrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2">
        {FAMOUS.map((k) => (
          <ItemPoster key={k} it={views[k]} />
        ))}
      </div>

      <Link href="/mafatih/contents" className="mf-card mf-press mt-9 flex items-center justify-between px-5 py-4 font-semibold">
        {t("today.allContents")}
        <IconChevron size={18} className="text-mf-mute" />
      </Link>

      <p className="mt-8 px-1 text-center text-[0.75rem] leading-relaxed text-mf-mute">{t("source")}</p>
    </div>
  );
}
