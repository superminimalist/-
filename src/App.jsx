import { Navigate, Route, Routes } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import CalendarPage from './pages/CalendarPage'
import DayDetailPage from './pages/DayDetailPage'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'

export default function App(){return <div className='max-w-md mx-auto min-h-screen pb-20 p-4 bg-slate-50'><Routes><Route path='/' element={<HomePage/>}/><Route path='/calendar' element={<CalendarPage/>}/><Route path='/day/:dateKey' element={<DayDetailPage/>}/><Route path='/search' element={<SearchPage/>}/><Route path='/settings' element={<SettingsPage/>}/><Route path='*' element={<Navigate to='/' />}/></Routes><BottomNav/></div>}
