---
name: light-theme-redesign
description: Redesign light theme of dashboard to polished modern SaaS (indigo accent, #F5F7FB bg, #E8ECF3 borders, dark navy sidebar, WCAG AA). Dark theme untouched.
metadata:
  type: project
---

STATUS: COMPLETE · verified (tsc clean, vitest 53 passed, next build succeeds).

Scope: UI/styling/layout only; all features, routes, data fetching, business logic unchanged. Dark theme (.dark) untouched — only ADDITIVE semantic vars added to it.

Light theme (:root in globals.css): accent indigo #4F46E5 · page bg #F5F7FB · cards #FFFFFF · border #E8ECF3 · radius 12-16px · caption #64748B · secondary #475569 (WCAG AA) · semantic green/amber/red for status only · dark navy sidebar (#111827→#1A2035), active = softer lighter block (#1F2937).

@theme inline: legacy colors kept theme-scoped (--brand/--accent) so dark theme preserved; semantic + sidebar-light color mappings added.

Components restyled (token-based, no hard-coded hex): Card, Badge (brand/success/warning/destructive), Table (sticky header, hover, focus rings), EmptyState, Skeleton, StatCard (28px number, Intl.NumberFormat, indigo icon chip, arrow+percent+since-last-week deltas), StatusBoard (semantic status dots/labels).

Dashboard page: heading tuned to ~24px.

Files changed: src/app/globals.css, src/components/ui/{Card,Badge,Table,EmptyState,Skeleton}.tsx, src/components/StatCard.tsx, src/components/StatusBoard.tsx, src/app/dashboard/page.tsx, src/lib/statusColors.ts, src/lib/__tests__/statusColors.test.ts. Deleted unused src/components/DashboardCharts.tsx.

Related memories: [[warm-luxury-theme]], [[sidebar-light-mode-visibility]], [[dark-mode-refinement]], [[unit-test-coverage]].
