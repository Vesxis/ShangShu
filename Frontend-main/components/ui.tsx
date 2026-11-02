"use client";

import Link from "next/link";
import type { CSSProperties, ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { color, radius, type } from "@/lib/theme";

type Variant = "primary" | "secondary" | "danger" | "success" | "warning" | "ghost";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, CSSProperties> = {
  sm: { padding: "6px 14px", fontSize: "11px", letterSpacing: "1px" },
  md: { padding: "11px 24px", fontSize: "11px", letterSpacing: "2px" },
  lg: { padding: "15px 40px", fontSize: "11px", letterSpacing: "3px" },
};

function variantStyle(variant: Variant, disabled: boolean): CSSProperties {
  if (disabled) {
    return { backgroundColor: color.surfaceInset, color: color.textFaint, border: `1px solid ${color.border}` };
  }
  switch (variant) {
    case "primary":
      return { backgroundColor: color.accent, color: color.onAccent, border: "none" };
    case "secondary":
      return { backgroundColor: "transparent", color: color.textMuted, border: `1px solid ${color.border}` };
    case "danger":
      return { backgroundColor: color.dangerBg, color: color.danger, border: `1px solid ${color.dangerBorder}` };
    case "success":
      return { backgroundColor: color.successBg, color: color.success, border: `1px solid ${color.successBorder}` };
    case "warning":
      return { backgroundColor: color.warningBg, color: color.warning, border: `1px solid ${color.warningBorder}` };
    case "ghost":
      return { backgroundColor: "transparent", color: color.textMuted, border: "none" };
  }
}

function baseStyle(variant: Variant, size: Size, disabled: boolean): CSSProperties {
  return {
    ...SIZES[size],
    ...variantStyle(variant, disabled),
    fontWeight: "800",
    textTransform: "uppercase",
    borderRadius: radius.sm,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  };
}

function buttonClass(variant: Variant, extra?: string) {
  return ["btn", `btn-${variant}`, extra].filter(Boolean).join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

export function Button({ variant = "primary", size = "md", full, style, disabled, className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={buttonClass(variant, className)}
      style={{ ...baseStyle(variant, size, !!disabled), width: full ? "100%" : undefined, ...style }}
    />
  );
}

interface LinkButtonProps {
  href: string;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  style?: CSSProperties;
  children: ReactNode;
}

export function LinkButton({ href, variant = "primary", size = "md", full, style, children }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={buttonClass(variant)}
      style={{ ...baseStyle(variant, size, false), width: full ? "100%" : undefined, ...style }}
    >
      {children}
    </Link>
  );
}

const fieldStyle: CSSProperties = {
  width: "100%",
  backgroundColor: color.surfaceInset,
  border: `1px solid ${color.border}`,
  color: color.text,
  padding: "12px 14px",
  fontSize: "14px",
  borderRadius: radius.sm,
  outline: "none",
};

export function Input({ style, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} style={{ ...fieldStyle, ...style }} />;
}

export function Textarea({ style, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} style={{ ...fieldStyle, resize: "vertical", ...style }} />;
}

export function Select({ style, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} style={{ ...fieldStyle, cursor: "pointer", ...style }} />;
}

export function Field({
  label,
  children,
  error,
  style,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  style?: CSSProperties;
}) {
  return (
    <label style={{ display: "block", ...style }}>
      <span style={{ ...type.label, display: "block", marginBottom: "8px" }}>{label}</span>
      {children}
      {error && <FieldError>{error}</FieldError>}
    </label>
  );
}

export function FieldError({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginTop: "7px",
        color: color.danger,
        fontSize: "12px",
        lineHeight: 1.4,
      }}
    >
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: "14px",
          height: "14px",
          borderRadius: radius.circle,
          border: `1px solid ${color.dangerBorder}`,
          backgroundColor: color.dangerBg,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
          fontWeight: "700",
        }}
      >
        !
      </span>
      {children}
    </span>
  );
}

export function TextField({
  label,
  error,
  style,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; style?: CSSProperties }) {
  return (
    <Field label={label} error={error}>
      <Input {...rest} aria-invalid={error ? true : undefined} style={style} />
    </Field>
  );
}

