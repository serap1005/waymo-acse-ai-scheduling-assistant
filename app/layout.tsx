import type { Metadata } from "next";
import "./globals.css";
import { ViewSwitcher } from "./supply/components/ViewSwitcher";

export const metadata: Metadata = {
  title: "Waymo Commute Pass",
  description: "AI-powered commute scheduling assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ViewSwitcher />
        {children}
      </body>
    </html>
  );
}
