import type { ReactNode } from "react";

// drop a client component into a translated string: t("key", { x: MARK }) → splitAround(str, <Comp />)
export const MARK = "⁣";

export function splitAround(text: string, node: ReactNode) {
  const [before, after = ""] = text.split(MARK);
  return (
    <>
      {before}
      {node}
      {after}
    </>
  );
}
