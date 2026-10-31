import { Link } from "@/i18n/navigation";
import type { Majlis } from "@/lib/types";
import { LocalTime } from "./LocalTime";
import { StatusBadge } from "./StatusBadge";

export function MajlisCard({ m }: { m: Majlis }) {
  return (
    <Link
      href={`/majlis/${m.id}`}
      className="card flex items-start justify-between gap-4 transition hover:border-accent"
    >
      <div className="min-w-0">
        <div className="mb-1 font-medium">{m.title}</div>
        {m.speaker && <div className="mb-2 text-sm text-mute">{m.speaker}</div>}
        <div className="text-sm"><LocalTime iso={m.starts_at} /></div>
      </div>
      <StatusBadge status={m.status} />
    </Link>
  );
}
