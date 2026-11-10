import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { getDatabaseUrl } from "./db-env.mjs";

const sql = neon(getDatabaseUrl());

async function main() {
  console.log("Migrating database for Super Admin (CEO) and Review workflow...");

  // 1. Update users role check constraint to support super_admin
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`;
  await sql`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('employee', 'admin', 'super_admin'));
  `;
  console.log("Updated users_role_check to include 'super_admin'.");

  // 2. Add review metadata columns to reports table
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS review_notes TEXT;`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;`;
  console.log("Added review_notes, reviewed_by, and reviewed_at columns to reports.");

  // 3. Seed Super Admin (CEO) account
  const ceoEmail = "ceo@yetaf-holding.com";
  const ceoPassword = "YetafCeo2026!";
  const ceoHash = await bcrypt.hash(ceoPassword, 10);

  const existingCeo = await sql`SELECT id FROM users WHERE email = ${ceoEmail};`;
  if (existingCeo.length === 0) {
    await sql`
      INSERT INTO users (email, password_hash, full_name, department, role)
      VALUES (
        ${ceoEmail},
        ${ceoHash},
        'Executive Chairman & CEO',
        'Office of the CEO & Board',
        'super_admin'
      );
    `;
    console.log(`Created Super Admin (CEO): ${ceoEmail} (password: ${ceoPassword})`);
  } else {
    await sql`
      UPDATE users
      SET role = 'super_admin',
          password_hash = ${ceoHash},
          full_name = 'Executive Chairman & CEO',
          department = 'Office of the CEO & Board'
      WHERE email = ${ceoEmail};
    `;
    console.log(`Updated Super Admin (CEO): ${ceoEmail}`);
  }

  // 4. Ensure standard Admin account is also set
  const adminEmail = "admin@yetaf-holding.com";
  const adminPassword = "YetafAdmin2026!";
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await sql`SELECT id FROM users WHERE email = ${adminEmail};`;
  if (existingAdmin.length === 0) {
    await sql`
      INSERT INTO users (email, password_hash, full_name, department, role)
      VALUES (
        ${adminEmail},
        ${adminHash},
        'Executive Administrator',
        'Executive Management',
        'admin'
      );
    `;
    console.log(`Created Admin: ${adminEmail}`);
  } else {
    await sql`
      UPDATE users
      SET role = 'admin',
          password_hash = ${adminHash}
      WHERE email = ${adminEmail};
    `;
    console.log(`Verified Admin: ${adminEmail}`);
  }

  // 5. Seed a sample Department Employee account so user can test staff submission workflow
  const staffEmail = "operations@yetaf-holding.com";
  const staffPassword = "YetafStaff2026!";
  const staffHash = await bcrypt.hash(staffPassword, 10);

  const existingStaff = await sql`SELECT id FROM users WHERE email = ${staffEmail};`;
  if (existingStaff.length === 0) {
    await sql`
      INSERT INTO users (email, password_hash, full_name, department, role)
      VALUES (
        ${staffEmail},
        ${staffHash},
        'Abebe Tadesse (Ops Lead)',
        'Operations & Logistics',
        'employee'
      );
    `;
    console.log(`Created Staff Member: ${staffEmail} (password: ${staffPassword})`);
  } else {
    await sql`
      UPDATE users
      SET role = 'employee',
          password_hash = ${staffHash}
      WHERE email = ${staffEmail};
    `;
    console.log(`Verified Staff Member: ${staffEmail}`);
  }

  console.log("Migration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

