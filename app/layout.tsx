import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parallel — Rewrite Your City",
  description:
    "Interactive urban what-if simulator. Convert parking into green space in a fictional neighborhood and see the modelled consequences.",
};

export const viewport: Viewport = { themeColor: "#0a0e13", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
