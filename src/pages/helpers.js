import { getWeekdayInfo } from '../utils/dateUtils'
import { estimateHijriDay, getHijriRule } from '../utils/hijriUtils'
import { isQamarDarAqrab } from '../utils/qamarUtils'
import { statusFromScore, SCORE_MAP } from '../utils/scoreUtils'

export const buildDayData = (date, correction = 0) => {
  const weekday = getWeekdayInfo(date)
  const hijri = estimateHijriDay(date, correction)
  const hRule = getHijriRule(hijri)
  const qamar = isQamarDarAqrab(date)
  let score = (weekday?.baseScore || 0) + (hRule?.score || 0) + (qamar ? SCORE_MAP.qamarDarAqrab : 0)
  const status = statusFromScore(score)
  return { key: `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`, day:date.getDate(), dateLabel:date.toLocaleDateString('ko-KR',{dateStyle:'full'}), weekday: weekday?.label, hijri, qamar, score, status, goodFor:hRule?.goodFor||['기도'], avoid:hRule?.avoid||['무리한 결정'], mitigation:hRule?.mitigation||'침착하게 계획하기' }
}
