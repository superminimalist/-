"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient, getSessionProfile, isStaff } from "@/lib/supabase/server";
import { startRecording, stopRecording } from "@/lib/livekit";
import { LIBRARY_TYPES, type LibraryType, type Majlis } from "@/lib/types";

async function staffClient() {
  const { profile } = await getSessionProfile();
  if (!isStaff(profile)) throw new Error("forbidden");
  return createClient();
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function back(path = "/admin") {
  revalidatePath("/", "layout");
  redirect({ href: path, locale: await getLocale() });
}

// ───── series / majlis ─────
export async function createSeries(form: FormData) {
  const supabase = await staffClient();
  const year = Number(str(form, "hijri_year"));
  const { error } = await supabase.from("majlis_series").insert({
    title: str(form, "title"),
    occasion: str(form, "occasion"),
    hijri_year: Number.isFinite(year) && year > 0 ? year : null,
  });
  if (error) throw new Error(error.message);
  await back();
}

export async function createMajlis(form: FormData) {
  const supabase = await staffClient();
  const startsAt = str(form, "starts_at_iso");
  if (!startsAt || Number.isNaN(Date.parse(startsAt))) throw new Error("invalid start time");
  const { error } = await supabase.from("majlis").insert({
    title: str(form, "title"),
    speaker: str(form, "speaker"),
    description: str(form, "description"),
    series_id: str(form, "series_id") || null,
    starts_at: startsAt,
  });
  if (error) throw new Error(error.message);
  await back();
}

export async function deleteMajlis(form: FormData) {
  const supabase = await staffClient();
  await supabase.from("majlis").delete().eq("id", str(form, "id"));
  await back();
}

export async function goLive(form: FormData) {
  const supabase = await staffClient();
  const id = str(form, "id");
  const { data: m } = await supabase.from("majlis").select("*").eq("id", id).single<Majlis>();
  if (!m) throw new Error("not found");

  await supabase.from("majlis").update({ status: "live" }).eq("id", id);

  try {
    const rec = await startRecording(m.livekit_room, m.id);
    if (rec) await supabase.from("majlis").update({ egress_id: rec.egressId, recording_url: rec.url }).eq("id", id);
  } catch (e) {
    console.error("[egress] start failed", e); // live still works without recording
  }
  revalidatePath("/", "layout");
}

export async function endMajlis(form: FormData) {
  const supabase = await staffClient();
  const id = str(form, "id");
  const { data: m } = await supabase.from("majlis").select("egress_id").eq("id", id).single();
  if (m?.egress_id) await stopRecording(m.egress_id);
  await supabase.from("majlis").update({ status: "ended" }).eq("id", id);
  await back();
}

// ───── library ─────
export async function createLibraryItem(form: FormData) {
  const supabase = await staffClient();
  const type = str(form, "type") as LibraryType;
  if (!LIBRARY_TYPES.includes(type)) throw new Error("invalid type");
  const { error } = await supabase.from("library_items").insert({
    type,
    title: str(form, "title"),
    reciter: str(form, "reciter"),
    language: str(form, "language") || "ur",
    occasion: str(form, "occasion"),
    audio_url: str(form, "audio_url") || null,
    text_original: str(form, "text_original"),
    text_translation: str(form, "text_translation"),
  });
  if (error) throw new Error(error.message);
  await back("/library");
}

export async function deleteLibraryItem(form: FormData) {
  const supabase = await staffClient();
  await supabase.from("library_items").delete().eq("id", str(form, "id"));
  await back("/admin/library/new");
}

// ───── moderation ─────
export async function addBannedWord(form: FormData) {
  const supabase = await staffClient();
  const word = str(form, "word").toLowerCase();
  if (word) await supabase.from("banned_words").upsert({ word });
  revalidatePath("/", "layout");
}

export async function removeBannedWord(form: FormData) {
  const supabase = await staffClient();
  await supabase.from("banned_words").delete().eq("word", str(form, "word"));
  revalidatePath("/", "layout");
}

export async function unmuteUser(form: FormData) {
  const supabase = await staffClient();
  await supabase.from("profiles").update({ muted: false }).eq("id", str(form, "id"));
  revalidatePath("/", "layout");
}
