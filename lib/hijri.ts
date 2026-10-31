// Umm al-Qura via ICU — no dependency. Local moon sighting may differ by ±1 day;
// HIJRI_OFFSET_DAYS lets the imambargah align with its own marja's announcement.
const OFFSET_DAYS = Number(process.env.NEXT_PUBLIC_HIJRI_OFFSET_DAYS ?? 0);

function shifted(d: Date) {
  return OFFSET_DAYS ? new Date(d.getTime() + OFFSET_DAYS * 86_400_000) : d;
}

export function formatHijri(date: Date | string, locale: string, timeZone?: string) {
  const d = shifted(typeof date === "string" ? new Date(date) : date);
  return new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(d);
}

export function formatGregorian(date: Date | string, locale: string, timeZone?: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(d);
}
