import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenAdvisor — UMich Degree Advisor",
  description: "AI-powered academic planning for University of Michigan students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
