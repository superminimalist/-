import qamarData from '../data/qamarDarAqrab.json'

export const isQamarDarAqrab = (date) =>
  qamarData.some((d) => d.month === date.getMonth() + 1 && d.day === date.getDate() && d.active)
