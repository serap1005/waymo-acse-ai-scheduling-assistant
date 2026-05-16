# Waymo Commute Pass

**Live Demo:** https://waymo-acse-ai-scheduling-assistant.vercel.app

---

## Safety was round one. Waymo's round two is your 8:30 AM.

*The autonomous vehicle leader is launching a monthly commuter subscription with locked rates and an AI scheduling agent. A bet that converts spontaneous riders into recurring ones is the key to making the economics work.*

SAN FRANCISCO - For the better part of a decade, Waymo's pitch to the riding public was a single word: safer. The company has now logged enough autonomous miles, in enough cities, to make that case largely uncontested. The harder question, the one that determines whether autonomous rideshare is a viable mass-market business, is whether it can be reliable enough to plan a life around.

Today, Waymo is offering its answer. The company introduced Commute Pass, a monthly subscription aimed squarely at the urban commuter who has flirted with making Waymo a daily habit and pulled back when the price surged or the car arrived three minutes late. Subscribers get a per-ride rate locked for 30 days, immune to weather, demand, and time of day, and the ability to schedule recurring rides in advance: set once, forgotten. There is no monthly fee. Pricing is fixed per trip distance, starting at $9.

**The Agent as Infrastructure**

The mechanism attracts users with convenient accessibility. Rather than a scheduling form, Waymo is routing setup through a conversational AI agent it calls ACSE, built on Anthropic's Claude. A rider describes a commute in plain language, "Castro to SoMa, weekdays, leaving by 8:15", and the agent returns a structured schedule and a locked price inside a chat window. The conversational LLM model allows users to easily try out commute pass quoting and heighten curiosity towards new feature; taking under one breath second.

The agent is deliberately narrow with an intention: it will not negotiate rates, invent pricing, or improvise on policy. Asked for a discount, it declines and explains that the locked rate is already the best available price. Asked about cancellation, it returns the policy verbatim-free up to two hours before departure, a 50% fee inside that window-and moves on. A scheduling agent that hallucinates a discount, or commits to a route Waymo cannot fulfill, would erode the very reliability the product is meant to sell. The guardrails are not friction, but are the feature.

What the rider never sees is the second agent. Every confirmed schedule ACSE generates becomes a structured demand signal consumed by Waymo's Supply Allocation Agent, a server-side LLM running on Claude Sonnet via tool-use and prompt caching. It receives real-time fleet telemetry, scheduled ride commitments, corridor-level on-demand forecasts, and live disruption feeds, and returns precise vehicle assignment decisions: which vehicles reposition to which staging corridors, when, and why. Three hard constraints are validated server-side on every decision cycle, an on-demand floor ensuring at least 15% of the fleet stays available for non-subscribers, corridor caps preventing any single neighborhood from being starved of supply, and a four-minute reassignment SLA on any vehicle released from a no-show or cancellation. Failures surface as visible alerts, never silent retries.

The two agents are the product. ACSE converts a rider's morning routine into a structured commitment. The allocation agent converts that commitment into a pre-positioned vehicle. The reliability Waymo is selling is not a policy. It is an architecture.

**The Math of a Predictable Rider**

The strategic bet underneath the product is grounded in Waymo's own operational data. Roughly 44% of Waymo's vehicle miles are currently driven empty; a direct consequence of unforecastable, spontaneous demand. Every cold dispatch is a vehicle repositioning at cost. But every commuter who locks in a recurring schedule is a demand signal: a vehicle pre-positioned, an empty mile eliminated, a wait time shortened for every other rider on that corridor.

Another story is compounding economics. A commuter riding five days a week generates roughly 22 known demand data points per month; each one a confirmed origin, destination, and departure window. The Supply Allocation Agent ingests those commitments 30 to 45 minutes before pickup and begins repositioning vehicles to staging corridors before a single rider opens the app. Multiply that across thousands of subscribers in a single market and Waymo's fleet begins to operate less like a reactive dispatch system and more like a scheduled transit network that happens to pick riders up at their front doors. Simulations anchored to Waymo's 44.3% baseline suggest that at meaningful subscriber adoption, deadheading could fall toward 25%, a reduction that lowers cost-per-mile across the entire fleet and allows Waymo to sustain the price lock as a structural advantage rather than a promotional one. The commuter's habit, in other words, funds its own guarantee.

That flywheel has a second loop. More predictable demand means more training data on real-world commute patterns: the kind of granular, time-anchored, corridor-specific signal that improves vehicle allocation algorithms over time. Waymo's data moat, already formidable from miles driven, deepens every time a subscriber confirms a route.

**A Beachhead, Not a Rollout**

