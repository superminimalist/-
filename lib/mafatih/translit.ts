// Vocalised Arabic → readable romanisation (ā ī ū, ḥ ṣ ḍ ṭ ẓ, ʿ ʾ), e.g.
// اَللّهُمَّ اِنّى اَسْئَلُكَ → "Allāhumma innī asʾaluka".
// Built for the Mafatih text's conventions: hamza seat written as bare alef (اَ اِ اُ),
// ى for final ي, superscript alef (ٰ) in اللّٰه, tanwin fath often left unwritten (صَلاحا).

const FATHA = "َ", DAMMA = "ُ", KASRA = "ِ", SUKUN = "ْ", SHADDA = "ّ";
const AN = "ً", UN = "ٌ", IN = "ٍ", DAGGER = "ٰ";
const VOWEL: Record<string, string> = { [FATHA]: "a", [DAMMA]: "u", [KASRA]: "i", [AN]: "an", [UN]: "un", [IN]: "in" };
const LONG: Record<string, string> = { a: "ā", i: "ī", u: "ū" };

const CONS: Record<string, string> = {
  "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "ḥ", "خ": "kh", "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s",
  "ش": "sh", "ص": "ṣ", "ض": "ḍ", "ط": "ṭ", "ظ": "ẓ", "ع": "ʿ", "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ک": "k",
  "ل": "l", "م": "m", "ن": "n", "ه": "h", "و": "w", "ي": "y", "ی": "y", "ء": "ʾ", "أ": "ʾ", "إ": "ʾ", "ؤ": "ʾ", "ئ": "ʾ",
  "پ": "p", "چ": "ch", "ژ": "zh", "گ": "g",
};
const SUN = new Set("تثدذرزسشصضطظلن");
const MARKS_RE = /[ً-ْٰ]/g;

// words this text leaves unvocalised, by bare letters
const BARE: Record<string, string> = {
  "لا": "lā", "يا": "yā", "الا": "illā", "ولا": "wa-lā", "فلا": "fa-lā", "بلا": "bilā", "ما": "mā", "انا": "anā",
  "هذا": "hādhā", "هذه": "hādhihi", "ذلك": "dhālika", "الله": "Allāh",
};
// final ى read as ā (otherwise ī, since this text writes final ي as ى)
const ALIF_MAQSURA = new Set(["على", "الى", "حتى", "متى", "تعالى", "موسى", "عيسى", "يحيى", "المصطفى", "مصطفى", "اولى", "اخرى", "الاعلى", "اعلى", "ادنى", "التقى", "الهدى", "هدى", "العزى", "تقوى", "رضى", "ادى", "اتى", "مضى", "بقى", "جزى", "تدانى", "استوى", "يخشى", "اخشى", "ينسى", "كفى", "سوى", "دعى"]);
// اللّٰه with proclitics → base form; case ending added from the last letter's vowel
const ALLAH: Record<string, string> = {
  "الله": "Allāh", "والله": "wa-llāh", "فالله": "fa-llāh", "بالله": "billāh", "تالله": "tallāh",
  "لله": "lillāh", "ولله": "wa-lillāh", "فلله": "fa-lillāh", "اللهم": "Allāhumma", "واللهم": "wa-llāhumma",
};

type Letter = { ch: string; marks: string };

function letters(word: string): Letter[] {
  const out: Letter[] = [];
  for (const c of word) {
    if (/[ً-ْٰ]/.test(c)) {
      if (out.length) out[out.length - 1].marks += c;
    } else out.push({ ch: c, marks: "" });
  }
  return out;
}

const vowelOf = (m: string) => {
  for (const c of m) if (VOWEL[c]) return VOWEL[c];
  return "";
};

/** turn a trailing short vowel into its long form, or append the long vowel */
function lengthen(s: string, v: "a" | "i" | "u") {
  return s.endsWith(v) ? s.slice(0, -1) + LONG[v] : s + LONG[v];
}

