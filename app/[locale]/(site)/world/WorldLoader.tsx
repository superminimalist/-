"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type WorldType from "@/components/world/World";

// three.js touches window/document — client only
const World = dynamic(() => import("@/components/world/World"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-mute">…</div>,
});

export function WorldLoader(props: ComponentProps<typeof WorldType>) {
  return <World {...props} />;
}
