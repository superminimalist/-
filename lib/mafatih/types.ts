export type Block =
  | { t: "ar"; x: string; v?: number; en?: string; ko?: string } // Arabic; v = Qur'an verse no.; en/ko = translation
  | { t: "en"; x: string } // English rubric / translation
  | { t: "h"; x: string }; // sub-heading inside a section

export type IndexEntry = {
  id: string;
  level: 0 | 1 | 2;
  title: string;
  page: number;
  words: number;
};

export type Section = { id: string; title: string; page: number; blocks: Block[] };

/** a whole section, or (with h) the part under one sub-heading; h: "" = before the first heading */
export type Slice = { id: string } | { id: string; h: string };

export type ItemView = {
  key: string;
  href: string;
  title: string;
  sub: string;
  tone: string;
  minutes: number;
};

/** content/mafatih/translations/*.json: section id → block index → translation.
 *  c = opening of the Arabic it was written for (checked on merge); ar = corrected Arabic. */
export type Overlay = Record<string, Record<string, { c: string; ar?: string; en?: string; ko?: string }>>;
