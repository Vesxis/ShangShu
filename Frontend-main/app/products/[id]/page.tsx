"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getProduct, Product } from "@/lib/api";
import { useCart, writeCart } from "@/lib/cart";
import { CartButton, Nav, NavLink, Page } from "@/components/nav";
import { Badge, Button, Card, PageLoader } from "@/components/ui";
import { colorLabel } from "@/lib/labels";
import { color, radius } from "@/lib/theme";

function fallbackImage(id: number) {
  return `https://picsum.photos/seed/product${id}/800/800`;
}

function isHex(value: string) {
  return /^#[0-9a-f]{3,8}$/i.test(value.trim());
}

const GUARANTEES = [
  { label: "免运费", value: "适用于所有订单" },
  { label: "便捷退款", value: "订单取消与退款" },
  { label: "安全支付", value: "使用账户余额结算" },
];

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string, 10);

  const cart = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [qtyOverride, setQtyOverride] = useState<number | null>(null);

  useEffect(() => {
    getProduct(id)
      .then(setProduct)
      .catch(() => router.push("/products"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const inCart = cart.find((i) => i.id === id);
  const qty = qtyOverride ?? inCart?.qty ?? 1;

  function addToCart() {
    const next = inCart ? cart.map((i) => (i.id === id ? { ...i, qty } : i)) : [...cart, { id, qty }];
    writeCart(next);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) return <PageLoader />;
  if (!product) return null;

  const outOfStock = product.quantity === 0;

  const nav = (
    <Nav>
      <NavLink href="/products">← 全部商品</NavLink>
      <CartButton />
    </Nav>
  );

  return (
    <Page nav={nav} width="1000px">
      <p style={{ color: color.textDim, fontSize: "12px", letterSpacing: "1px", marginBottom: "32px" }}>
        <Link href="/products" style={{ color: color.textDim, textDecoration: "none" }}>
          商品
        </Link>
        {" / "}
        <span style={{ color: color.text }}>{product.name.toUpperCase()}</span>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "64px", alignItems: "start" }}>
        <div
          style={{
            aspectRatio: "1",
            backgroundColor: color.surface,
            overflow: "hidden",
            borderRadius: radius.md,
            border: `1px solid ${color.border}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image_url || fallbackImage(product.id)}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              const img = e.currentTarget;
              img.style.display = "none";
              if (img.parentElement) img.parentElement.style.backgroundColor = product.color;
            }}
          />
        </div>

        <div>
          <p style={{ color: color.textDim, fontSize: "11px", letterSpacing: "2px", marginBottom: "8px" }}>
            商品编号 #{product.id}
          </p>
          <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-1px", marginBottom: "8px" }}>{product.name}</h1>
          <p style={{ fontSize: "28px", fontWeight: "800", marginBottom: "32px" }}>${product.price}</p>

          {product.description && (
            <p style={{ color: color.textMuted, fontSize: "14px", lineHeight: "1.7", marginBottom: "28px" }}>
              {product.description}
            </p>
          )}

          <div style={{ marginBottom: "28px" }}>
            <p style={{ color: color.textDim, fontSize: "10px", letterSpacing: "2px", marginBottom: "10px" }}>颜色</p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: radius.circle, backgroundColor: product.color, border: `1px solid ${color.border}` }} />
              {!isHex(product.color) && (
                <span style={{ color: color.textMuted, fontSize: "13px", textTransform: "capitalize" }}>{colorLabel(product.color)}</span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <p style={{ color: color.textDim, fontSize: "10px", letterSpacing: "2px" }}>数量</p>
              {outOfStock ? (
                <Badge tint={color.danger}>暂时缺货</Badge>
              ) : (
                <Badge tint={color.success}>有货（库存 {product.quantity}）</Badge>
              )}
            </div>
            {!outOfStock && (
              <div style={{ display: "flex", alignItems: "center", border: `1px solid ${color.border}`, borderRadius: radius.sm, width: "fit-content" }}>
                <button
                  onClick={() => setQtyOverride(Math.max(1, qty - 1))}
                  aria-label="减少数量"
                  style={{ background: "none", border: "none", color: color.textMuted, cursor: "pointer", padding: "10px 18px", fontSize: "18px", lineHeight: 1 }}
                >
                  −
                </button>
                <span style={{ fontSize: "15px", fontWeight: "700", minWidth: "36px", textAlign: "center" }}>{qty}</span>
                <button
                  onClick={() => setQtyOverride(Math.min(product.quantity, qty + 1))}
                  aria-label="增加数量"
                  style={{ background: "none", border: "none", color: color.textMuted, cursor: "pointer", padding: "10px 18px", fontSize: "18px", lineHeight: 1 }}
                >
                  +
                </button>
              </div>
            )}
          </div>

          <Card
            style={{
              padding: "14px 18px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: color.textDim, fontSize: "14px" }}>合计</span>
            <span style={{ fontWeight: "800", fontSize: "18px" }}>${(product.price * qty).toFixed(2)}</span>
          </Card>

          <Button
            full
            size="lg"
            onClick={addToCart}
            disabled={outOfStock}
            variant={added ? "success" : "primary"}
            style={{ marginBottom: "10px" }}
          >
            {outOfStock ? "暂时缺货" : added ? "✓ 已加入购物车" : inCart ? "更新购物车" : "加入购物车"}
          </Button>

          <Link
            href="/cart"
            style={{ display: "block", textAlign: "center", color: color.textDim, fontSize: "12px", textDecoration: "none" }}
          >
            View cart →
          </Link>

          <div style={{ marginTop: "36px", borderTop: `1px solid ${color.borderSoft}`, paddingTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {GUARANTEES.map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: color.textMuted, fontSize: "13px" }}>{item.label}</span>
                <span style={{ color: color.textDim, fontSize: "13px" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}
