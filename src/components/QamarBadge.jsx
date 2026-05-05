export default function QamarBadge({ active }) {
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${active ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>까마르 다르 아끄랍 {active ? '적용' : '없음'}</span>
}
