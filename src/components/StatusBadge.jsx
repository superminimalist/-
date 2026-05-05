const styles = {
  very_good: 'bg-emerald-100 text-emerald-700', good: 'bg-green-100 text-green-700', neutral: 'bg-slate-100 text-slate-700', caution: 'bg-amber-100 text-amber-700', inauspicious: 'bg-rose-100 text-rose-700',
}
const labels = { very_good: '길일', good: '길일', neutral: '보통', caution: '주의', inauspicious: '흉일' }
export default function StatusBadge({ status }) { return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>{labels[status]}</span> }
