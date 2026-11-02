"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import {
  aiChat,
  changePassword,
  Client,
  ClientStats,
  createPaymentIntent,
  deleteClient,
  deleteProductFromOrder,
  depositBalance,
  getAiRecommendations,
  getMe,
  getMyOrders,
  getMyStats,
  getOrderWithProducts,
  logout,
  Order,
  OrderWithProducts,
  updateClient,
} from "@/lib/api";
import { notifyAuthChange } from "@/lib/useAuth";
import { LogoutButton, Nav, NavLink, Page } from "@/components/nav";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LinkButton,
  PageLoader,
  PageTitle,
  Spinner,
  StatCard,
  Tabs,
  TextField,
} from "@/components/ui";
import { roleLabel, statusLabel } from "@/lib/labels";
import { useFieldErrors } from "@/lib/formErrors";
import { color, radius, statusColor } from "@/lib/theme";

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY, { locale: "zh" }) : null;

const TABS = ["overview", "orders", "edit", "deposit", "security", "ai"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "概览",
  orders: "订单",
  edit: "编辑资料",
  deposit: "充值",
  security: "账号安全",
  ai: "智能助手",
};

function PaymentForm({ clientSecret, amount, onSuccess }: { clientSecret: string; amount: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const card = elements?.getElement(CardElement);
    if (!stripe || !card) return;
    setLoading(true);
    setError("");
    const result = await stripe.confirmCardPayment(clientSecret, { payment_method: { card } });
    if (result.error) {
      setError(result.error.message || "支付失败");
      setLoading(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ display: "block", color: color.textDim, fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
          银行卡信息
        </span>
        <div style={{ backgroundColor: color.surfaceInset, border: `1px solid ${color.border}`, padding: "14px 16px", borderRadius: radius.sm }}>
          <CardElement
            options={{
              style: {
                base: { color: color.text, fontSize: "14px", "::placeholder": { color: color.textFaint } },
                invalid: { color: color.danger },
              },
            }}
          />
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" size="lg" full disabled={loading || !stripe}>
        {loading ? "正在处理…" : `支付 $${amount.toFixed(2)}（美元）`}
      </Button>
    </form>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [depositSuccess, setDepositSuccess] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const [editForm, setEditForm] = useState({ name: "", age: "", address: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const [aiRecs, setAiRecs] = useState("");
  const [aiRecsLoading, setAiRecsLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const editFields = useFieldErrors();
  const depositFields = useFieldErrors();
  const securityFields = useFieldErrors();

  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<number, OrderWithProducts>>({});
  const [detailsLoading, setDetailsLoading] = useState<number | null>(null);
  const [detailsError, setDetailsError] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getMe(), getMyOrders(), getMyStats()])
      .then(([me, myOrders, myStats]) => {
        setClient(me);
        setOrders(myOrders);
        setStats(myStats);
        setEditForm({ name: me.name, age: String(me.age), address: "" });
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleChangePassword() {
    if (pwForm.new_password !== pwForm.confirm) {
      securityFields.setErrors({ confirm: "两次输入的密码不一致" });
      return;
    }
    setPwLoading(true);
    setPwError("");
    setPwSuccess(false);
    try {
      await changePassword(pwForm.old_password, pwForm.new_password);
      setPwForm({ old_password: "", new_password: "", confirm: "" });
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleDemoTopUp() {
    if (!client) return;
    setDemoLoading(true);
    setDepositError("");
    try {
      const updated = await depositBalance(client.id, 100);
      setClient((prev) => (prev ? { ...prev, balance: updated.balance } : prev));
      setDepositSuccess("演示余额已到账，本次未发生真实扣款。");
      setTimeout(() => setDepositSuccess(""), 4000);
    } catch (err: unknown) {
      setDepositError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setDemoLoading(false);
    }
  }

  async function handleDeposit() {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      depositFields.setErrors({ amount: "请输入大于零的金额" });
      return;
    }
    setDepositLoading(true);
    setDepositError("");
    try {
      const data = await createPaymentIntent(amount);
      setClientSecret(data.client_secret);
    } catch (err: unknown) {
      setDepositError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setDepositLoading(false);
    }
  }

  async function handleEditProfile() {
    if (!client) return;
    setEditLoading(true);
    setEditError("");
    setEditSuccess(false);
    try {
      const updated = await updateClient(client.id, {
        name: editForm.name,
        age: parseInt(editForm.age, 10),
        address: editForm.address || undefined,
      });
      setClient((prev) => (prev ? { ...prev, name: updated.name, age: updated.age } : prev));
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (!client) return;
    if (!window.confirm("确定要删除账号吗？此操作无法撤销。")) return;
    setDeleteLoading(true);
    try {
      await deleteClient(client.id);
      logout();
      notifyAuthChange();
      router.push("/login");
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : "删除账号失败，请稍后重试");
      setDeleteLoading(false);
    }
  }

  async function toggleOrderDetails(orderId: number) {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    setExpandedOrder(orderId);
    setDetailsError(null);
    if (orderDetails[orderId]) return;
    setDetailsLoading(orderId);
    try {
      const data = await getOrderWithProducts(orderId);
      setOrderDetails((prev) => ({ ...prev, [orderId]: data }));
    } catch {
      setDetailsError(orderId);
    } finally {
      setDetailsLoading(null);
    }
  }

  async function handleRemoveProduct(orderId: number, productId: number) {
    if (!window.confirm("确定要从订单中移除这件商品吗？")) return;
    try {
      await deleteProductFromOrder(orderId, productId);
      setOrderDetails((prev) => ({
        ...prev,
        [orderId]: { ...prev[orderId], products: prev[orderId].products.filter((p) => p.id !== productId) },
      }));
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : "操作失败，请稍后重试");
    }
  }

  if (loading) return <PageLoader />;
  if (!client) return null;

  const nav = (
    <Nav>
      <NavLink href="/products">商品</NavLink>
      <NavLink href="/transactions">交易记录</NavLink>
      <LogoutButton />
    </Nav>
  );

  return (
    <Page nav={nav} width="900px">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <PageTitle>{client.name}</PageTitle>
          <p style={{ color: color.textDim, fontSize: "14px", marginTop: "4px" }}>{client.email}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: color.textDim, fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>余额</p>
          <p style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-1px" }}>${client.balance.toFixed(2)}</p>
          <Button variant="ghost" size="sm" onClick={() => setTab("deposit")} style={{ color: color.success, padding: "4px 0" }}>
            + Add funds
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "36px" }}>
        <StatCard label="订单" value={stats?.total_orders ?? orders.length} />
        <StatCard label="累计消费" value={`$${(stats?.total_spent ?? 0).toFixed(2)}`} />
        <StatCard label="角色" value={roleLabel(client.role)} />
        <StatCard label="年龄" value={client.age} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} labels={TAB_LABELS} />

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          <Card style={{ padding: "24px" }}>
            <p style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: color.textDim, marginBottom: "16px" }}>
              账号信息
            </p>
            {[
              { label: "名称", value: client.name },
              { label: "邮箱", value: client.email },
              { label: "年龄", value: `${client.age} 岁` },
              { label: "角色", value: roleLabel(client.role) },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${color.borderSoft}` }}>
                <span style={{ color: color.textDim, fontSize: "14px" }}>{item.label}</span>
                <span style={{ fontSize: "14px", fontWeight: "500", textTransform: "capitalize", textAlign: "right", wordBreak: "break-all" }}>
                  {item.value}
                </span>
              </div>
            ))}
          </Card>

          <Card style={{ padding: "24px" }}>
            <p style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: color.textDim, marginBottom: "16px" }}>
              快捷操作
            </p>
            {[
              { label: "浏览商品", href: "/products" },
              { label: "查看购物车", href: "/cart" },
              { label: "交易明细", href: "/transactions" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color: color.textMuted,
                  fontSize: "14px",
                  textDecoration: "none",
                  padding: "10px 0",
                  borderBottom: `1px solid ${color.borderSoft}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {item.label} <span style={{ color: color.textFaint }}>→</span>
              </Link>
            ))}
            <button
              onClick={() => setTab("orders")}
              style={{
                background: "none",
                border: "none",
                color: color.textMuted,
                fontSize: "14px",
                textAlign: "left",
                cursor: "pointer",
                padding: "10px 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              我的订单（{orders.length}） <span style={{ color: color.textFaint }}>→</span>
            </button>
          </Card>
        </div>
      )}

      {tab === "orders" &&
        (orders.length === 0 ? (
          <EmptyState
            message="暂无订单"
            action={
              <LinkButton href="/products" size="lg">
                开始购物
              </LinkButton>
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {orders.map((order) => (
              <Card key={order.id} style={{ overflow: "hidden" }}>
                <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <p style={{ fontWeight: "600", marginBottom: "4px", fontSize: "15px" }}>{order.title}</p>
                    <p style={{ color: color.textFaint, fontSize: "12px" }}>订单 #{order.id}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Badge tint={statusColor[order.status]}>{statusLabel(order.status)}</Badge>
                    <Button variant="secondary" size="sm" onClick={() => toggleOrderDetails(order.id)}>
                      {expandedOrder === order.id ? "收起" : "查看详情"}
                    </Button>
                  </div>
                </div>

                {expandedOrder === order.id && (
                  <div style={{ borderTop: `1px solid ${color.borderSoft}`, padding: "16px 20px", backgroundColor: color.surface }}>
                    {detailsLoading === order.id ? (
                      <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
                        <Spinner size={20} />
                      </div>
                    ) : detailsError === order.id ? (
                      <Alert>订单详情加载失败，请重试。</Alert>
                    ) : orderDetails[order.id]?.products.length === 0 ? (
                      <p style={{ color: color.textDim, fontSize: "13px" }}>订单中暂无商品</p>
                    ) : (
                      <>
                        <p style={{ color: color.textDim, fontSize: "10px", letterSpacing: "2px", marginBottom: "10px" }}>商品</p>
                        {orderDetails[order.id]?.products.map((product) => (
                          <div
                            key={product.id}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${color.borderSoft}` }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                              <div style={{ width: "28px", height: "28px", borderRadius: radius.sm, backgroundColor: product.color, border: `1px solid ${color.border}`, flexShrink: 0 }} />
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: "13px", fontWeight: "600" }}>{product.name}</p>
                                <p style={{ color: color.textFaint, fontSize: "12px" }}>数量：{product.quantity}</p>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                              <span style={{ fontSize: "13px", fontWeight: "700" }}>${(product.price * product.quantity).toFixed(2)}</span>
                              {order.status === "create" && (
                                <Button variant="danger" size="sm" onClick={() => handleRemoveProduct(order.id, product.id)}>
                                  移除
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ))}

      {tab === "edit" && (
        <div style={{ maxWidth: "400px" }}>
          {editSuccess && <Alert tone="success" style={{ marginBottom: "16px" }}>个人资料已更新。</Alert>}
          {editError && <Alert style={{ marginBottom: "16px" }}>{editError}</Alert>}

          <form
            noValidate
            onSubmit={editFields.onSubmit(handleEditProfile)}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {[
              { label: "姓名", key: "name", type: "text", placeholder: "请输入姓名", required: true },
              { label: "年龄", key: "age", type: "number", placeholder: "请输入年龄", required: true },
              { label: "收货地址（选填）", key: "address", type: "text", placeholder: "请输入收货地址", required: false },
            ].map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                name={field.key}
                type={field.type}
                value={editForm[field.key as keyof typeof editForm]}
                onChange={(e) => {
                  setEditForm({ ...editForm, [field.key]: e.target.value });
                  editFields.clear(field.key);
                }}
                placeholder={field.placeholder}
                required={field.required}
                min={field.key === "age" ? 1 : undefined}
                max={field.key === "age" ? 120 : undefined}
                error={editFields.errors[field.key]}
              />
            ))}
            <Button type="submit" size="lg" full disabled={editLoading} style={{ marginTop: "4px" }}>
              {editLoading ? "正在保存…" : "保存修改"}
            </Button>
          </form>
        </div>
      )}

      {tab === "deposit" && (
        <div style={{ maxWidth: "400px" }}>
          <Card style={{ padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: color.textDim, fontSize: "14px" }}>当前余额</span>
            <span style={{ fontWeight: "800", fontSize: "16px" }}>${client.balance.toFixed(2)}</span>
          </Card>

          {!stripePromise && (
            <Alert tone="warning" style={{ marginBottom: "16px" }}>
              Payments are unavailable: NEXT_PUBLIC_STRIPE_KEY is not set.
            </Alert>
          )}
          {depositSuccess && (
            <Alert tone="success" style={{ marginBottom: "16px" }}>
              {depositSuccess}
            </Alert>
          )}
          {depositError && <Alert style={{ marginBottom: "16px" }}>{depositError}</Alert>}

          {!clientSecret ? (
            <form
              noValidate
              onSubmit={depositFields.onSubmit(handleDeposit)}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <TextField
                label="金额（美元）"
                name="amount"
                type="number"
                value={depositAmount}
                onChange={(e) => {
                  setDepositAmount(e.target.value);
                  depositFields.clear("amount");
                }}
                min="1"
                step="0.01"
                placeholder="请输入充值金额"
                required
                error={depositFields.errors.amount}
              />
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[10, 25, 50, 100].map((amount) => (
                  <Button key={amount} type="button" variant="secondary" size="sm" onClick={() => setDepositAmount(String(amount))}>
                    ${amount}
                  </Button>
                ))}
              </div>
              <Button type="submit" size="lg" full disabled={depositLoading || !stripePromise}>
                {depositLoading ? "正在处理…" : "继续付款"}
              </Button>

              <div style={{ borderTop: `1px solid ${color.borderSoft}`, marginTop: "20px", paddingTop: "20px" }}>
                <p style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: color.textDim, marginBottom: "8px" }}>
                  演示充值
                </p>
                <p style={{ color: color.textDim, fontSize: "12px", lineHeight: 1.6, marginBottom: "12px" }}>
                  这是演示商城，可直接增加演示余额，体验购物车和结算流程。此操作不会产生真实资金交易。
                </p>
                <Button type="button" variant="secondary" full onClick={handleDemoTopUp} disabled={demoLoading}>
                  {demoLoading ? "正在添加…" : "充值 100 美元演示余额"}
                </Button>
              </div>
            </form>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ color: color.textDim, fontSize: "14px" }}>
                  充值金额：<strong style={{ color: color.text }}>${parseFloat(depositAmount).toFixed(2)}</strong>
                </span>
                <Button variant="ghost" size="sm" onClick={() => setClientSecret(null)}>
                  ← 返回
                </Button>
              </div>
              {stripePromise && (
                <Elements stripe={stripePromise} options={{ locale: "zh" }}>
                  <PaymentForm
                    clientSecret={clientSecret}
                    amount={parseFloat(depositAmount)}
                    onSuccess={() => {
                      setDepositSuccess("支付成功，余额将在稍后更新。");
                      setClientSecret(null);
                      setDepositAmount("");
                      setTimeout(() => {
                        getMe()
                          .then(setClient)
                          .catch(() => {
                          });
                      }, 2000);
                    }}
                  />
                </Elements>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "security" && (
        <div style={{ maxWidth: "400px" }}>
          {pwSuccess && <Alert tone="success" style={{ marginBottom: "16px" }}>密码已更新。</Alert>}
          {pwError && <Alert style={{ marginBottom: "16px" }}>{pwError}</Alert>}

          <form
            noValidate
            onSubmit={securityFields.onSubmit(handleChangePassword)}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {[
              { label: "当前密码", key: "old_password", placeholder: "请输入当前密码", minLength: undefined },
              { label: "新密码", key: "new_password", placeholder: "请输入新密码，至少 8 个字符", minLength: 8 },
              { label: "确认新密码", key: "confirm", placeholder: "请再次输入新密码", minLength: undefined },
            ].map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                name={field.key}
                type="password"
                value={pwForm[field.key as keyof typeof pwForm]}
                onChange={(e) => {
                  setPwForm({ ...pwForm, [field.key]: e.target.value });
                  securityFields.clear(field.key);
                }}
                required
                minLength={field.minLength}
                placeholder={field.placeholder}
                error={securityFields.errors[field.key]}
              />
            ))}
            <Button type="submit" size="lg" full disabled={pwLoading} style={{ marginTop: "4px" }}>
              {pwLoading ? "正在保存…" : "修改密码"}
            </Button>
          </form>

          <div style={{ marginTop: "40px", paddingTop: "28px", borderTop: `1px solid ${color.borderSoft}` }}>
            <p style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: color.danger, marginBottom: "8px" }}>
              账号删除
            </p>
            <p style={{ color: color.textDim, fontSize: "13px", marginBottom: "16px" }}>
              账号删除后无法自行恢复，请谨慎操作。
            </p>
            <Button variant="danger" onClick={handleDeleteAccount} disabled={deleteLoading}>
              {deleteLoading ? "正在删除…" : "删除账号"}
            </Button>
          </div>
        </div>
      )}

      {tab === "ai" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <Card style={{ padding: "28px" }}>
            <p style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>个性化推荐</p>
            <p style={{ color: color.textDim, fontSize: "13px", marginBottom: "20px" }}>根据你的购买记录推荐</p>
            {!aiRecs ? (
              <Button
                disabled={aiRecsLoading}
                onClick={async () => {
                  setAiRecsLoading(true);
                  try {
                    setAiRecs(await getAiRecommendations());
                  } catch {
                    setAiRecs("推荐加载失败，请稍后重试。");
                  } finally {
                    setAiRecsLoading(false);
                  }
                }}
              >
                {aiRecsLoading ? "正在加载…" : "获取推荐"}
              </Button>
            ) : (
              <>
                <p style={{ color: color.textMuted, fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-line" }}>{aiRecs}</p>
                <Button variant="secondary" size="sm" onClick={() => setAiRecs("")} style={{ marginTop: "16px" }}>
                  刷新
                </Button>
              </>
            )}
          </Card>

          <Card style={{ padding: "28px" }}>
            <p style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>商城助手</p>
            <p style={{ color: color.textDim, fontSize: "13px", marginBottom: "20px" }}>
              向助手咨询商品、配送或支付问题
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!chatMessage.trim()) return;
                setChatLoading(true);
                setChatReply("");
                try {
                  setChatReply(await aiChat(chatMessage));
                } catch {
                  setChatReply("操作失败，请稍后重试。");
                } finally {
                  setChatLoading(false);
                }
              }}
              style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}
            >
              <Input
                type="text"
                placeholder="请输入商品、配送或支付相关问题"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                style={{ flex: "1 1 200px" }}
              />
              <Button type="submit" disabled={chatLoading}>
                {chatLoading ? "..." : "发送"}
              </Button>
            </form>
            {chatReply && (
              <div
                style={{
                  backgroundColor: color.surfaceInset,
                  border: `1px solid ${color.border}`,
                  borderRadius: radius.sm,
                  padding: "16px",
                  fontSize: "14px",
                  color: color.textMuted,
                  lineHeight: "1.7",
                  whiteSpace: "pre-line",
                }}
              >
                {chatReply}
              </div>
            )}
          </Card>
        </div>
      )}
    </Page>
  );
}
