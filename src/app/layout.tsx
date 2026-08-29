import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "入梦黔境",
  description: "以贵州傩文化为灵感的互动幻梦体验"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        {process.env.NODE_ENV === "development" ? <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async /> : null}
      </body>
    </html>
  );
}
