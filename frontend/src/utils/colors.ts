import type { CSSProperties } from "react";

export const COLOR_MAP: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ef4444",
  blue: "#2563eb",
  yellow: "#eab308",
  green: "#10b981",
  gray: "#6b7280",
  grey: "#6b7280",
  navy: "#000080",
  "navy blue": "#001f3f",
  navyblue: "#001f3f",
  burgundy: "#800020",
  "light blue": "#93c5fd",
  lightblue: "#93c5fd",
  "dark blue": "#172554",
  darkblue: "#172554",
  "dark green": "#14532d",
  darkgreen: "#14532d",
  "heather gray": "#9ca3af",
  "heather grey": "#9ca3af",
  heathergray: "#9ca3af",
  heathergrey: "#9ca3af",
  charcoal: "#374151",
  "dark wash": "#1e293b",
  darkwash: "#1e293b",
  "tropical print": "linear-gradient(135deg, #059669 0%, #0284c7 50%, #f59e0b 100%)",
  tropicalprint: "linear-gradient(135deg, #059669 0%, #0284c7 50%, #f59e0b 100%)",
  "navy palms": "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0d9488 100%)",
  navypalms: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0d9488 100%)",
  olive: "#556b2f",
  beige: "#d4b996",
  brown: "#78350f",
  pink: "#ec4899",
  khaki: "#c3b091",
  lavender: "#c084fc",
  champagne: "#f7e7ce",
  cream: "#fffdd0",
  maroon: "#800000",
  orange: "#f97316",
  purple: "#a855f7",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  coral: "#ff7f50",
  peach: "#ffcba4",
  mint: "#98ff98",
  "mint green": "#98ff98",
  mintgreen: "#98ff98",
  sage: "#9caf88",
  "sage green": "#9caf88",
  sagegreen: "#9caf88",
  mustard: "#eab308",
  rust: "#b7410e",
  rose: "#f43f5e",
  "rose gold": "#b76e79",
  rosegold: "#b76e79",
  gold: "#ffd700",
  silver: "#cbd5e1",
  bronze: "#cd7f32",
  copper: "#b87333",
  ivory: "#fffff0",
  tan: "#d2b48c",
  camel: "#c19a6b",
  denim: "#2563eb",
  indigo: "#4f46e5",
  violet: "#8b5cf6",
  turquoise: "#06b6d4",
  emerald: "#10b981",
  "army green": "#4b5320",
  armygreen: "#4b5320",
  "forest green": "#14532d",
  forestgreen: "#14532d",
  "sky blue": "#38bdf8",
  skyblue: "#38bdf8",
  "baby blue": "#bfdbfe",
  babyblue: "#bfdbfe",
  "royal blue": "#1d4ed8",
  royalblue: "#1d4ed8",
  "midnight blue": "#0f172a",
  midnightblue: "#0f172a",
  magenta: "#d946ef",
  fuchsia: "#d946ef",
  wine: "#722f37",
  "off-white": "#faf9f6",
  "off white": "#faf9f6",
  offwhite: "#faf9f6",
  multi: "linear-gradient(135deg, #ef4444 0%, #f59e0b 33%, #10b981 66%, #3b82f6 100%)",
  multicolor: "linear-gradient(135deg, #ef4444 0%, #f59e0b 33%, #10b981 66%, #3b82f6 100%)",
};

/**
 * Returns a CSS style object with either `background` (for gradients)
 * or `backgroundColor` suitable for rendering a color swatch.
 */
export const getColorStyle = (color?: string | null): CSSProperties => {
  if (!color || typeof color !== "string") {
    return { backgroundColor: "#e5e7eb" };
  }
  const trimmed = color.trim();
  if (!trimmed) {
    return { backgroundColor: "#e5e7eb" };
  }

  // If it's already a hex, rgb, rgba, hsl, hsla, or gradient
  if (/^(#|rgb|hsl|linear-gradient)/i.test(trimmed)) {
    return trimmed.startsWith("linear-gradient")
      ? { background: trimmed }
      : { backgroundColor: trimmed };
  }

  const key = trimmed.toLowerCase();
  if (COLOR_MAP[key]) {
    const val = COLOR_MAP[key];
    return val.startsWith("linear-gradient")
      ? { background: val }
      : { backgroundColor: val };
  }

  // Fallback 1: try removing spaces and punctuation
  const noSpaces = key.replace(/[\s-_]+/g, "");
  if (COLOR_MAP[noSpaces]) {
    const val = COLOR_MAP[noSpaces];
    return val.startsWith("linear-gradient")
      ? { background: val }
      : { backgroundColor: val };
  }

  // Fallback 2: CSS color keyword without spaces
  return { backgroundColor: noSpaces || key };
};

/**
 * Returns a hex string or CSS color suitable for admin editors.
 */
export const getColorHex = (color?: string | null): string => {
  if (!color) return "#000000";
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) return trimmed;
  const key = trimmed.toLowerCase();
  if (COLOR_MAP[key] && !COLOR_MAP[key].startsWith("linear-gradient")) {
    return COLOR_MAP[key];
  }
  const noSpaces = key.replace(/[\s-_]+/g, "");
  if (COLOR_MAP[noSpaces] && !COLOR_MAP[noSpaces].startsWith("linear-gradient")) {
    return COLOR_MAP[noSpaces];
  }
  return "#000000";
};
