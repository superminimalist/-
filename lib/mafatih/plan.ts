import type { Slice } from "./types";

// Curated entry points into the book. Titles live in messages/*.json → mafatih.items.<key>.
export type ItemKey = keyof typeof ITEMS;
export type Tone = "dawn" | "day" | "dusk" | "night" | "green" | "gold" | "rose" | "indigo";

export const ITEMS = {
  // daily
  fajr: { slice: { id: "taqibaat-e-namaz-e-fajr" }, tone: "dawn" },
  zuhr: { slice: { id: "taqibaat-e-namaz-e-zuhr" }, tone: "day" },
  asr: { slice: { id: "taqibaat-nafilah-of-asr" }, tone: "day" },
  maghrib: { slice: { id: "taqibaat-e-namaz-e-maghrib" }, tone: "dusk" },
  isha: { slice: { id: "taqibaat-e-namaz-e-isha" }, tone: "night" },
  taqibat: { slice: { id: "general-taqibaat" }, tone: "green" },
  tasbih: { slice: { id: "tasbih-az-zahra" }, tone: "rose" },
  sabah: { slice: { id: "dua-al-sabah" }, tone: "dawn" },
  sunrise: { slice: { id: "supplications-at-sunrise-sunset" }, tone: "dusk" },
  shukr: { slice: { id: "thanksgiving-prostration-sajdat-al-shukr" }, tone: "green" },
  ahd: { slice: { id: "supplication-of-the-covenant-dua-al-ahad" }, tone: "indigo" },
  nightPrayer: { slice: { id: "method-of-the-night-prayer" }, tone: "night" },

  // days of the week — supplication (Sahifa Sajjadiyya appendix)
  duaSat: { slice: { id: "third-chapter-supplications-of-the-days", h: "THE SUPPLICATION ON SATURDAYS" }, tone: "green" },
  duaSun: { slice: { id: "the-supplication-on-sundays" }, tone: "green" },
  duaMon: { slice: { id: "the-supplication-on-mondays" }, tone: "green" },
  duaTue: { slice: { id: "the-supplication-on-tuesdays" }, tone: "green" },
  duaWed: { slice: { id: "the-supplication-on-wednesdays" }, tone: "green" },
  duaThu: { slice: { id: "the-supplication-on-thursdays" }, tone: "green" },
  duaFri: { slice: { id: "the-supplication-on-fridays" }, tone: "green" },

  // days of the week — ziyarah of the Infallible(s) the day belongs to
  zSat: { slice: { id: "dedication-of-the-names-of-the-holy-prophet-and-imams-to-the", h: "ZIYARAH ON SATURDAYS" }, tone: "gold" },
  zSunAli: { slice: { id: "ziyarah-of-amir-al-muminin-a-on-sundays" }, tone: "gold" },
  zSunFatima: { slice: { id: "ziyarah-of-lady-fatimah-al-zahra-s-on-sundays", h: "" }, tone: "rose" },
  zMonHasan: { slice: { id: "ziyarah-of-lady-fatimah-al-zahra-s-on-sundays", h: "ZIYARAH OF IMAM AL HASAN" }, tone: "gold" },
  zMonHusayn: { slice: { id: "ziyarah-of-imam-al-husayn-a-on-mondays", h: "" }, tone: "rose" },
  zTue: { slice: { id: "ziyarah-of-imam-al-husayn-a-on-mondays", h: "ZIYARAH OF IMAM ZAYN" }, tone: "gold" },
  zWed: { slice: { id: "ziyarah-of-imam-al-husayn-a-on-mondays", h: "ZIYARAH OF IMAM MUSA" }, tone: "gold" },
  zThu: { slice: { id: "ziyarah-of-imam-hasan-al-askari-a-on-thursday" }, tone: "gold" },
  zFri: { slice: { id: "ziyarah-of-imam-al-mahdi-a-t-f-s-on-friday" }, tone: "indigo" },

  // night of Friday / Friday
  kumayl: { slice: { id: "dua-kumayl" }, tone: "night" },
  fridayNight: { slice: { id: "recommended-rituals-of-friday-night-shab-e-jumah" }, tone: "night" },
  friday: { slice: { id: "recommended-rites-of-friday" }, tone: "gold" },
  fridayAsr: { slice: { id: "aamal-of-asr-on-friday" }, tone: "dusk" },

  // well-known
  tawassul: { slice: { id: "dua-tawassul" }, tone: "indigo" },
  jawshan: { slice: { id: "dua-jawshan-al-kabir" }, tone: "green" },
  mujeer: { slice: { id: "dua-mujeer" }, tone: "indigo" },
  simat: { slice: { id: "dua-simat" }, tone: "dusk" },
  mashlool: { slice: { id: "dua-mashlool" }, tone: "green" },
  faraj: { slice: { id: "dua-e-faraj-dua-sahib-al-amr-a-t-f-s" }, tone: "indigo" },
  ashura: { slice: { id: "first-form-of-ziyarah-of-the-famous-ziyarah-of-ashura" }, tone: "rose" },
  warith: { slice: { id: "seventh-form-of-ziyarah-ziyarah-warith" }, tone: "rose" },
  jamia: { slice: { id: "ziyarah-al-jamiah-al-kabeerah" }, tone: "gold" },
  munajat: { slice: { id: "1st-whispered-prayer-of-the-repenters-munajaat-al-taebeen" }, tone: "night" },
  yasin: { slice: { id: "surah-yasin" }, tone: "green" },
} satisfies Record<string, { slice: Slice; tone: Tone }>;

