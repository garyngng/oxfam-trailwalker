import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./modern.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "毅行者全段分析",
  description:
    "樂施毅行者 2026 由北潭涌到哈羅，每一小段上山、落山、可跑同地標。東壩、雞公山、針草帽、大帽山。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <head>
        <meta name="text-scale" content="scale" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
