"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addProductToOrder, cancelOrder, checkoutOrder, createOrder, getMe, getProducts, Product } from "@/lib/api";
import { clearCart, useCart } from "@/lib/cart";
import { Nav, NavLink, Page } from "@/components/nav";
import { Alert, Button, Card, EmptyState, LinkButton, PageLoader, PageTitle, Spinner, StatusMark } from "@/components/ui";
import { color, radius } from "@/lib/theme";

type Step = "review" | "placing" | "success" | "error";

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ textAlign: "center", maxWidth: "400px", width: "100%" }}>{children}</div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("review");
  const [errorMsg, setErrorMsg] = useState("");
  const [placingMsg, setPlacingMsg] = useState("");

  useEffect(() => {
    Promise.all([getProducts(100), getMe()])
      .then(([allProducts, me]) => {
        setProducts(allProducts);
        setBalance(me.balance);
        setUserName(me.name);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const lines = cart
    .map((item) => ({ item, product: products.find((p) => p.id === item.id) }))
    .filter((line): line is { item: { id: number; qty: number }; product: Product } => line.product !== undefined);

  const total = lines.reduce((sum, line) => sum + line.product.price * line.item.qty, 0);
  const totalItems = lines.reduce((sum, line) => sum + line.item.qty, 0);
  const unavailableCount = cart.length - lines.length;
  const canAfford = balance >= total;
  const canPlaceOrder = canAfford && lines.length > 0;

  async function handlePlaceOrder() {
    setStep("placing");
    let draftOrderId: number | null = null;
    try {
      setPlacingMsg("正在创建订单…");
      const date = new Date().toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
      const order = await createOrder(`订单 — ${date}`);
      draftOrderId = order.id;

      setPlacingMsg("正在添加商品…");
      for (const { item, product } of lines) {
        await addProductToOrder(order.id, product.id, item.qty);
      }

      setPlacingMsg("正在处理付款…");
      await checkoutOrder(order.id);
      draftOrderId = null;
      clearCart();
      setStep("success");
    } catch (err: unknown) {
      if (draftOrderId !== null) {
        try {
          await cancelOrder(draftOrderId);
        } catch {
        }
      }
      setErrorMsg(err instanceof Error ? err.message : "操作失败，请稍后重试");
      setStep("error");
    }
  }

  if (loading) return <PageLoader />;

  if (step === "placing") {
    return (
      <Screen>
        <Spinner size={36} style={{ margin: "0 auto 20px" }} />
        <p style={{ fontSize: "15px", fontWeight: "700", marginBottom: "6px" }}>{placingMsg}</p>
        <p style={{ color: color.textDim, fontSize: "13px" }}>请稍候…</p>
      </Screen>
    );
  }

  if (step === "success") {
    return (
      <Screen>
        <StatusMark tone="success" glyph="✓" />
        <PageTitle style={{ fontSize: "28px", marginBottom: "8px" }}>下单成功</PageTitle>
        <p style={{ color: color.textMuted, fontSize: "14px", marginBottom: "32px" }}>
          订单已提交，付款已完成。
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <LinkButton href="/profile" size="lg" full>
            查看订单
          </LinkButton>
          <LinkButton href="/products" variant="secondary" size="lg" full>
            继续选购
          </LinkButton>
        </div>
      </Screen>
    );
  }

  if (step === "error") {
    return (
      <Screen>
        <StatusMark tone="error" glyph="✗" />
        <PageTitle style={{ fontSize: "28px", marginBottom: "8px" }}>下单失败</PageTitle>
        <Alert style={{ marginBottom: "32px" }}>{errorMsg}</Alert>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <LinkButton href="/cart" variant="secondary">
            返回购物车
          </LinkButton>
          <Button
            onClick={() => {
              setStep("review");
              setErrorMsg("");
            }}
          >
            重试
          </Button>
        </div>
      </Screen>
    );
  }

  const nav = (
    <Nav home="/products">
      <NavLink href="/cart">← 返回购物车</NavLink>
    </Nav>
  );

  if (cart.length === 0) {
    return (
      <Page nav={nav} width="800px">
        <EmptyState
          message="购物车还是空的"
          action={
            <LinkButton href="/products" size="lg">
              去逛逛
            </LinkButton>
          }
        />
      </Page>
    );
  }

  return (
    <Page nav={nav} width="800px">
      <PageTitle style={{ marginBottom: "8px" }}>结算</PageTitle>
      {userName && (
        <p style={{ color: color.textDim, fontSize: "14px", marginBottom: "32px" }}>你好，{userName}</p>
      )}

      <div style={{ display: "flex", gap: "32px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 360px", minWidth: 0 }}>
          <p style={{ fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", color: color.textDim, marginBottom: "16px" }}>
            商品（{totalItems} 件）
          </p>

          {unavailableCount > 0 && (
            <Alert tone="warning" style={{ marginBottom: "12px" }}>
              {unavailableCount} 件商品已失效，本次不会下单。
            </Alert>
          )}

          {lines.map(({ item, product }) => (
            <Card key={product.id} style={{ display: "flex", gap: "14px", alignItems: "center", padding: "16px", marginBottom: "10px" }}>
              <div style={{ width: "56px", height: "56px", flexShrink: 0, borderRadius: radius.sm, overflow: "hidden", backgroundColor: color.surfaceInset }}>
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", backgroundColor: product.color }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: "600", fontSize: "14px", marginBottom: "2px" }}>{product.name}</p>
                <p style={{ color: color.textDim, fontSize: "13px" }}>
                  数量：{item.qty} × ${product.price}
                </p>
              </div>
              <span style={{ fontWeight: "800", fontSize: "15px" }}>${(product.price * item.qty).toFixed(2)}</span>
            </Card>
          ))}
        </div>

        <Card style={{ width: "280px", flexShrink: 0, padding: "24px" }}>
          <p style={{ fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", color: color.textDim, marginBottom: "20px" }}>
            付款
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: color.textDim, fontSize: "14px" }}>商品小计</span>
              <span style={{ fontSize: "14px" }}>${total.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: color.textDim, fontSize: "14px" }}>运费</span>
              <span style={{ fontSize: "14px", color: color.success, fontWeight: "600" }}>免费</span>
            </div>
          </div>

          <div
            style={{
              borderTop: `1px solid ${color.borderSoft}`,
              paddingTop: "14px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: "600", fontSize: "15px" }}>合计</span>
            <span style={{ fontWeight: "800", fontSize: "20px" }}>${total.toFixed(2)}</span>
          </div>

          <div style={{ backgroundColor: color.surfaceInset, borderRadius: radius.sm, padding: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: color.textDim, fontSize: "13px" }}>账户余额</span>
              <span style={{ fontSize: "13px", color: canAfford ? color.success : color.danger, fontWeight: "600" }}>
                ${balance.toFixed(2)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: color.textDim, fontSize: "13px" }}>付款后余额</span>
              <span style={{ fontSize: "13px", fontWeight: "600", color: canAfford ? color.text : color.danger }}>
                {canAfford ? `$${(balance - total).toFixed(2)}` : "余额不足"}
              </span>
            </div>
          </div>

          {!canAfford && (
            <p style={{ color: color.danger, fontSize: "12px", textAlign: "center", marginBottom: "12px" }}>
              Not enough balance.{" "}
              <Link href="/profile" style={{ color: color.danger, fontWeight: "600" }}>
                前往充值 →
              </Link>
            </p>
          )}

          <Button full size="lg" onClick={handlePlaceOrder} disabled={!canPlaceOrder}>
            提交订单
          </Button>
        </Card>
      </div>
    </Page>
  );
}
