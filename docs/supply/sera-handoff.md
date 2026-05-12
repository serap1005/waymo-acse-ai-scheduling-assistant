# Sera handoff — three small additive changes to enable the joint demo

Hey Sera — Logan here. I built out `/supply` as a parallel demo to your chat (lives entirely under `app/supply/` and `docs/supply/`, doesn't touch any of your code). It visualizes how prescheduled commutes reduce Waymo's deadheading. The two views toggle via a small floating switcher in the top-right (one 2-line addition to `app/layout.tsx`, only shared file I touched).

For the **joint demo** — where a user creates a schedule in your chat and immediately sees it reflected as a corridor on `/supply` — I need three small additive changes on your side. None of them break your existing SF/Phoenix flows. Total LOC: under 30.

## What the joint demo looks like

1. User opens chat at `/`, says *"I commute from Santa Monica to DTLA, weekdays at 8 AM"*
2. ACSE parses → returns the usual `ScheduleData` + schedule card. **No UX change for you.**
3. The same `ScheduleData` gets written to `localStorage`. **5 lines of new code.**
4. User clicks the View Switcher → lands on `/supply`. Their corridor renders in **orange** on the map with `SCHEDULED` label, animated dash-flow, and an entry in the schedules strip.
5. If they delete a schedule on `/supply`, it's gone from `localStorage`. Cross-tab + same-tab sync via `storage` and a custom event.

## Change 1 — System prompt: add LA (~3-line edit)

Right now your prompt says coverage is *"San Francisco and Phoenix metro areas only"* (`app/api/chat/route.ts` line 111). If a user types "Santa Monica to DTLA" today, the agent refuses. For the joint demo to land, we need LA included.

**In `app/api/chat/route.ts`:**

```diff
-You are ACSE, Waymo's AI-powered Commute Scheduling Assistant. You help urban commuters in San Francisco and Phoenix set up reliable, price-locked recurring rides through Waymo Commute Pass.
+You are ACSE, Waymo's AI-powered Commute Scheduling Assistant. You help urban commuters in San Francisco, Phoenix, and Los Angeles set up reliable, price-locked recurring rides through Waymo Commute Pass.
```

```diff
-- lockedPrice: estimate based on SF/Phoenix distance:
+- lockedPrice: estimate based on SF/Phoenix/LA distance:
   * Short commute (1-3 miles): "$9"-"$12"
   * Medium commute (3-6 miles): "$13"-"$18"
   * Long commute (6-10 miles): "$19"-"$26"
+  * Long urban commute (10-18 miles): "$24"-"$32"
   * Mission District to Downtown SF is ~3 miles = "$13"
   * Scottsdale to Sky Harbor is ~12 miles = "$24"
+  * Santa Monica to DTLA is ~15 miles = "$28"
+  * Pasadena to DTLA is ~12 miles = "$24"
+  * Hollywood to DTLA is ~7 miles = "$18"
```

```diff
-- Coverage: San Francisco and Phoenix metro areas only.
+- Coverage: San Francisco, Phoenix, and Los Angeles metro areas only.
```

Your existing SF and Phoenix flows still work identically. LA just becomes a covered third market.

## Change 2 — Write the schedule to localStorage (~5 lines)

After your existing `parseSchedule()` call returns a `ScheduleData`, we want to persist it where `/supply` can pick it up. Same storage key, same event name as on my side.

**In `app/page.tsx`** — find the spot where you handle the parsed schedule (where you currently call `setMessages` with a `scheduleCard` attached). Add this right after:

```typescript
// Phase 2 linkage: persist to localStorage so /supply can render this corridor.
const scheduledRide = {
  ...parsed,                               // your existing ScheduleData
  id: crypto.randomUUID(),
  createdAt: Date.now(),
};
const STORAGE_KEY = "commute-pass:scheduled-rides";
const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, scheduledRide]));
window.dispatchEvent(new CustomEvent("commute-pass:schedules-updated"));
```

That's it. No new imports, no new dependencies, no state machine changes. The `window.dispatchEvent` is what makes same-tab navigation (via the View Switcher) work — the `storage` event doesn't fire in the originating tab.

## Change 3 — Optional: "See fleet impact →" link on the schedule card

Nicest UX touch — once the schedule card renders, give the user a CTA to see what happens to the fleet. Lives wherever your `InlineScheduleCard` is rendered.

```tsx
<a
  href="/supply"
  style={{
    display: "block",
    marginTop: 8,
    fontSize: 12,
    color: "#22D3EE",
    textDecoration: "none",
    fontWeight: 600,
  }}
>
  See fleet impact →
</a>
```

If you'd rather not touch the card UI, the View Switcher in the top-right still works fine — this is purely a delight optimization.

## How to verify it works

1. After applying changes 1 + 2, run `npm run dev`.
2. At `/`, type "I commute from Santa Monica to DTLA, weekdays at 8 AM."
3. ACSE should return a schedule card with `lockedPrice: "$28"` (matching the new LA anchor).
4. Click "Supply" in the top-right View Switcher.
5. The Santa Monica → DTLA corridor should be drawn in orange on the right panel with a `SCHEDULED` label. The schedules strip below the legend should show a pill for it.
6. On `/supply`, hit `× Clear` (bottom-right) to reset, or click the `×` on the pill.

## Risk profile

- **Your existing UX study:** unchanged. SF and Phoenix flows are not modified.
- **Your guardrails:** unchanged. PII/injection/policy patterns all still apply.
- **Storage scope:** `localStorage` is per-origin, demo-only, no PII, no backend.
- **If `/supply` is unavailable:** your chat still works exactly as today.

## Once you've merged

I'll remove the dev-only `+ Test schedule` inject button on my side and we ship the joint demo.

— Logan
