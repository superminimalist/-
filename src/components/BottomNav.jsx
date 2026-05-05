import { NavLink } from 'react-router-dom'
const items = [{to:'/',label:'오늘'},{to:'/calendar',label:'달력'},{to:'/search',label:'검색'},{to:'/settings',label:'설정'}]
export default function BottomNav(){return <nav className='fixed bottom-0 left-0 right-0 bg-white border-t max-w-md mx-auto'><div className='grid grid-cols-4'>{items.map(i=><NavLink key={i.to} to={i.to} className={({isActive})=>`py-3 text-center text-sm ${isActive?'text-indigo-600 font-semibold':'text-slate-500'}`}>{i.label}</NavLink>)}</div></nav>}
