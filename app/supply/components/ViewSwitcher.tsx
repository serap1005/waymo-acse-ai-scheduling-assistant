"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string }[] = [
  { href: "/", label: "Rider" },
  { href: "/supply", label: "Supply" },
  { href: "/supply/allocator", label: "Allocator" },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/supply/allocator") return pathname.startsWith("/supply/allocator");
  if (href === "/supply") return pathname === "/supply";
  return false;
}

export function ViewSwitcher() {
  const pathname = usePathname();
  const isSupply = pathname.startsWith("/supply");

  return (
    <div
      style={{
        position: "fixed",
        top: isSupply ? 44 : 16,
        right: 16,
        zIndex: 9999,
        background: isSupply ? "rgba(255,255,255,0.08)" : "rgba(11, 16, 32, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: 6,
        borderRadius: 999,
        border: isSupply
          ? "1.5px solid rgba(255,255,255,0.2)"
          : "1.5px solid rgba(34, 211, 238, 0.35)",
        display: "flex",
        gap: 4,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.href, pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textDecoration: "none",
              background: active ? (isSupply ? "#FFFFFF" : "#22D3EE") : "transparent",
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