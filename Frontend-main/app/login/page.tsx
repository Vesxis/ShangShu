"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, loginClient, resendVerification, saveTokens } from "@/lib/api";
import { notifyAuthChange } from "@/lib/useAuth";
import { AuthShell } from "@/components/nav";
import { Alert, Button, Eyebrow, PageTitle, TextField } from "@/components/ui";
import { useFieldErrors } from "@/lib/formErrors";
import { color } from "@/lib/theme";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "done">("idle");
  const [resendMessage, setResendMessage] = useState("");
  const { errors, onSubmit, clear } = useFieldErrors();

  async function handleSubmit() {
    setError("");
    setNeedsVerification(false);
    setResendMessage("");
    setResendState("idle");
    setLoading(true);
    try {
      const tokens = await loginClient({ username: form.email, password: form.password });
      saveTokens(tokens.access_token, tokens.refresh_token);
      notifyAuthChange();
      router.push("/products");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
      setNeedsVerification(err instanceof ApiError && err.status === 403);
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendState("sending");
    try {
      const result = await resendVerification(form.email);
      setResendMessage(result.message);
    } catch (err: unknown) {
      setResendMessage(err instanceof Error ? err.message : "邮件发送失败，请稍后重试");
    } finally {
      setResendState("done");
    }
  }

  return (
    <AuthShell>
      <Eyebrow style={{ marginBottom: "8px" }}>账号</Eyebrow>
      <PageTitle style={{ marginBottom: "8px" }}>欢迎回来</PageTitle>
      <p style={{ color: color.textMuted, fontSize: "14px", marginBottom: "40px" }}>登录你的商城账号。</p>

      {error && <Alert style={{ marginBottom: needsVerification ? "12px" : "20px" }}>{error}</Alert>}

      {needsVerification && (
        <div style={{ marginBottom: "20px" }}>
          <Button variant="secondary" size="sm" full onClick={handleResend} disabled={resendState === "sending"}>
            {resendState === "sending" ? "正在发送…" : "重新发送验证链接"}
          </Button>
          {resendMessage && (
            <p style={{ color: color.textMuted, fontSize: "12px", marginTop: "10px", lineHeight: 1.5 }}>{resendMessage}</p>
          )}
        </div>
      )}

      <form noValidate onSubmit={onSubmit(handleSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <TextField
          label="邮箱"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => {
            setForm({ ...form, email: e.target.value });
            clear("email");
          }}
          required
          placeholder="请输入邮箱地址"
          error={errors.email}
        />

        <div>
          <TextField
            label="密码"
            name="password"
            type="password"
            value={form.password}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value });
              clear("password");
            }}
            required
            placeholder="请输入密码"
            error={errors.password}
          />
          <Link
            href="/forgot-password"
            style={{ display: "inline-block", marginTop: "8px", color: color.textDim, fontSize: "11px", letterSpacing: "1px", textDecoration: "none" }}
          >
            忘记密码？
          </Link>
        </div>

        <Button type="submit" size="lg" full disabled={loading} style={{ marginTop: "8px" }}>
          {loading ? "正在登录…" : "登录"}
        </Button>
      </form>

      <p style={{ textAlign: "center", marginTop: "32px", color: color.textFaint, fontSize: "13px" }}>
        No account?{" "}
        <Link href="/register" style={{ color: color.text, textDecoration: "none", fontWeight: "600" }}>
          注册
        </Link>
      </p>
    </AuthShell>
  );
}
