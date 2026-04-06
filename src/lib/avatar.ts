type AvatarTone = "creator" | "customer" | "generic";

const TONES: Record<AvatarTone, { start: string; end: string; ring: string }> = {
  creator: {
    start: "#ff5c8a",
    end: "#8b5cf6",
    ring: "rgba(255,255,255,0.18)",
  },
  customer: {
    start: "#38bdf8",
    end: "#3b82f6",
    ring: "rgba(255,255,255,0.18)",
  },
  generic: {
    start: "#2b3448",
    end: "#161b27",
    ring: "rgba(255,255,255,0.12)",
  },
};

function getInitials(name?: string, fallback = "A") {
  if (!name) {
    return fallback;
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return fallback;
  }

  return parts
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);
}

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getAvatarFallback(name?: string, tone: AvatarTone = "generic") {
  const palette = TONES[tone];
  const initials = getInitials(name, tone === "customer" ? "B" : tone === "creator" ? "C" : "A");

  return svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" fill="none">
      <defs>
        <linearGradient id="avatarGradient" x1="24" y1="18" x2="140" y2="144" gradientUnits="userSpaceOnUse">
          <stop stop-color="${palette.start}"/>
          <stop offset="1" stop-color="${palette.end}"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="48" fill="#0b1020"/>
      <rect x="8" y="8" width="144" height="144" rx="40" fill="url(#avatarGradient)"/>
      <rect x="8" y="8" width="144" height="144" rx="40" stroke="${palette.ring}" stroke-width="2"/>
      <circle cx="124" cy="38" r="12" fill="rgba(255,255,255,0.16)"/>
      <text x="80" y="94" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="700" fill="white">${initials}</text>
    </svg>
  `);
}

export function getAvatarSrc(
  src: string | null | undefined,
  name?: string,
  tone: AvatarTone = "generic",
) {
  if (typeof src === "string" && src.trim()) {
    return src;
  }

  return getAvatarFallback(name, tone);
}