Commute Pass is launching in San Francisco, Los Angeles, and Phoenix, and only there. Expansion to Austin will follow, the company said, but on a timetable set by fleet readiness rather than subscriber demand. The internal gate is whether Waymo can guarantee a vehicle during the 7-to-9 AM peak window without lengthening wait times for on-demand riders in the same market; if priority dispatch for subscribers begins to degrade the experience for conventional users, the expansion stops.

For enterprise customers, the new feature includes an employer subsidy layer: companies can co-fund employee subscriptions through *Waymo for Business*, converting individual commuter habits into bulk corridor demand. A single enterprise contract covering 50 employees on the same morning route is worth more to Waymo's fleet algorithm than 50 individual subscribers.

That constraint is the most disciplined thing about the launch. Waymo is not announcing a national subscription product. It is announcing a narrow test of a single hypothesis: that scheduled demand begets predictable supply, predictable supply begets shorter waits, and shorter waits make Waymo measurably more useful to every rider in the city, including the ones who never subscribe.

If the bet works, the implication for the broader autonomous-vehicle industry is significant. The companies that win the next phase of autonomous rideshare will not be crowned by safety records or service maps. They will be crowned by something quieter and harder to replicate: the moment a rider stops thinking about whether to take Waymo, and simply expects it to be there.

The battle for rideshare was fought on safety. Waymo won. Today's battle for Waymo is reliability, and your 8:30 AM is not a mere subscription. It is the infrastructure.

