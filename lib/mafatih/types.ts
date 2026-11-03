export type Block =
  | { t: "ar"; x: string; v?: number } // Arabic text; v = Qur'an verse number
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
