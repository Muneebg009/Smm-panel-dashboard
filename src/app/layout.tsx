import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "PakSmartPanel — Smart Business Manager",
  description:
    "Independent Phase 1 admin dashboard. All information is simulated demo data.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