export const isItemKey = (k: string): k is ItemKey => Object.hasOwn(ITEMS, k);

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Date#getDay: 0 = Sunday

export const WEEK: Record<Weekday, { dua: ItemKey; ziyarah: ItemKey[]; extra: ItemKey[] }> = {
  6: { dua: "duaSat", ziyarah: ["zSat"], extra: [] },
  0: { dua: "duaSun", ziyarah: ["zSunAli", "zSunFatima"], extra: [] },
  1: { dua: "duaMon", ziyarah: ["zMonHasan", "zMonHusayn"], extra: [] },
  2: { dua: "duaTue", ziyarah: ["zTue"], extra: [] },
  3: { dua: "duaWed", ziyarah: ["zWed"], extra: [] },
  4: { dua: "duaThu", ziyarah: ["zThu"], extra: ["kumayl", "fridayNight"] },
  5: { dua: "duaFri", ziyarah: ["zFri"], extra: ["friday", "fridayAsr"] },
};

/** week starts on Saturday in the book's order */
export const WEEK_ORDER: Weekday[] = [6, 0, 1, 2, 3, 4, 5];

export const DAILY: ItemKey[] = ["fajr", "zuhr", "asr", "maghrib", "isha", "taqibat", "tasbih", "sabah", "sunrise", "shukr", "ahd", "nightPrayer"];

export const FAMOUS: ItemKey[] = ["kumayl", "tawassul", "ashura", "ahd", "jawshan", "faraj", "jamia", "warith", "mujeer", "simat", "munajat", "yasin", "mashlool", "sabah"];

export type Moment = "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";

/** rough time-of-day buckets (local clock — prayer-time calculation is out of scope) */
export function momentOf(h: number): Moment {
  if (h >= 4 && h < 7) return "dawn";
  if (h >= 7 && h < 12) return "morning";
  if (h >= 12 && h < 15) return "noon";
  if (h >= 15 && h < 18) return "afternoon";
  if (h >= 18 && h < 21) return "evening";
  return "night";
}

export const MOMENT_ITEMS: Record<Moment, ItemKey[]> = {
  dawn: ["fajr", "sabah", "ahd"],
  morning: ["sabah", "sunrise", "ahd"],
  noon: ["zuhr", "taqibat", "tasbih"],
  afternoon: ["asr", "tasbih", "sunrise"],
  evening: ["maghrib", "sunrise", "tasbih"],
  night: ["isha", "nightPrayer", "tasbih"],
};

/** Thursday after sunset is already the night of Friday */
export const isFridayEve = (day: Weekday, h: number) => day === 4 && h >= 17;
