"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { createMajlis } from "@/app/actions/admin";
import type { MajlisSeries } from "@/lib/types";

export function MajlisForm({ series }: { series: MajlisSeries[] }) {
  const t = useTranslations("admin");
  const [local, setLocal] = useState("");
  // datetime-local is wall-clock in the host's browser — convert to UTC ISO before it hits the server
  const iso = local ? new Date(local).toISOString() : "";

  return (
    <form action={createMajlis} className="card max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">{t("newMajlis")}</h1>
      <div>
        <label className="label">{t("fieldTitle")}</label>
        <input name="title" required className="input" />
      </div>
      <div>
        <label className="label">{t("speaker")}</label>
        <input name="speaker" className="input" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">{t("startsAt")}</label>
          <input type="datetime-local" required value={local} onChange={(e) => setLocal(e.target.value)} className="input" />
          <input type="hidden" name="starts_at_iso" value={iso} />
        </div>
        <div>
          <label className="label">{t("series")}</label>
          <select name="series_id" className="input" defaultValue="">
            <option value="">{t("none")}</option>
            {series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">{t("description")}</label>
        <textarea name="description" rows={4} className="input" />
      </div>
      <button className="btn" disabled={!iso}>{t("create")}</button>
    </form>
  );
}