export function Card({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={["surface", className].filter(Boolean).join(" ")} style={{ borderRadius: radius.md, ...style }}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p style={{ ...type.eyebrow, ...style }}>{children}</p>;
}

export function PageTitle({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <h1 style={{ ...type.heading, fontSize: "32px", ...style }}>{children}</h1>;
}

type Tone = "error" | "success" | "warning" | "info";

const TONES: Record<Tone, { fg: string; bg: string; border: string }> = {
  error: { fg: color.danger, bg: color.dangerBg, border: color.dangerBorder },
  success: { fg: color.success, bg: color.successBg, border: color.successBorder },
  warning: { fg: color.warning, bg: color.warningBg, border: color.warningBorder },
  info: { fg: color.info, bg: color.infoBg, border: color.infoBorder },
};

export function Alert({ tone = "error", children, style }: { tone?: Tone; children: ReactNode; style?: CSSProperties }) {
  const t = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      style={{
        backgroundColor: t.bg,
        border: `1px solid ${t.border}`,
        color: t.fg,
        padding: "12px 16px",
        borderRadius: radius.sm,
        fontSize: "13px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Badge({ tint, children, style }: { tint?: string; children: ReactNode; style?: CSSProperties }) {
  const fg = tint ?? color.textMuted;
  return (
    <span
      style={{
        display: "inline-block",
        width: "fit-content",
        backgroundColor: `${fg}20`,
        border: `1px solid ${fg}40`,
        color: fg,
        padding: "3px 12px",
        borderRadius: radius.pill,
        fontSize: "11px",
        fontWeight: "700",
        letterSpacing: "1px",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 32, style }: { size?: number; style?: CSSProperties }) {
  return (
    <div
      role="status"
      aria-label="正在加载"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: `2px solid ${color.borderStrong}`,
        borderTopColor: color.text,
        borderRadius: radius.circle,
        animation: "spin 0.8s linear infinite",
        ...style,
      }}
    />
  );
}

export function PageLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner />
    </div>
  );
}

export function StatusMark({ tone, glyph }: { tone: Tone; glyph: string }) {
  const t = TONES[tone];
  return (
    <div
      style={{
        width: "64px",
        height: "64px",
        borderRadius: radius.circle,
        backgroundColor: t.bg,
        border: `1px solid ${t.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 32px",
      }}
    >
      <span style={{ color: t.fg, fontSize: "28px" }}>{glyph}</span>
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 0" }}>
      <p style={{ color: color.textDim, fontSize: "14px", marginBottom: action ? "24px" : 0 }}>{message}</p>
      {action}
    </div>
  );
}

export function StatCard({ label, value, tint, style }: { label: string; value: ReactNode; tint?: string; style?: CSSProperties }) {
  return (
    <Card style={{ padding: "20px 24px", ...style }}>
      <p style={{ ...type.label, marginBottom: "8px" }}>{label}</p>
      <p style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-1px", color: tint ?? color.text }}>{value}</p>
    </Card>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  labels,
  badges,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  labels?: Partial<Record<T, string>>;
  badges?: Partial<Record<T, number>>;
}) {
  return (
    <div style={{ display: "flex", borderBottom: `1px solid ${color.borderSoft}`, marginBottom: "28px", flexWrap: "wrap" }}>
      {tabs.map((tab) => {
        const isActive = tab === active;
        const badge = badges?.[tab];
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            style={{
              background: "none",
              border: "none",
              borderBottom: `2px solid ${isActive ? color.accent : "transparent"}`,
              color: isActive ? color.text : color.textDim,
              cursor: "pointer",
              fontSize: "11px",
              letterSpacing: "2px",
              fontWeight: isActive ? "800" : "600",
              textTransform: "uppercase",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {labels?.[tab] ?? tab}
            {badge ? (
              <span
                style={{
                  backgroundColor: color.warning,
                  color: color.onAccent,
                  borderRadius: radius.circle,
                  width: "18px",
                  height: "18px",
                  fontSize: "10px",
                  fontWeight: "800",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
