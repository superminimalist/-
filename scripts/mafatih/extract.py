"""Mafatih al-Jinan PDF → content/mafatih/{index.json, s/<id>.json}

usage: python3 -I scripts/mafatih/extract.py <mafatih.pdf> <out_dir>

The PDF (alhassanain.org) is typeset in Traditional Arabic with presentation-form
glyphs. PyMuPDF yields logical order, but these artefacts need repair:
  1. two-letter ligatures (ﳏ = مح) emit the harakat of both letters after the pair
     (first mark → first letter); a lone mark needs the glyph's joining form to place;
  2. shadda+vowel glyphs (ﱠ) NFKC-decompose with a leading space;
  3. justified lines sometimes put a space between a letter and its mark;
  4. lines wrap mid-word — the last glyph's joining form (initial/medial) tells us;
  5. a few unmapped ligatures come out as latin letters (K=به, Y=ته, $=نه, g=ًّ).
"""
import json, re, sys, unicodedata as ud
from collections import Counter
from pathlib import Path
import pymupdf

SHADDA, SUKUN, KASRA = "\u0651", "\u0652", "\u0650"
YA = set("يى")
GARBAGE = {"K": "به", "Y": "ته", "$": "نه"}  # all initial-form ligatures
GARBAGE_MARK = {"g": SHADDA + "\u064b"}
LINEBREAK = "\u2062"
VERSE = "\u2063"  # followed by the verse number  # placeholder for an ambiguous line wrap, resolved with the vocab


def is_mark(s: str) -> bool:
    s = s.strip()
    return bool(s) and all(ud.category(c) == "Mn" for c in s)


def is_ar_letter(c: str) -> bool:
    return "\u0620" <= c <= "\u064a" or c in "\u0671\u067e\u0686\u0698\u06a9\u06af\u06cc"


def joins_next(raw: str) -> bool:
    if raw in GARBAGE:
        return True
    name = ud.name(raw, "")
    return "INITIAL FORM" in name or "MEDIAL FORM" in name


def distribute(raw: str, letters: str, units: list[str]) -> str:
    """Attach harakat units to the letters of one glyph (see module doc)."""
    if not units:
        return letters
    if len(letters) != 2:
        return letters + "".join(units)
    l1, l2 = letters
    if len(units) >= 2:
        return l1 + units[0] + l2 + "".join(units[1:])
    u = units[0]
    if l1 == "ل" and l2 in "اآأإ":  # لا: اِلاّ, الاْ, لِابْنِ  vs  مَلاَتْ
        return l1 + u + l2 if (SHADDA in u or SUKUN in u or u == KASRA) else l1 + l2 + u
    if joins_next(raw) or l2 in YA:  # يُميتُ, جَميعاً, فِي, اِلَى
        return l1 + u + l2
    return l1 + l2 + u  # مُخْلِصينَ, كَريمِ


def fix_arabic_chars(chars: list[str]) -> tuple[str, bool]:
    """chars: raw glyphs in stream order for one Arabic line → (text, continues_word)."""
    toks: list[list] = []  # [raw, letters, units]
    orphan: list[str] = []

    def attach(u: str):
        # skip spaces that justification put between a letter and its mark
        j = len(toks) - 1
        while j >= 0 and toks[j][1] == " ":
            j -= 1
        if j >= 0 and is_ar_letter(toks[j][1][-1]):
            del toks[j + 1 :]
            toks[j][2].append(u)
        else:
            orphan.append(u)

    for c in chars:
        if c in GARBAGE_MARK:
            attach(GARBAGE_MARK[c])
            continue
        n = (GARBAGE.get(c) or ud.normalize("NFKC", c)).replace("\u0640", "")
        if not n:
            continue
        if is_mark(n):
            attach(n.strip())
        elif n.isspace():
            toks.append([c, " ", []])
        else:
            toks.append([c, n, []])
    last = next((t for t in reversed(toks) if t[1] != " "), None)
    cont = bool(last) and joins_next(last[0])
    s = "".join(t[1] if t[1] == " " else distribute(t[0], t[1], t[2]) for t in toks)
    if orphan:  # marks at the start of a line belong to its final letter
        s = s.rstrip() + "".join(orphan)
    return ud.normalize("NFC", s), cont


