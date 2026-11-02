"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { verifyEmail } from "@/lib/api";
import { AuthShell } from "@/components/nav";
import { Alert, Eyebrow, LinkButton, PageTitle, Spinner, StatusMark } from "@/components/ui";
import { color } from "@/lib/theme";

type Status = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "验证失败");
        setStatus("error");
      });
  }, [token]);

  return (
    <AuthShell>
      <div style={{ textAlign: "center" }}>
        {status === "loading" && (
          <>
            <Spinner size={40} style={{ margin: "0 auto 32px" }} />
            <Eyebrow>正在验证邮箱</Eyebrow>
          </>
        )}

        {status === "success" && (
          <>
            <StatusMark tone="success" glyph="✓" />
            <Eyebrow style={{ marginBottom: "12px" }}>邮箱验证成功</Eyebrow>
            <PageTitle style={{ marginBottom: "12px" }}>账号已激活</PageTitle>
            <p style={{ color: color.textMuted, fontSize: "14px", marginBottom: "40px" }}>
              邮箱已验证，现在可以登录。
            </p>
            <LinkButton href="/login" size="lg">
              前往登录
            </LinkButton>
          </>
        )}

        {status === "error" && (
          <>
            <StatusMark tone="error" glyph="✗" />
            <Eyebrow style={{ marginBottom: "12px" }}>验证失败</Eyebrow>
            <PageTitle style={{ fontSize: "28px", marginBottom: "12px" }}>链接已失效</PageTitle>
            <Alert style={{ marginBottom: "40px" }}>{error}</Alert>
            <LinkButton href="/register" variant="secondary" size="lg">
              重新注册
            </LinkButton>
          </>
        )}
      </div>
    </AuthShell>
  );
}
