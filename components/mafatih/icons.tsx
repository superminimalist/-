import type { SVGProps } from "react";

// SF-Symbols-like line icons, 24px grid, currentColor
type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconSunrise = (p: P) => (
  <Svg {...p}>
    <path d="M3 18h18M6.3 18a5.7 5.7 0 0 1 11.4 0M12 4v4M4.9 9.9l1.4 1.4M19.1 9.9l-1.4 1.4M9.5 6.5 12 4l2.5 2.5" />
  </Svg>
);
export const IconSun = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </Svg>
);
export const IconSunset = (p: P) => (
  <Svg {...p}>
    <path d="M3 18h18M6.3 18a5.7 5.7 0 0 1 11.4 0M12 3.5v4.5M4.9 9.9l1.4 1.4M19.1 9.9l-1.4 1.4M9.5 5.5 12 8l2.5-2.5" />
  </Svg>
);
export const IconMoon = (p: P) => (
  <Svg {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    <path d="M16.5 3.5v3M15 5h3" />
  </Svg>
);
export const IconBook = (p: P) => (
  <Svg {...p}>
    <path d="M12 6.5C10.3 5 7.8 4.5 4 4.5v13c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-13c-3.8 0-6.3.5-8 2Z" />
    <path d="M12 6.5v13" />
  </Svg>
);
export const IconHands = (p: P) => (
  <Svg {...p}>
    <path d="M8.5 21v-3.2L5 13.5V7a1.5 1.5 0 0 1 3 0v4.5M15.5 21v-3.2l3.5-4.3V7a1.5 1.5 0 0 0-3 0v4.5" />
    <path d="M8 11.5 10.4 14c.4.4.6 1 .6 1.6V21M16 11.5 13.6 14c-.4.4-.6 1-.6 1.6V21" />
  </Svg>
);
export const IconDome = (p: P) => (
  <Svg {...p}>
    <path d="M12 2.5v2M7 12a5 5 0 0 1 10 0M5 21V12h14v9M3 21h18M10 21v-4a2 2 0 0 1 4 0v4" />
    <path d="M12 4.5c-2 1.6-3.7 3.4-5 7.5M12 4.5c2 1.6 3.7 3.4 5 7.5" />
  </Svg>
);
export const IconBeads = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="4.5" r="1.6" />
    <circle cx="17.3" cy="6.7" r="1.6" />
    <circle cx="19.5" cy="12" r="1.6" />
    <circle cx="17.3" cy="17.3" r="1.6" />
    <circle cx="6.7" cy="6.7" r="1.6" />
    <circle cx="4.5" cy="12" r="1.6" />
    <circle cx="6.7" cy="17.3" r="1.6" />
    <path d="M12 19v2.5" />
  </Svg>
);
export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.5Z" />
  </Svg>
);
export const IconList = (p: P) => (
  <Svg {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r=".6" fill="currentColor" />
    <circle cx="4.5" cy="12" r=".6" fill="currentColor" />
    <circle cx="4.5" cy="18" r=".6" fill="currentColor" />
  </Svg>
);
export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1v-9.5Z" />
  </Svg>
);
export const IconChevron = (p: P) => (
  <Svg {...p} className={`rtl:-scale-x-100 ${p.className ?? ""}`}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
);
export const IconBack = (p: P) => (
  <Svg {...p} className={`rtl:-scale-x-100 ${p.className ?? ""}`}>
    <path d="m15 5-7 7 7 7" />
  </Svg>
);
export const IconTextSize = (p: P) => (
  <Svg {...p}>
    <path d="M3 19 8 6l5 13M4.8 15h6.4M14.5 19l3.5-9 3.5 9M15.6 16.3h4.8" />
  </Svg>
);
export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const IconPlay = (p: P) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z" />
  </Svg>
);
export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
export const IconGlobe = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
  </Svg>
);
export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);
export const IconSparkle = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5ZM18.5 15.5c.3 1.7 1 2.4 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.1 2.2-.8 2.5-2.5Z" />
  </Svg>
);
export const IconReset = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.7h3.7" />
  </Svg>
);