def fix_text(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"ا\u064e\u0651(?=[ءئ])", "آ", s)  # madda typed as shadda-fatha: دُعاَّءَ → دُعآءَ
    s = re.sub(r" ء(?=[\u064b-\u0652])", "ء", s)  # شَى ءٌ
    s = re.sub(r"(كُل[\u064e\u064f\u0650]\u0651)(?=[^\s\u064b-\u0652])", r"\1 ", s)  # كُلِّشَىْءٍ
    s = re.sub(r" ([،.:؛!])", r"\1", s)
    s = s.replace("االله", "الله")  # ا + ﷲ
    s = re.sub(r"(^|\s)ا\s(?=\S)", r"\1ا", s)  # bare alef split off its word
    return s


def clean_ws(s: str) -> str:
    return re.sub(r"[  ]+", " ", s).strip()


# ---------------------------------------------------------------- page → lines
HEADER_FONTS = ("LucidaConsole",)


def page_lines(page):
    """Yield dicts {kind: ar|en|h, text, y0, y1, x0, x1, cont} in reading order."""
    raw = page.get_text("rawdict")
    W = page.rect.width
    for b in raw["blocks"]:
        for l in b.get("lines", []):
            spans = [s for s in l["spans"] if not s["font"].startswith(HEADER_FONTS)]
            if not spans:
                continue
            arab_chars, latin = [], []
            bold = True
            colored = False
            for s in spans:
                cs = [c["c"] for c in s["chars"]]
                if "Arab" in s["font"]:
                    arab_chars += cs
                else:
                    latin.append("".join(cs))
                    if s["text"].strip() if "text" in s else "".join(cs).strip():
                        bold = bold and "Bold" in s["font"]
                        colored = colored or (s["color"] not in (0,))
            lat = "".join(latin)
            ar_letters = sum(1 for c in arab_chars if any(is_ar_letter(x) for x in ud.normalize("NFKC", c)) or c in GARBAGE)
            lat_letters = sum(1 for c in lat if c.isalnum())
            if ar_letters == 0 and lat_letters == 0:
                continue
            bbox = l["bbox"]
            if ar_letters >= lat_letters:
                txt, cont = fix_arabic_chars(arab_chars)
                yield dict(kind="ar", text=txt, y0=bbox[1], y1=bbox[3], x0=bbox[0], x1=bbox[2], cont=cont, W=W)
            else:
                t = lat.replace(" ", " ")
                vm = re.fullmatch(r"\s*\)\s*(\d{1,3})\s*\(?\s*", "".join(arab_chars) + t)
                if vm:  # Qur'an verse number ")12 (" — paren is in the Arabic font
                    yield dict(kind="vn", text=vm.group(1), y0=bbox[1], y1=bbox[3], x0=bbox[0], x1=bbox[2], W=W)
                    continue
                if re.fullmatch(r"\s*\d{1,4}\s*", t):  # page number
                    continue
                letters = [c for c in t if c.isalpha()]
                # unbolded headings: all caps, often one word per line when justified
                caps = len(letters) >= 2 and sum(c.isupper() for c in letters) / len(letters) > 0.9
                kind = "h" if (bold or caps) and lat_letters >= 2 else "en"
                yield dict(kind=kind, text=t, y0=bbox[1], y1=bbox[3], x0=bbox[0], x1=bbox[2], W=W, colored=colored)


