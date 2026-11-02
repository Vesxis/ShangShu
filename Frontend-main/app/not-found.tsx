import { AuthShell } from "@/components/nav";
import { LinkButton, PageTitle } from "@/components/ui";

export default function NotFound() {
  return (
    <AuthShell>
      <PageTitle style={{ marginBottom: "24px" }}>页面不存在</PageTitle>
      <p style={{ marginBottom: "24px" }}>链接可能已失效，请返回商城继续浏览。</p>
      <LinkButton href="/products">返回商城</LinkButton>
    </AuthShell>
  );
}
