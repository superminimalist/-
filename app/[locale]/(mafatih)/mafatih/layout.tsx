import type { Viewport } from "next";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/mafatih/Shell";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d0f" },
  ],
  viewportFit: "cover",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mafatih" });
  return {
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: t("tagline"),
    // iPhone "Add to Home Screen" → launches full-screen with its own icon
    manifest: "/mafatih/manifest.webmanifest",
    icons: { apple: "/mafatih/apple-touch-icon.png" },
    appleWebApp: { capable: true, title: "Mafatih", statusBarStyle: "default" },
    formatDetection: { telephone: false },
  };
}

export default function MafatihLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
