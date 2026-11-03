import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Mafatih text is read from disk at request time (content/mafatih/**)
  outputFileTracingIncludes: {
    "/[locale]/mafatih/**": ["./content/mafatih/**/*"],
  },
};

export default withNextIntl(nextConfig);
