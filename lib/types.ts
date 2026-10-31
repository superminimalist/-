export type UserRole = "member" | "host" | "admin";
export type MajlisStatus = "scheduled" | "live" | "ended";
export type LibraryType = "nauha" | "marsiya" | "ziyarat" | "dua";

export const LIBRARY_TYPES: LibraryType[] = ["nauha", "marsiya", "ziyarat", "dua"];
export const CONTENT_LANGUAGES = ["ur", "ar", "fa", "en", "ko", "hi"] as const;

export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  locale: string;
  muted: boolean;
}

export interface MajlisSeries {
  id: string;
  title: string;
  occasion: string;
  hijri_year: number | null;
}

export interface Majlis {
  id: string;
  series_id: string | null;
  title: string;
  speaker: string;
  description: string;
  starts_at: string;
  status: MajlisStatus;
  livekit_room: string;
  egress_id: string | null;
  recording_url: string | null;
}

export interface ChatMessage {
  id: number;
  majlis_id: string;
  user_id: string;
  body: string;
  deleted: boolean;
  created_at: string;
  profiles?: { display_name: string } | null;
}

export interface LibraryItem {
  id: string;
  type: LibraryType;
  title: string;
  reciter: string;
  language: string;
  occasion: string;
  audio_url: string | null;
  text_original: string;
  text_translation: string;
}
