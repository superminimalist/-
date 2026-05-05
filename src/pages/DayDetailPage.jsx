import { useParams } from 'react-router-dom'
import DayCard from '../components/DayCard'
import { buildDayData } from './helpers'
export default function DayDetailPage(){const {dateKey}=useParams();const [y,m,d]=dateKey.split('-').map(Number);const day=buildDayData(new Date(y,m-1,d),Number(localStorage.getItem('hijriCorrection')||0));return <div className='space-y-3'><h1 className='text-xl font-bold'>상세</h1><DayCard day={day}/><div className='card text-sm'>근거: weekday + hijri + qamar + special 규칙(샘플)<br/>source: sample/page-1</div></div>}
