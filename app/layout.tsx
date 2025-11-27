import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Work Inventory Management",
  description: "Inventory management system for job work supply and receipt tracking",
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
