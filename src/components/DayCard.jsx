import StatusBadge from './StatusBadge'
import QamarBadge from './QamarBadge'
export default function DayCard({ day }) {
  return <div className='card space-y-2'><div className='flex justify-between'><h2 className='font-bold'>{day.dateLabel}</h2><StatusBadge status={day.status} /></div><QamarBadge active={day.qamar} /><p className='text-sm'>하면 좋은 일: {day.goodFor.join(', ')}</p><p className='text-sm'>피해야 할 일: {day.avoid.join(', ')}</p><p className='text-sm text-slate-500'>완화 방법: {day.mitigation}</p></div>
}
