import weekdays from '../data/weekdays.json'

export const getWeekdayInfo = (date) => weekdays.find((w) => w.weekday === date.getDay())

export const toDateKey = (date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
