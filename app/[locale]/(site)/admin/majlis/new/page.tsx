import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { MajlisSeries } from "@/lib/types";
import { MajlisForm } from "./MajlisForm";

export default async function NewMajlis({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const { data: series } = await supabase
    .from("majlis_series")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<MajlisSeries[]>();
  return <MajlisForm series={series ?? []} />;
}
