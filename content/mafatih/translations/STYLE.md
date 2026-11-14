# Mafatih translation style (Korean only)

Every Arabic passage (`{"t":"ar"}` block) gets a Korean liturgical translation. No English.

## Output format

`content/mafatih/translations/chunk-NNN.json` (part files `chunk-NNN-p2.json`, … if large)

```json
{
  "<section-id>": {
    "<block index>": { "c": "<first 2–3 words of the block's Arabic, copied exactly>", "ko": "…" }
  }
}
```

- Block index = position in `content/mafatih/s/<section-id>.json` → `blocks` (0-based). Translate exactly the indices assigned to you, all of them.
- `c` is checked mechanically against the start of the block.
- Blocks are consecutive pieces of one prayer and may start or end mid-sentence. Translate exactly that span so neighbouring blocks read on.
- Optional `"ar"` (corrected Arabic) ONLY when the passage is badly broken (words fused or split, stray symbols, harakat missing throughout). Otherwise leave the Arabic alone; do not output `ar`.
- Read the Arabic in small pieces (e.g. a Python one-liner printing only your assigned blocks), not whole files.
- Validate: `node scripts/mafatih/check-tr.mjs <file>` → `OK`. At the end: `node scripts/mafatih/check-tr.mjs <file> <chunkNo>` checks coverage across your part files → `OK`.

## Korean register (전례적 번역)

Korean prayer-book register, to be recited aloud in worship. Faithful to the Arabic, natural Korean word order, no glosses in parentheses, normal spacing.

- 하나님 (الله). 하나님, (اللهم). 나의 하나님 (إلهي). 주님이시여 (يا ربّ). 나의 주인이시여 (سيدي / مولاي).
- To God: requests ~하옵소서 / ~주옵소서 / ~하소서; statements ~하나이다 / ~이옵니다 / ~이시니이다; vocatives ~이시여.
- To the Prophet / Imams: 당신, "당신께 평안이 있으소서" (السلام عليك).
- 자비로우시고 자애로우신 하나님의 이름으로 (بسم الله الرحمن الرحيم). 자비로운 이들 가운데 가장 자비로우신 분이시여 (يا أرحم الراحمين).
- 무함마드와 무함마드의 가문께 축복을 내리옵소서 (اللهم صل على محمد وآل محمد). Inline صلى الله عليه وآله: 하나님께서 그분과 그 가문께 축복을 내리시기를.
- Terms: 사도, 예언자, 이맘, 믿는 이들의 수장 (أمير المؤمنين), 시대의 주인 (صاحب الزمان), 가문, 계승자 (وصيّ), 중재, 지야라트, 두아, 꾸란, 카아바, 핫즈, 움라, 라마단, 진, 사탄, 내세, 부활의 날, 낙원, 불/지옥.
- Names: 알리, 파티마 자흐라, 하산, 후세인, 자인 알아비딘, 무함마드 바끼르, 자으파르 사디끄, 무사 카짐, 알리 리다, 무함마드 자와드, 알리 하디, 하산 아스카리, 마흐디, 아바스, 자이납, 카르발라, 쿠파, 나자프, 메디나, 메카.
- Qur'an verse blocks (with `"v"`): translate the verse faithfully.

## Examples

```json
"1": { "c": "يَا رَبِّ", "ko": "주님이시여, 사탄들의 속삭임에서 저를 지켜 주시고, 당신의 권능에 힘입어 권세 잡은 자들의 폭정에서 저를 보호하소서." },
"4": { "c": "اَللّهُمَّ اغْفِرْ", "ko": "하나님, 보호의 장막을 찢는 저의 죄를 용서하옵소서. 하나님, 징벌을 불러오는 저의 죄를 용서하옵소서." },
"5": { "c": "السَّلامُ", "ko": "하나님의 사도의 아드님이시여, 당신께 평안이 있으소서. 믿는 이들의 수장의 아드님이시여, 당신께 평안이 있으소서." },
"24": { "c": "اِنَّا لِلَّهِ", "ko": "진실로 우리는 하나님께 속하였고, 그분께로 돌아가나이다." }
```
