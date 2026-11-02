
export const color = {
  bg: "#07070b",
  surface: "#0a0a0a",
  surfaceRaised: "#0c0c0c",
  surfaceInset: "#0d0d0d",

  borderSoft: "#17171b",
  border: "#25252c",
  borderStrong: "#33333c",

  text: "#ffffff",
  textMuted: "#8b8b95",
  textDim: "#74747e",
  textFaint: "#4a4a53",

  accent: "#ffffff",
  onAccent: "#000000",

  success: "#16a34a",
  successBg: "#16a34a20",
  successBorder: "#16a34a40",

  danger: "#dc2626",
  dangerBg: "#dc262610",
  dangerBorder: "#dc262640",

  warning: "#d97706",
  warningBg: "#d9770610",
  warningBorder: "#d9770640",

  info: "#2563eb",
  infoBg: "#2563eb10",
  infoBorder: "#2563eb40",

  violet: "#7c3aed",

  accentFrom: "#a78bfa",
  accentTo: "#60a5fa",
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  pill: "999px",
  circle: "50%",
} as const;

export const type = {
  label: {
    fontSize: "10px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: color.textDim,
  },
  eyebrow: {
    fontSize: "11px",
    letterSpacing: "3px",
    textTransform: "uppercase",
    color: color.textDim,
  },
  heading: {
    fontWeight: "800",
    letterSpacing: "-1px",
    color: color.text,
  },
  body: {
    fontSize: "14px",
    color: color.textMuted,
  },
} as const;

export const layout = {
  navHeight: "64px",
  page: "1100px",
  narrow: "800px",
  form: "400px",
} as const;

export const statusColor: Record<string, string> = {
  accept: color.success,
  completed: color.success,
  pending: color.warning,
  create: color.warning,
  rejected: color.danger,
  cancelled: color.danger,
};
