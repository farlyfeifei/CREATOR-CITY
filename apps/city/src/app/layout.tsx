import type { Metadata } from "next";
import "@fontsource/lxgw-wenkai/500.css";
import "@fontsource/lxgw-wenkai/700.css";
import "@fontsource/ma-shan-zheng/400.css";
import "@fontsource/zcool-xiaowei/400.css";
import "lenis/dist/lenis.css";
import { MotionRuntime } from "@/components/motion/MotionRuntime";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creator City | 创作者之城",
  description: "AI 创作者的像素城市、个人展厅与交流社区",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <MotionRuntime />
        {children}
      </body>
    </html>
  );
}
