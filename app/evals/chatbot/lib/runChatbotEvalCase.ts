"use client";

import type { ChatbotEvalCase } from "./chatbotEvalCases";

export interface ChatbotEvalResult {
  caseId: string;
  passed: boolean;
  response: string;
  assertions: Array<{ name: string; pass: boolean; detail: string }>;
  latencyMs: number;
  error?: string;
}

export async function runChatbotEvalCase(caseDef: ChatbotEvalCase): Promise<ChatbotEvalResult> {
  const startedAt = Date.now();
  try {
    const apiResponse = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: caseDef.userMessage }],
      }),
    });
    if (!apiResponse.ok) {
      const err = await apiResponse.json().catch(() => ({ error: `HTTP ${apiResponse.status}` }));
      throw new Error(err.error ?? err.message ?? `HTTP ${apiResponse.status}`);
    }
    const data = await apiResponse.json();
    const response: string = typeof data.message === "string" ? data.message : "";
    const assertions = caseDef.assertions.map((a) => {
      const r = a.check(response);
      return { name: a.name, pass: r.pass, detail: r.detail };
    });
    const allPass = assertions.every((a) => a.pass);
    return {
      caseId: caseDef.id,
      passed: allPass,
      response,
      assertions,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      caseId: caseDef.id,
      passed: false,
      response: "",
      assertions: [],
      latencyMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
