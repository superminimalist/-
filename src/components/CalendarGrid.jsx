import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
export default function CalendarGrid({ days }) { return <div className='grid grid-cols-7 gap-2'>{days.map(d=><Link key={d.key} to={`/day/${d.key}`} className='card p-2 min-h-20'><p className='text-xs'>{d.day}</p>{d.inMonth && <StatusBadge status={d.status} />}</Link>)}</div> }
