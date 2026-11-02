"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  aiSearch,
  browseProducts,
  Category,
  getCategories,
  getMe,
  Product,
  ProductPage,
} from "@/lib/api";
import { useCart, writeCart } from "@/lib/cart";
import { useIsLoggedIn } from "@/lib/useAuth";
import { CartButton, LogoutButton, Nav, NavLink } from "@/components/nav";
import { Alert, Badge, Button, EmptyState, Input, PageLoader } from "@/components/ui";
import { categoryLabel } from "@/lib/labels";
import { color, layout, radius } from "@/lib/theme";

const PER_PAGE = 12;
const MIN_PRICE_CEILING = 100;
const SEARCH_DEBOUNCE_MS = 300;
const AI_MIN_QUERY = 2;
const AI_MAX_QUERY = 200;

function fallbackImage(id: number) {
  return `https://picsum.photos/seed/product${id}/400/400`;
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: color.textDim, fontSize: "10px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>
      {children}
    </p>
  );
}

export default function ProductsPage() {
  const cart = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");

  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<{ key: string; page: ProductPage } | null>(null);

  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const isLoggedIn = useIsLoggedIn();

  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState<Product[] | null>(null);
  const [aiAnswered, setAiAnswered] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    getMe()
      .then((me) => {
        setIsAdmin(me.role === "superadmin" || me.role === "moderator");
        setUserName(me.name);
      })
      .catch(() => setIsAdmin(false));

    getCategories(100)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  const query = useMemo(
    () => ({
      name: search,
      categoryId,
      maxPrice,
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
    }),
    [search, categoryId, maxPrice, page],
  );

  const key = JSON.stringify(query);

  useEffect(() => {
    let live = true;
    browseProducts(query)
      .then((fetched) => {
        if (live) setResult({ key, page: fetched });
      })
      .catch(() => {
        if (live) setResult({ key, page: { items: [], total: 0, price_ceiling: 0 } });
      });
    return () => {
      live = false;
    };
  }, [query, key]);

  const shelf = result?.page;
  const busy = result?.key !== key;
  const total = shelf?.total ?? 0;
  const ceiling = Math.max(MIN_PRICE_CEILING, Math.ceil((shelf?.price_ceiling ?? 0) / 100) * 100);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const filtersActive = search !== "" || categoryId !== null || maxPrice !== null;

  const aiMode = aiResults !== null;
  const shown = aiMode ? aiResults : (shelf?.items ?? []);

  function stepQty(id: number, delta: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, Math.min(10, (prev[id] ?? 1) + delta)) }));
  }

  function addToCart(product: Product) {
    const qty = quantities[product.id] ?? 1;
    const existing = cart.find((i) => i.id === product.id);
    writeCart(
      existing
        ? cart.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i))
        : [...cart, { id: product.id, qty }],
    );
  }

  async function runAiSearch() {
    const asked = aiQuery.trim();
    if (asked.length < AI_MIN_QUERY) return;
    setAiLoading(true);
    setAiError("");
    try {
      setAiResults(await aiSearch(asked));
      setAiAnswered(asked);
    } catch (err: unknown) {
      setAiResults(null);
      setAiError(err instanceof Error ? err.message : "搜索暂不可用，请稍后重试");
    } finally {
      setAiLoading(false);
    }
  }

  function clearAiSearch() {
    setAiResults(null);
    setAiAnswered("");
    setAiError("");
    setAiQuery("");
  }

  if (!result) return <PageLoader />;

  return (
    <div style={{ minHeight: "100vh", color: color.text }}>
      <Nav>
        {userName && <span style={{ color: color.textDim, fontSize: "11px", letterSpacing: "1px" }}>你好，{userName}</span>}
        {isAdmin && <NavLink href="/admin">管理后台</NavLink>}
        <NavLink href="/profile">个人中心</NavLink>
        <CartButton />
        <LogoutButton />
      </Nav>

      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <aside
          style={{
            width: "240px",
            flexShrink: 0,
            borderRight: `1px solid ${color.borderSoft}`,
            padding: "32px 24px",
            position: "sticky",
            top: layout.navHeight,
            height: `calc(100vh - ${layout.navHeight})`,
            overflowY: "auto",
          }}
        >
          <div style={{ marginBottom: "32px" }}>
            <FilterLabel>搜索</FilterLabel>
            <Input
              type="text"
              placeholder="按商品名称搜索"
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setPage(1);
              }}
              style={{ padding: "9px 12px", fontSize: "13px" }}
            />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <FilterLabel>分类</FilterLabel>
            {[{ id: null, name: "全部" }, ...categories].map(
              (option) => {
                const active = categoryId === option.id;
                return (
                  <button
                    key={option.id ?? "all"}
                    onClick={() => {
                      setCategoryId(option.id);
                      setPage(1);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      background: active ? color.surfaceInset : "none",
                      border: "none",
                      color: active ? color.text : color.textDim,
                      cursor: "pointer",
                      fontSize: "13px",
                      padding: "8px 10px",
                      borderRadius: radius.sm,
                      fontWeight: active ? "700" : "400",
                    }}
                  >
                    {categoryLabel(option.name)}
                  </button>
                );
              },
            )}
          </div>

          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <FilterLabel>最高价格</FilterLabel>
              <span style={{ fontSize: "13px", fontWeight: "700" }}>${maxPrice ?? ceiling}</span>
            </div>
            <input
              type="range"
              min={0}
              max={ceiling}
              step={10}
              value={maxPrice ?? ceiling}
              aria-label="最高价格"
              onChange={(e) => {
                setMaxPrice(parseInt(e.target.value, 10));
                setPage(1);
              }}
              style={{ width: "100%", accentColor: color.accent, cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
              <span style={{ color: color.textFaint, fontSize: "12px" }}>$0</span>
              <span style={{ color: color.textFaint, fontSize: "12px" }}>${ceiling}</span>
            </div>
          </div>

          {filtersActive && (
            <Button
              variant="secondary"
              size="sm"
              full
              onClick={() => {
                setTyped("");
                setSearch("");
                setCategoryId(null);
                setMaxPrice(null);
                setPage(1);
              }}
            >
              清除筛选
            </Button>
          )}

          <div style={{ marginTop: "32px" }}>
            <FilterLabel>AI 智能搜索</FilterLabel>
            {isLoggedIn ? (
              <>
                <Input
                  type="text"
                  placeholder="描述你想找的商品"
                  value={aiQuery}
                  maxLength={AI_MAX_QUERY}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runAiSearch();
                  }}
                  style={{ padding: "9px 12px", fontSize: "13px", marginBottom: "8px" }}
                />
                <Button
                  size="sm"
                  full
                  onClick={runAiSearch}
                  disabled={aiLoading || aiQuery.trim().length < AI_MIN_QUERY}
                >
                  {aiLoading ? "正在搜索…" : "智能搜索"}
                </Button>
                {aiError && (
                  <Alert style={{ marginTop: "10px", fontSize: "12px" }}>{aiError}</Alert>
                )}
              </>
            ) : (
              <p style={{ color: color.textDim, fontSize: "12px", lineHeight: "1.6" }}>
                <Link href="/login" style={{ color: color.text }}>
                  登录
                </Link>{" "}
                后即可用自然语言搜索商品。
              </p>
            )}
          </div>
        </aside>

        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: "32px 32px 80px",
            opacity: busy && !aiMode ? 0.55 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {aiMode ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
              <Badge tint={color.accentFrom}>AI</Badge>
              <span style={{ color: color.textMuted, fontSize: "13px" }}>
                “{aiAnswered}”的搜索结果：共 {shown.length} 件商品
              </span>
              <Button variant="ghost" size="sm" onClick={clearAiSearch}>
                清除
              </Button>
            </div>
          ) : (
            <p style={{ color: color.textDim, fontSize: "12px", letterSpacing: "1px", marginBottom: "24px" }}>
              共 {total} 件商品
            </p>
          )}

          {shown.length === 0 ? (
            <EmptyState message={aiMode ? "暂未找到符合描述的商品" : "未找到商品"} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "16px" }}>
              {shown.map((product) => {
                const inCart = cart.find((c) => c.id === product.id);
                const qty = quantities[product.id] ?? 1;
                return (
                  <div
                    key={product.id}
                    className="surface product-card"
                    style={{ borderRadius: radius.md, overflow: "hidden" }}
                  >
                    <Link
                      href={`/products/${product.id}`}
                      style={{ display: "block", overflow: "hidden", aspectRatio: "1", backgroundColor: color.surface }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image_url || fallbackImage(product.id)}
                        alt={product.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.style.display = "none";
                          if (img.parentElement) img.parentElement.style.backgroundColor = product.color;
                        }}
                      />
                    </Link>

                    <div style={{ padding: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
                        <p style={{ fontSize: "14px", fontWeight: "600" }}>{product.name}</p>
                        <p style={{ fontSize: "15px", fontWeight: "800", flexShrink: 0 }}>${product.price}</p>
                      </div>
                      <p style={{ color: color.textFaint, fontSize: "11px", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>
                        {categoryLabel(product.category?.name ?? "其他")}
                      </p>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", border: `1px solid ${color.border}`, borderRadius: radius.sm }}>
                          <button
                            onClick={() => stepQty(product.id, -1)}
                            aria-label="减少数量"
                            style={{ background: "none", border: "none", color: color.textMuted, cursor: "pointer", padding: "6px 10px", fontSize: "16px", lineHeight: 1 }}
                          >
                            −
                          </button>
                          <span style={{ fontSize: "13px", fontWeight: "700", minWidth: "20px", textAlign: "center" }}>{qty}</span>
                          <button
                            onClick={() => stepQty(product.id, 1)}
                            aria-label="增加数量"
                            style={{ background: "none", border: "none", color: color.textMuted, cursor: "pointer", padding: "6px 10px", fontSize: "16px", lineHeight: 1 }}
                          >
                            +
                          </button>
                        </div>
                        <Button
                          size="sm"
                          variant={inCart ? "secondary" : "primary"}
                          onClick={() => addToCart(product)}
                          style={{ flex: 1 }}
                        >
                          {inCart ? `已加入（${inCart.qty}）` : "加入购物车"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!aiMode && total > PER_PAGE && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginTop: "40px" }}>
              <Button variant="secondary" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1 || busy}>
                上一页
              </Button>
              <span style={{ color: color.textDim, fontSize: "12px", letterSpacing: "1px" }}>
                第 {page} / {totalPages} 页
              </span>
              <Button size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages || busy}>
                下一页
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
