"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/api";
import { AuthShell } from "@/components/nav";
import { Alert, Button, Eyebrow, PageTitle, StatusMark, TextField } from "@/components/ui";
import { useFieldErrors } from "@/lib/formErrors";
import { color } from "@/lib/theme";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { errors, onSubmit, clear } = useFieldErrors();

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell>
        <div style={{ textAlign: "center" }}>
          <StatusMark tone="success" glyph="✓" />
          <Eyebrow style={{ marginBottom: "12px" }}>请查收邮件</Eyebrow>
          <PageTitle style={{ fontSize: "28px", marginBottom: "12px" }}>链接已发送</PageTitle>
          <p style={{ color: color.textMuted, fontSize: "14px", marginBottom: "40px" }}>
            密码重置链接已发送至 <strong style={{ color: color.text }}>{email}</strong>
          </p>
          <Link href="/login" style={{ color: color.textMuted, fontSize: "11px", letterSpacing: "2px", textDecoration: "none" }}>
            ← 返回登录
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Eyebrow style={{ marginBottom: "8px" }}>重置密码</Eyebrow>
      <PageTitle style={{ marginBottom: "8px" }}>忘记密码？</PageTitle>
      <p style={{ color: color.textMuted, fontSize: "14px", marginBottom: "40px" }}>
        输入邮箱地址，我们会向你发送密码重置链接。
      </p>

      {error && <Alert style={{ marginBottom: "20px" }}>{error}</Alert>}

      <form noValidate onSubmit={onSubmit(handleSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <TextField
          label="邮箱"
          name="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clear("email");
          }}
          required
          placeholder="请输入邮箱地址"
          error={errors.email}
        />

        <Button type="submit" size="lg" full disabled={loading} style={{ marginTop: "8px" }}>
          {loading ? "正在发送…" : "发送重置链接"}
        </Button>
      </form>

      <p style={{ textAlign: "center", marginTop: "32px", color: color.textFaint, fontSize: "13px" }}>
        Remember your password?{" "}
        <Link href="/login" style={{ color: color.text, textDecoration: "none", fontWeight: "600" }}>
          登录
        </Link>
      </p>
    </AuthShell>
  );
}
