import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentGuard — governance for autonomous agent payments",
  description:
    "Every AI agent payment, governed. Identity, policy, audit, and Claude-powered intent classification on Circle Nanopayments — agents plug in with three lines of SDK.",
  metadataBase: new URL("https://agentguard.xyz"),
  openGraph: {
    title: "AgentGuard — every AI agent payment, governed.",
    description:
      "The governance layer for autonomous agent payments on Circle Nanopayments. Identity, policy, audit, intent — all on Arc.",
    url: "https://agentguard.xyz",
    siteName: "AgentGuard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentGuard — every AI agent payment, governed.",
    description:
      "Governance layer for autonomous agent payments on Circle Nanopayments.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-primary">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
