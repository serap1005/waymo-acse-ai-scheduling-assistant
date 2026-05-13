"use client";

import type { AllocatorInput, AllocatorResponse } from "./schemas";

export async function callAllocator(input: AllocatorInput): Promise<AllocatorResponse> {
  const response = await fetch("/api/allocate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }
  return (await response.json()) as AllocatorResponse;
}
