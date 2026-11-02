"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyTransactions, Transaction } from "@/lib/api";
import { Nav, NavLink, Page } from "@/components/nav";
import { Badge, Button, Card, EmptyState, LinkButton, PageTitle, Spinner, StatCard } from "@/components/ui";
import { transactionLabel } from "@/lib/labels";
import { color } from "@/lib/theme";

const LIMIT = 15;

type TxType = Transaction["type"];

const TYPES: readonly TxType[] = ["deposit", "purchase", "refund", "withdraw"];

const TYPE_COLOR: Record<TxType, string> = {
  deposit: color.success,
  purchase: color.danger,
  refund: color.info,
  withdraw: color.warning,
};

const TYPE_LABEL: Record<TxType, string> = {
  deposit: "充值",
  purchase: "消费",
  refund: "退款",
  withdraw: "提现",
};

const CREDIT: Record<TxType, boolean> = {
  deposit: true,
  refund: true,
  purchase: false,
  withdraw: false,
};

const GRID = "1fr 120px 110px 110px";

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyTransactions(LIMIT, offset)
      .then((data) => {
        if (cancelled) return;
        setTransactions((prev) => (offset === 0 ? data : [...prev, ...data]));
        setHasMore(data.length >= LIMIT);
      })
      .catch(() => {
        if (!cancelled) router.push("/login");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offset, router]);

  function loadMore() {
    setLoading(true);
    setOffset((prev) => prev + LIMIT);
  }

  const nav = (
    <Nav>
      <NavLink href="/profile">← 个人中心</NavLink>
      <NavLink href="/products">商品</NavLink>
    </Nav>
  );

  return (
    <Page nav={nav} width="900px">
      <PageTitle style={{ marginBottom: "32px" }}>交易记录</PageTitle>

      {transactions.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "32px" }}>
          {TYPES.map((type) => {
            const sum = transactions.filter((t) => t.type === type).reduce((acc, t) => acc + t.amount, 0);
            return <StatCard key={type} label={TYPE_LABEL[type]} value={`$${sum.toFixed(2)}`} tint={TYPE_COLOR[type]} />;
          })}
        </div>
      )}

      {loading && transactions.length === 0 ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <Spinner />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          message="暂无交易记录"
          action={
            <LinkButton href="/products" size="lg">
              开始购物
            </LinkButton>
          }
        />
      ) : (
        <Card style={{ overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              gap: "12px",
              padding: "12px 20px",
              borderBottom: `1px solid ${color.borderSoft}`,
              backgroundColor: color.surface,
            }}
          >
            {["说明", "类型", "金额", "收支变动"].map((heading) => (
              <span key={heading} style={{ color: color.textDim, fontSize: "10px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase" }}>
                {heading}
              </span>
            ))}
          </div>

          {transactions.map((t, i) => (
            <div
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: "12px",
                padding: "16px 20px",
                borderBottom: i < transactions.length - 1 ? `1px solid ${color.borderSoft}` : "none",
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "2px" }}>{t.description ? transactionLabel(t.description) : TYPE_LABEL[t.type]}</p>
                <p style={{ color: color.textFaint, fontSize: "12px" }}>#{t.id}</p>
              </div>
              <Badge tint={TYPE_COLOR[t.type]}>{TYPE_LABEL[t.type]}</Badge>
              <span style={{ fontSize: "14px", fontWeight: "600" }}>${t.amount.toFixed(2)}</span>
              <span style={{ fontSize: "14px", fontWeight: "800", color: CREDIT[t.type] ? color.success : color.danger }}>
                {CREDIT[t.type] ? "+" : "−"}${t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </Card>
      )}

      {hasMore && !loading && transactions.length > 0 && (
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Button variant="secondary" onClick={loadMore}>
            加载更多
          </Button>
        </div>
      )}

      {loading && transactions.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
          <Spinner size={24} />
        </div>
      )}
    </Page>
  );
}