# ---------------------------------------------------------------- TOC
def parse_toc(doc):
    entries, buf, lvl = [], "", None
    for p in range(1, 19):
        for b in doc[p].get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                spans = [s for s in l["spans"] if not any(is_ar_letter(c) for c in ud.normalize("NFKC", s["text"])) and not s["font"].startswith(HEADER_FONTS)]
                t = clean_ws("".join(s["text"] for s in spans))
                if not t or t == "Table of Contents" or re.fullmatch(r"\d+", t):
                    continue
                x = round(l["bbox"][0])
                bold = any("Bold" in s["font"] for s in spans)
                if not buf:
                    if bold and x <= 140:
                        lvl = 0
                    elif any("Arial" in s["font"] for s in spans) and x > 160:
                        lvl = 2
                    elif x <= 150:
                        lvl = 1
                    else:
                        lvl = 2
                buf = (buf + " " + t).strip()
                m = re.search(r"\s*\.{3,}\s*(\d+)\s*$", buf) or re.search(r"\s+(\d{2,4})$", buf)
                if m:
                    title = fix_en(clean_ws(buf[: m.start()].rstrip(". ")))
                    entries.append(dict(level=lvl, title=title, page=int(m.group(1))))
                    buf = ""
    return entries


# ---------------------------------------------------------------- titles
SMALL = {"of", "the", "and", "on", "in", "for", "to", "at", "al", "e", "a", "by", "from", "with", "after"}


# typos / missing spaces in the source PDF's English
EN_FIXES = [
    (r"\b(al|l)(?=[A-Z’'])", r"\1-"),  # alHusayn → al-Husayn (also old extractions)
    (r"\bAliAmeer\b", "Ali, Amir"),
    (r"\b(Surah|Ali|Abi|Abu|Mirza|Talib|illa|Shaykh|Imam|Sayyid)(?=[A-Z])", r"\1 "),
    (r"\bAllahuakbar(?=[A-Z])", "Allahu akbar "),
    (r"’s(?=[A-Z])", "’s "),
    (r"\bTusiand\b", "Tusi and"),
    (r"\bMomineen\b", "Mu’minin"),
    (r"\bMERTIS\b", "MERITS"), (r"\bMertis\b", "Merits"),
    (r"\bELEVENTHN\b", "ELEVENTH"), (r"\bEleventhn\b", "Eleventh"),
    (r"\bSECLECTED\b", "SELECTED"), (r"\bSeclected\b", "Selected"),
    (r"\bNineth\b", "Ninth"), (r"\bNINETH\b", "NINTH"),
    (r"\bMosa\b", "Musa"), (r"\bMOTHS\b", "MONTHS"), (r"\bIT'S AAMAL\b", "ITS AAMAL"),
    (r"\bAmeerul Momeneen\b", "Amir al-Mu’minin"),
    (r"\(S\.w\.t\)", "(s.w.t.)"),
    (r"\s+([,.;:])(?=\s|$)", r"\1"),
    (r"  +", " "),
]


def fix_en(s: str) -> str:
    for a, b in EN_FIXES:
        s = re.sub(a, b, s)
    return s.strip()


def title_case(t: str) -> str:
    t = re.sub(r"\s+", " ", t).strip()
    words = t.lower().split(" ")
    out = []
    for i, w in enumerate(words):
        if re.fullmatch(r"\(?[ivx]+\)?|\(?a\.?s\.?\)?|\(?s\)?|\(a\)|\(a\.t\.f\.s\.?\)", w):
            out.append(w.upper())
        elif i and w in SMALL:
            out.append(w)
        else:
            out.append(re.sub(r"(^|[-(/'’])([a-z])", lambda m: m.group(1) + m.group(2).upper(), w))
    return " ".join(out)


def slugify(t: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:60]


