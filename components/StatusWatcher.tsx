"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

/** Refreshes the page when the host goes live / ends, so viewers don't have to reload. */
export function StatusWatcher({ majlisId, status }: { majlisId: string; status: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const ch = supabase
      .channel(`majlis:${majlisId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "majlis", filter: `id=eq.${majlisId}` },
        (payload) => {
          if ((payload.new as { status: string }).status !== status) router.refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [majlisId, status, router, supabase]);

  return null;
}