*Waymo Commute Pass is available beginning today in San Francisco, Los Angeles, and Phoenix. Pricing starts at $9 per locked ride for short-distance commutes. There is no monthly subscription fee. For more information, visit [waymo.com/commute-pass](http://waymo.com/commute-pass).*

---

## Try the Demo

The deployed prototype walks through four views accessible from the top-right nav (RIDER · SUPPLY · ALLOCATOR · EVALS):

**RIDER** — the conversational ACSE chatbot. Try one of:
- `Mission District to Salesforce Tower, Mon-Fri 8:30 AM`
- `Santa Monica to DTLA, weekdays 8 AM`
- `What's the cancellation policy?`
- `Give me a discount` (intentionally blocked by L2 guardrail)

**SUPPLY** — the fleet allocation sandbox. Side-by-side LA fleet visualization comparing on-demand-only vs. with Commute Pass. Drag the time-of-day scrubber, add test schedules, watch deadheading drop.

**ALLOCATOR** — the Supply Allocation Agent test bench. Pick one of five hand-built scenarios (Phoenix baseline, LA evening weather, Austin cold-start, near-floor edge case, systemic no-show spike) and run a live allocation decision against Claude Sonnet.

**EVALS** — the per-agent test bench. ACSE chatbot eval suite (30 cases) and Allocator eval suite (18 cases) run against the live models with hard-constraint and scenario assertions.

---

## Architecture

Two AI agents, one Next.js app, shared infrastructure.

```
RIDER (chat)  →  /api/chat  →  Claude Sonnet 4.5  →  ScheduleCard  →  localStorage
                                                                          ↓
                                                                    SchedulesStrip
                                                                          ↓
                                                                    SUPPLY VIEW

SCENARIO  →  /api/allocate  →  Claude Sonnet 4.5  →  Server-side overrides  →  Validate
PICKER       (tool-use,        (forced tool-use,      (always recompute        (3 hard
             prompt-cached)     ephemeral cache)       derivable fields)        constraints)
```

**ACSE chatbot (`/`, `/api/chat`)** — Natural-language conversational scheduling agent. Three modes: schedule construction, policy grounding, recommendation. Four-layer guardrail stack: L4 rate limiting (20 req/IP/60s), L3 prompt-injection detection, L1 PII detection, L2 policy-manipulation detection. Confirmed schedules are written to `localStorage` (key: `commute-pass:scheduled-rides`) and broadcast via `CustomEvent: commute-pass:schedules-updated`.

**Supply view (`/supply`)** — Stylized LA fleet visualization. 40 vehicles per panel, three states (idle / dispatched / with-passenger), animated via `requestAnimationFrame` writing to refs (no React re-renders in the hot path). Reads `localStorage` to surface user-confirmed schedules as highlighted corridors.

**Supply Allocation Agent (`/supply/allocator`, `/api/allocate`)** — Structured fleet allocation agent. Takes `AllocatorInput` JSON, returns `AllocatorOutput` JSON via forced tool-use (`emit_allocation_decision`). System prompt is prompt-cached (`cache_control: ephemeral`). Server-side overrides recompute derivable fields (`on_demand_reserve_pct`, `utilization_rate`, `active_disruptions`) from the agent's own assignment array — model judgment is preserved for creative decisions only.

**Eval test benches (`/evals`)** — ACSE chatbot eval (30 cases, 12 critical: Scheduling / Policy / Adversarial / PII) mirrors `SOURCE_OF_TRUTH.md` §9. Allocator eval (18 cases, 5 critical: Baseline / No-show / Disruption / Fleet / New market / Edge) mirrors the Commute Pass Dispatch Model spec. Launch gate per agent: ≥90% overall, 100% on critical.

For the canonical specifications consumed by both agents, see [`SOURCE_OF_TRUTH.md`](./SOURCE_OF_TRUTH.md) and [`docs/supply/SPEC.md`](./docs/supply/SPEC.md).

---

## Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| Framework | Next.js 16.2 App Router | Serverless API routes co-located with pages |
| UI | React 19.2 | Functional components, hooks, refs for animation |
| Styling | Tailwind CSS 4 | Utility-first, `@tailwindcss/postcss` |
| Language | TypeScript 5 | Strict mode |
| AI SDK | `@anthropic-ai/sdk` 0.95.1 | Single dependency for both agents |
| Model | Claude Sonnet 4.5 (`claude-sonnet-4-5`) | System prompts (ACSE), forced tool-use + prompt caching (Allocator) |
| State (Phase 2 linkage) | `localStorage` + `CustomEvent` | Cross-tab via `storage` event, same-tab via custom event |
| Animation | `requestAnimationFrame` | Direct DOM writes via refs, no React re-renders per frame |
| Hosting | Vercel | Auto-deploy on push to main, preview URLs per branch |
| Version control | GitHub | Branch-based workflow |
| Linting | ESLint 9 + `eslint-config-next` | |

No database. No authentication. No external geocoding API. Synthetic fleet data. Stateless serverless API routes. Rate limiting is in-memory (resets on cold start).

---

## Repo Structure

```
waymo-acse-ai-scheduling-assistant/
├── app/
│   ├── page.tsx                          # ACSE chatbot (rider)
│   ├── layout.tsx                        # Root layout, ViewSwitcher mount
│   ├── globals.css                       # Tailwind imports + scrollbar
│   ├── api/
│   │   ├── chat/route.ts                 # ACSE API: guardrails + Claude call
│   │   └── allocate/route.ts             # Allocator API: tool-use + overrides
│   ├── components/
│   │   └── ScheduleCard.tsx              # Structured schedule card in chat
│   └── supply/
│       ├── page.tsx                      # Supply view (fleet visualization)
│       ├── allocator/                    # Allocator test bench + lib
│       │   ├── page.tsx
│       │   ├── components/               # Input editor, output viewer, map
│       │   └── lib/                      # System prompt, schemas, eval cases
│       ├── components/                   # HeroBlock, KPIStrip, Panel, etc.
│       ├── evals/                        # Per-agent eval runner UI
│       └── lib/                          # Animation, simulation, scheduleStore
├── docs/
│   └── supply/                           # Logan's spec docs
│       ├── SPEC.md                       # Iteration log (chronological)
│       ├── PROGRESS.md
│       └── specs/                        # Plan + impl specs
├── AGENTS.md                             # Agent-coding routing (Next.js 16 guidance)
├── CLAUDE.md                             # Imports AGENTS.md
├── SOURCE_OF_TRUTH.md                    # Canonical agent specifications
├── README.md                             # This file
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Local Setup

**Prerequisites:** Node 20+ and an Anthropic API key.

```bash
# Clone
git clone https://github.com/serap1005/waymo-acse-ai-scheduling-assistant.git
cd waymo-acse-ai-scheduling-assistant

# Install
npm install

# Configure env
cp .env.local.example .env.local       # if example exists, otherwise create the file
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# Run dev server
npm run dev
```

The app runs at `http://localhost:3000`. The four views are reachable via the top-right nav or by URL:

- `/` — ACSE chatbot
- `/supply` — fleet visualization
- `/supply/allocator` — Allocator test bench
- `/evals` — eval test benches for both agents

**Production build:**

```bash
npm run build
npm run start
```

**Linting:**

```bash
npm run lint
```

---

## Deployment

Deployed on Vercel. Auto-deploys on push to `main`. Preview deployments are generated per branch — push any feature branch and Vercel will return a preview URL within ~60 seconds.

**Environment variables (set in the Vercel dashboard):**

- `ANTHROPIC_API_KEY` — required for both `/api/chat` and `/api/allocate` to function

The free Vercel hobby tier is sufficient for the deployed demo. Both API routes are stateless and scale horizontally; the only stateful component is the in-memory rate limiter in each route, which resets on each cold start.

---

## Credits

**Sera Park** | **Logan Wood**

Strategic framing inspired by [Waymo](https://waymo.com)'s public operational data and the broader autonomous rideshare landscape. All product names, scenarios, and operational numbers in this prototype are illustrative.

UCLA Anderson · Technical Product Management · 2026