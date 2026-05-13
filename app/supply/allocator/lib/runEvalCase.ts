"use client";

import { callAllocator } from "./callAllocator";
import type { EvalCase, EvalResult } from "./schemas";

export async function runEvalCase(caseDef: EvalCase): Promise<EvalResult> {
  const startedAt = Date.now();
  try {
    const response = await callAllocator(caseDef.input);
    const assertions = caseDef.assertions.map((a) => {
      const r = a.check(response.decision, caseDef.input);
      return { name: a.name, pass: r.pass, detail: r.detail };
    });
    const hardConstraintsPass = response.constraint_checks.every((c) => c.passed);
    const allAssertionsPass = assertions.every((a) => a.pass);
    return {
      caseId: caseDef.id,
      passed: allAssertionsPass && hardConstraintsPass,
      hardConstraintsPass,
      assertions,
      hardConstraints: response.constraint_checks,
      latencyMs: response.latency_ms,
      tokens: response.tokens,
    };
  } catch (err) {
    return {
      caseId: caseDef.id,
      passed: false,
      hardConstraintsPass: false,
      assertions: [],
      hardConstraints: [],
      latencyMs: Date.now() - startedAt,
      tokens: { input: 0, output: 0, cached_input: 0, cache_creation_input: 0 },
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
