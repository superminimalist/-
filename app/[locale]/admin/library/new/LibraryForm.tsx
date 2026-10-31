"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { createLibraryItem } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/client";
import { CONTENT_LANGUAGES, LIBRARY_TYPES } from "@/lib/types";

export function LibraryForm() {
  const t = useTranslations("admin");
  const tt = useTranslations("libraryTypes");
  const tl = useTranslations("languages");
  const supabase = useMemo(() => createClient(), []);
  const [audioUrl, setAudioUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // upload straight from the browser to Storage — server actions cap request bodies
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const ext = file.name.split(".").pop() ?? "mp3";
    const path = `audio/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("library").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setUploadError(error.message);
    setAudioUrl(supabase.storage.from("library").getPublicUrl(path).data.publicUrl);
  }

  return (
    <form action={createLibraryItem} className="card space-y-4">
      <h1 className="text-xl font-semibold">{t("newLibrary")}</h1>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">{t("type")}</label>
          <select name="type" className="input" defaultValue="nauha">
            {LIBRARY_TYPES.map((ty) => <option key={ty} value={ty}>{tt(ty)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t("language")}</label>
          <select name="language" className="input" defaultValue="ur">
            {CONTENT_LANGUAGES.map((l) => <option key={l} value={l}>{tl(l)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">{t("fieldTitle")}</label>
        <input name="title" required className="input" dir="auto" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">{t("reciter")}</label>
          <input name="reciter" className="input" dir="auto" />
        </div>
        <div>
          <label className="label">{t("occasion")}</label>
          <input name="occasion" className="input" placeholder="muharram" />
        </div>
      </div>
      <div>
        <label className="label">{t("audioFile")}</label>
        <input type="file" accept="audio/*" onChange={onFile} className="text-sm" />
        <input type="hidden" name="audio_url" value={audioUrl} />
        {uploading && <p className="mt-1 text-xs text-mute">…</p>}
        {audioUrl && <audio src={audioUrl} controls className="mt-2 w-full" />}
        {uploadError && <p className="mt-1 text-xs text-live">{uploadError}</p>}
      </div>
      <div>
        <label className="label">{t("textOriginal")}</label>
        <textarea name="text_original" rows={8} className="input" dir="auto" />
      </div>
      <div>
        <label className="label">{t("textTranslation")}</label>
        <textarea name="text_translation" rows={6} className="input" dir="auto" />
      </div>
      <button className="btn" disabled={uploading}>{t("create")}</button>
    </form>
  );
}
