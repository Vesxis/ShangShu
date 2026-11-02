"use client";

import { useIsLoggedIn } from "@/lib/useAuth";
import { Nav, NavLink } from "@/components/nav";
import { LinkButton } from "@/components/ui";
import { color } from "@/lib/theme";

const HIGHLIGHTS = [
  "中文购物", "商品分类", "智能搜索", "商城导购", "账户管理",
  "订单查询", "便捷结算", "余额支付", "个性推荐", "中文服务",
];

export default function Home() {
  const isLoggedIn = useIsLoggedIn();

  return (
    <div style={{ minHeight: "100vh", color: color.text, display: "flex", flexDirection: "column" }}>
      <Nav>
        <NavLink href="/products">商品</NavLink>
        {isLoggedIn ? (
          <>
            <NavLink href="/profile">个人中心</NavLink>
            <LinkButton href="/cart" size="sm">购物车</LinkButton>
          </>
        ) : (
          <>
            <NavLink href="/login">登录</NavLink>
            <LinkButton href="/register" size="sm">注册</LinkButton>
          </>
        )}
      </Nav>

      <main className="landing">
        <p className="landing-eyebrow fade-1">商枢 · 高并发电商交易平台</p>

        <h1 className="landing-title fade-2">
          发现好物，<span className="landing-title-accent">自在生活。</span>
        </h1>

        <p className="landing-lede fade-3">
          从挑选好物到轻松下单，让购物更简单。
          中文界面、便捷的账户管理，还有随时为你解答的智能商城助手。
        </p>

        <div className="landing-actions fade-4">
          <LinkButton href="/products" size="lg">开始选购</LinkButton>
          {!isLoggedIn && (
            <LinkButton href="/register" variant="secondary" size="lg">创建账号</LinkButton>
          )}
        </div>

        <div className="tech-cloud fade-5" aria-label="商城服务">
          {HIGHLIGHTS.map((highlight, i) => (
            <span
              key={highlight}
              className="tech-chip"
              style={{ animationDelay: `${(i % 5) * 0.6}s`, animationDuration: `${5 + (i % 3)}s` }}
            >
              {highlight}
            </span>
          ))}
        </div>
      </main>

      <footer className="landing-footer">
        <span style={{ fontSize: "12px", fontWeight: "800", letterSpacing: "1px" }}>商枢｜高并发电商交易平台</span>
        <p style={{ color: color.textFaint, fontSize: "11px" }}>© 2026</p>
      </footer>
    </div>
  );
}
