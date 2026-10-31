"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { sendMagicLink, type MagicLinkState } from "@/app/actions/auth";

export function LoginForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<MagicLinkState, FormData>(sendMagicLink, null);

  if (state?.ok) return <p className="card text-accent">{t("sent")}</p>;

  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="email">{t("email")}</label>
        <input id="email" name="email" type="email" required className="input" dir="ltr" />
      </div>
      <div>
        <label className="label" htmlFor="display_name">{t("displayName")}</label>
        <input id="display_name" name="display_name" className="input" maxLength={40} />
      </div>
      {state && !state.ok && <p className="text-sm text-live">{t("error")}</p>}
      <button className="btn w-full" disabled={pending}>{t("send")}</button>
    </form>
  );
}
