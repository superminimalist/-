import { useTranslations } from "next-intl";
import type { MajlisStatus } from "@/lib/types";

const styles: Record<MajlisStatus, string> = {
  live: "bg-live text-white",
  scheduled: "bg-accent-soft text-accent",
  ended: "bg-line text-mute",
};

export function StatusBadge({ status }: { status: MajlisStatus }) {
  const t = useTranslations("status");
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status === "live" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
      {t(status)}
    </span>
  );
}
