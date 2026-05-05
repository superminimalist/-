import { useMemo, useState } from 'react'
import { buildDayData } from './helpers'
const actions=['travel','marriage','business','contract','treatment','prayer','charity','moving','buying','selling']
export default function SearchPage(){const [q,setQ]=useState('');const day=buildDayData(new Date(),Number(localStorage.getItem('hijriCorrection')||0));const filtered=useMemo(()=>actions.filter(a=>a.includes(q.toLowerCase())),[q]);return <div className='space-y-3'><h1 className='text-xl font-bold'>검색</h1><input className='w-full card p-3' placeholder='행동 검색...' value={q} onChange={e=>setQ(e.target.value)} /><div className='card text-sm'>오늘 추천: {day.goodFor.join(', ')}</div><ul className='space-y-2'>{filtered.map(a=><li key={a} className='card'>{a}</li>)}</ul></div>}
