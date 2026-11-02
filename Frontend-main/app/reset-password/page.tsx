"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/api";
import { AuthShell } from "@/components/nav";
import { Alert, Button, Eyebrow, PageTitle, StatusMark, TextField } from "@/components/ui";
import { useFieldErrors } from "@/lib/formErrors";
import { color } from "@/lib/theme";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const { errors, setErrors, onSubmit, clear } = useFieldErrors();

  async function handleSubmit() {
    if (password !== confirm) {
      setErrors({ confirm: "两次输入的密码不一致" });
      return;
    }
    setLoading(true);
    setError("");
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: "center" }}>
        <StatusMark tone="success" glyph="✓" />
        <Eyebrow style={{ marginBottom: "12px" }}>操作成功</Eyebrow>
        <PageTitle style={{ fontSize: "28px", marginBottom: "12px" }}>密码已更新</PageTitle>
        <p style={{ color: color.textMuted, fontSize: "14px" }}>正在跳转到登录页面…</p>
      </div>
    );
  }

  return (
    <>
      <Eyebrow style={{ marginBottom: "8px" }}>账号</Eyebrow>
      <PageTitle style={{ marginBottom: "8px" }}>新密码</PageTitle>
      <p style={{ color: color.textMuted, fontSize: "14px", marginBottom: "40px" }}>
        请为账号设置一个安全的密码。
      </p>

      {error && <Alert style={{ marginBottom: "20px" }}>{error}</Alert>}

      {!token && (
        <Alert tone="warning" style={{ marginBottom: "20px" }}>
          缺少重置凭证，请使用邮件中的完整链接。
        </Alert>
      )}

      <form noValidate onSubmit={onSubmit(handleSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <TextField
          label="新密码"
          name="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clear("password");
          }}
          required
          minLength={8}
          placeholder="请输入新密码，至少 8 个字符"
          error={errors.password}
        />
        <TextField
          label="确认密码"
          name="confirm"
          type="password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            clear("confirm");
          }}
          required
          placeholder="请再次输入新密码"
          error={errors.confirm}
        />

        <Button type="submit" size="lg" full disabled={loading || !token} style={{ marginTop: "8px" }}>
          {loading ? "正在保存…" : "设置新密码"}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<p style={{ color: color.textDim, fontSize: "13px" }}>正在加载…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
