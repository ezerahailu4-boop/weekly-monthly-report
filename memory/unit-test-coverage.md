---
name: unit-test-coverage
description: Unit test suite for pure lib functions using vitest; 49 tests across 5 files, all passing; plus print styles and accessibility improvements
metadata:
  type: project
---

Added a vitest-based unit test suite for the pure utility functions in `src/lib/` that previously had zero test coverage.

**Files created:**
- `vitest.config.ts` — vitest config with `@/*` alias resolution mapped to `./src`
- `src/lib/__tests__/dateUtils.test.ts` — `formatDate`, `formatDateIso` (10 tests)
- `src/lib/__tests__/safeCompare.test.ts` — `safeTimingCompare` constant-time comparison (5 tests)
- `src/lib/__tests__/windowSchedule.test.ts` — `parseTimeToMinutes`, `formatTime12h`, `formatDayTimeLabel`, `formatCountdown`, `evaluateReportingWindow` (16 tests)
- `src/lib/__tests__/compliancePeriods.test.ts` — `getWeekBounds`, `getMonthBounds`, `findBestReportInPeriod` (12 tests)
- `src/lib/__tests__/statusColors.test.ts` — `statusColorsFor`, `roleColorsFor` (6 tests)

**Accessibility improvements (a11y):**
- `src/components/ui/Table.tsx` — `TableHead` th elements now get `scope="col"` for screen-reader table navigation
- `src/components/ui/Modal.tsx` — dialog now has `aria-modal="true"`, optional `aria-label` prop, and `aria-labelledby` linked to `ModalTitle` via a React context + `useId`; `ModalTitle` renders its id so the title is programmatically associated with the dialog
- `src/components/StatCard.tsx` — each stat card now has `role="region"` and `aria-label={title}`; decorative icons marked `aria-hidden`

**Print styles (globals.css `@media print`):**
- Expanded from report-only rules to full dashboard/admin coverage
- Hides sidebar, nav drawers, modals, command palette, breadcrumbs, logout/api links on print
- Full-width main content, stripped card shadows/borders, dark text on light print
- Tables repeat header rows (`thead: display: table-header-group`), avoid orphan rows
- Links print their URL in parentheses; logout/api links hidden

**Package.json changes:**
- Added `"test": "vitest run"` and `"test:watch": "vitest"` scripts
- Added devDependencies: `vitest@3`, `@vitest/ui@3`, `jsdom`

**Verification (both commits):**
- `npx vitest run` → 49 passed, 0 failed
- `npx tsc --noEmit` → clean
- `npx eslint src/` → 0 errors (15 pre-existing warnings only)
- `npm run build` → passes

**Follow-up commit (`b719f8b`) — fixed plan/report PDF letterhead export on Vercel:**
- `src/app/api/plans/[id]/export/route.ts` — added `--no-sandbox`/`--disable-setuid-sandbox` to `chromium.launch()`; wrapped `renderOfficialLetterheadHtml` in try/catch so letterhead failures don’t break the whole export; improved catch-block logging
- `src/app/api/reports/[id]/export/pdf/route.ts` — same Chromium flags + try/catch around `renderReportHtml` with minimal fallback HTML
- `src/lib/officialLetterhead.ts` — added 8s `AbortController` timeout to `fetchCompanyLogoBuffer` to prevent hanging on unreachable external logo URLs

**Why:** Closed the "Test coverage", "Print styles", and "Accessibility audit" gaps identified in the codebase. The project previously had only one Playwright e2e file (`tests/e2e/auth.spec.ts`) and no unit tests; print CSS covered only `.report-render`; and there was no programmatic table/modal/station card accessibility.

**Related:** [[dark-mode-refinement]], [[warm-luxury-theme]] — statusColors tests verify the warm-luxury theme color tokens used in light/dark modes.
