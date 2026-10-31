import { getTranslations, setRequestLocale } from "next-intl/server";
import { createSeries } from "@/app/actions/admin";

export default async function NewSeries({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  return (
    <form action={createSeries} className="card max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">{t("newSeries")}</h1>
      <div>
        <label className="label">{t("fieldTitle")}</label>
        <input name="title" required className="input" placeholder="Ashra-e-Muharram 1448" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">{t("occasion")}</label>
          <input name="occasion" className="input" placeholder="muharram" list="occasions" />
          <datalist id="occasions">
            {["muharram", "safar", "arbaeen", "fatimiyya", "ramadan", "wiladat", "shahadat"].map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label">{t("hijriYear")}</label>
          <input name="hijri_year" type="number" className="input" placeholder="1448" />
        </div>
      </div>
      <button className="btn">{t("create")}</button>
    </form>
  );
}
