"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string }[] = [
  { href: "/", label: "Rider" },
  { href: "/supply", label: "Supply" },
];

export function ViewSwitcher() {
  const pathname = usePathname();

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        background: "rgba(11, 16, 32, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: 4,
        borderRadius: 999,
        border: "1px solid rgba(34, 41, 65, 0.9)",
        display: "flex",
        gap: 2,
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
      }}
    >
      {TABS.map((tab) => {
        const active = tab.href === "/supply" ? pathname.startsWith("/supply") : pathname === "/";
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textDecoration: "none",
              background: active ? "#22D3EE" : "transparent",
              color: active ? "#0B1020" : "#94A3B8",
              transition: "background 120ms ease, color 120ms ease",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
