# Setup — Yetta Holding Reporting Portal

Next.js 16 (App Router, TypeScript, Tailwind CSS v4) + Neon Serverless PostgreSQL (`@neondatabase/serverless`).

---

## 1. Default Administrator Credentials

Public signup is disabled for corporate governance. Use this pre-configured Admin account:

* **Email:** `admin@yetta-holding.com`
* **Password:** `YettaAdmin2026!`
* **Role:** `admin` (Full access to company-wide submissions, filters, exports, and staff account provisioning)

---

## 2. Neon Database Setup

Your project is already linked to a live Neon PostgreSQL database:
* **Project ID:** `cold-sky-43535947`
* **Project Name:** `yetta-holding-reports`
* **Region:** `aws-us-east-2`

The database schema includes:
* `users` table: UUID primary keys, emails, bcrypt password hashes, full names, departments, and roles (`employee` or `admin`).
* `sessions` table: 30-day cryptographically secure session tokens stored in HTTP-only cookies.
* `reports` table: Weekly & Monthly performance reports with JSONB payloads, date ranges, status tracking (`draft`, `submitted`, `reviewed`), and cascade deletion on user removal.

To run or re-apply database migrations and seed the admin user:
```bash
node scripts/migrate-neon.mjs
```

---

## 3. Environment Configuration

Configure `.env.local` (copy from `.env.example`):
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
SESSION_SECRET=replace-with-a-long-random-secret
```

---

## 4. Run the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

3. On `/login`, click **"Auto-fill Admin"** (or type `admin@yetta-holding.com` / `YettaAdmin2026!`) and click **Sign In**.

---

## 5. How Admins Provision Employee Accounts

Once logged in as an administrator:
1. Navigate to the **Admin Console** in the top navigation bar (`/admin`).
2. Click the **"Team & Account Provisioning"** tab.
3. Click **"+ Provision New Account"**.
4. Enter the employee's Name, Corporate Email, Division (Operations, Finance, Commercial, etc.), Temporary Password, and Role (`Employee`).
5. Click **"Confirm & Provision"**.
6. The system provisions the account directly in Neon and shows a **"Copy Full Credentials"** button so you can send the login details directly to the employee.
