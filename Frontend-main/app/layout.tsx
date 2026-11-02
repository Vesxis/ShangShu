import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "商枢｜高并发电商交易平台",
  description: "商枢，面向华人的电商交易平台，提供商品选购、订单结算、账户管理与智能导购。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
      style={{ colorScheme: "dark" }}
    >
      <body>{children}</body>
    </html>
  );
}
