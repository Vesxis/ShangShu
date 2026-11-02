"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { color, layout, radius } from "@/lib/theme";
import { logout } from "@/lib/api";
import { notifyAuthChange } from "@/lib/useAuth";
import { cartCount, useCart } from "@/lib/cart";

function Wordmark({ href = "/", style }: { href?: string; style?: CSSProperties }) {
  return (
    <Link href={href} className="wordmark" aria-label="商枢｜高并发电商交易平台" style={style}>
      商枢
    </Link>
  );
}

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="nav-link">
      {children}
    </Link>
  );
}

export function Nav({ home = "/", children }: { home?: string; children?: ReactNode }) {
  return (
    <nav className="nav-bar">
      <Wordmark href={home} />
      <div style={{ display: "flex", alignItems: "center", gap: "26px", flexWrap: "wrap" }}>{children}</div>
    </nav>
  );
}

export function CartButton() {
  const router = useRouter();
  const count = cartCount(useCart());
  return (
    <button
      onClick={() => router.push("/cart")}
      style={{
        backgroundColor: color.accent,
        color: color.onAccent,
        border: "none",
        padding: "8px 20px",
        cursor: "pointer",
        fontSize: "11px",
        fontWeight: "800",
        letterSpacing: "2px",
        borderRadius: radius.sm,
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      购物车
      {count > 0 && (
        <span
          style={{
            backgroundColor: color.onAccent,
            color: color.accent,
            borderRadius: radius.circle,
            width: "18px",
            height: "18px",
            fontSize: "10px",
            fontWeight: "800",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        logout();
        notifyAuthChange();
        router.push("/login");
      }}
      style={{
        background: "none",
        border: `1px solid ${color.border}`,
        color: color.textDim,
        cursor: "pointer",
        fontSize: "11px",
        letterSpacing: "2px",
        textTransform: "uppercase",
        padding: "7px 16px",
        borderRadius: radius.sm,
      }}
    >
      退出登录
    </button>
  );
}

export function Page({ nav, children, width = layout.page }: { nav?: ReactNode; children: ReactNode; width?: string }) {
  return (
    <div style={{ minHeight: "100vh", color: color.text }}>
      {nav}
      <main style={{ maxWidth: width, margin: "0 auto", padding: "48px 40px 80px" }}>{children}</main>
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-stage">
      <Wordmark style={{ marginBottom: "36px" }} />
      <div className="surface auth-card">{children}</div>
      <Link
        href="/products"
        style={{ marginTop: "28px", color: color.textDim, fontSize: "11px", letterSpacing: "2px", textDecoration: "none" }}
      >
        BROWSE THE SHOP →
      </Link>
    </div>
  );
}