function word(w: string): string {
  const bare = w.replace(MARKS_RE, "");
  const L = letters(w);
  if (ALLAH[bare]) {
    const base = ALLAH[bare];
    if (base.endsWith("umma")) return base;
    const end = vowelOf(L[L.length - 1].marks);
    return base + (end.length === 1 ? end : "");
  }
  if (BARE[bare] && !w.match(MARKS_RE)?.length) return BARE[bare];
  if (bare === "الا" || bare === "لا" || bare === "يا") return BARE[bare];

  let s = "";
  let skipShadda = -1;
  for (let i = 0; i < L.length; i++) {
    const { ch, marks } = L[i];
    const prev = L[i - 1];
    const next = L[i + 1];
    const v = vowelOf(marks);
    const pv = prev ? vowelOf(prev.marks) : "";
    const doubled = marks.includes(SHADDA) && i !== skipShadda;
    const last = i === L.length - 1;

    // definite article (also after a proclitic: وَالْ فَالْ بِالْ كَالْ)
    if (ch === "ا" && next?.ch === "ل" && !vowelOf(next.marks) && !next.marks.includes(SHADDA) &&
        (i === 0 || (i === 1 && /[وفبك]/.test(L[0].ch))) && L.length > i + 2) {
      const after = L[i + 2];
      const sun = after.marks.includes(SHADDA) && SUN.has(after.ch);
      s += (i === 0 ? "a" : "") + (sun ? CONS[after.ch] : "l") + "-";
      if (sun) skipShadda = i + 2;
      i += 1;
      continue;
    }

    if (ch === "آ") {
      s += i === 0 ? "ā" : "ʾā";
      continue;
    }
    if (ch === "ا" || ch === "ٱ") {
      if (v) {
        s += (i === 0 || (i === 1 && /[وفبل]/.test(L[0].ch) && !s.endsWith("ʾ")) ? (i === 0 ? "" : "") : "ʾ") + v;
        continue;
      }
      if (pv === "an") continue; // tanwin fath carrier
      if (i === 1 && /[وف]/.test(L[0].ch) && next?.marks.includes(SUKUN)) continue; // فَاعْرِفْ: wasla
      if (pv === "a" || prev?.marks.includes(DAGGER)) {
        s = lengthen(s, "a");
        continue;
      }
      if (prev && prev.ch === "و" && pv === "" && last) continue; // كَانُوا
      if (i === 0) {
        s += next && next.marks.includes(SUKUN) ? "i" : "a"; // اِغْفِرْ written اغْفِرْ
        continue;
      }
      if (last && L.length > 2) {
        s += "an"; // صَلاحا → ṣalāḥan
        continue;
      }
      s = lengthen(s, "a"); // unvocalised long a: لا، سَلام
      continue;
    }

    if (ch === "ى") {
      if (v === "an") s += "an";
      else if (marks.includes(SUKUN)) s += "y";
      else if (pv === "i") s = lengthen(s, "i");
      else if (pv === "a" || ALIF_MAQSURA.has(bare)) s = lengthen(s, "a");
      else s += "ī";
      continue;
    }
    if (ch === "ة") {
      s += v ? "t" + v : "h";
      continue;
    }
    if ((ch === "ي" || ch === "ی") && !v && !doubled && prev && pv !== "") {
      if (pv === "i") { s = lengthen(s, "i"); continue; }
    }
    if (ch === "و" && !v && !doubled && prev && pv === "u") {
      s = lengthen(s, "u");
      continue;
    }

    const c = CONS[ch];
    if (!c) {
      s += ch;
      continue;
    }
    s += doubled ? c + c : c;
    if (marks.includes(DAGGER)) s += "ā";
    else if (v) s += v;
  }
  return s;
}

export function romanize(ar: string): string {
  const words = ar.replace(/[،؛]/g, " , ").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i] === ",") {
      if (out.length) out[out.length - 1] += ",";
      continue;
    }
    let w = word(words[i]);
    // a separately written وَ / فَ binds to the next word
    if ((w === "wa" || w === "fa") && words[i + 1] && words[i + 1] !== ",") {
      let nxt = word(words[i + 1]);
      if (/^a[a-zṭṣḍẓḥʿ]{1,2}-/.test(nxt) || /^Allāh/.test(nxt)) nxt = nxt.replace(/^A/, "").replace(/^a/, "");
      out.push(`${w}-${nxt}`);
      i++;
      continue;
    }
    // the article's a (and Allāh's A) drops after a vowel: fī al-arḍ → fi l-arḍ, bismi llāhi
    const afterVowel = out.length && /[aiuāīū]$/.test(out[out.length - 1]);
    if (afterVowel && /^a(l|[a-zṭṣḍẓḥʿ]{1,2})-/.test(w)) w = w.slice(1);
    else if (afterVowel && /^Allāh/.test(w)) w = w.slice(1);
    out.push(w);
  }
  const s = out
    .join(" ")
    // long vowels the text leaves unmarked in the commonest words
    .replace(/raḥman/g, "raḥmān")
    .replace(/(^|[\s-])(ʾ?)ilah(?!ī)/g, "$1$2ilāh")
    .replace(/(^|[\s-])muḥammad/g, "$1Muḥammad");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
