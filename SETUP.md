# Setup — Yetta Holding Reporting Portal

Next.js 16 (App Router, TypeScript, Tailwind CSS v4) + Neon Serverless PostgreSQL (`@neondatabase/serverless`).

---

## 1. Initial Administrator Credentials

Public signup is disabled for corporate governance. Use the seeded Admin account:

* **Email:** `admin@yetaf-holding.com`
* **Role:** `admin` (Full access to company-wide submissions, filters, exports, and staff account provisioning)
* Initial passwords are generated at seed runtime or configured via `ADMIN_SEED_PASSWORD`.

---

## 2. Neon Database Setup

Your project is linked to a live Neon PostgreSQL database:
* **Project Name:** `yetaf-holding-reports`

The database schema includes:
* `users` table: UUID primary keys, emails, bcrypt password hashes, full names, departments, and roles (`employee`, `admin`, `super_admin`).
* `sessions` table: 30-day cryptographically secure session tokens stored in HTTP-only cookies.
* `directives`, `directive_comments`, `action_plans`, `tasks`, `reports`, `uploaded_files`, and `portal_settings` tables.

To run database migrations:
```bash
node scripts/migrate-directive-center.mjs
node scripts/migrate-audit-notifications.mjs
```

The second command enables in-app notification delivery and report activity history. Run it once for each database before deploying the updated app. Existing mobile navigation, global quick search, report filters, review notes, and CSV exports are already included in the portal.

Administrators can download a business-data snapshot from **Admin Console → Download data backup**. Store the JSON file in approved encrypted storage. It excludes password hashes, sessions, Telegram bot tokens, and ERP API keys. For full database point-in-time recovery, enable and retain Neon backups for the production project; the downloaded snapshot is an export and does not automatically restore the database.

---

## 3. Environment Configuration

Configure `.env.local` (copy from `.env.example`):
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
SESSION_SECRET=replace-with-a-long-random-secret
CRON_SECRET=replace-with-a-secure-cron-secret
ERP_API_KEY=replace-with-a-secure-erp-api-key
```

---

## 4. Run the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

3. On `/login`, enter your configured credentials and click **Sign In**.

---

## 5. How Admins Provision Employee Accounts

Once logged in as an administrator:
1. Navigate to the **Admin Console** in the top navigation bar (`/admin`).
2. Click the **"Team & Account Provisioning"** tab.
3. Click **"+ Provision New Account"**.
4. Enter the employee's Name, Corporate Email, Division (Operations, Finance, Commercial, etc.), Temporary Password, and Role (`Employee`).
5. Click **"Confirm & Provision"**.
6. The system provisions the account directly in Neon and shows a **"Copy Full Credentials"** button so you can send the login details directly to the employee.
