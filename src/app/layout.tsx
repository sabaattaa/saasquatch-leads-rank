import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadRank — Enrichment Priority for SaaSquatch-style pipelines",
  description:
    "Score, validate, and dedupe scraped B2B leads before spending enrichment credits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
