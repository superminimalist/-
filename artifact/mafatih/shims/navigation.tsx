// alias target for "@/i18n/navigation"
import type { AnchorHTMLAttributes } from "react";
import { back, navigate, toHash, usePath } from "./router";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; locale?: string };

export function Link({ href, onClick, locale: _l, ...rest }: Props) {
  void _l;
  const h = toHash(href);
  const internal = href.startsWith("/");
  return (
    <a
      {...rest}
      href={internal ? `#${h}` : href}
      target={internal ? undefined : "_blank"}
      rel={internal ? undefined : "noreferrer"}
      onClick={(e) => {
        onClick?.(e);
        if (!internal || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        navigate(href);
      }}
    />
  );
}

export const usePathname = () => usePath();
export const useRouter = () => ({ push: navigate, replace: navigate, back, refresh: () => {}, prefetch: () => {} });
export const redirect = (href: string) => navigate(href);
export const getPathname = ({ href }: { href: string }) => href;