def norm_key(t: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", t.upper())


# ---------------------------------------------------------------- paragraphs
def to_paragraphs(lines):
    """Merge lines into blocks [{t: ar|en|h, x: text}]."""
    blocks = []
    prev = None
    for ln in lines:
        k, txt = ln["kind"], ln["text"]
        if k == "vn":
            if blocks and blocks[-1]["t"] == "ar":
                blocks[-1]["x"] = blocks[-1]["x"].rstrip() + VERSE + txt + " "
            continue
        if k == "h":
            t = clean_ws(txt)
            if blocks and blocks[-1]["t"] == "h" and prev is not None and ln["y0"] - prev["y1"] < 6:
                blocks[-1]["x"] += " " + t
            else:
                blocks.append({"t": "h", "x": t})
            prev = ln
            continue
        new_para = True
        if blocks and blocks[-1]["t"] == k and prev is not None and prev["kind"] == k:
            gap = ln["y0"] - prev["y1"]
            lh = prev["y1"] - prev["y0"]
            same_page = gap > -40
            if k == "ar":
                # Arabic duas flow line to line; only a big gap breaks them
                new_para = same_page and gap > lh * 1.2
                if not same_page:
                    new_para = False
            else:
                prev_full = prev["x1"] > prev["W"] * 0.70
                ends_sentence = re.search(r"[.:!?”\"]\s*$", prev["text"]) is not None
                new_para = (same_page and gap > lh * 0.9) or (ends_sentence and not prev_full)
        if new_para:
            blocks.append({"t": k, "x": clean_ws(txt) if k == "en" else txt.strip()})
        else:
            b = blocks[-1]
            if k == "ar":
                b["x"] = b["x"].rstrip() + ("" if prev["cont"] else LINEBREAK) + txt.strip()
            else:
                cur = b["x"]
                if cur.endswith("-") and not cur.endswith(" -"):
                    # this book hyphenates names (al-Husayn), not syllables: keep the hyphen
                    b["x"] = cur + clean_ws(txt)
                else:
                    b["x"] = cur + " " + clean_ws(txt)
        prev = ln
    return [b for b in blocks if b["x"] and not re.fullmatch(r"[\s.\-–—]*", b["x"])]


# ---------------------------------------------------------------- main
def main():
    doc = pymupdf.open(PDF)
    toc = parse_toc(doc)
    # all lines of the book, tagged with page
    book = []
    for p in range(19, doc.page_count):
        for ln in page_lines(doc[p]):
            ln["page"] = p + 1
            book.append(ln)

    # locate each TOC entry: first heading line on its page (or the next page) matching the title
    starts = []
    cursor = 0
    for e in toc:
        key = norm_key(e["title"])[:24]
        found = None
        for i in range(cursor, len(book)):
            ln = book[i]
            if ln["page"] > e["page"] + 1:
                break
            if ln["page"] < e["page"]:
                continue
            if ln["kind"] in ("h", "en"):
                # headings may wrap: test this line + next two
                joined = norm_key(" ".join(b["text"] for b in book[i : i + 3] if b["kind"] != "ar"))
                if key and joined.startswith(key[: max(8, min(len(key), 16))]):
                    found = i
                    break
        if found is None:
            found = next((i for i in range(cursor, len(book)) if book[i]["page"] >= e["page"]), len(book))
        # drop wrapped heading continuation lines that just repeat the title
        starts.append(found)
        cursor = found

    sections = []
    ids = set()
    for n, e in enumerate(toc):
        a = starts[n]
        b = starts[n + 1] if n + 1 < len(toc) else len(book)
        lines = book[a:b]
        # strip the heading lines that equal the title
        tkey = norm_key(e["title"])
        acc = ""
        while lines and lines[0]["kind"] in ("h", "en") and norm_key(lines[0]["text"]) and tkey.startswith(norm_key(acc + lines[0]["text"])):
            acc += lines[0]["text"]
            lines = lines[1:]
        sid = slugify(e["title"]) or f"s{n}"
        base, k = sid, 2
        while sid in ids:
            sid, k = f"{base}-{k}", k + 1
        ids.add(sid)
        sections.append((sid, e, to_paragraphs(lines)))

    # vocab of letter skeletons → decide whether a plain line wrap split a word
    vocab = Counter()
    for _, _, blocks in sections:
        for x in blocks:
            if x["t"] == "ar":
                for w in re.split(r"[\s" + LINEBREAK + "]+", x["x"]):
                    vocab[skeleton(w)] += 1

    def should_join(l, r):
        sl, sr, both = skeleton(l), skeleton(r), skeleton(l + r)
        if not sl or not sr:
            return False
        if len(sr) == 1 and sr != "و":
            return True
        if sl == "ا":  # a bare alef is never a word: ا غْفِرْ
            return True
        if len(sl) == 1:
            return False
        return vocab[both] >= 1 and vocab[both] >= min(vocab[sl], vocab[sr])

    def resolve(t: str) -> str:
        # left to right, so a chain a⁢b⁢c is judged on the already-joined left word
        segs = t.split(LINEBREAK)
        acc = segs[0]
        for seg in segs[1:]:
            lw = acc.rsplit(" ", 1)[-1]
            rw = seg.split(" ", 1)[0]
            acc += ("" if lw and rw and should_join(lw, rw) else " ") + seg
        return acc

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "s").mkdir(exist_ok=True)
    index = []
    for sid, e, blocks in sections:
        out = []
        for x in blocks:
            if x["t"] == "ar":
                t = resolve(x["x"])
                if VERSE in t:
                    parts = re.split(VERSE + r"(\d+)", t)
                    for i in range(0, len(parts) - 1, 2):
                        if parts[i].strip():
                            out.append({"t": "ar", "x": fix_text(parts[i]), "v": int(parts[i + 1])})
                    if parts[-1].strip():
                        out += [{"t": "ar", "x": c} for c in split_phrases(fix_text(parts[-1]))]
                else:
                    out += [{"t": "ar", "x": c} for c in split_phrases(fix_text(t))]
            else:
                out.append({**x, "x": fix_en(x["x"])})
        item = dict(
            id=sid,
            level=e["level"],
            title=title_case(e["title"]),
            page=e["page"],
            words=sum(len(x["x"].split()) for x in out),
        )
        index.append(item)
        (OUT / "s" / f"{sid}.json").write_text(
            json.dumps(dict(id=sid, title=item["title"], page=e["page"], blocks=out), ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(len(toc), "entries", sum(1 for i in index if i["words"] == 0), "empty")


def skeleton(w: str) -> str:
    return "".join(c for c in w if is_ar_letter(c))


# phrase starts that make natural reading breaks inside a long dua
BREAK_AT = re.compile(
    r"(?<!\sوَ)(?<!\sفَ) (?=(?:[وَفَ]{0,2}\s?)?(?:اَللّٰهُمَّ|اَللّهُمَّ|اللّهُمَّ|اَللَّهُمَّ|اِلهى|اِلٰهِي|اِلهِي|اِلَهِي|يا رَبِّ|يَا رَبِّ|سُبْحانَكَ|سُبْحَانَكَ|يا مَنْ|يَا مَنْ|اَلْحَمْدُ|اَلسَّلامُ|اَلسَّلَامُ|اَشْهَدُ)\s)"
)


def split_phrases(t: str, min_words=10, max_words=55) -> list[str]:
    if len(t.split()) <= max_words:
        return [t]
    parts = [p.strip() for p in re.split(r"(?<=[.،؛:!])\s+|" + BREAK_AT.pattern, t) if p and p.strip()]
    out: list[str] = []
    for p in parts:
        if out and (len(out[-1].split()) < min_words or len(p.split()) < 4):
            out[-1] += " " + p
        else:
            out.append(p)
    # still-huge chunks: cut at the nearest وَ after max_words
    final = []
    for p in out:
        ws = p.split(" ")
        while len(ws) > max_words * 1.6:
            cut = next((i for i in range(max_words, len(ws)) if ws[i] in ("وَ", "وَاَنْتَ")), None)
            if cut is None:
                break
            final.append(" ".join(ws[:cut]))
            ws = ws[cut:]
        final.append(" ".join(ws))
    return final


if __name__ == "__main__":
    PDF, OUT = sys.argv[1], Path(sys.argv[2])
    main()
