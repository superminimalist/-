export const SCORE_MAP = { very_good: 3, good: 2, neutral: 0, caution: -1, inauspicious: -2, very_inauspicious: -3, qamarDarAqrab: -3 }

export const statusFromScore = (score) => {
  if (score >= 3) return 'very_good'
  if (score >= 1) return 'good'
  if (score === 0) return 'neutral'
  if (score >= -2) return 'caution'
  return 'inauspicious'
}
