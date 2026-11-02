"use client";

import { useState } from "react";
import Link from "next/link";
import { registerClient, resendVerification } from "@/lib/api";
import { AuthShell } from "@/components/nav";
import { Alert, Button, Eyebrow, LinkButton, PageTitle, StatusMark, TextField } from "@/components/ui";
import { useFieldErrors } from "@/lib/formErrors";
import { color } from "@/lib/theme";

const FIELDS = [
  { label: "姓名", key: "name", type: "text", placeholder: "请输入姓名", minLength: 2 },
  { label: "邮箱", key: "email", type: "email", placeholder: "请输入邮箱地址" },
  { label: "密码", key: "password", type: "password", placeholder: "请设置密码，至少 8 个字符", minLength: 8 },
  { label: "年龄", key: "age", type: "number", placeholder: "请输入年龄" },
] as const;

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", age: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [resendMessage, setResendMessage] = useState("");
  const { errors, onSubmit, clear } = useFieldErrors();

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      await registerClient({
        name: form.name,
        email: form.email,
        password: form.password,
        age: parseInt(form.age, 10),
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendState("sending");
    setResendMessage("");
    try {
      const result = await resendVerification(form.email);
      setResendMessage(result.message);
      setResendState("sent");
    } catch (err: unknown) {
      setResendMessage(err instanceof Error ? err.message : "邮件发送失败，请稍后重试");
      setResendState("failed");
    }
  }

  if (success) {
    return (
      <AuthShell>
        <div style={{ textAlign: "center" }}>
          <StatusMark tone="success" glyph="✓" />
          <Eyebrow style={{ marginBottom: "12px" }}>请查收邮件</Eyebrow>
          <PageTitle style={{ fontSize: "28px", marginBottom: "12px" }}>还差最后一步</PageTitle>
          <p style={{ color: color.textMuted, fontSize: "14px", marginBottom: "28px" }}>
            请查收发送至 <strong style={{ color: color.text }}>{form.email}</strong> 的验证邮件，点击链接激活账号。若未收到邮件，可尝试重新发送。
          </p>

          {resendMessage && (
            <Alert tone={resendState === "failed" ? "error" : "success"} style={{ marginBottom: "24px", textAlign: "left" }}>
              {resendMessage}
            </Alert>
          )}

          <LinkButton href="/login" size="lg" full>
            前往登录
          </LinkButton>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={resendState === "sending"}
            style={{ marginTop: "16px" }}
          >
            {resendState === "sending" ? "正在发送…" : "没有收到？重新发送"}
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Eyebrow style={{ marginBottom: "8px" }}>账号</Eyebrow>
      <PageTitle style={{ marginBottom: "8px" }}>创建账号</PageTitle>
      <p style={{ color: color.textMuted, fontSize: "14px", marginBottom: "40px" }}>创建账号，开启购物之旅。</p>

      {error && <Alert style={{ marginBottom: "20px" }}>{error}</Alert>}

      <form noValidate onSubmit={onSubmit(handleSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {FIELDS.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            name={field.key}
            type={field.type}
            value={form[field.key]}
            onChange={(e) => {
              setForm({ ...form, [field.key]: e.target.value });
              clear(field.key);
            }}
            required
            minLength={"minLength" in field ? field.minLength : undefined}
            min={field.key === "age" ? 1 : undefined}
            max={field.key === "age" ? 120 : undefined}
            placeholder={field.placeholder}
            error={errors[field.key]}
          />
        ))}

        <Button type="submit" size="lg" full disabled={loading} style={{ marginTop: "8px" }}>
          {loading ? "正在创建账号…" : "创建账号"}
        </Button>
      </form>

      <p style={{ textAlign: "center", marginTop: "32px", color: color.textFaint, fontSize: "13px" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: color.text, textDecoration: "none", fontWeight: "600" }}>
          登录
        </Link>
      </p>
    </AuthShell>
  );
}
