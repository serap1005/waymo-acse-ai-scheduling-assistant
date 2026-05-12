# Visual conventions — supply view

Look-and-feel rules for the stylized simulation.

- **Color is meaningful, never decorative** (per global CLAUDE.md). Vehicle states get distinct colors mapped to a single legend. KPI deltas use a consistent direction palette. **User-added schedules render orange** (`#FB923C`) on the map and in the schedules strip — distinct from system-generated teal corridors. The color encodes "this is your input."
- **No purple/green gradients.** Ever.
- **Honest data viz.** Label simulated values as simulated. No misleading axis truncation, no fake precision.
- **Stylized, not realistic.** Dot-grid or vector-art LA, not a Mapbox tile. If stylized starts to look bad, escalate to Logan before swapping in a real basemap.
- **Brand respect.** Match the calm, premium, safety-forward feel of the Waymo app (deep blue + teal in Sera's UI). Don't introduce a wildly different palette.
- **Motion serves comprehension.** Animation reinforces the pre-positioning narrative. No motion just to look busy.
- **Phone-frame deferred.** Sera's UI is in a phone frame; the supply view is full-screen for Phase 1. Decide later whether the joint demo embeds both in frames or a split layout.
