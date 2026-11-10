# Yetta Holding — Executive Reporting Portal

A modern, high-performance executive reporting portal built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, and **Neon Serverless PostgreSQL**.

Designed to streamline subsidiary reporting across Yetta Holding, replacing disconnected email Word documents with structured, centralized digital submissions and dual-format exports (Word `.docx` and instant PDF).

---

## 🌟 Key Features

* **Dual Report Architecture**:
  * **Weekly Performance Report**: Granular KPI tracking, weekly targets vs. actual performance, auto-calculated percentage achievements, rollover incomplete activities, and weekly priorities.
  * **Monthly Progress Report**: Status of management directions, strategic goals and milestones, root cause variance analysis, and upcoming monthly focus areas.
* **Resilient Draft & Auto-Save Engine**:
  * Forms continuously auto-save in-progress input to `localStorage` to guard against accidental browser crashes or tab closures.
  * Explicit **"Save as Draft"** workflow stores in-progress work securely in PostgreSQL with a dedicated `Draft` badge until ready for final submission.
* **Full Report Editing & Deletion**:
  * Complete lifecycle management: author employees and executive administrators can update, correct, or delete reports.
* **Admin Governance Console (`/admin`)**:
  * Company-wide oversight with interactive filters: filter by department, staff member, report type, review status, and period dates.
  * Executive metric cards for total submissions, active personnel, and weekly vs. monthly submission rates.
  * Integrated **"Mark as Reviewed"** review status loop.
* **Team & Account Provisioning**:
  * Public sign-up is disabled for corporate security. Only authenticated administrators may provision accounts.
  * Administrators can provision new corporate staff accounts directly from the Admin Console with assigned divisions and roles.
  * One-click temporary credentials generator and clipboard sharing.
* **High-Fidelity Dual Export**:
  * **Instant Client-Side Print / PDF**: Uses custom `@media print` styling for 100% reliable PDF creation from any browser with zero serverless timeouts or Chromium payload limits.
  * **Microsoft Word Export (`.docx`)**: Generates formatted, editable Word documents matching official Yetta Holding templates on the fly.
* **Staff Profile & Account Settings (`/profile`)**:
  * Dedicated settings view allowing personnel to view credentials, update display name and assigned division, and change passwords securely with bcrypt encryption.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 16 (App Router, React 19)
* **Language:** TypeScript 5
* **Styling:** Tailwind CSS v4 (Executive Emerald & Slate palette)
* **Database & Auth:** Neon Serverless PostgreSQL (`@neondatabase/serverless`) + Bcrypt + HTTP-only secure session cookies
* **Document Generation:** `docx` (Word OpenXML) + `@media print` & Playwright (PDF)
* **Icons:** Lightweight zero-dependency SVG icon system

---

## 🚀 Quick Start Guide

### 1. Database Configuration (Neon)
The live Neon PostgreSQL database is already configured and migrated.

Configure `.env.local` (see `.env.example`):
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
SESSION_SECRET=replace-with-a-long-random-secret
```

To re-run migrations or seed:
```bash
node scripts/migrate-neon.mjs
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Default Administrator Credentials

Public sign-up is disabled. To access the portal and admin console, use the seeded admin credentials:

* **Email:** `admin@yetta-holding.com`
* **Password:** `YettaAdmin2026!`
* **Role:** `admin` (Full access to all reports, governance filters, and staff account provisioning)

*(A handy **"Auto-fill Admin"** button is provided directly on the `/login` screen for fast local testing).*

---

## 📁 Project Structure

```
report-app/
├── public/                 # Static assets
├── scripts/
│   └── migrate-neon.mjs    # Database migration & admin seed script for Neon
├── src/
│   ├── app/
│   │   ├── admin/          # Admin Governance Console & Team Management
│   │   ├── api/            # Local backend endpoints
│   │   │   ├── admin/      # Admin user creation and deletion
│   │   │   ├── auth/       # Login endpoint
│   │   │   ├── profile/    # Profile & password updates
│   │   │   └── reports/    # Report CRUD & export endpoints (DOCX, PDF)
│   │   ├── dashboard/      # Employee workspace & personal submission records
│   │   ├── login/          # Executive sign-in with diagnostic error handling
│   │   ├── profile/        # Staff personal settings & password management
│   │   ├── reports/
│   │   │   ├── [id]/       # Formatted executive report view & exports
│   │   │   ├── [id]/edit/  # Report editing & draft update interface
│   │   │   └── new/        # Weekly & Monthly report creation forms
│   │   ├── layout.tsx      # Root layout & executive typography configuration
│   │   └── page.tsx        # Executive landing page & live snapshot preview
│   ├── components/         # Reusable UI (Icons, Tables, FormBits, Badges)
│   ├── lib/
│   │   ├── auth.ts         # Session authentication, verification & hashing
│   │   ├── constants.ts    # Shared cookie and application constants
│   │   ├── db.ts           # Neon serverless client connection
│   │   ├── getReportForExport.ts # Secure report export loader
│   │   └── reportHtml.ts   # Document HTML & print template generator
│   └── types/              # TypeScript interfaces for reports, profiles, KPIs
├── README.md               # Project documentation
└── SETUP.md                # Detailed onboarding guide
```

---

## 📄 License
Confidential & Proprietary — Yetta Holding Limited.
