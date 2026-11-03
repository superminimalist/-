"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { IconBeads, IconHome, IconList, IconStar } from "./icons";
import { useSettings } from "./store";

/** theme + Arabic font live on the root so every page (and the reader) shares them */
export function Shell({ children }: { children: React.ReactNode }) {
  const [s] = useSettings();
  return (
    <div
      className="mf min-h-dvh bg-mf-bg text-mf-text"
      data-theme={s.theme === "system" ? undefined : s.theme}
      data-font={s.font}
      style={{ ["--mf-scale" as string]: s.scale }}
    >
      {children}
      <TabBar />
    </div>
  );
}

const TABS = [
  { href: "/mafatih", key: "today", Icon: IconHome },
  { href: "/mafatih/contents", key: "contents", Icon: IconList },
  { href: "/mafatih/tasbih", key: "tasbih", Icon: IconBeads },
  { href: "/mafatih/saved", key: "saved", Icon: IconStar },
] as const;

function TabBar() {
  const t = useTranslations("mafatih.tabs");
  const path = usePathname();
  // reading screens are "pushed" — no tab bar, like iOS
  if (path.startsWith("/mafatih/read") || path.startsWith("/mafatih/d/")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="mf-bar flex w-full max-w-sm items-stretch justify-around rounded-[26px] border border-mf-line/60 p-1.5 shadow-[0_8px_32px_-8px_rgb(0_0_0/0.18)]">
        {TABS.map(({ href, key, Icon }) => {
          const active = href === "/mafatih" ? path === "/mafatih" : path.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`mf-press flex flex-1 flex-col items-center gap-0.5 rounded-[20px] py-1.5 text-[0.68rem] font-semibold transition-colors ${
                active ? "bg-mf-accent-soft text-mf-accent-ink" : "text-mf-mute"
              }`}
            >
              <Icon size={22} />
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
