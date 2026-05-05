import hijriDays from '../data/hijriDays.json'

export const estimateHijriDay = (date, correction = 0) => {
  const raw = ((date.getDate() + 9 + correction - 1) % 30) + 1
  return raw
}

export const getHijriRule = (hijriDay) => hijriDays.find((d) => d.day === hijriDay) || null
