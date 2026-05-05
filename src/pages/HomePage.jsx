import DayCard from '../components/DayCard'
import { buildDayData } from './helpers'
export default function HomePage(){const c=Number(localStorage.getItem('hijriCorrection')||0);const day=buildDayData(new Date(),c);return <div className='space-y-4'><h1 className='text-xl font-bold'>오늘</h1><DayCard day={day} /></div>}
