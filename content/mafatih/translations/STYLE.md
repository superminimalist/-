# Mafatih translation style

Every Arabic passage (`{"t":"ar"}` block) gets an English and a Korean translation.
The rendered page shows: Arabic → romanisation (automatic) → Korean → English.

## Output format

One JSON file per chunk: `content/mafatih/translations/chunk-NN.json`

```json
{
  "<section-id>": {
    "<block index>": {
      "c": "<the first 2–3 words of that block's Arabic, copied character for character>",
      "en": "…",
      "ko": "…",
      "ar": "… (optional: corrected Arabic, ONLY when the source is visibly broken)"
    }
  }
}
```

- Block index = position in `content/mafatih/s/<section-id>.json` → `blocks` array (0-based). Translate exactly the indices you were assigned.
- `c` is checked mechanically: it must be the start of the block text, copied exactly (with harakat).
- Passages are chunks of one continuous prayer; a block may start or end mid-sentence. Translate exactly that span so consecutive blocks read on; do not repeat or anticipate text from neighbours.
- `ar`: give it only if the source has obvious breakage: words fused together (`السَّلامُعَلَيْكَ`), words split apart (`نَذَ رْتُهُ`), stray symbols (`◌`, `[`), harakat missing for most of the passage, misspelling. Then supply the full corrected passage covering the same span. Never change meaning or wording otherwise.
- Qur'anic verse blocks (they carry `"v"`): translate the verse. Keep it faithful; no commentary.
- Short formula repeated many times (e.g. Jawshan refrains): translate each occurrence fully anyway.
- Validate before finishing: `node scripts/mafatih/check-tr.mjs content/mafatih/translations/chunk-NN.json`. It must print `OK`.

## English

- Faithful, dignified, modern. "You/Your" for God (capitalised), "you" for the Prophet and Imams.
- Allah (not God) for الله; "my God" for إلهي; "O Allah" for اللهم; "my Lord" for ربّ / يا ربّ; "my Master" for سيدي / مولاي when addressing God.
- the All-beneficent, the All-merciful (الرحمن الرحيم); Most Merciful of the merciful (أرحم الراحمين).
- Muhammad and the family of Muhammad; the Household (أهل البيت); Commander of the Faithful (أمير المؤمنين); Master of the Age (صاحب الزمان).
- Blessing formulae inside the text: "Allah bless him and his family" (صلى الله عليه وآله), "peace be upon him/them".
- Proper names in common English spelling: al-Husayn, al-Hasan, Fatima al-Zahra, Ali, Ja'far al-Sadiq, Musa al-Kazim, Ali al-Rida, al-Jawad, al-Hadi, al-Askari, al-Mahdi, Zayn al-Abidin, Karbala, Kufa, Najaf, Ramadan, Sha'ban, Rajab, Muharram, Dhu l-Hijja.

## Korean (전례적 번역)

Korean prayer-book register. It must read as something said aloud in worship.

- 하나님 for الله. 하나님, (vocative for اللهم). 나의 하나님 (إلهي). 주님이시여 (يا ربّ). 나의 주인이시여 (سيدي/مولاي).
- Requests to God: ~하옵소서 / ~주옵소서 / ~하소서. Statements to God: ~하나이다 / ~이옵니다 / ~이시니이다. Vocatives: ~이시여.
- To the Prophet / Imams: 당신 (honorific), "당신께 평안이 있으소서" for السلام عليك.
- 자비로우시고 자애로우신 하나님의 이름으로 (بسم الله الرحمن الرحيم). 자비로운 이들 가운데 가장 자비로우신 분이시여 (يا أرحم الراحمين).
- 무함마드와 무함마드의 가문께 축복을 내리옵소서 (اللهم صل على محمد وآل محمد). 하나님께서 그분과 그 가문께 축복을 내리시기를 (صلى الله عليه وآله, inline).
- 사도 (رسول), 예언자 (نبي), 이맘, 믿는 이들의 수장 (أمير المؤمنين), 시대의 주인 (صاحب الزمان), 가문 (آل / أهل البيت), 계승자 (وصيّ), 중재 (شفاعة), 지야라트, 두아, 꾸란, 카아바, 핫즈, 움라, 라마단, 이슬람, 무슬림, 진 (جن), 사탄 (شيطان), 내세 (آخرة), 부활의 날 (يوم القيامة), 천국/낙원 (الجنة), 지옥/불 (النار).
- Names in Korean: 알리, 파티마 자흐라, 하산, 후세인, 자인 알아비딘, 무함마드 바끼르, 자으파르 사디끄, 무사 카짐, 알리 리다, 무함마드 자와드, 알리 하디, 하산 아스카리, 마흐디, 아바스, 자이납, 카르발라, 쿠파, 나자프, 메디나, 메카.
- Natural Korean word order; no translationese, no parentheses glosses. Keep sentences complete and dignified. Use `word-break`-friendly spacing (normal Korean spacing).

## Example (from the Sunday supplication)

```json
"1": {
  "c": "يَا رَبِّ",
  "en": "O my Lord, from the whisperings of the devils, and by Your authority I guard myself against the tyranny of rulers.",
  "ko": "주님이시여, 사탄들의 속삭임에서 저를 지켜 주시고, 당신의 권능에 힘입어 권세 잡은 자들의 폭정에서 저를 보호하소서."
}
```

Finished examples to imitate: `kumayl.json`, `weekly-duas.json`, `weekly-ziyarat.json`, `ashura.json` in this folder.
